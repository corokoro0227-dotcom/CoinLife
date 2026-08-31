import { XMLParser } from "fast-xml-parser";
import { buildCoinMatcher, type Coin } from "@/lib/coins";

// English-language sources only (see the language decision on /about):
// general crypto news wires plus one deliberately skeptical source, so a
// user who locked in "bearish" still gets real reporting, not just
// negative-sounding market chatter.
export const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
  { name: "NewsBTC", url: "https://www.newsbtc.com/feed/" },
  { name: "Bitcoin.com News", url: "https://news.bitcoin.com/feed/" },
  { name: "Web3 is Going Just Great", url: "https://web3isgoinggreat.com/rss/" },
] as const;

// Purely mechanical word lists. An article is BULLISH- or BEARISH-leaning
// based only on which set of words appears more often in its title +
// excerpt — never on whether the underlying event is "good" for any given
// reader. A price crash still counts as bearish-worded even for a reader
// who is happy to see it; see /about for why the choice at signup is
// framed as "which kind of narrative" rather than "good vs bad news".
export const BULLISH_WORDS = [
  "surge",
  "surges",
  "surged",
  "rally",
  "rallies",
  "rallied",
  "soar",
  "soars",
  "soared",
  "jump",
  "jumps",
  "jumped",
  "breakout",
  "all-time high",
  "all time high",
  "\\bath\\b",
  "rebound",
  "rebounds",
  "outperform",
  "adoption",
  "approved",
  "approval",
  "upgrade",
  "partnership",
  "bull run",
  "bullish",
  "inflow",
  "inflows",
  "accumulate",
  "accumulation",
  "record high",
];

export const BEARISH_WORDS = [
  "crash",
  "crashes",
  "crashed",
  "plunge",
  "plunges",
  "plunged",
  "plummet",
  "plummets",
  "plummeted",
  "dump",
  "dumps",
  "dumped",
  "sell-off",
  "selloff",
  "tumble",
  "tumbles",
  "tumbled",
  "slump",
  "slumps",
  "decline",
  "declines",
  "bearish",
  "hack",
  "hacked",
  "exploit",
  "exploited",
  "rug pull",
  "rugpull",
  "lawsuit",
  "sued",
  "\\bban\\b",
  "banned",
  "crackdown",
  "delist",
  "delisted",
  "fraud",
  "collapse",
  "collapsed",
  "liquidation",
  "liquidations",
  "correction",
  "outflow",
  "outflows",
];

const BULLISH_RE = new RegExp(BULLISH_WORDS.join("|"), "gi");
const BEARISH_RE = new RegExp(BEARISH_WORDS.join("|"), "gi");

export type RawFeedItem = {
  title: string;
  description: string;
  link: string;
  sourceName: string;
  publishedAt: Date;
};

export type Direction = "BULLISH" | "BEARISH";

export type ClassifiedFeedItem = RawFeedItem & { direction: Direction | null };

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

async function fetchFeedItems(feed: { name: string; url: string }): Promise<RawFeedItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ConvictionBot/1.0; +https://conviction.example)" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${feed.name}: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: true });
  const parsed = parser.parse(xml);
  const rawItems: unknown[] = parsed?.rss?.channel?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .map((item): RawFeedItem | null => {
      const record = item as Record<string, unknown>;
      const title = toText(record.title);
      const link = toText(record.link);
      const description = stripHtml(toText(record.description)).slice(0, 240);
      const pubDateText = toText(record.pubDate);
      const publishedAt = pubDateText ? new Date(pubDateText) : null;
      if (!title || !link || !publishedAt || Number.isNaN(publishedAt.getTime())) return null;
      return { title, description, link, sourceName: feed.name, publishedAt };
    })
    .filter((item): item is RawFeedItem => item !== null);
}

/**
 * Pulls every configured feed in parallel. A feed that fails to load is
 * silently skipped — the rest still work. Not filtered by coin here;
 * that happens per-user in itemsForUser, since the same fetched batch is
 * reused across every visitor's request within the revalidate window.
 */
export async function fetchAllFeedItems(): Promise<RawFeedItem[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeedItems));
  const seen = new Set<string>();
  const items: RawFeedItem[] = [];
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

function classifyDirection(text: string): Direction | null {
  const bullHits = text.match(BULLISH_RE)?.length ?? 0;
  const bearHits = text.match(BEARISH_RE)?.length ?? 0;
  if (bullHits === 0 && bearHits === 0) return null;
  if (bullHits === bearHits) return null;
  return bullHits > bearHits ? "BULLISH" : "BEARISH";
}

/** Every item that mentions this coin, each tagged with its direction (or null if ambiguous/neutral). */
export function itemsForCoin(items: RawFeedItem[], coin: Coin): ClassifiedFeedItem[] {
  const matcher = buildCoinMatcher(coin);
  return items
    .filter((item) => matcher.test(`${item.title} ${item.description}`))
    .map((item) => ({ ...item, direction: classifyDirection(`${item.title} ${item.description}`) }));
}

/** Items about this coin that also match the user's locked-in stance. */
export function itemsForUser(items: RawFeedItem[], coin: Coin, stance: Direction): ClassifiedFeedItem[] {
  return itemsForCoin(items, coin).filter((item) => item.direction === stance);
}
