"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRenewToggle({ contestId, autoRenew }: { contestId: string; autoRenew: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/contests/${contestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: !autoRenew }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={() => void handleToggle()}
      disabled={busy}
      className="text-xs text-zinc-500 underline decoration-dotted hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300"
    >
      {autoRenew ? "自動継続を停止する" : "自動継続を再開する"}
    </button>
  );
}
