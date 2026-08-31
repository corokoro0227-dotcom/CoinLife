import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ミームコイン情報ボード",
  description: "世界のミームコイン関連ニュースと市場データを情報源のまま集約するボード。分析・予想・売買推奨は行いません。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-1.5 font-semibold tracking-tight">
              <span className="h-2.5 w-2.5 bg-amber-400" aria-hidden="true" />
              ミームコイン情報ボード
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                ボード
              </Link>
              <Link href="/sources" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                情報源について
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-zinc-400">
          本サイトは複数の公開情報源を機械的に集約して並べるだけのサイトです。当サイト自身による分析・予想・売買推奨は一切行いません。掲載情報の正確性は各出典元に依存します。投資判断は必ずご自身の責任で行ってください。
        </footer>
      </body>
    </html>
  );
}
