"""FOMOフェード(過熱逆張り)戦略のシグナルロジック。

backtest.py と live_bot.py の両方から参照する共有モジュール。
バックテストと実弾で判定ロジックが分岐しないよう、シグナル計算はここに一本化する。
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class StrategyConfig:
    lookback_bars: int = 3
    price_spike_pct: float = 3.0
    volume_ma_window: int = 20
    volume_spike_ratio: float = 2.5
    rsi_window: int = 14
    rsi_threshold: float = 75.0
    price_ma_window: int = 20
    deviation_pct: float = 4.0
    confirmation_pullback_pct: float = 1.0
    confirmation_timeout_bars: int = 5
    stop_buffer_pct: float = 1.5
    take_profit_mode: str = "ma"  # "ma" or "fib"
    fib_ratio: float = 0.5
    max_holding_bars: int = 12
    risk_per_trade_pct: float = 1.0
    regime_ma_window: int = 200
    regime_filter: bool = True
    fee_pct: float = 0.05


def required_bars(cfg: StrategyConfig) -> int:
    return max(cfg.regime_ma_window, cfg.price_ma_window, cfg.volume_ma_window, cfg.rsi_window) + 20


def compute_rsi(close: pd.Series, window: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return (100 - (100 / (1 + rs))).fillna(50)


def compute_indicators(df: pd.DataFrame, cfg: StrategyConfig) -> pd.DataFrame:
    df = df.copy()
    df["price_ma"] = df["close"].rolling(cfg.price_ma_window).mean()
    df["regime_ma"] = df["close"].rolling(cfg.regime_ma_window).mean()
    df["volume_ma"] = df["volume"].rolling(cfg.volume_ma_window).mean()
    df["volume_ratio"] = df["volume"] / df["volume_ma"]
    df["spike_return_pct"] = df["close"].pct_change(cfg.lookback_bars) * 100
    df["deviation_pct"] = (df["close"] - df["price_ma"]) / df["price_ma"] * 100
    df["rsi"] = compute_rsi(df["close"], cfg.rsi_window)
    return df


def flag_overheat(df: pd.DataFrame, cfg: StrategyConfig) -> pd.Series:
    overheat = (
        (df["spike_return_pct"] >= cfg.price_spike_pct)
        & (df["volume_ratio"] >= cfg.volume_spike_ratio)
        & (df["rsi"] >= cfg.rsi_threshold)
        & (df["deviation_pct"] >= cfg.deviation_pct)
    )
    if cfg.regime_filter:
        # 上位足が強い上昇トレンド中はフェードを止める(踏み上げ対策)
        rising_regime = df["regime_ma"] > df["regime_ma"].shift(cfg.lookback_bars)
        strong_uptrend = (df["close"] > df["regime_ma"]) & rising_regime
        overheat = overheat & ~strong_uptrend.fillna(False)
    return overheat.fillna(False)


def compute_entry_plan(spike_high: float, entry_price: float, price_ma: float, cfg: StrategyConfig) -> tuple[float, float] | None:
    """確認足でのショートエントリー時の(stop_price, take_profit_price)を返す。無効な設定ならNone。"""
    stop_price = spike_high * (1 + cfg.stop_buffer_pct / 100)
    if cfg.take_profit_mode == "ma":
        take_profit_price = price_ma
    else:
        take_profit_price = entry_price - (spike_high - price_ma) * cfg.fib_ratio

    if stop_price <= entry_price or pd.isna(take_profit_price) or take_profit_price >= entry_price:
        return None
    return stop_price, take_profit_price
