import Link from "next/link";
import { SiwsLogin } from "@/components/SiwsLogin";
import { NotificationBell } from "@/components/NotificationBell";

export function NavBar() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-1.5 font-semibold tracking-tight">
            <span className="bg-accent h-2.5 w-2.5" aria-hidden="true" />
            CoinLife
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/contests" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              大会一覧
            </Link>
            <Link href="/columns" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              コラム
            </Link>
            <Link href="/exchanges" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              取引所連携
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              ダッシュボード
            </Link>
            <Link href="/account" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              アカウント
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <SiwsLogin />
        </div>
      </div>
    </header>
  );
}
