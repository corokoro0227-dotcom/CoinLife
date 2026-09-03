import { config } from "../config.js";
import type { Chain, ContractVerification } from "../types.js";

const EXPLORER_BASE: Partial<Record<Chain, string>> = {
  base: "https://basescan.org/token/",
  bnb: "https://bscscan.com/token/",
  hyperevm: "https://hyperevm.cloud.blockscout.com/token/",
};

async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const body = (await res.json()) as { result?: string; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result ?? "0x";
}

async function getCode(rpcUrl: string, address: string): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [address, "latest"] }),
  });
  const body = (await res.json()) as { result?: string; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result ?? "0x";
}

/** ABIエンコードされた dynamic string の戻り値をデコードする(name()/symbol()用)。 */
function decodeAbiString(hex: string): string | null {
  const data = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (data.length < 128) return null;
  try {
    const lengthWord = data.slice(64, 128);
    const length = parseInt(lengthWord, 16);
    if (!Number.isFinite(length) || length <= 0 || length > 256) return null;
    const strHex = data.slice(128, 128 + length * 2);
    const bytes = Buffer.from(strHex, "hex");
    return bytes.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * 与えられたEVMアドレスがERC20コントラクトとして実在するかをRPCで検証する
 * (Base / BNB Chain / HyperEVM / 将来のRobinhood Chain共通)。
 */
export async function verifyEvmToken(chain: Chain, address: string): Promise<ContractVerification> {
  const rpcUrl = config.rpcUrls[chain];
  const explorerUrl = EXPLORER_BASE[chain] ? `${EXPLORER_BASE[chain]}${address}` : null;

  if (!rpcUrl) {
    return {
      verified: false,
      chain,
      address,
      name: null,
      symbol: null,
      source: `unverified: no RPC configured for ${chain}`,
      explorerUrl,
    };
  }

  try {
    const code = await getCode(rpcUrl, address);
    if (!code || code === "0x") {
      return {
        verified: false,
        chain,
        address,
        name: null,
        symbol: null,
        source: `${chain}-rpc: no contract code at address`,
        explorerUrl,
      };
    }

    const [nameHex, symbolHex] = await Promise.all([
      ethCall(rpcUrl, address, "0x06fdde03").catch(() => null),
      ethCall(rpcUrl, address, "0x95d89b41").catch(() => null),
    ]);

    return {
      verified: true,
      chain,
      address,
      name: nameHex ? decodeAbiString(nameHex) : null,
      symbol: symbolHex ? decodeAbiString(symbolHex) : null,
      source: `${chain}-rpc`,
      explorerUrl,
    };
  } catch (err) {
    return {
      verified: false,
      chain,
      address,
      name: null,
      symbol: null,
      source: `unverified: rpc error (${(err as Error).message})`,
      explorerUrl,
    };
  }
}
