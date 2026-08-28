"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { useSession } from "next-auth/react";
import { buildLockInstruction, buildUnlockInstruction, getVaultPda, getLockVaultProgramId } from "@/lib/lockVaultClient";
import { getLockTier, getNextLockTier } from "@/lib/lockTiers";
import { FEE_TIERS, MIN_LOCK_SOL, computeFeeLamports, feeBpsLabelForAmountSol } from "@/lib/lockFeeTiers";

const PRESET_AMOUNTS_SOL = [0.01, 0.1, 1];

type LockRecord = {
  id: string;
  contestId: string | null;
  vaultPda: string;
  amountLamports: string;
  feeLamports: string | null;
  unlockedAt: string | null;
};

export function LockPanel({ contestId }: { contestId: string }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { status: sessionStatus } = useSession();
  const [amountSol, setAmountSol] = useState("0.1");
  const [records, setRecords] = useState<LockRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = Boolean(process.env.NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID && process.env.NEXT_PUBLIC_TREASURY_PUBKEY);

  const load = useCallback(async () => {
    const res = await fetch("/api/lock");
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records);
    }
  }, []);

  // Fetching data on mount is a React-docs-sanctioned effect use case; this
  // project doesn't use a data-fetching library.
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [sessionStatus, load]);

  const activeLock = records.find((record) => record.contestId === contestId && !record.unlockedAt);
  const totalLockedSol = records.reduce((sum, r) => sum + Number(r.amountLamports), 0) / LAMPORTS_PER_SOL;
  const currentTier = getLockTier(totalLockedSol);
  const nextTier = getNextLockTier(totalLockedSol);

  const handleLock = async () => {
    if (!publicKey) return;
    const parsedAmount = parseFloat(amountSol);
    if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_LOCK_SOL) {
      setError(`ロック額は最小${MIN_LOCK_SOL} SOLからです`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const lamports = BigInt(Math.round(parsedAmount * LAMPORTS_PER_SOL));
      const ix = await buildLockInstruction(publicKey, lamports);
      const tx = new Transaction().add(ix);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      const programId = getLockVaultProgramId();
      const [vaultPda] = getVaultPda(publicKey, programId);

      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultPda: vaultPda.toBase58(),
          amountLamports: lamports.toString(),
          contestId,
          lockTxSig: signature,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "ロックの記録に失敗しました");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ロックに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (record: LockRecord) => {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_PUBKEY as string);
      const ix = await buildUnlockInstruction(publicKey, treasury);
      const tx = new Transaction().add(ix);
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      const feeLamports = computeFeeLamports(BigInt(record.amountLamports));

      const res = await fetch(`/api/lock/${record.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlockTxSig: signature, feeLamports: feeLamports.toString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "解除の記録に失敗しました");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "解除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <p className="text-xs text-zinc-500">
        コミットロック機能は準備中です(スマートコントラクト未デプロイ)。
      </p>
    );
  }

  if (!publicKey) {
    return <p className="text-xs text-zinc-500">ロック機能を使うにはウォレットを接続してください。</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-none border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold">コミットロック(任意)</h3>
      <p className="text-xs text-zinc-500">
        自分のSOLを自分でロックし、大会参加のコミットメントとして使えます。解除時にロック額に応じた固定料率の手数料がかかります(金額のみで決まり、他の参加者への分配は一切ありません)。
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        {FEE_TIERS.map((tier) => (
          <li key={tier.label}>
            {tier.label}: {tier.percent}
          </li>
        ))}
      </ul>

      {totalLockedSol > 0 && (
        <div className="flex items-center justify-between rounded-none bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500 dark:bg-zinc-900/60">
          <span>
            累計ロック額 {totalLockedSol.toFixed(3)} SOL {currentTier && <>· {currentTier.name}</>}
          </span>
          {nextTier && <span>次のティア({nextTier.name})まであと {(nextTier.minSol - totalLockedSol).toFixed(3)} SOL</span>}
        </div>
      )}

      {activeLock ? (
        <div className="flex items-center justify-between rounded-none bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-900">
          <span>{(Number(activeLock.amountLamports) / LAMPORTS_PER_SOL).toFixed(4)} SOL ロック中</span>
          <button
            onClick={() => void handleUnlock(activeLock)}
            disabled={busy}
            className="rounded-none bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {busy ? "処理中…" : "解除する"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            {PRESET_AMOUNTS_SOL.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmountSol(String(preset))}
                className={`rounded-none border px-2.5 py-1 text-[11px] ${
                  amountSol === String(preset)
                    ? "border-zinc-900 bg-accent text-accent-foreground dark:border-accent"
                    : "border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700"
                }`}
              >
                {preset} SOL
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN_LOCK_SOL}
              step="0.01"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              className="w-28 rounded-none border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-xs text-zinc-500">SOL</span>
            <button
              onClick={() => void handleLock()}
              disabled={busy}
              className="rounded-none bg-zinc-900 dark:bg-white px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {busy ? "処理中…" : "ロックする"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            最小{MIN_LOCK_SOL} SOLから、上限なく自由に金額を設定できます。
            {Number.isFinite(parseFloat(amountSol)) && parseFloat(amountSol) >= MIN_LOCK_SOL && (
              <> この金額の解除手数料率: {feeBpsLabelForAmountSol(parseFloat(amountSol))}</>
            )}
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
