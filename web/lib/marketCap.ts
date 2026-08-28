// Restricts which assets count toward a user's equity to today's top-N by
// market cap. This is an anti-wash-trading guard: pumping the price of a
// thinly-traded token by trading with yourself is far harder to pull off on
// a large-cap asset, so illiquid/micro-cap holdings simply don't count
// toward the leaderboard.

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // refresh a few times a day

let cache: { symbols: Set<string>; fetchedAt: number } | null = null;

export async function getTopMarketCapSymbols(limit = 100): Promise<Set<string>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.symbols;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);

    const data = (await res.json()) as { symbol: string }[];
    const symbols = new Set(data.map((coin) => coin.symbol.toUpperCase()));
    cache = { symbols, fetchedAt: Date.now() };
    return symbols;
  } catch (error) {
    // Prefer a stale list over failing valuation outright.
    if (cache) return cache.symbols;
    throw error;
  }
}
