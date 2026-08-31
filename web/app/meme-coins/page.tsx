import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IconEmptyTray } from "@/components/icons";

export const metadata: Metadata = {
  title: "ミームコイン掲示板 | CoinLife",
};

export default async function MemeCoinsPage() {
  const posts = await prisma.column.findMany({
    where: { category: "MEME_COIN" },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { displayName: true, walletAddress: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ミームコイン掲示板</h1>
          <p className="mt-1 text-sm text-zinc-500">
            世界のミームコインの今日のトレンドと今後の予想を集める掲示板です。毎日21時、時価総額上位ミームコインの値動きを自動で紹介します。あなた自身の情報や見解を投稿することもできます。
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            掲載情報は特定銘柄の売買を推奨・保証するものではなく、投資助言にも該当しません。投資判断はご自身の責任で行ってください。
          </p>
        </div>
        <Link
          href="/meme-coins/new"
          className="shrink-0 rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          投稿する
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <IconEmptyTray className="h-10 w-10 text-zinc-400" />
          <p className="text-sm text-zinc-500">まだ投稿がありません。</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/columns/${post.id}`}
                className="flex flex-col gap-1 rounded-none border border-zinc-200 px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{post.title}</p>
                  {post.isAutomated && (
                    <span className="rounded-none bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-900">自動投稿</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  引用元: {post.sourceName} ・ {post.createdAt.toLocaleDateString("ja-JP")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
