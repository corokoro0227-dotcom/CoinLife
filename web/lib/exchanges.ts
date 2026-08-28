import { binance, bybit, okx, type Exchange, type Balance, type Ticker } from "ccxt";
import type { Exchange as ExchangeEnum } from "@prisma/client";
import { getTopMarketCapSymbols } from "@/lib/marketCap";

type ExchangeCtor = new (config: { apiKey: string; secret: string; enableRateLimit: boolean }) => Exchange;

const EXCHANGE_CTORS: Record<ExchangeEnum, ExchangeCtor> = {
  BINANCE: binance,
  BYBIT: bybit,
  OKX: okx,
};

const STABLECOINS = new Set(["USDT", "USD", "USDC", "BUSD", "DAI", "FDUSD", "TUSD"]);

// Keys ccxt's `fetchBalance()` result carries alongside the per-asset entries.
const NON_ASSET_KEYS = new Set(["info", "timestamp", "datetime", "free", "used", "total", "debt"]);

export function isSupportedExchange(id: string): id is ExchangeEnum {
  return id in EXCHANGE_CTORS;
}

/**
 * Connects to the exchange with the given (read-only, ideally) API credentials,
 * fetches the account balance, and converts every held asset to an approximate
 * USD value using each asset's USDT ticker price.
 */
export async function fetchAccountEquityUsd(
  exchange: ExchangeEnum,
  apiKey: string,
  apiSecret: string,
): Promise<number> {
  const client = new EXCHANGE_CTORS[exchange]({ apiKey, secret: apiSecret, enableRateLimit: true });

  const balance = await client.fetchBalance();
  const holdings = Object.entries(balance)
    .filter(([key]) => !NON_ASSET_KEYS.has(key))
    .map(([asset, value]) => [asset, (value as Balance).total ?? 0] as const)
    .filter(([, amount]) => amount > 0);

  if (holdings.length === 0) return 0;

  let tickers: Record<string, Ticker> = {};
  try {
    tickers = await client.fetchTickers();
  } catch {
    tickers = {};
  }

  // Anti-wash-trading guard: only stablecoins and today's top-100-by-market-cap
  // assets count toward equity. A thinly-traded token's price is easy to pump
  // by wash trading; excluding it from valuation removes the incentive.
  const topSymbols = await getTopMarketCapSymbols();

  let equityUsd = 0;
  for (const [asset, amount] of holdings) {
    if (STABLECOINS.has(asset)) {
      equityUsd += amount;
      continue;
    }
    if (!topSymbols.has(asset)) continue;
    const symbol = `${asset}/USDT`;
    const price = tickers[symbol]?.last ?? (await safeFetchLastPrice(client, symbol));
    if (price) equityUsd += amount * price;
  }

  return equityUsd;
}

async function safeFetchLastPrice(client: Exchange, symbol: string): Promise<number | null> {
  try {
    const ticker = await client.fetchTicker(symbol);
    return ticker.last ?? null;
  } catch {
    return null;
  }
}
