import { XMLParser } from "fast-xml-parser";

// This site does not write or select stories editorially — it pulls from a
// fixed list of no-signup, publicly available RSS feeds from established
// crypto news outlets, then mechanically keeps only items that mention a
// meme coin by name/keyword. Nothing here is chosen or worded by the site.
export const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
  { name: "NewsBTC", url: "https://www.newsbtc.com/feed/" },
  { name: "Bitcoin.com News", url: "https://news.bitcoin.com/feed/" },
] as const;

// Word-boundary matched, case-insensitive. Kept short and literal on
// purpose — this is a mechanical filter, not editorial curation.
const MEME_COIN_KEYWORDS = [
  "meme coin",
  "memecoin",
  "meme token",
  "meme season",
  "dogecoin",
  "\\bdoge\\b",
  "shiba inu",
  "\\bshib\\b",
  "\\bpepe\\b",
  "\\bbonk\\b",
  "\\bfloki\\b",
  "dogwifhat",
  "\\bwif\\b",
  "trump coin",
  "\\btrump\\b.*\\bcoin\\b",
];

// Also mechanical: an item is filed under "forecast" purely because its own
// title/description contains one of these phrases — the site is not
// generating or endorsing any prediction, just noting that the source
// article frames itself as one.
const FORECAST_KEYWORDS = [
  "predict",
  "forecast",
  "outlook",
  "price target",
  "target price",
  "could reach",
  "could hit",
  "could surge",
  "could soar",
  "expects?",
  "projection",
  "set to",
  "next bull run",
  "poised to",
  "eyeing \\$",
];

const MEME_COIN_RE = new RegExp(MEME_COIN_KEYWORDS.join("|"), "i");
const FORECAST_RE = new RegExp(FORECAST_KEYWORDS.join("|"), "i");

export type FeedItem = {
  title: string;
  description: string;
  link: string;
  sourceName: string;
  publishedAt: Date;
  category: "trend" | "forecast";
};

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]).trim();
  }
  return "";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

async function fetchFeedItems(feed: { name: string; url: string }): Promise<FeedItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MemeBoardBot/1.0; +https://meme-board.example)" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${feed.name}: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: true });
  const parsed = parser.parse(xml);
  const rawItems: unknown[] = parsed?.rss?.channel?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((item): FeedItem | null => {
      const record = item as Record<string, unknown>;
      const title = toText(record.title);
      const link = toText(record.link);
      const description = stripHtml(toText(record.description)).slice(0, 240);
      const pubDateText = toText(record.pubDate);
      const publishedAt = pubDateText ? new Date(pubDateText) : null;
      if (!title || !link || !publishedAt || Number.isNaN(publishedAt.getTime())) return null;

      const haystack = `${title} ${description}`;
      if (!MEME_COIN_RE.test(haystack)) return null;

      return {
        title,
        description,
        link,
        sourceName: feed.name,
        publishedAt,
        category: FORECAST_RE.test(haystack) ? "forecast" : "trend",
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

/**
 * Pulls every configured feed in parallel, keeps only items mentioning a
 * meme coin, de-duplicates by link, and sorts newest first. A feed that
 * fails to load (down, rate-limited, format change) is silently skipped —
 * the rest still render.
 */
export async function fetchMemeCoinFeedItems(): Promise<FeedItem[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeedItems));

  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      items.push(item);
    }
  }

  return items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
