// Meme coin trend snapshot, built from CoinGecko's public (no API key
// required) endpoints:
// - /search/trending: coins currently getting the most search interest
// - /coins/markets?category=meme-token: price/market-cap data for the
//   meme-token category, used to compute today's broad momentum
//
// This intentionally reports observed data (rank changes, 24h price moves)
// rather than asserting what will happen next — CoinLife is not an
// investment adviser (see /terms).

const TRENDING_URL = "https://api.coingecko.com/api/v3/search/trending";
const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=10&price_change_percentage=24h";

const FETCH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; CoinLifeBot/1.0; +https://coinlife.example)" };

type TrendingResponse = {
  coins?: { item?: { name?: string; symbol?: string; market_cap_rank?: number | null } }[];
};

type MarketCoin = {
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
};

export type MemeCoinTrendDigest = {
  title: string;
  quote: string;
  commentary: string;
  sourceName: string;
  sourceUrl: string;
};

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

async function fetchTrendingNames(): Promise<string[]> {
  const res = await fetch(TRENDING_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch trending coins: ${res.status}`);
  const data = (await res.json()) as TrendingResponse;
  return (data.coins ?? [])
    .map((entry) => entry.item?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 5);
}

async function fetchMemeCoinMarkets(): Promise<MarketCoin[]> {
  const res = await fetch(MARKETS_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch meme coin markets: ${res.status}`);
  return (await res.json()) as MarketCoin[];
}

/**
 * Builds today's meme coin trend digest: top movers by 24h price change
 * among the largest meme-token-category coins, plus a list of names
 * currently trending in search. Returns null if CoinGecko has nothing
 * usable right now (e.g. rate-limited).
 */
export async function fetchTodaysMemeCoinTrend(now = new Date()): Promise<MemeCoinTrendDigest | null> {
  const [markets, trendingNames] = await Promise.all([
    fetchMemeCoinMarkets().catch((error) => {
      console.error("Failed to read meme coin markets", error);
      return [] as MarketCoin[];
    }),
    fetchTrendingNames().catch((error) => {
      console.error("Failed to read trending coins", error);
      return [] as string[];
    }),
  ]);

  if (markets.length === 0) return null;

  const ranked = [...markets].sort(
    (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0),
  );
  const gainers = ranked.filter((c) => (c.price_change_percentage_24h ?? 0) > 0).slice(0, 3);
  const losers = ranked
    .filter((c) => (c.price_change_percentage_24h ?? 0) < 0)
    .slice(-3)
    .reverse();

  const upCount = markets.filter((c) => (c.price_change_percentage_24h ?? 0) > 0).length;
  const mood =
    upCount >= markets.length * 0.6
      ? "時価総額上位のミームコインの多くが値上がりしており、市場全体が強含んでいます。"
      : upCount <= markets.length * 0.4
        ? "時価総額上位のミームコインの多くが値下がりしており、市場全体が弱含んでいます。"
        : "上昇・下落が拮抗しており、方向感の定まらない展開です。";

  const dateLabel = now.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const title = `【${dateLabel}】ミームコイン市場動向`;

  const gainerLines = gainers
    .map((c) => `${c.name}(${c.symbol.toUpperCase()}) ${formatPercent(c.price_change_percentage_24h ?? 0)}`)
    .join(" / ");
  const loserLines = losers
    .map((c) => `${c.name}(${c.symbol.toUpperCase()}) ${formatPercent(c.price_change_percentage_24h ?? 0)}`)
    .join(" / ");

  const quoteParts = [gainerLines && `上昇: ${gainerLines}`, loserLines && `下落: ${loserLines}`].filter(Boolean);
  const quote = quoteParts.join("\n").slice(0, 300);

  const commentaryParts = [mood];
  if (trendingNames.length > 0) {
    commentaryParts.push(`検索で話題になっているのは ${trendingNames.join("、")} など。`);
  }
  commentaryParts.push(
    "この投稿はCoinGeckoの公開データを機械的に集計したものであり、特定銘柄の売買を推奨・保証するものではありません。今後の値動きを断定するものでもなく、投資判断はご自身の責任で行ってください。",
  );

  return {
    title,
    quote,
    commentary: commentaryParts.join("\n"),
    sourceName: "CoinGecko",
    sourceUrl: "https://www.coingecko.com/en/categories/meme-token",
  };
}
