import { prisma } from "@/lib/prisma";
import { computeContestStatus, computeEndAt, computeStartAt } from "@/lib/contestSchedule";

/**
 * Keeps every auto-renewing contest chain unbroken: for each chain whose
 * latest round has already ended, creates the next round(s) back-to-back
 * (entryOpensAt = predecessor.endAt) until the chain reaches into the
 * future. Looping lets this self-heal even if the cron didn't run for a
 * while and several rounds' worth of time has passed.
 */
export async function rotateContestSeries(now = new Date()): Promise<{ created: number }> {
  const chainTails = await prisma.contest.findMany({
    where: { autoRenew: true, nextContest: null },
  });

  let created = 0;
  for (const tail of chainTails) {
    let predecessor = tail;
    while (predecessor.endAt <= now) {
      const entryOpensAt = predecessor.endAt;
      const startAt = computeStartAt(entryOpensAt);
      const endAt = computeEndAt(startAt);

      predecessor = await prisma.contest.create({
        data: {
          title: `第${predecessor.roundNumber + 1}回大会`,
          description: predecessor.description,
          entryOpensAt,
          startAt,
          endAt,
          status: computeContestStatus({ startAt, endAt }, now),
          createdById: predecessor.createdById,
          prizeNote: predecessor.prizeNote,
          reviewHours: predecessor.reviewHours,
          autoRenew: true,
          roundNumber: predecessor.roundNumber + 1,
          previousContestId: predecessor.id,
        },
      });
      created += 1;
    }
  }

  return { created };
}
