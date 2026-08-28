"""メインループ。

スマホを見られない時間帯でも動かし続けられるように無人ループとして書いているが、
「上限なしで自由にサイズを決めさせる」という運用判断のリスクは変えられないので、
最低限の技術的セーフガードだけは実装している:
  - APIやフィードの連続エラーで自動停止 (壊れたデータで発注し続けるのを防ぐ)
  - 同じ窓に何度も重複発注しない
  - Kelly比率は物理的に100%(全額)で頭打ち (100%超はあり得ないので)
これはポジションサイズの上限ではなく、バグで暴走しないための最低ラインです。
"""

import sys
import time
from typing import Optional

from config import load_config
from edge_model import Side, decide_trade, estimate_sigma_per_second, model_probability_up
from gamma import UpDownWindow, fetch_active_window
from logging_utils import build_logger
from price_feed import get_current_price, get_price_at_or_before, get_recent_returns
from trader import Trader

MAX_CONSECUTIVE_ERRORS = 5
MIN_SECONDS_REMAINING_TO_ENTER = 10.0


def run() -> None:
    cfg = load_config()
    logger = build_logger(cfg.log_file)
    trader = Trader(cfg)

    mode = "LIVE (実資金)" if cfg.live_trading else "DRY-RUN (シミュレーションのみ)"
    logger.info("polybot 起動。モード=%s series=%s", mode, cfg.series_slug)

    traded_event_slugs: set[str] = set()
    consecutive_errors = 0

    while True:
        try:
            _tick(cfg, trader, logger, traded_event_slugs)
            consecutive_errors = 0
        except Exception:
            consecutive_errors += 1
            logger.exception(
                "tick中にエラー (連続%d/%d回目)", consecutive_errors, MAX_CONSECUTIVE_ERRORS
            )
            if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                logger.critical(
                    "連続エラーが上限に達したため安全のため停止します。"
                    "原因を確認してから再起動してください。"
                )
                sys.exit(1)

        time.sleep(cfg.poll_interval_seconds)


def _tick(cfg, trader: Trader, logger, traded_event_slugs: set) -> None:
    window: Optional[UpDownWindow] = fetch_active_window(cfg.series_slug)
    if window is None:
        logger.info("現在アクティブな窓なし (series=%s)", cfg.series_slug)
        return

    if window.event_slug in traded_event_slugs:
        logger.debug("窓 %s は処理済みなのでスキップ", window.event_slug)
        return

    remaining = window.seconds_remaining
    if remaining < MIN_SECONDS_REMAINING_TO_ENTER:
        logger.info("窓 %s は残り%.0f秒で短すぎるのでスキップ", window.event_slug, remaining)
        return

    price_now = get_current_price(cfg.ref_price_symbol)
    price_open = get_price_at_or_before(cfg.ref_price_symbol, window.start_time)
    returns = get_recent_returns(cfg.ref_price_symbol, minutes=60)
    sigma_per_second = estimate_sigma_per_second(returns)

    model_p_up = model_probability_up(price_now, price_open, remaining, sigma_per_second)
    market_p_up = trader.get_midpoint(window.up_token_id)

    decision = decide_trade(
        market_prob_up=market_p_up,
        model_prob_up=model_p_up,
        edge_threshold=cfg.edge_threshold,
        kelly_multiplier=cfg.kelly_fraction,
    )

    logger.info(
        "窓=%s 残り%.0fs price_now=%.2f price_open=%.2f "
        "model_p_up=%.3f market_p_up=%.3f edge=%.3f side=%s kelly=%.3f",
        window.event_slug,
        remaining,
        price_now,
        price_open,
        model_p_up,
        market_p_up,
        decision.edge,
        decision.side.value,
        decision.kelly_fraction,
    )

    if decision.side == Side.NONE or decision.kelly_fraction <= 0:
        return

    bankroll = trader.get_bankroll_usdc()
    size_usdc = bankroll * decision.kelly_fraction
    if size_usdc <= 0:
        return

    token_id = window.up_token_id if decision.side == Side.UP else window.down_token_id
    entry_price = market_p_up if decision.side == Side.UP else (1 - market_p_up)

    trader.place_order(decision.side, token_id, entry_price, size_usdc)
    traded_event_slugs.add(window.event_slug)


if __name__ == "__main__":
    run()
