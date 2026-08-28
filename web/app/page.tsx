import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContestStatusBadge } from "@/components/ContestStatusBadge";
import { HeroIllustration } from "@/components/illustrations/HeroIllustration";
import { IconShield, IconScale, IconTrend, IconEmptyTray } from "@/components/icons";

export default async function Home() {
  const contests = await prisma.contest.findMany({
    orderBy: { startAt: "desc" },
    take: 5,
    include: { _count: { select: { participants: true } } },
  });

  return (
    <div className="flex flex-col gap-16">
      <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
            仮想通貨のある<span className="border-accent border-b-4">日常</span>を。
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            取引所口座をつないで、いつもの暮らしの中で少しずつ実績を積み重ねる。資金は預からず、参加は無料。気負わず続けられる、仮想通貨のコミュニティです。
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/contests"
              className="rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              大会に参加する
            </Link>
            <Link
              href="/exchanges"
              className="rounded-none border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              取引所を連携する
            </Link>
            <Link
              href="/concept"
              className="px-4 py-2 text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              コンセプトを詳しく見る
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroIllustration />
        </div>
      </section>

      <section className="grid gap-8 border-t border-zinc-200 pt-8 sm:grid-cols-3 dark:border-zinc-800">
        <div className="flex flex-col gap-2">
          <IconShield className="h-9 w-9" />
          <p className="font-medium">資金は預からない</p>
          <p className="text-sm text-zinc-500">
            取引所口座は読み取り専用で連携します。運営が資金を動かすことは一切ありません。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <IconScale className="h-9 w-9" />
          <p className="font-medium">公正な判定</p>
          <p className="text-sm text-zinc-500">
            時価総額上位銘柄のみを算定対象にし、ウォッシュトレードなどの不正を防止します。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <IconTrend className="h-9 w-9" />
          <p className="font-medium">実績がすべて</p>
          <p className="text-sm text-zinc-500">
            肩書きも資産規模も関係なく、損益率という結果だけで日々の積み重ねを評価します。
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">直近の大会</h2>
        {contests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
            <IconEmptyTray className="h-10 w-10 text-zinc-400" />
            <p className="text-sm text-zinc-500">まだ大会がありません。</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {contests.map((contest) => (
              <li key={contest.id}>
                <Link
                  href={`/contests/${contest.id}`}
                  className="flex items-center justify-between rounded-none border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <div>
                    <p className="font-medium">{contest.title}</p>
                    <p className="text-xs text-zinc-500">
                      {contest.startAt.toLocaleDateString("ja-JP")} 〜 {contest.endAt.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{contest._count.participants}人参加</span>
                    <ContestStatusBadge status={contest.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
