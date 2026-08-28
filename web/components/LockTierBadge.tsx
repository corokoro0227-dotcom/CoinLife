import { getLockTier } from "@/lib/lockTiers";

export function LockTierBadge({ totalLockedSol }: { totalLockedSol: number }) {
  const tier = getLockTier(totalLockedSol);
  if (!tier) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-none bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {tier.name}
    </span>
  );
}
