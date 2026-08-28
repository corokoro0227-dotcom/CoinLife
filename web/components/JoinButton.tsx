"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type EntryPhase = "BEFORE_ENTRY" | "ENTRY_OPEN" | "CLOSED";

export function JoinButton({
  contestId,
  alreadyJoined,
  entryPhase,
}: {
  contestId: string;
  alreadyJoined: boolean;
  entryPhase: EntryPhase;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyJoined) {
    return (
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="bg-accent text-accent-foreground px-2 py-0.5 text-xs font-medium">参加済み</span>
        <a href="#lock" className="text-[11px] text-zinc-400 hover:underline">
          コミットロックも試してみる ↓
        </a>
      </div>
    );
  }
  if (entryPhase === "BEFORE_ENTRY") {
    return <p className="text-xs text-zinc-500">エントリー期間はまだ開始していません</p>;
  }
  if (entryPhase === "CLOSED") {
    return <p className="text-xs text-zinc-500">エントリー期間は終了しました</p>;
  }
  if (status !== "authenticated") {
    return <p className="text-xs text-zinc-500">参加するにはログインしてください</p>;
  }

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contests/${contestId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "参加に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => void handleJoin()}
        disabled={busy}
        className="rounded-none bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {busy ? "参加中…" : "この大会に参加"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
