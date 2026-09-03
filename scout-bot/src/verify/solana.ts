import { config } from "../config.js";
import type { ContractVerification } from "../types.js";

const TOKEN_PROGRAM_IDS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
]);

interface PumpFunCoin {
  mint?: string;
  name?: string;
  symbol?: string;
}

async function fetchPumpFunMeta(mint: string): Promise<PumpFunCoin | null> {
  try {
    const res = await fetch(`${config.pumpfunApiBase}/coins/${mint}`);
    if (!res.ok) return null;
    return (await res.json()) as PumpFunCoin;
  } catch {
    return null;
  }
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

/**
 * 与えられたSolanaのミントアドレスを検証する。
 * 1. RPCで実在確認しSPL Token/Token-2022プログラム所有か確認
 * 2. pump.fun公開API(非公式)で name/symbol を補完
 * ランダムなリプライに書かれたアドレスを鵜呑みにせず、必ずここを通す。
 */
export async function verifySolanaMint(address: string): Promise<ContractVerification> {
  const rpcUrl = config.rpcUrls.solana;
  if (!rpcUrl) {
    return {
      verified: false,
      chain: "solana",
      address,
      name: null,
      symbol: null,
      source: "unverified: SOLANA_RPC_URL not configured",
      explorerUrl: null,
    };
  }

  try {
    const accountInfo = await rpcCall<{
      value: { owner: string; data: [string, string] } | null;
    }>(rpcUrl, "getAccountInfo", [address, { encoding: "base64" }]);

    if (!accountInfo.value || !TOKEN_PROGRAM_IDS.has(accountInfo.value.owner)) {
      return {
        verified: false,
        chain: "solana",
        address,
        name: null,
        symbol: null,
        source: "solana-rpc: not an SPL token mint",
        explorerUrl: `https://solscan.io/token/${address}`,
      };
    }

    const meta = await fetchPumpFunMeta(address);

    return {
      verified: true,
      chain: "solana",
      address,
      name: meta?.name ?? null,
      symbol: meta?.symbol ?? null,
      source: meta ? "solana-rpc+pumpfun" : "solana-rpc (pumpfun metadata unavailable)",
      explorerUrl: `https://solscan.io/token/${address}`,
    };
  } catch (err) {
    return {
      verified: false,
      chain: "solana",
      address,
      name: null,
      symbol: null,
      source: `unverified: rpc error (${(err as Error).message})`,
      explorerUrl: `https://solscan.io/token/${address}`,
    };
  }
}
