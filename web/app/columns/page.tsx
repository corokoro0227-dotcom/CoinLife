import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IconEmptyTray } from "@/components/icons";

export const metadata: Metadata = {
  title: "コラム | CoinLife",
};

export default async function ColumnsPage() {
  const columns = await prisma.column.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { displayName: true, walletAddress: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">コラム</h1>
          <p className="mt-1 text-sm text-zinc-500">
            毎日21時、その日話題になった仮想通貨ニュースを自動で紹介します。あなた自身のコラムを書くこともできます。
          </p>
        </div>
        <Link
          href="/columns/new"
          className="rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          コラムを書く
        </Link>
      </div>

      {columns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <IconEmptyTray className="h-10 w-10 text-zinc-400" />
          <p className="text-sm text-zinc-500">まだコラムがありません。</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {columns.map((column) => (
            <li key={column.id}>
              <Link
                href={`/columns/${column.id}`}
                className="flex flex-col gap-1 rounded-none border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{column.title}</p>
                  {column.isAutomated && (
                    <span className="rounded-none bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-900">自動投稿</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  引用元: {column.sourceName} ・ {column.createdAt.toLocaleDateString("ja-JP")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
