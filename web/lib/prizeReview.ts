// Prizes can be marked as actually sent only after a cheating/wash-trading
// review window has passed since the contest ended. Shared by the API
// routes (server-side enforcement) and the UI (countdown display).

export function getReviewEndsAt(contest: { endAt: Date; reviewHours: number }): Date {
  return new Date(contest.endAt.getTime() + contest.reviewHours * 60 * 60 * 1000);
}

export function isReviewComplete(contest: { endAt: Date; reviewHours: number }, now = new Date()): boolean {
  return now >= getReviewEndsAt(contest);
}
