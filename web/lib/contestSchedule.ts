// Fixed cadence for the always-on contest cycle: a 3-day entry period is
// immediately followed by a 7-day scoring period, and the moment one round
// ends the next round's entry period begins — no gaps, no manual scheduling.

export const ENTRY_PERIOD_DAYS = 3;
export const CONTEST_PERIOD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeStartAt(entryOpensAt: Date): Date {
  return new Date(entryOpensAt.getTime() + ENTRY_PERIOD_DAYS * DAY_MS);
}

export function computeEndAt(startAt: Date): Date {
  return new Date(startAt.getTime() + CONTEST_PERIOD_DAYS * DAY_MS);
}

export function computeContestStatus(contest: { startAt: Date; endAt: Date }, now = new Date()): "UPCOMING" | "ACTIVE" | "ENDED" {
  if (now < contest.startAt) return "UPCOMING";
  if (now < contest.endAt) return "ACTIVE";
  return "ENDED";
}

export function isEntryOpen(contest: { entryOpensAt: Date; startAt: Date }, now = new Date()): boolean {
  return now >= contest.entryOpensAt && now < contest.startAt;
}
