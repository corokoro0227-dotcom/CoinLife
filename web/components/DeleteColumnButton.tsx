"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteColumnButton({ columnId }: { columnId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("このコラムを削除しますか?")) return;
    setBusy(true);
    try {
      await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
      router.push("/columns");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={() => void handleDelete()} disabled={busy} className="text-xs text-red-500 hover:underline disabled:opacity-50">
      削除
    </button>
  );
}
