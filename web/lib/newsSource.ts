import { XMLParser } from "fast-xml-parser";

// No-signup RSS feeds from major, well-established crypto news outlets.
// "Most influential" is approximated as: the newest item from the first
// feed that has published something within the last day, trusting that
// outlet's own top-of-feed editorial ordering.
const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
];

const RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type NewsItem = {
  title: string;
  description: string;
  link: string;
  sourceName: string;
  publishedAt: Date;
};

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]).trim();
  }
  return "";
}

async function fetchFeedItems(feed: { name: string; url: string }): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CoinLifeBot/1.0; +https://coinlife.example)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${feed.name}: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: true });
  const parsed = parser.parse(xml);
  const rawItems: unknown[] = parsed?.rss?.channel?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((item): NewsItem | null => {
      const record = item as Record<string, unknown>;
      const title = toText(record.title);
      const link = toText(record.link);
      const description = toText(record.description);
      const pubDateText = toText(record.pubDate);
      const publishedAt = pubDateText ? new Date(pubDateText) : null;
      if (!title || !link || !publishedAt || Number.isNaN(publishedAt.getTime())) return null;
      return { title, description, link, sourceName: feed.name, publishedAt };
    })
    .filter((item): item is NewsItem => item !== null);
}

/**
 * Picks the newest article, from the first feed (in FEEDS order) that has
 * one, published within the last 24 hours.
 */
export async function fetchTodaysTopCryptoNews(now = new Date()): Promise<NewsItem | null> {
  for (const feed of FEEDS) {
    try {
      const items = await fetchFeedItems(feed);
      const recent = items
        .filter((item) => now.getTime() - item.publishedAt.getTime() <= RECENCY_WINDOW_MS)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      if (recent.length > 0) return recent[0];
    } catch (error) {
      console.error(`Failed to read feed ${feed.name}`, error);
    }
  }
  return null;
}
