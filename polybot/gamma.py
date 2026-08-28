"""Polymarket Gamma API から Up/Down 系イベントの現在アクティブな窓を取得する。

スラッグを自前でタイムスタンプ組み立てして推測すると DST や境界計算で簡単に
バグる (仕様は東部時間境界・UTC5分グリッドなど不規則) ので、必ず API のレスポンス
に入っている startDate/endDate/clobTokenIds をそのまま使う。
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import requests

GAMMA_HOST = "https://gamma-api.polymarket.com"


@dataclass
class UpDownWindow:
    event_slug: str
    market_id: str
    start_time: datetime
    end_time: datetime
    up_token_id: str
    down_token_id: str

    @property
    def seconds_remaining(self) -> float:
        now = datetime.now(timezone.utc)
        return (self.end_time - now).total_seconds()


def _parse_iso(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def fetch_active_window(series_slug: str, timeout: float = 10.0) -> Optional[UpDownWindow]:
    """今まさに取引可能な (開いていて、まだ終了していない) 窓を1つ返す。無ければNone。"""
    resp = requests.get(
        f"{GAMMA_HOST}/events",
        params={
            "series_slug": series_slug,
            "closed": "false",
            "order": "endDate",
            "ascending": "true",
            "limit": 10,
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    events = resp.json()

    now = datetime.now(timezone.utc)
    for event in events:
        markets = event.get("markets") or []
        if not markets:
            continue
        market = markets[0]

        start = _parse_iso(event["startDate"])
        end = _parse_iso(event["endDate"])
        if not (start <= now < end):
            continue

        token_ids_raw = market.get("clobTokenIds")
        if not token_ids_raw:
            continue
        import json

        token_ids = json.loads(token_ids_raw)
        if len(token_ids) < 2:
            continue

        return UpDownWindow(
            event_slug=event.get("slug", ""),
            market_id=market.get("id", ""),
            start_time=start,
            end_time=end,
            up_token_id=token_ids[0],
            down_token_id=token_ids[1],
        )

    return None
