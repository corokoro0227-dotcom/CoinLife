const LABELS: Record<string, string> = { UPCOMING: "エントリー受付中", ACTIVE: "開催中", ENDED: "終了" };
const COLORS: Record<string, string> = {
  ACTIVE: "bg-accent text-accent-foreground",
  UPCOMING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ENDED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function ContestStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-none px-2 py-0.5 font-medium ${COLORS[status] ?? COLORS.ENDED}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
