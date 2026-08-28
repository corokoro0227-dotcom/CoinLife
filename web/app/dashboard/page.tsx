import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return <p className="text-sm text-zinc-500">ダッシュボードを見るにはウォレットでログインしてください。</p>;
  }

  const [connections, participations] = await Promise.all([
    prisma.exchangeConnection.findMany({
      where: { userId },
      include: { balanceSnapshots: { orderBy: { takenAt: "desc" }, take: 1 } },
    }),
    prisma.contestParticipant.findMany({
      where: { userId },
      include: { contest: true },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const totalEquityUsd = connections.reduce((sum, c) => sum + (c.balanceSnapshots[0]?.equityUsd ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">ダッシュボード</h1>

      <section className="rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">合算残高(接続済み取引所の直近スナップショット合計)</p>
        <p className="mt-1 text-3xl font-semibold">${totalEquityUsd.toFixed(2)}</p>
        <Link href="/exchanges" className="mt-2 inline-block text-xs underline hover:text-zinc-500 dark:hover:text-zinc-400">
          取引所を管理する →
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">参加中の大会</h2>
        {participations.length === 0 ? (
          <p className="text-sm text-zinc-500">
            まだ大会に参加していません。
            <Link href="/contests" className="ml-1 underline hover:text-zinc-500 dark:hover:text-zinc-400">
              大会を探す →
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {participations.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/contests/${p.contestId}`}
                  className="flex items-center justify-between rounded-none border border-zinc-200 px-4 py-3 hover:border-zinc-900 dark:hover:border-zinc-400 dark:border-zinc-800"
                >
                  <span>{p.contest.title}</span>
                  <span className="text-xs text-zinc-500">開始時残高 ${p.startEquityUsd.toFixed(2)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
