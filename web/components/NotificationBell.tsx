"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function NotificationBell() {
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setUnreadCount(data.unreadCount);
    }
  }, []);

  // Fetching data on mount/status-change is a React-docs-sanctioned effect
  // use case; this project doesn't use a data-fetching library.
  useEffect(() => {
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [status, load]);

  if (status !== "authenticated") return null;

  return (
    <Link href="/notifications" className="relative text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
      通知
      {unreadCount > 0 && (
        <span className="ml-1 rounded-none bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">{unreadCount}</span>
      )}
    </Link>
  );
}
