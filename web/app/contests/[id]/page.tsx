import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getContestLeaderboard } from "@/lib/leaderboard";
import { getReviewEndsAt } from "@/lib/prizeReview";
import { getActiveLockUserIds } from "@/lib/lockStats";
import { JoinButton } from "@/components/JoinButton";
import { LockPanel } from "@/components/LockPanel";
import { PrizeManager } from "@/components/PrizeManager";
import { AutoRenewToggle } from "@/components/AutoRenewToggle";

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      createdBy: { select: { displayName: true, walletAddress: true } },
      prizePayouts: { include: { user: { select: { displayName: true, walletAddress: true } } }, orderBy: { rank: "asc" } },
    },
  });
  if (!contest) notFound();

  const [leaderboard, session, activeLockUserIds] = await Promise.all([
    getContestLeaderboard(id),
    auth(),
    getActiveLockUserIds(id),
  ]);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const alreadyJoined = userId ? leaderboard.some((entry) => entry.userId === userId) : false;
  const isCreator = userId === contest.createdById;
  const now = new Date();
  const contestEnded = now >= contest.endAt;
  const reviewEndsAt = getReviewEndsAt(contest);
  const entryPhase = now < contest.entryOpensAt ? "BEFORE_ENTRY" : now < contest.startAt ? "ENTRY_OPEN" : "CLOSED";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-900">
              第{contest.roundNumber}回
            </span>
            {contest.autoRenew && (
              <span className="rounded-none bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                常時開催シリーズ
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{contest.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 whitespace-pre-wrap">{contest.description}</p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-500">
            <p>
              エントリー期間: {contest.entryOpensAt.toLocaleString("ja-JP")} 〜 {contest.startAt.toLocaleString("ja-JP")}
            </p>
            <p>
              大会期間: {contest.startAt.toLocaleString("ja-JP")} 〜 {contest.endAt.toLocaleString("ja-JP")}
            </p>
          </div>
          {contest.prizeNote && (
            <p className="mt-2 whitespace-pre-wrap rounded-none bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              賞金: {contest.prizeNote}
            </p>
          )}
          {isCreator && (
            <div className="mt-2">
              <AutoRenewToggle contestId={contest.id} autoRenew={contest.autoRenew} />
            </div>
          )}
        </div>
        <JoinButton contestId={contest.id} alreadyJoined={alreadyJoined} entryPhase={entryPhase} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">リーダーボード(損益率順)</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-zinc-500">まだ参加者がいません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="py-2">順位</th>
                <th className="py-2">ユーザー</th>
                <th className="py-2 text-right">損益率</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.userId} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 font-mono">{index + 1}</td>
                  <td className="py-2">
                    {entry.displayName ?? `${entry.walletAddress.slice(0, 4)}…${entry.walletAddress.slice(-4)}`}
                    {activeLockUserIds.has(entry.userId) && (
                      <span title="コミットロック中" className="ml-1.5 text-[10px] text-zinc-400">
                        (ロック中)
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-2 text-right font-mono ${
                      entry.pnlPercent === null
                        ? "text-zinc-400"
                        : entry.pnlPercent >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500"
                    }`}
                  >
                    {entry.pnlPercent === null ? "—" : `${entry.pnlPercent >= 0 ? "+" : ""}${entry.pnlPercent.toFixed(2)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <PrizeManager
        contestId={contest.id}
        isCreator={isCreator}
        participants={leaderboard.map((entry) => ({
          userId: entry.userId,
          displayName: entry.displayName,
          walletAddress: entry.walletAddress,
        }))}
        payouts={contest.prizePayouts}
        contestEnded={contestEnded}
        reviewEndsAt={reviewEndsAt.toISOString()}
      />

      <div id="lock" className="scroll-mt-20">
        <LockPanel contestId={contest.id} />
      </div>
    </div>
  );
}
