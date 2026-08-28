import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _float(name: str, default: float) -> float:
    val = os.getenv(name)
    return float(val) if val else default


def _int(name: str, default: int) -> int:
    val = os.getenv(name)
    return int(val) if val else default


@dataclass(frozen=True)
class Config:
    private_key: str
    funder_address: str
    signature_type: int
    clob_host: str
    chain_id: int

    series_slug: str
    ref_price_source: str
    ref_price_symbol: str

    edge_threshold: float
    kelly_fraction: float
    poll_interval_seconds: int

    live_trading: bool
    log_file: str


def load_config() -> Config:
    cfg = Config(
        private_key=os.getenv("POLY_PRIVATE_KEY", ""),
        funder_address=os.getenv("POLY_FUNDER_ADDRESS", ""),
        signature_type=_int("POLY_SIGNATURE_TYPE", 1),
        clob_host=os.getenv("POLY_CLOB_HOST", "https://clob.polymarket.com"),
        chain_id=_int("POLY_CHAIN_ID", 137),
        series_slug=os.getenv("POLY_SERIES_SLUG", "btc-up-or-down-1h"),
        ref_price_source=os.getenv("REF_PRICE_SOURCE", "binance"),
        ref_price_symbol=os.getenv("REF_PRICE_SYMBOL", "BTCUSDT"),
        edge_threshold=_float("EDGE_THRESHOLD", 0.05),
        kelly_fraction=_float("KELLY_FRACTION", 1.0),
        poll_interval_seconds=_int("POLL_INTERVAL_SECONDS", 15),
        live_trading=_bool("LIVE_TRADING", False),
        log_file=os.getenv("LOG_FILE", "polybot.log"),
    )

    if cfg.live_trading and not cfg.private_key:
        raise RuntimeError(
            "LIVE_TRADING=true なのに POLY_PRIVATE_KEY が空です。"
            "本番運用するには秘密鍵の設定が必要です。"
        )

    return cfg
