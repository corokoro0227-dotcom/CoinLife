"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { signIn, signOut, useSession } from "next-auth/react";
import bs58 from "bs58";
import { buildSiwsMessage } from "@/lib/siws";

export function SiwsLogin() {
  const { publicKey, signMessage } = useWallet();
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("このウォレットはメッセージ署名に対応していません");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const address = publicKey.toBase58();
      const nonceRes = await fetch(`/api/auth/nonce?publicKey=${encodeURIComponent(address)}`);
      const { nonce } = await nonceRes.json();

      const message = buildSiwsMessage({
        domain: window.location.host,
        publicKey: address,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const signature = await signMessage(new TextEncoder().encode(message));

      const result = await signIn("solana", {
        publicKey: address,
        signature: bs58.encode(signature),
        message,
        redirect: false,
      });

      if (result?.error) setError("署名の検証に失敗しました");
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }, [publicKey, signMessage]);

  return (
    <div className="flex items-center gap-3">
      <WalletMultiButton />
      {status === "authenticated" && session?.user ? (
        <button
          onClick={() => void signOut({ redirect: false })}
          className="rounded-none border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
        >
          ログアウト
        </button>
      ) : (
        publicKey && (
          <button
            onClick={() => void handleSignIn()}
            disabled={busy}
            className="rounded-none bg-zinc-900 dark:bg-white px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {busy ? "署名待ち…" : "ログイン(署名)"}
          </button>
        )
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
