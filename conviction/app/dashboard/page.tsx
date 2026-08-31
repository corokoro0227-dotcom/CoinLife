import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { coinById } from "@/lib/coins";
import { fetchCoinPrice } from "@/lib/market";
import { fetchAllFeedItems, itemsForUser, type ClassifiedFeedItem } from "@/lib/feeds";
import { t, LANG_COOKIE, type Lang } from "@/lib/i18n";
import { translateToJapanese } from "@/lib/translate";

export const revalidate = 300;

function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${value.toPrecision(3)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

async function translateArticles(items: ClassifiedFeedItem[]): Promise<ClassifiedFeedItem[]> {
  const flat = items.flatMap((item) => [item.title, item.description]);
  const translated = await translateToJapanese(flat);
  if (!translated) return items;
  return items.map((item, i) => ({
    ...item,
    title: translated[i * 2] ?? item.title,
    description: translated[i * 2 + 1] ?? item.description,
  }));
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const coin = coinById(user.coinId);
  if (!coin) redirect("/");

  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get(LANG_COOKIE)?.value === "ja" ? "ja" : "en";

  const [priceResult, feedResult] = await Promise.allSettled([fetchCoinPrice(user.coinId), fetchAllFeedItems()]);

  const price = priceResult.status === "fulfilled" ? priceResult.value : null;
  const allItems = feedResult.status === "fulfilled" ? feedResult.value : [];
  let matchingItems = itemsForUser(allItems, coin, user.stance);

  if (lang === "ja" && matchingItems.length > 0) {
    matchingItems = await translateArticles(matchingItems);
  }

  const stanceLabel = t(lang, user.stance === "BULLISH" ? "bullish" : "bearish");
  const changeColor = (price?.priceChangePercentage24h ?? 0) > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : (price?.priceChangePercentage24h ?? 0) < 0
      ? "text-red-600 dark:text-red-400"
      : "";

  return (
    <div className="flex flex-col gap-8">
      <section className="border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{t(lang, "yourCommitment")}</span>
          <span>{t(lang, "joinedOn")} {user.createdAt.toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US")}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <span className="text-xs text-zinc-500">{t(lang, "coinLabel")}</span>
            <p className="text-lg font-semibold">
              {coin.name} <span className="text-zinc-400">{coin.symbol}</span>
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-500">{t(lang, "stanceLabel")}</span>
            <p className="text-lg font-semibold">{stanceLabel}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500">{t(lang, "change24h")}</span>
            {price ? (
              <p className="text-lg font-semibold tabular-nums">
                {formatUsd(price.currentPrice)}{" "}
                <span className={`text-sm ${changeColor}`}>{formatPercent(price.priceChangePercentage24h)}</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-500">{t(lang, "tickerUnavailable")}</p>
            )}
          </div>
        </div>
      </section>

      <p className="border border-dashed border-zinc-300 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-700">
        {t(lang, "emailNote")}
      </p>

      <section>
        <h2 className="text-lg font-semibold">{t(lang, "articlesHeading")}</h2>
        {matchingItems.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t(lang, "noArticles")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {matchingItems.map((item) => (
              <li key={item.link} className="border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      item.direction === "BULLISH"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }`}
                  >
                    {item.direction === "BULLISH" ? t(lang, "bullish") : t(lang, "bearish")}
                  </span>
                </div>
                <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block font-medium hover:underline">
                  {item.title} ↗
                </a>
                {item.description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>}
                <p className="mt-1 text-xs text-zinc-500">
                  {item.sourceName} · {item.publishedAt.toLocaleString(lang === "ja" ? "ja-JP" : "en-US")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
