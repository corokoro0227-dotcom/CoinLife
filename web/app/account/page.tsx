import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTotalLockedLamports, getUserLockStreak } from "@/lib/lockStats";
import { lamportsToSol } from "@/lib/solanaFormat";
import { EmailSettingsForm } from "@/components/EmailSettingsForm";
import { LockTierBadge } from "@/components/LockTierBadge";

export const metadata: Metadata = {
  title: "アカウント設定 | CoinLife",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ emailVerified?: string; emailError?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return <p className="text-sm text-zinc-500">アカウント設定を見るにはウォレットでログインしてください。</p>;
  }

  const { emailVerified, emailError } = await searchParams;

  const [user, totalLockedLamports, lockStreak] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getUserTotalLockedLamports(userId),
    getUserLockStreak(userId),
  ]);
  const totalLockedSol = lamportsToSol(totalLockedLamports);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">アカウント設定</h1>

      {emailVerified && (
        <p className="rounded-none bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          メールアドレスの確認が完了しました。
        </p>
      )}
      {emailError && (
        <p className="rounded-none bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          確認リンクが無効か期限切れです。もう一度メールアドレスを登録し直してください。
        </p>
      )}

      <section className="flex flex-col gap-2 rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="font-medium">このアカウントについて</p>
        <p className="font-mono text-xs text-zinc-500">{user.walletAddress}</p>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <LockTierBadge totalLockedSol={totalLockedSol} />
          <span className="text-xs text-zinc-500">累計ロック額 {totalLockedSol.toFixed(3)} SOL</span>
          {lockStreak > 0 && <span className="text-xs text-zinc-500">連続{lockStreak}回</span>}
        </div>
        <p className="text-xs text-zinc-400">
          称号・連続記録はこのウォレットアカウントに紐づいています。メールアドレスを追加・変更してもリセットされません。
        </p>
      </section>

      <EmailSettingsForm currentEmail={user.email} verified={Boolean(user.emailVerifiedAt)} />
    </div>
  );
}
