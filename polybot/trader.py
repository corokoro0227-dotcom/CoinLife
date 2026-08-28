"""Polymarket CLOB クライアントのラッパー。

LIVE_TRADING=false のときは一切のオンチェーン/API書き込みを行わず、
「本来ならこう発注していた」というログだけを吐く (dry-run)。
初めて動かすときは必ずこのモードで数十窓分ログを見て、モデルの
判断がおかしくないか確認してから LIVE_TRADING=true に切り替えること。
"""

import logging
from dataclasses import dataclass
from typing import Optional

from config import Config
from edge_model import Side

logger = logging.getLogger("polybot")


@dataclass
class OrderResult:
    submitted: bool
    detail: str


class Trader:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._client = None
        if cfg.live_trading:
            self._client = self._build_client()

    def _build_client(self):
        from py_clob_client.client import ClobClient

        client = ClobClient(
            self.cfg.clob_host,
            key=self.cfg.private_key,
            chain_id=self.cfg.chain_id,
            signature_type=self.cfg.signature_type,
            funder=self.cfg.funder_address or None,
        )
        client.set_api_creds(client.create_or_derive_api_creds())
        return client

    def get_midpoint(self, token_id: str) -> float:
        if self._client is not None:
            return float(self._client.get_midpoint(token_id)["mid"])

        # dry-runでも板情報自体は認証不要で読めるので、読み取り専用クライアントを使う
        from py_clob_client.client import ClobClient

        ro_client = ClobClient(self.cfg.clob_host)
        return float(ro_client.get_midpoint(token_id)["mid"])

    def get_bankroll_usdc(self) -> float:
        override = _env_float("BANKROLL_OVERRIDE_USDC")
        if override is not None:
            return override

        if self._client is None:
            raise RuntimeError(
                "dry-runでは残高を自動取得できません。.envにBANKROLL_OVERRIDE_USDC"
                "を設定してシミュレーション用の残高を指定してください。"
            )

        from py_clob_client.clob_types import AssetType, BalanceAllowanceParams

        params = BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
        result = self._client.get_balance_allowance(params)
        # USDCは6桁精度で返ってくることが多い。SDKのバージョンによって単位が
        # 変わることがあるので、初回はBANKROLL_OVERRIDE_USDCで検算すること。
        raw_balance = float(result["balance"])
        return raw_balance / 1_000_000

    def place_order(
        self,
        side: Side,
        token_id: str,
        price: float,
        size_usdc: float,
    ) -> OrderResult:
        detail = (
            f"side={side.value} token_id={token_id} "
            f"price={price:.4f} size_usdc={size_usdc:.2f}"
        )

        if not self.cfg.live_trading:
            logger.info("[DRY-RUN] 発注シミュレーション: %s", detail)
            return OrderResult(submitted=False, detail=detail)

        from py_clob_client.clob_types import MarketOrderArgs, OrderType
        from py_clob_client.order_builder.constants import BUY

        order = MarketOrderArgs(
            token_id=token_id,
            amount=size_usdc,
            side=BUY,
            order_type=OrderType.FOK,
        )
        signed = self._client.create_market_order(order)
        resp = self._client.post_order(signed, OrderType.FOK)
        logger.info("[LIVE] 発注実行: %s -> %s", detail, resp)
        return OrderResult(submitted=True, detail=str(resp))


def _env_float(name: str) -> Optional[float]:
    import os

    val = os.getenv(name)
    return float(val) if val else None
