// Purely cosmetic status tiers based on a user's all-time cumulative locked
// volume. These carry no financial value, no fee discount, and no bearing on
// contest/prize eligibility — tying them to money would recreate the
// pay-to-win structure this app deliberately avoids. They're a badge, not a
// benefit.

export type LockTier = { name: string; minSol: number };

export const LOCK_TIERS: LockTier[] = [
  { name: "Platinum", minSol: 20 },
  { name: "Gold", minSol: 5 },
  { name: "Silver", minSol: 1 },
  { name: "Bronze", minSol: 0.1 },
];

export function getLockTier(totalLockedSol: number): LockTier | null {
  return LOCK_TIERS.find((tier) => totalLockedSol >= tier.minSol) ?? null;
}

export function getNextLockTier(totalLockedSol: number): LockTier | null {
  const remaining = [...LOCK_TIERS].reverse().find((tier) => totalLockedSol < tier.minSol);
  return remaining ?? null;
}
