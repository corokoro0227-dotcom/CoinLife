"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Notification = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  contest: { id: string; title: string };
};

const TYPE_LABELS: Record<string, string> = {
  ENTRY_OPENED: "エントリー開始",
  ENTRY_CLOSING_SOON: "エントリー終了間近",
  CONTEST_STARTED: "大会開始",
  CONTEST_ENDING_SOON: "大会終了間近",
};

export default function NotificationsPage() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
    setLoading(false);
  }, []);

  // Fetching data on mount/status-change is a React-docs-sanctioned effect
  // use case; this project doesn't use a data-fetching library.
  useEffect(() => {
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, load]);

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    await load();
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  };

  if (status === "unauthenticated") {
    return <p className="text-sm text-zinc-500">通知を見るにはウォレットでログインしてください。</p>;
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">通知</h1>
        {unreadCount > 0 && (
          <button onClick={() => void markAllRead()} className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300">
            すべて既読にする
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-zinc-500">通知はまだありません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-none border px-4 py-3 text-sm ${
                n.readAt ? "border-zinc-200 dark:border-zinc-800" : "border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/60"
              }`}
            >
              <div>
                <span className="text-[11px] text-zinc-400">{TYPE_LABELS[n.type] ?? n.type}</span>
                <p>{n.message}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                  <Link href={`/contests/${n.contest.id}`} className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
                    大会を見る
                  </Link>
                  <span>{new Date(n.createdAt).toLocaleString("ja-JP")}</span>
                </div>
              </div>
              {!n.readAt && (
                <button onClick={() => void markRead(n.id)} className="shrink-0 text-[11px] text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300">
                  既読
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
