"""Binance USDT-M無期限先物で、銘柄を限定せずFOMOフェード戦略を回すbot。

安全のため既定は dry-run(発注シミュレーションのみ、実際の注文は送らない)。
実弾発注には `--live` フラグに加えて環境変数 I_UNDERSTAND_THE_RISK=1 が必須。

使い方・注意点は README.md を必ず読むこと。
"""

from __future__ import annotations

import argparse
import csv
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd

from strategy import StrategyConfig, compute_entry_plan, compute_indicators, flag_overheat, required_bars

try:
    import ccxt
except ImportError as exc:  # pragma: no cover
    raise SystemExit("ccxt が必要です: pip install -r requirements.txt") from exc


logger = logging.getLogger("fomo_fade_live")


@dataclass
class SymbolState:
    phase: str = "idle"  # idle -> armed -> in_position
    spike_high: float = 0.0
    armed_since: Optional[pd.Timestamp] = None
    entry_price: float = 0.0
    stop_price: float = 0.0
    take_profit_price: float = 0.0
    size: float = 0.0
    entry_time: Optional[pd.Timestamp] = None
    stop_order_id: Optional[str] = None
    tp_order_id: Optional[str] = None


@dataclass
class RiskState:
    max_daily_loss_pct: float
    day: Optional[str] = None
    realized_pnl_today: float = 0.0
    starting_equity_today: float = 0.0

    def reset_if_new_day(self, today: str, equity: float) -> None:
        if self.day != today:
            self.day = today
            self.realized_pnl_today = 0.0
            self.starting_equity_today = equity

    def daily_loss_breached(self) -> bool:
        if self.starting_equity_today <= 0:
            return False
        loss_pct = -self.realized_pnl_today / self.starting_equity_today * 100
        return loss_pct >= self.max_daily_loss_pct


class TradeLogger:
    def __init__(self, path: Path):
        self.path = path
        is_new = not path.exists()
        self._file = path.open("a", newline="", encoding="utf-8")
        self._writer = csv.writer(self._file)
        if is_new:
            self._writer.writerow(
                [
                    "symbol",
                    "entry_time",
                    "entry_price",
                    "exit_time",
                    "exit_price",
                    "exit_reason",
                    "size",
                    "pnl",
                    "dry_run",
                ]
            )

    def log(self, symbol: str, state: SymbolState, exit_price: float, exit_reason: str, pnl: float, dry_run: bool) -> None:
        self._writer.writerow(
            [
                symbol,
                state.entry_time,
                state.entry_price,
                pd.Timestamp.utcnow(),
                exit_price,
                exit_reason,
                state.size,
                pnl,
                dry_run,
            ]
        )
        self._file.flush()


def build_exchange(testnet: bool) -> "ccxt.binance":
    exchange = ccxt.binance(
        {
            "apiKey": os.environ.get("BINANCE_API_KEY", ""),
            "secret": os.environ.get("BINANCE_API_SECRET", ""),
            "enableRateLimit": True,
            "options": {"defaultType": "future"},
        }
    )
    if testnet:
        exchange.set_sandbox_mode(True)
    return exchange


def select_universe(exchange, min_quote_volume_usdt: float, max_symbols: int, quote: str = "USDT") -> list[str]:
    markets = exchange.load_markets()
    tickers = exchange.fetch_tickers()
    candidates = []
    for symbol, market in markets.items():
        if not (market.get("swap") and market.get("active") and market.get("quote") == quote):
            continue
        ticker = tickers.get(symbol)
        if not ticker:
            continue
        quote_volume = ticker.get("quoteVolume") or 0.0
        if quote_volume >= min_quote_volume_usdt:
            candidates.append((symbol, quote_volume))
    candidates.sort(key=lambda item: item[1], reverse=True)
    return [symbol for symbol, _ in candidates[:max_symbols]]


def fetch_recent_ohlcv(exchange, symbol: str, timeframe: str, min_bars: int) -> pd.DataFrame:
    raw = exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=min_bars)
    df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    return df


def fetch_equity(exchange) -> float:
    balance = exchange.fetch_balance()
    usdt = balance.get("USDT", {})
    return float(usdt.get("total") or 0.0)


def place_short_entry(exchange, symbol: str, size: float, dry_run: bool) -> None:
    if dry_run:
        logger.info("[DRY-RUN] %s: 成行ショート size=%.6f", symbol, size)
        return
    amount = exchange.amount_to_precision(symbol, size)
    exchange.create_order(symbol, type="market", side="sell", amount=amount)


def place_protective_orders(
    exchange, symbol: str, size: float, stop_price: float, take_profit_price: float, dry_run: bool
) -> tuple[Optional[str], Optional[str]]:
    if dry_run:
        logger.info("[DRY-RUN] %s: 保護注文 stop=%.6f tp=%.6f", symbol, stop_price, take_profit_price)
        return None, None
    amount = exchange.amount_to_precision(symbol, size)
    stop_order = exchange.create_order(
        symbol,
        type="STOP_MARKET",
        side="buy",
        amount=amount,
        params={"stopPrice": exchange.price_to_precision(symbol, stop_price), "reduceOnly": True},
    )
    tp_order = exchange.create_order(
        symbol,
        type="TAKE_PROFIT_MARKET",
        side="buy",
        amount=amount,
        params={"stopPrice": exchange.price_to_precision(symbol, take_profit_price), "reduceOnly": True},
    )
    return stop_order.get("id"), tp_order.get("id")


def close_position_market(exchange, symbol: str, size: float, dry_run: bool) -> Optional[float]:
    if dry_run:
        logger.info("[DRY-RUN] %s: 成行決済 size=%.6f", symbol, size)
        return None
    amount = exchange.amount_to_precision(symbol, size)
    order = exchange.create_order(symbol, type="market", side="buy", amount=amount, params={"reduceOnly": True})
    price = order.get("average") or order.get("price")
    return float(price) if price else None


def cancel_open_orders(exchange, symbol: str, order_ids: list[Optional[str]], dry_run: bool) -> None:
    if dry_run:
        return
    for order_id in order_ids:
        if not order_id:
            continue
        try:
            exchange.cancel_order(order_id, symbol)
        except Exception:
            logger.exception("%s: 注文キャンセルに失敗 order_id=%s", symbol, order_id)


def process_symbol(
    exchange,
    symbol: str,
    state: SymbolState,
    cfg: StrategyConfig,
    equity: float,
    dry_run: bool,
    min_bars: int,
    timeframe: str,
) -> Optional[float]:
    """1銘柄分のポーリング処理を行う。ポジションを閉じたらpnlを返す。"""
    try:
        df = fetch_recent_ohlcv(exchange, symbol, timeframe, min_bars)
    except Exception:
        logger.exception("%s: OHLCV取得に失敗", symbol)
        return None
    if len(df) < min_bars:
        return None

    df = compute_indicators(df, cfg)
    df["overheat"] = flag_overheat(df, cfg)
    last = df.iloc[-1]

    if state.phase == "idle":
        if bool(last["overheat"]):
            state.phase = "armed"
            state.spike_high = float(last["high"])
            state.armed_since = last["timestamp"]
        return None

    if state.phase == "armed":
        state.spike_high = max(state.spike_high, float(last["high"]))
        pulled_back = (state.spike_high - last["close"]) / state.spike_high * 100 >= cfg.confirmation_pullback_pct
        red_candle = last["close"] < last["open"]
        bars_waited = int((df["timestamp"] > state.armed_since).sum())

        if pulled_back or red_candle:
            entry_price = float(last["close"])
            plan = compute_entry_plan(state.spike_high, entry_price, float(last["price_ma"]), cfg)
            if plan is None:
                state.phase = "idle"
                return None
            stop_price, take_profit_price = plan
            risk_amount = equity * cfg.risk_per_trade_pct / 100
            size = risk_amount / (stop_price - entry_price)

            place_short_entry(exchange, symbol, size, dry_run)
            stop_id, tp_id = place_protective_orders(exchange, symbol, size, stop_price, take_profit_price, dry_run)

            state.phase = "in_position"
            state.entry_price = entry_price
            state.stop_price = stop_price
            state.take_profit_price = take_profit_price
            state.size = size
            state.entry_time = last["timestamp"]
            state.stop_order_id = stop_id
            state.tp_order_id = tp_id
        elif bars_waited > cfg.confirmation_timeout_bars:
            state.phase = "idle"
        return None

    if state.phase == "in_position":
        exit_price = None
        exit_reason = ""
        if float(last["high"]) >= state.stop_price:
            exit_price, exit_reason = state.stop_price, "stop_loss"
        elif float(last["low"]) <= state.take_profit_price:
            exit_price, exit_reason = state.take_profit_price, "take_profit"
        else:
            bars_held = int((df["timestamp"] > state.entry_time).sum())
            if bars_held >= cfg.max_holding_bars:
                exit_price, exit_reason = float(last["close"]), "time_stop"

        if exit_price is None:
            return None

        cancel_open_orders(exchange, symbol, [state.stop_order_id, state.tp_order_id], dry_run)
        if exit_reason == "time_stop":
            filled_price = close_position_market(exchange, symbol, state.size, dry_run)
            if filled_price is not None:
                exit_price = filled_price

        pnl = (state.entry_price - exit_price) * state.size
        logger.info("%s: %s exit=%.6f pnl=%.2f", symbol, exit_reason, exit_price, pnl)
        state.phase = "idle"
        return pnl

    return None


def run(args: argparse.Namespace) -> None:
    cfg = StrategyConfig(
        lookback_bars=args.lookback_bars,
        price_spike_pct=args.price_spike_pct,
        volume_spike_ratio=args.volume_spike_ratio,
        rsi_threshold=args.rsi_threshold,
        deviation_pct=args.deviation_pct,
        confirmation_pullback_pct=args.confirmation_pullback_pct,
        confirmation_timeout_bars=args.confirmation_timeout_bars,
        stop_buffer_pct=args.stop_buffer_pct,
        take_profit_mode=args.take_profit_mode,
        fib_ratio=args.fib_ratio,
        max_holding_bars=args.max_holding_bars,
        risk_per_trade_pct=args.risk_per_trade_pct,
        fee_pct=args.fee_pct,
        regime_filter=not args.no_regime_filter,
    )

    dry_run = not args.live
    if args.live and os.environ.get("I_UNDERSTAND_THE_RISK") != "1":
        raise SystemExit("実弾発注には環境変数 I_UNDERSTAND_THE_RISK=1 の明示的な設定が必要です。")

    exchange = build_exchange(testnet=args.testnet)
    universe = select_universe(exchange, args.min_quote_volume_usdt, args.max_symbols)
    if not universe:
        raise SystemExit("条件に合う銘柄が見つかりませんでした(min-quote-volume-usdtを下げてみてください)")
    logger.info("監視対象 %d銘柄: %s", len(universe), ", ".join(universe))

    if not dry_run:
        for symbol in universe:
            try:
                exchange.set_leverage(args.leverage, symbol)
            except Exception:
                logger.exception("%s: レバレッジ設定に失敗", symbol)

    states: dict[str, SymbolState] = {symbol: SymbolState() for symbol in universe}
    risk = RiskState(max_daily_loss_pct=args.max_daily_loss_pct)
    open_positions = 0
    dry_run_equity = args.equity
    trade_log = TradeLogger(Path(args.trade_log))
    min_bars = required_bars(cfg)

    while True:
        try:
            equity = dry_run_equity if dry_run else fetch_equity(exchange)
            today = pd.Timestamp.utcnow().strftime("%Y-%m-%d")
            risk.reset_if_new_day(today, equity)

            if risk.daily_loss_breached():
                logger.warning("日次最大損失(%.1f%%)に到達、新規エントリーなしで待機します", risk.max_daily_loss_pct)
            else:
                for symbol in universe:
                    state = states[symbol]
                    if state.phase == "idle" and open_positions >= args.max_positions:
                        continue
                    was_in_position = state.phase == "in_position"
                    pnl = process_symbol(exchange, symbol, state, cfg, equity, dry_run, min_bars, args.timeframe)
                    if pnl is not None:
                        dry_run_equity += pnl
                        risk.realized_pnl_today += pnl
                        trade_log.log(symbol, state, state.take_profit_price, "closed", pnl, dry_run)
                    if was_in_position and state.phase == "idle":
                        open_positions -= 1
                    elif not was_in_position and state.phase == "in_position":
                        open_positions += 1
        except KeyboardInterrupt:
            logger.info("停止シグナルを受信、終了します")
            break
        except Exception:
            logger.exception("メインループで予期しないエラー。%d秒後にリトライします", args.poll_interval_sec)

        time.sleep(args.poll_interval_sec)


def main() -> None:
    parser = argparse.ArgumentParser(description="Binance USDT-M無期限先物 全銘柄FOMOフェードbot")
    parser.add_argument("--testnet", action="store_true", help="Binance Futures Testnetを使用")
    parser.add_argument("--live", action="store_true", help="実弾発注を有効化(既定はdry-run)")
    parser.add_argument("--equity", type=float, default=10_000.0, help="dry-run時の想定初期資金(USDT)")
    parser.add_argument("--leverage", type=int, default=2)
    parser.add_argument("--min-quote-volume-usdt", type=float, default=5_000_000.0)
    parser.add_argument("--max-symbols", type=int, default=30)
    parser.add_argument("--max-positions", type=int, default=3)
    parser.add_argument("--max-daily-loss-pct", type=float, default=3.0)
    parser.add_argument("--timeframe", default="5m")
    parser.add_argument("--poll-interval-sec", type=int, default=60)
    parser.add_argument("--trade-log", default="live_trades.csv")

    parser.add_argument("--lookback-bars", type=int, default=StrategyConfig.lookback_bars)
    parser.add_argument("--price-spike-pct", type=float, default=StrategyConfig.price_spike_pct)
    parser.add_argument("--volume-spike-ratio", type=float, default=StrategyConfig.volume_spike_ratio)
    parser.add_argument("--rsi-threshold", type=float, default=StrategyConfig.rsi_threshold)
    parser.add_argument("--deviation-pct", type=float, default=StrategyConfig.deviation_pct)
    parser.add_argument("--confirmation-pullback-pct", type=float, default=StrategyConfig.confirmation_pullback_pct)
    parser.add_argument("--confirmation-timeout-bars", type=int, default=StrategyConfig.confirmation_timeout_bars)
    parser.add_argument("--stop-buffer-pct", type=float, default=StrategyConfig.stop_buffer_pct)
    parser.add_argument("--take-profit-mode", choices=["ma", "fib"], default=StrategyConfig.take_profit_mode)
    parser.add_argument("--fib-ratio", type=float, default=StrategyConfig.fib_ratio)
    parser.add_argument("--max-holding-bars", type=int, default=StrategyConfig.max_holding_bars)
    parser.add_argument("--risk-per-trade-pct", type=float, default=StrategyConfig.risk_per_trade_pct)
    parser.add_argument("--fee-pct", type=float, default=StrategyConfig.fee_pct)
    parser.add_argument("--no-regime-filter", action="store_true")

    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(message)s")
    run(args)


if __name__ == "__main__":
    main()
