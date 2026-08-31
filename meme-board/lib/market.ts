// Raw market data for the meme-token category, straight from CoinGecko's
// public API (no key required). No commentary is generated from this data —
// numbers only, each row linking back to its own CoinGecko page.

const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=20&price_change_percentage=24h";

export type MemeCoinMarket = {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  marketCap: number;
  priceChangePercentage24h: number | null;
};

type RawMarketCoin = {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number | null;
};

export async function fetchMemeCoinMarkets(): Promise<MemeCoinMarket[]> {
  const res = await fetch(MARKETS_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MemeBoardBot/1.0; +https://meme-board.example)" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`Failed to fetch meme coin markets: ${res.status}`);
  const raw = (await res.json()) as RawMarketCoin[];
  return raw.map((coin) => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    priceChangePercentage24h: coin.price_change_percentage_24h,
  }));
}
