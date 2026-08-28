"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { explorerTxUrl } from "@/lib/solanaExplorer";

type Participant = { userId: string; displayName: string | null; walletAddress: string };

type Payout = {
  id: string;
  userId: string;
  rank: number | null;
  amountSol: number;
  status: "PLANNED" | "SENT";
  txSignature: string | null;
  note: string | null;
  user: { displayName: string | null; walletAddress: string };
};

function label(p: { displayName: string | null; walletAddress: string }) {
  return p.displayName ?? `${p.walletAddress.slice(0, 4)}…${p.walletAddress.slice(-4)}`;
}

export function PrizeManager({
  contestId,
  isCreator,
  participants,
  payouts,
  contestEnded,
  reviewEndsAt,
}: {
  contestId: string;
  isCreator: boolean;
  participants: Participant[];
  payouts: Payout[];
  contestEnded: boolean;
  reviewEndsAt: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ winnerUserId: participants[0]?.userId ?? "", amountSol: "0.1", rank: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date.now() is impure, so the current-time comparison is deferred to an
  // effect rather than computed directly during render.
  const [reviewComplete, setReviewComplete] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading wall-clock time is inherently impure and can't happen during render
    setReviewComplete(Date.now() >= new Date(reviewEndsAt).getTime());
  }, [reviewEndsAt]);
  const reviewEndsAtLabel = new Date(reviewEndsAt).toLocaleString("ja-JP");

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contests/${contestId}/prizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerUserId: form.winnerUserId,
          amountSol: parseFloat(form.amountSol),
          rank: form.rank ? parseInt(form.rank, 10) : undefined,
          note: form.note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      setForm({ ...form, amountSol: "0.1", rank: "", note: "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSent = async (payoutId: string) => {
    const txSignature = window.prompt("送金したトランザクションの署名(tx signature)を貼り付けてください");
    if (!txSignature) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contests/${contestId}/prizes/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (payoutId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/contests/${contestId}/prizes/${payoutId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (payouts.length === 0 && !isCreator) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-500">賞金(運営個人からの進呈・参加費とは無関係)</h2>
      <p className="text-xs text-zinc-500">
        不正がないかを確認するための審査期間があります。
        {reviewComplete ? " 審査は完了しており、送金済みへの変更が可能です。" : ` 送金済みへの変更は ${reviewEndsAtLabel} 以降に可能になります。`}
      </p>

      {payouts.length === 0 ? (
        <p className="text-sm text-zinc-500">まだ登録されていません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payouts.map((payout) => (
            <li
              key={payout.id}
              className="flex items-center justify-between rounded-none border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
            >
              <div>
                <p>
                  {payout.rank ? `${payout.rank}位 ` : ""}
                  {label(payout.user)} — <span className="font-mono">{payout.amountSol} SOL</span>
                </p>
                {payout.note && <p className="text-xs text-zinc-500">{payout.note}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {payout.status === "SENT" && payout.txSignature ? (
                  <a
                    href={explorerTxUrl(payout.txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-zinc-500 dark:hover:text-zinc-400"
                  >
                    送金済み ↗
                  </a>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">送金予定</span>
                )}
                {isCreator && payout.status === "PLANNED" && (
                  <>
                    <button
                      onClick={() => void handleMarkSent(payout.id)}
                      disabled={busy || !reviewComplete}
                      title={reviewComplete ? undefined : `審査期間中のため ${reviewEndsAtLabel} まで送金済みにできません`}
                      className="text-zinc-500 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
                    >
                      送金済みにする
                    </button>
                    <button onClick={() => void handleDelete(payout.id)} disabled={busy} className="text-red-500 hover:underline">
                      削除
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreator && !contestEnded && (
        <p className="text-xs text-zinc-400">大会終了後に賞金を登録できます。</p>
      )}

      {isCreator && contestEnded && participants.length > 0 && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-none border border-dashed border-zinc-300 p-3 text-xs dark:border-zinc-700">
          <label className="flex flex-col gap-1">
            受賞者
            <select
              value={form.winnerUserId}
              onChange={(e) => setForm({ ...form, winnerUserId: e.target.value })}
              className="rounded-none border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {participants.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            順位(任意)
            <input
              type="number"
              min="1"
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
              className="w-16 rounded-none border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            金額(SOL)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amountSol}
              onChange={(e) => setForm({ ...form, amountSol: e.target.value })}
              className="w-24 rounded-none border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            メモ(任意)
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="rounded-none border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-none bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            賞金を登録
          </button>
          {error && <p className="w-full text-red-500">{error}</p>}
        </form>
      )}
    </section>
  );
}
