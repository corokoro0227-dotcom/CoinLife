import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DeleteColumnButton } from "@/components/DeleteColumnButton";

export default async function ColumnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const column = await prisma.column.findUnique({
    where: { id },
    include: { author: { select: { id: true, displayName: true, walletAddress: true } } },
  });
  if (!column) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isAuthor = userId === column.authorId;

  const isMemeCoin = column.category === "MEME_COIN";
  const listHref = isMemeCoin ? "/meme-coins" : "/columns";
  const listLabel = isMemeCoin ? "ミームコイン掲示板に戻る" : "コラム一覧に戻る";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-16">
      <div>
        {column.isAutomated && (
          <span className="rounded-none bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-900">自動投稿</span>
        )}
        <h1 className="mt-2 text-2xl font-semibold">{column.title}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {column.author.displayName ?? `${column.author.walletAddress.slice(0, 4)}…${column.author.walletAddress.slice(-4)}`}
          {" ・ "}
          {column.createdAt.toLocaleDateString("ja-JP")}
        </p>
      </div>

      <blockquote className="border-l-2 border-zinc-300 pl-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {column.quote}
      </blockquote>
      <a
        href={column.sourceUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        引用元: {column.sourceName} ↗
      </a>

      {column.commentary && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{column.commentary}</p>
      )}

      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Link href={listHref} className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300">
          {listLabel}
        </Link>
        {isAuthor && <DeleteColumnButton columnId={column.id} />}
      </div>
    </div>
  );
}
