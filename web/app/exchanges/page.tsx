"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AFFILIATE_LINKS } from "@/lib/affiliateLinks";

type Connection = {
  id: string;
  exchange: string;
  label: string;
  createdAt: string;
  balanceSnapshots: { equityUsd: number; takenAt: string }[];
};

const EXCHANGES = [
  { value: "BINANCE", label: "Binance" },
  { value: "BYBIT", label: "Bybit" },
  { value: "OKX", label: "OKX" },
];

export default function ExchangesPage() {
  const { status } = useSession();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ exchange: "BINANCE", label: "", apiKey: "", apiSecret: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/exchanges");
    if (res.ok) {
      const data = await res.json();
      setConnections(data.connections);
    }
    setLoading(false);
  }, []);

  // Fetching data on mount/status-change is a React-docs-sanctioned effect
  // use case; this project doesn't use a data-fetching library.
  useEffect(() => {
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      void load();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, load]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "接続に失敗しました");
        return;
      }
      setForm({ exchange: "BINANCE", label: "", apiKey: "", apiSecret: "" });
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/exchanges/${id}`, { method: "DELETE" });
    await load();
  };

  const handleSync = async (id: string) => {
    await fetch(`/api/exchanges/${id}/sync`, { method: "POST" });
    await load();
  };

  if (status === "unauthenticated") {
    return <p className="text-sm text-zinc-500">この機能を使うにはウォレットでログインしてください。</p>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">取引所連携</h1>
        <p className="mt-2 text-sm text-zinc-500">
          必ず<strong className="text-red-500">「読み取り専用(Read-Only)」権限のAPIキー</strong>
          を発行してください。出金権限・取引権限は絶対に付与しないでください。APIシークレットはサーバー側で暗号化して保存されます。
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          ウォッシュトレード対策として、損益の判定にはその日の時価総額上位100銘柄(+主要ステーブルコイン)のみを算入します。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
        <select
          value={form.exchange}
          onChange={(e) => setForm({ ...form, exchange: e.target.value })}
          className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {EXCHANGES.map((ex) => (
            <option key={ex.value} value={ex.value}>
              {ex.label}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="ラベル(例: メイン口座)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          required
          placeholder="API Key"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          required
          type="password"
          placeholder="API Secret"
          value={form.apiSecret}
          onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
          className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-none bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? "接続確認中…" : "接続する"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-500">接続済みアカウント</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">読み込み中…</p>
        ) : connections.length === 0 ? (
          <p className="text-sm text-zinc-500">まだ接続されていません。</p>
        ) : (
          connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between rounded-none border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium">
                  {connection.label} <span className="text-xs text-zinc-500">({connection.exchange})</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {connection.balanceSnapshots[0]
                    ? `$${connection.balanceSnapshots[0].equityUsd.toFixed(2)} · ${new Date(connection.balanceSnapshots[0].takenAt).toLocaleString("ja-JP")}`
                    : "残高未取得"}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => void handleSync(connection.id)} className="underline hover:text-zinc-500 dark:hover:text-zinc-400">
                  同期
                </button>
                <button onClick={() => void handleDelete(connection.id)} className="text-red-500 hover:underline">
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-none border border-dashed border-zinc-300 p-4 text-xs text-zinc-500 dark:border-zinc-700">
        <p>取引所口座をまだお持ちでない場合はこちらから開設できます:</p>
        <div className="flex gap-4">
          {AFFILIATE_LINKS.map((link) => (
            <a
              key={link.exchange}
              href={link.url}
              target="_blank"
              rel="nofollow noopener sponsored"
              className="underline hover:text-zinc-500 dark:hover:text-zinc-400"
            >
              {link.exchange}で口座開設 →
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
