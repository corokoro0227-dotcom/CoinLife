"""単純な「無ドリフト対数正規」モデルで Up/Down の理論確率を出し、
市場価格とのエッジから Kelly サイズを計算する。

注意 (README にも記載): これは実測ボラティリティだけを使った素朴なモデル。
出来高スパイクやニュースイベント直後はボラティリティが跳ねてモデルが
外れやすい。「モデルが正しい」という前提そのものが最大のリスク。
"""

import math
import statistics
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


def normal_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def estimate_sigma_per_second(minute_returns: List[float]) -> float:
    """1分足リターンの標本標準偏差から、1秒あたりのボラティリティを推定する。"""
    if len(minute_returns) < 5:
        raise ValueError("ボラティリティ推定には最低5本のリターンが必要です")
    sigma_per_minute = statistics.stdev(minute_returns)
    return sigma_per_minute / math.sqrt(60.0)


def model_probability_up(
    price_now: float,
    price_open: float,
    seconds_remaining: float,
    sigma_per_second: float,
) -> float:
    """残り時間 `seconds_remaining` で価格が price_open 以上で引けるモデル確率。"""
    seconds_remaining = max(seconds_remaining, 1.0)
    sigma_t = sigma_per_second * math.sqrt(seconds_remaining)
    sigma_t = max(sigma_t, 1e-9)
    z = math.log(price_now / price_open) / sigma_t
    return normal_cdf(z)


class Side(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    NONE = "NONE"


@dataclass
class TradeDecision:
    side: Side
    edge: float
    kelly_fraction: float
    model_prob_up: float
    market_prob_up: float


def decide_trade(
    market_prob_up: float,
    model_prob_up: float,
    edge_threshold: float,
    kelly_multiplier: float,
) -> TradeDecision:
    """買うならUP/DOWNどちらのトークンか、エッジとKelly比率を決める。

    二値マーケットで価格 p の "Yes" トークンを買い真の確率が q のときの
    対数成長率最大化Kelly比率は f* = (q - p) / (1 - p)。
    """
    edge_up = model_prob_up - market_prob_up
    edge_down = (1 - model_prob_up) - (1 - market_prob_up)  # == -edge_up

    if edge_up >= edge_threshold and edge_up > 0:
        p = market_prob_up
        q = model_prob_up
        raw_kelly = (q - p) / max(1 - p, 1e-9)
        kelly = max(0.0, min(1.0, raw_kelly * kelly_multiplier))
        return TradeDecision(Side.UP, edge_up, kelly, model_prob_up, market_prob_up)

    if edge_down >= edge_threshold and edge_down > 0:
        p = 1 - market_prob_up
        q = 1 - model_prob_up
        raw_kelly = (q - p) / max(1 - p, 1e-9)
        kelly = max(0.0, min(1.0, raw_kelly * kelly_multiplier))
        return TradeDecision(Side.DOWN, edge_down, kelly, model_prob_up, market_prob_up)

    return TradeDecision(Side.NONE, max(edge_up, edge_down), 0.0, model_prob_up, market_prob_up)
