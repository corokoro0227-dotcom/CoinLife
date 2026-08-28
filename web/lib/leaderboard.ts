import { prisma } from "@/lib/prisma";

/**
 * A user's current equity is the sum of the most recent balance snapshot
 * from each of their connected exchange accounts.
 */
export async function getUserCurrentEquityUsd(userId: string): Promise<number> {
  const connections = await prisma.exchangeConnection.findMany({
    where: { userId },
    select: {
      balanceSnapshots: { orderBy: { takenAt: "desc" }, take: 1, select: { equityUsd: true } },
    },
  });

  return connections.reduce((sum, connection) => sum + (connection.balanceSnapshots[0]?.equityUsd ?? 0), 0);
}

export type LeaderboardEntry = {
  userId: string;
  displayName: string | null;
  walletAddress: string;
  startEquityUsd: number;
  currentEquityUsd: number;
  pnlPercent: number | null;
};

export async function getContestLeaderboard(contestId: string): Promise<LeaderboardEntry[]> {
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    include: { user: true },
  });

  const entries = await Promise.all(
    participants.map(async (participant): Promise<LeaderboardEntry> => {
      const currentEquityUsd = await getUserCurrentEquityUsd(participant.userId);
      const pnlPercent =
        participant.startEquityUsd > 0
          ? ((currentEquityUsd - participant.startEquityUsd) / participant.startEquityUsd) * 100
          : null;

      return {
        userId: participant.userId,
        displayName: participant.user.displayName,
        walletAddress: participant.user.walletAddress,
        startEquityUsd: participant.startEquityUsd,
        currentEquityUsd,
        pnlPercent,
      };
    }),
  );

  return entries.sort((a, b) => (b.pnlPercent ?? -Infinity) - (a.pnlPercent ?? -Infinity));
}
