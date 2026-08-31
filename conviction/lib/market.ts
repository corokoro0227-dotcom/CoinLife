// Ticker data for exactly one coin — the one the user locked in. Straight
// from CoinGecko's public API, no key required, no interpretation added.

export type CoinPrice = {
  currentPrice: number;
  priceChangePercentage24h: number | null;
  marketCap: number;
};

type RawMarketCoin = {
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
};

export async function fetchCoinPrice(coinId: string): Promise<CoinPrice | null> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}&price_change_percentage=24h`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ConvictionBot/1.0; +https://conviction.example)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch price for ${coinId}: ${res.status}`);
  const raw = (await res.json()) as RawMarketCoin[];
  const coin = raw[0];
  if (!coin) return null;
  return {
    currentPrice: coin.current_price,
    priceChangePercentage24h: coin.price_change_percentage_24h,
    marketCap: coin.market_cap,
  };
}
