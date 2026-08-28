import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContestStatusBadge } from "@/components/ContestStatusBadge";

export default async function ContestsPage() {
  const contests = await prisma.contest.findMany({
    orderBy: { startAt: "desc" },
    include: { _count: { select: { participants: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">大会一覧</h1>
        <Link
          href="/contests/new"
          className="rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          大会シリーズを開始
        </Link>
      </div>

      {contests.length === 0 ? (
        <p className="text-sm text-zinc-500">まだ大会がありません。最初の大会シリーズを開始しましょう。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {contests.map((contest) => (
            <li key={contest.id}>
              <Link
                href={`/contests/${contest.id}`}
                className="flex flex-col gap-1 rounded-none border border-zinc-200 px-4 py-3 hover:border-zinc-900 dark:hover:border-zinc-400 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    <span className="mr-2 font-mono text-xs text-zinc-400">第{contest.roundNumber}回</span>
                    {contest.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{contest._count.participants}人参加</span>
                    <ContestStatusBadge status={contest.status} />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  エントリー: {contest.entryOpensAt.toLocaleDateString("ja-JP")} 〜 大会:{" "}
                  {contest.startAt.toLocaleDateString("ja-JP")} 〜 {contest.endAt.toLocaleDateString("ja-JP")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
