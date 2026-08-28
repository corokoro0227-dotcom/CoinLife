import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex items-center justify-center gap-4 border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      <Link href="/concept" className="hover:underline">
        コンセプト
      </Link>
      <Link href="/columns" className="hover:underline">
        コラム
      </Link>
      <Link href="/terms" className="hover:underline">
        利用規約
      </Link>
      <Link href="/transparency" className="hover:underline">
        透明性レポート
      </Link>
    </footer>
  );
}
