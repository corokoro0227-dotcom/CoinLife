import { prisma } from "@/lib/prisma";

export async function getUserTotalLockedLamports(userId: string): Promise<bigint> {
  const records = await prisma.lockRecord.findMany({ where: { userId }, select: { amountLamports: true } });
  return records.reduce((sum, r) => sum + r.amountLamports, 0n);
}

/** userIds with a currently-active (not yet unlocked) lock tied to this contest round. */
export async function getActiveLockUserIds(contestId: string): Promise<Set<string>> {
  const records = await prisma.lockRecord.findMany({
    where: { contestId, unlockedAt: null },
    select: { userId: true },
  });
  return new Set(records.map((r) => r.userId));
}

/**
 * Consecutive rounds (walking backward through the contest chain) in which
 * the user locked something, starting from the given round.
 */
async function countStreakFrom(userId: string, contestId: string): Promise<number> {
  let streak = 0;
  let currentId: string | null = contestId;

  while (currentId) {
    const lock = await prisma.lockRecord.findFirst({ where: { userId, contestId: currentId } });
    if (!lock) break;

    const contest: { previousContestId: string | null } | null = await prisma.contest.findUnique({
      where: { id: currentId },
      select: { previousContestId: true },
    });
    streak += 1;
    currentId = contest?.previousContestId ?? null;
  }

  return streak;
}

/** The user's current lock streak, anchored on their most recent lock. */
export async function getUserLockStreak(userId: string): Promise<number> {
  const latestLock = await prisma.lockRecord.findFirst({
    where: { userId, contestId: { not: null } },
    orderBy: { lockedAt: "desc" },
  });
  if (!latestLock?.contestId) return 0;
  return countStreakFrom(userId, latestLock.contestId);
}

export type TreasuryStats = {
  totalEverLockedLamports: bigint;
  currentlyLockedLamports: bigint;
  totalFeesCollectedLamports: bigint;
  uniqueLockers: number;
};

export async function getTreasuryStats(): Promise<TreasuryStats> {
  const [everLocked, currentlyLocked, feesCollected, lockers] = await Promise.all([
    prisma.lockRecord.aggregate({ _sum: { amountLamports: true } }),
    prisma.lockRecord.aggregate({ _sum: { amountLamports: true }, where: { unlockedAt: null } }),
    prisma.lockRecord.aggregate({ _sum: { feeLamports: true }, where: { unlockedAt: { not: null } } }),
    prisma.lockRecord.findMany({ distinct: ["userId"], select: { userId: true } }),
  ]);

  return {
    totalEverLockedLamports: everLocked._sum.amountLamports ?? 0n,
    currentlyLockedLamports: currentlyLocked._sum.amountLamports ?? 0n,
    totalFeesCollectedLamports: feesCollected._sum.feeLamports ?? 0n,
    uniqueLockers: lockers.length,
  };
}
