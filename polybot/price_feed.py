"""参照価格フィード。

重要な注意 (README にも記載): Polymarket の BTC Up/Down 系マーケットは
Chainlink の BTC/USD Data Streams で解決される。Data Streams は購読契約が
必要な有料フィードで、個人が気軽に叩けるものではない。ここでは代替として
Binance の現物価格を近似として使う。通常時はChainlinkの参照値と数ベーシス
ポイント以内で連動するが、取引所固有の障害・フラッシュクラッシュ・出来高の
薄い時間帯には乖離しうる (=このbotの「エッジ」がそのまま偽物になるリスク)。
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List

import requests

BINANCE_HOST = "https://api.binance.com"


@dataclass
class Candle:
    open_time: datetime
    open: float
    close: float


def get_current_price(symbol: str, timeout: float = 5.0) -> float:
    resp = requests.get(
        f"{BINANCE_HOST}/api/v3/ticker/price",
        params={"symbol": symbol},
        timeout=timeout,
    )
    resp.raise_for_status()
    return float(resp.json()["price"])


def get_price_at_or_before(symbol: str, at: datetime, timeout: float = 5.0) -> float:
    """指定時刻時点の始値に一番近い1分足のopenを返す (=窓のストライク価格の近似)。"""
    start_ms = int(at.timestamp() * 1000) - 60_000
    resp = requests.get(
        f"{BINANCE_HOST}/api/v3/klines",
        params={
            "symbol": symbol,
            "interval": "1m",
            "startTime": start_ms,
            "limit": 2,
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    klines = resp.json()
    if not klines:
        raise RuntimeError(f"{symbol} の {at} 付近の価格が取得できませんでした")

    target_ms = int(at.timestamp() * 1000)
    best = min(klines, key=lambda k: abs(k[0] - target_ms))
    return float(best[1])  # open price


def get_recent_returns(symbol: str, minutes: int = 60, timeout: float = 5.0) -> List[float]:
    """直近 `minutes` 分の1分足からログリターン列を返す (ボラティリティ推定用)。"""
    resp = requests.get(
        f"{BINANCE_HOST}/api/v3/klines",
        params={"symbol": symbol, "interval": "1m", "limit": minutes + 1},
        timeout=timeout,
    )
    resp.raise_for_status()
    klines = resp.json()

    closes = [float(k[4]) for k in klines]
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append(_ln(closes[i] / closes[i - 1]))
    return returns


def _ln(x: float) -> float:
    import math

    return math.log(x)
