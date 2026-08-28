import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUserCurrentEquityUsd } from "@/lib/leaderboard";
import { getUserTotalLockedLamports, getUserLockStreak } from "@/lib/lockStats";
import { lamportsToSol } from "@/lib/solanaFormat";
import { LockTierBadge } from "@/components/LockTierBadge";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { participations: { include: { contest: true }, orderBy: { joinedAt: "desc" } } },
  });
  if (!user) notFound();

  const [currentEquityUsd, totalLockedLamports, lockStreak] = await Promise.all([
    getUserCurrentEquityUsd(user.id),
    getUserTotalLockedLamports(user.id),
    getUserLockStreak(user.id),
  ]);
  const totalLockedSol = lamportsToSol(totalLockedLamports);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{user.displayName ?? "名無しのトレーダー"}</h1>
          <LockTierBadge totalLockedSol={totalLockedSol} />
        </div>
        <p className="font-mono text-xs text-zinc-500">{user.walletAddress}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">合算残高</p>
          <p className="text-2xl font-semibold">${currentEquityUsd.toFixed(2)}</p>
        </section>
        <section className="rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">累計ロック額</p>
          <p className="text-2xl font-semibold">{totalLockedSol.toFixed(3)} SOL</p>
        </section>
        <section className="rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">連続ロック記録</p>
          <p className="text-2xl font-semibold">{lockStreak > 0 ? `${lockStreak}回` : "—"}</p>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">参加した大会</h2>
        {user.participations.length === 0 ? (
          <p className="text-sm text-zinc-500">まだ大会に参加していません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.participations.map((p) => {
              const pnl =
                p.startEquityUsd > 0 ? ((currentEquityUsd - p.startEquityUsd) / p.startEquityUsd) * 100 : null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/contests/${p.contestId}`}
                    className="flex items-center justify-between rounded-none border border-zinc-200 px-4 py-3 hover:border-zinc-900 dark:hover:border-zinc-400 dark:border-zinc-800"
                  >
                    <span>{p.contest.title}</span>
                    <span className={pnl !== null && pnl >= 0 ? "text-emerald-600" : "text-red-500"}>
                      {pnl === null ? "—" : `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
