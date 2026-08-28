"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function EmailSettingsForm({
  currentEmail,
  verified,
}: {
  currentEmail: string | null;
  verified: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(currentEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      setMessage("確認メールを送信しました。メール内のリンクをクリックして確認を完了してください。");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await fetch("/api/account/email", { method: "DELETE" });
      setEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <p className="font-medium">通知用メールアドレス</p>
        <p className="mt-1 text-xs text-zinc-500">
          大会のエントリー開始・終了間近などの通知をメールでも受け取れます。ログイン方法はこれまで通りウォレットのままです。
        </p>
      </div>

      {currentEmail && (
        <p className="text-sm">
          {currentEmail}{" "}
          {verified ? (
            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 text-xs font-medium">確認済み</span>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400">確認待ち</span>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {busy ? "処理中…" : currentEmail ? "変更する" : "登録する"}
        </button>
      </form>

      {currentEmail && (
        <button onClick={() => void handleRemove()} disabled={busy} className="w-fit text-xs text-red-500 hover:underline disabled:opacity-50">
          メール通知を解除する
        </button>
      )}

      {message && <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{message}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
