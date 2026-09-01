"""FOMOフェード(過熱逆張り)戦略のバックテストエンジン。

使い方は同ディレクトリの README.md を参照。
"""

from __future__ import annotations

import argparse
import dataclasses
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

from strategy import StrategyConfig, compute_indicators, flag_overheat


@dataclass
class Trade:
    entry_time: object
    entry_price: float
    exit_time: object
    exit_price: float
    exit_reason: str
    stop_price: float
    take_profit_price: float
    size: float
    pnl: float
    pnl_pct: float


def load_ohlcv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"timestamp", "open", "high", "low", "close", "volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSVに必要な列がありません: {sorted(missing)}")
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df.sort_values("timestamp").reset_index(drop=True)


def run_backtest(
    df: pd.DataFrame, cfg: StrategyConfig, initial_equity: float = 10_000.0
) -> tuple[list[Trade], list[tuple[object, float]], pd.DataFrame]:
    df = compute_indicators(df, cfg)
    df["overheat"] = flag_overheat(df, cfg)

    trades: list[Trade] = []
    equity_curve: list[tuple[object, float]] = []
    equity = initial_equity

    state = "idle"
    spike_high = 0.0
    armed_idx: Optional[int] = None
    entry_idx: Optional[int] = None
    entry_price = stop_price = take_profit_price = size = 0.0

    fee = cfg.fee_pct / 100

    for row in df.itertuples(index=True):
        i = row.Index
        equity_curve.append((row.timestamp, equity))

        if state == "idle":
            if row.overheat:
                state = "armed"
                spike_high = row.high
                armed_idx = i
            continue

        if state == "armed":
            spike_high = max(spike_high, row.high)
            pulled_back = (spike_high - row.close) / spike_high * 100 >= cfg.confirmation_pullback_pct
            red_candle = row.close < row.open
            if pulled_back or red_candle:
                candidate_entry = row.close
                candidate_stop = spike_high * (1 + cfg.stop_buffer_pct / 100)
                if cfg.take_profit_mode == "ma":
                    candidate_tp = row.price_ma
                else:
                    candidate_tp = candidate_entry - (spike_high - row.price_ma) * cfg.fib_ratio

                valid_setup = (
                    candidate_stop > candidate_entry
                    and not np.isnan(candidate_tp)
                    and candidate_tp < candidate_entry
                )
                if valid_setup:
                    entry_price, stop_price, take_profit_price = (
                        candidate_entry,
                        candidate_stop,
                        candidate_tp,
                    )
                    risk_amount = equity * cfg.risk_per_trade_pct / 100
                    size = risk_amount / (stop_price - entry_price)
                    entry_idx = i
                    state = "in_position"
                else:
                    state = "idle"
            elif i - armed_idx > cfg.confirmation_timeout_bars:
                state = "idle"
            continue

        if state == "in_position":
            exit_price: Optional[float] = None
            exit_reason = ""
            if row.high >= stop_price:
                exit_price, exit_reason = stop_price, "stop_loss"
            elif row.low <= take_profit_price:
                exit_price, exit_reason = take_profit_price, "take_profit"
            elif i - entry_idx >= cfg.max_holding_bars:
                exit_price, exit_reason = row.close, "time_stop"

            if exit_price is not None:
                gross_pnl = (entry_price - exit_price) * size
                fees = (entry_price + exit_price) * size * fee
                pnl = gross_pnl - fees
                equity += pnl
                trades.append(
                    Trade(
                        entry_time=df.at[entry_idx, "timestamp"],
                        entry_price=entry_price,
                        exit_time=row.timestamp,
                        exit_price=exit_price,
                        exit_reason=exit_reason,
                        stop_price=stop_price,
                        take_profit_price=take_profit_price,
                        size=size,
                        pnl=pnl,
                        pnl_pct=pnl / (equity - pnl) * 100,
                    )
                )
                state = "idle"

    return trades, equity_curve, df


def summarize(
    trades: list[Trade], initial_equity: float, equity_curve: list[tuple[object, float]]
) -> dict:
    if not trades:
        return {"num_trades": 0}

    pnls = np.array([t.pnl for t in trades])
    wins = pnls[pnls > 0]
    losses = pnls[pnls <= 0]
    equity_values = np.array([e for _, e in equity_curve])
    running_max = np.maximum.accumulate(equity_values)
    drawdown_pct = (equity_values - running_max) / running_max * 100
    final_equity = initial_equity + pnls.sum()
    loss_sum = abs(losses.sum())

    return {
        "num_trades": len(trades),
        "win_rate_pct": round(len(wins) / len(trades) * 100, 2),
        "avg_win": round(wins.mean(), 2) if len(wins) else 0.0,
        "avg_loss": round(losses.mean(), 2) if len(losses) else 0.0,
        "expectancy_per_trade": round(pnls.mean(), 2),
        "profit_factor": round(wins.sum() / loss_sum, 2) if loss_sum else float("inf"),
        "total_return_pct": round((final_equity - initial_equity) / initial_equity * 100, 2),
        "max_drawdown_pct": round(drawdown_pct.min(), 2),
        "final_equity": round(final_equity, 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="FOMOフェード(過熱逆張り)戦略のバックテスト")
    parser.add_argument("csv", help="OHLCVのCSVファイル (timestamp,open,high,low,close,volume)")
    parser.add_argument("--initial-equity", type=float, default=10_000.0)
    parser.add_argument("--lookback-bars", type=int, default=StrategyConfig.lookback_bars)
    parser.add_argument("--price-spike-pct", type=float, default=StrategyConfig.price_spike_pct)
    parser.add_argument("--volume-spike-ratio", type=float, default=StrategyConfig.volume_spike_ratio)
    parser.add_argument("--rsi-threshold", type=float, default=StrategyConfig.rsi_threshold)
    parser.add_argument("--deviation-pct", type=float, default=StrategyConfig.deviation_pct)
    parser.add_argument("--stop-buffer-pct", type=float, default=StrategyConfig.stop_buffer_pct)
    parser.add_argument("--take-profit-mode", choices=["ma", "fib"], default=StrategyConfig.take_profit_mode)
    parser.add_argument("--fib-ratio", type=float, default=StrategyConfig.fib_ratio)
    parser.add_argument("--max-holding-bars", type=int, default=StrategyConfig.max_holding_bars)
    parser.add_argument("--risk-per-trade-pct", type=float, default=StrategyConfig.risk_per_trade_pct)
    parser.add_argument("--fee-pct", type=float, default=StrategyConfig.fee_pct)
    parser.add_argument("--no-regime-filter", action="store_true")
    parser.add_argument("--trades-csv", help="個別トレード明細を書き出すCSVパス")
    args = parser.parse_args()

    cfg = StrategyConfig(
        lookback_bars=args.lookback_bars,
        price_spike_pct=args.price_spike_pct,
        volume_spike_ratio=args.volume_spike_ratio,
        rsi_threshold=args.rsi_threshold,
        deviation_pct=args.deviation_pct,
        stop_buffer_pct=args.stop_buffer_pct,
        take_profit_mode=args.take_profit_mode,
        fib_ratio=args.fib_ratio,
        max_holding_bars=args.max_holding_bars,
        risk_per_trade_pct=args.risk_per_trade_pct,
        fee_pct=args.fee_pct,
        regime_filter=not args.no_regime_filter,
    )

    df = load_ohlcv(args.csv)
    trades, equity_curve, _ = run_backtest(df, cfg, args.initial_equity)
    stats = summarize(trades, args.initial_equity, equity_curve)

    print(f"バー数: {len(df)}")
    for key, value in stats.items():
        print(f"  {key}: {value}")

    if args.trades_csv and trades:
        pd.DataFrame([dataclasses.asdict(t) for t in trades]).to_csv(args.trades_csv, index=False)
        print(f"トレード明細を書き出しました: {args.trades_csv}")


if __name__ == "__main__":
    main()
