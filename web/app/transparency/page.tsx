import type { Metadata } from "next";
import { getTreasuryStats } from "@/lib/lockStats";
import { lamportsToSol } from "@/lib/solanaFormat";
import { explorerAddressUrl } from "@/lib/solanaExplorer";
import { FEE_TIERS } from "@/lib/lockFeeTiers";

export const metadata: Metadata = {
  title: "透明性レポート | CoinLife",
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-none border border-zinc-200 p-5 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

export default async function TransparencyPage() {
  const stats = await getTreasuryStats();
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_PUBKEY;
  const explorerAccountUrl = treasuryAddress ? explorerAddressUrl(treasuryAddress) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold">透明性レポート</h1>
        <p className="mt-2 text-sm text-zinc-500">
          コミットロック機能の手数料は、すべてこのページと同じ数字がSolana上でも確認できます。運営が集計を操作することはできません。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="これまでにロックされた総額" value={`${lamportsToSol(stats.totalEverLockedLamports).toFixed(4)} SOL`} />
        <StatCard
          label="現在ロック中の総額"
          value={`${lamportsToSol(stats.currentlyLockedLamports).toFixed(4)} SOL`}
          hint="解除されるとユーザーへ返却されます"
        />
        <StatCard
          label="運営が受け取った手数料の累計"
          value={`${lamportsToSol(stats.totalFeesCollectedLamports).toFixed(4)} SOL`}
          hint="ロック額のみで決まる固定料率。誰にも裁量はありません"
        />
        <StatCard label="ロック利用者数(累計・実人数)" value={`${stats.uniqueLockers}人`} />
      </div>

      <div className="flex flex-col gap-2 rounded-none border border-zinc-200 p-5 text-xs text-zinc-500 dark:border-zinc-800">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">手数料率(ロック額のみで決定・裁量なし)</p>
        <ul className="flex flex-col gap-1">
          {FEE_TIERS.map((tier) => (
            <li key={tier.label} className="flex justify-between">
              <span>{tier.label}</span>
              <span className="font-mono">{tier.percent}</span>
            </li>
          ))}
        </ul>
      </div>

      {treasuryAddress && (
        <div className="flex flex-col gap-2 rounded-none border border-dashed border-zinc-300 p-5 text-xs text-zinc-500 dark:border-zinc-700">
          <p>手数料の送金先(treasury)アドレス:</p>
          <code className="break-all rounded bg-zinc-100 px-2 py-1 font-mono dark:bg-zinc-900">{treasuryAddress}</code>
          {explorerAccountUrl && (
            <a href={explorerAccountUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-500 dark:hover:text-zinc-400">
              Solana Explorerで実際の残高・取引履歴を確認する ↗
            </a>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-400">
        コミットロックは大会参加や賞金とは無関係の、完全に任意の機能です。ロックした資産は常にあなた自身のウォレット署名でのみ制御され、解除時にロック額のみで決まる手数料が上記アドレスへ送られる以外の資金移動は一切ありません。
      </p>
    </div>
  );
}
