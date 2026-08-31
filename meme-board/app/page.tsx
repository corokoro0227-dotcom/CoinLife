import Link from "next/link";
import { fetchMemeCoinFeedItems, type FeedItem } from "@/lib/feeds";
import { fetchMemeCoinMarkets, type MemeCoinMarket } from "@/lib/market";

export const revalidate = 900;

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString("en-US")}`;
}

function ArticleList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">現在、該当する記事を取得できませんでした。</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.link} className="border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium hover:underline"
          >
            {item.title} ↗
          </a>
          {item.description && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            出典: {item.sourceName} ・ {item.publishedAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const [feedResult, marketResult] = await Promise.allSettled([fetchMemeCoinFeedItems(), fetchMemeCoinMarkets()]);

  const feedItems = feedResult.status === "fulfilled" ? feedResult.value : [];
  const markets: MemeCoinMarket[] = marketResult.status === "fulfilled" ? marketResult.value : [];

  const trendItems = feedItems.filter((item) => item.category === "trend").slice(0, 15);
  const forecastItems = feedItems.filter((item) => item.category === "forecast").slice(0, 15);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">ミームコイン情報ボード</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          世界のミームコインに関するニュースと市場データを、複数の公開情報源からそのまま集約して並べるだけのサイトです。
          当サイト自身が銘柄を分析したり、値動きを予想したり、売買を推奨することは一切ありません。「今後の予想」欄も、
          各出典記事が自ら予想・見通しとして書いている記事を機械的に振り分けているだけで、当サイトの見解ではありません。
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          分類方法の詳細は <Link href="/sources" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">情報源について</Link> を参照してください。判断は必ずご自身で行ってください。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">市場データ</h2>
        <p className="mt-1 text-xs text-zinc-500">出典: CoinGecko(ミームコインカテゴリ、時価総額順)</p>
        {markets.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">現在、市場データを取得できませんでした。</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-3">銘柄</th>
                  <th className="py-2 pr-3">価格</th>
                  <th className="py-2 pr-3">時価総額</th>
                  <th className="py-2 pr-3">24h</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((coin) => (
                  <tr key={coin.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3">
                      <a
                        href={`https://www.coingecko.com/en/coins/${coin.id}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:underline"
                      >
                        {coin.name} <span className="text-zinc-400">{coin.symbol.toUpperCase()}</span> ↗
                      </a>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{formatUsd(coin.currentPrice)}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatMarketCap(coin.marketCap)}</td>
                    <td
                      className={`py-2 pr-3 tabular-nums ${
                        (coin.priceChangePercentage24h ?? 0) > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : (coin.priceChangePercentage24h ?? 0) < 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}
                    >
                      {formatPercent(coin.priceChangePercentage24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">現在のトレンドとして報じられている記事</h2>
        <p className="mt-1 text-xs text-zinc-500">複数のニュースサイトのRSSから、ミームコインに触れている記事を新着順に掲載</p>
        <div className="mt-3">
          <ArticleList items={trendItems} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">今後の予想として報じられている記事</h2>
        <p className="mt-1 text-xs text-zinc-500">
          見出し・本文に「predict」「forecast」等の予想を示す語を含む記事のみを抽出(分類方法は<Link href="/sources" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">こちら</Link>)
        </p>
        <div className="mt-3">
          <ArticleList items={forecastItems} />
        </div>
      </section>
    </div>
  );
}
