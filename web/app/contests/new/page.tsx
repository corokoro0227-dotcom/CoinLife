"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function NewContestPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    entryOpensAt: "",
    prizeNote: "",
    reviewHours: "24",
    autoRenew: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "unauthenticated") {
    return <p className="text-sm text-zinc-500">大会を作成するにはウォレットでログインしてください。</p>;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "作成に失敗しました");
        return;
      }
      router.push(`/contests/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
      <h1 className="text-2xl font-semibold">大会シリーズを開始</h1>
      <p className="text-xs text-zinc-500">
        エントリー期間3日 → 大会期間1週間の固定サイクルです。大会が終わった瞬間から自動的に次の大会のエントリー期間が始まり、以後は何もしなくても継続します(いつでも大会ページから停止できます)。
      </p>
      <input
        required
        placeholder="タイトル(第1回など、以降の回は自動採番されます)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <textarea
        required
        placeholder="説明・ルール(以降の回にも引き継がれます)"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={4}
        className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <label className="text-xs text-zinc-500">
        エントリー開始日時
        <input
          required
          type="datetime-local"
          value={form.entryOpensAt}
          onChange={(e) => setForm({ ...form, entryOpensAt: e.target.value })}
          className="mt-1 w-full rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="mt-1 block text-[11px] text-zinc-400">
          この日時から3日間がエントリー期間、その後7日間が大会期間になります。
        </span>
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={form.autoRenew}
          onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })}
          className="rounded border-zinc-300 dark:border-zinc-700"
        />
        大会終了後、自動的に次の回を開始する(常時開催)
      </label>
      <label className="text-xs text-zinc-500">
        賞金について(任意)
        <textarea
          placeholder="例: 1位 0.5 SOL / 2位 0.2 SOL(運営より進呈・参加費とは無関係)"
          value={form.prizeNote}
          onChange={(e) => setForm({ ...form, prizeNote: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="mt-1 block text-[11px] text-zinc-400">
          賞金は参加費から出すものではなく、大会主催者が自分の資産から個人的に進呈するものである必要があります。
        </span>
      </label>
      <label className="text-xs text-zinc-500">
        不正調査の審査期間(大会終了から何時間後に送金可能にするか)
        <input
          type="number"
          min="24"
          max="48"
          value={form.reviewHours}
          onChange={(e) => setForm({ ...form, reviewHours: e.target.value })}
          className="mt-1 w-24 rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="ml-2 text-[11px] text-zinc-400">時間(24〜48の範囲)</span>
        <span className="mt-1 block text-[11px] text-zinc-400">
          大会終了後、この時間が経過するまでは賞金を「送金済み」にできません(ウォッシュトレード等の不正調査のための猶予期間)。
        </span>
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-none bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {submitting ? "作成中…" : "大会シリーズを開始"}
      </button>
    </form>
  );
}
