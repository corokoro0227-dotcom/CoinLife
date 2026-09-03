import type { Chain, ContractVerification } from "../types.js";
import { verifySolanaMint } from "./solana.js";
import { verifyEvmToken } from "./evm.js";

/**
 * チェーンとアドレス(公式ローンチページ/コントラクト自体から得たもの限定。
 * リプライ欄などに書かれただけのアドレスは絶対に信用しない)を受け取り、
 * オンチェーン + 補助APIで検証する。
 */
export async function verifyContract(chain: Chain, address: string): Promise<ContractVerification> {
  if (chain === "solana") return verifySolanaMint(address);
  if (chain === "base" || chain === "bnb" || chain === "hyperevm") {
    return verifyEvmToken(chain, address);
  }
  // robinhood: 公開RPC/エクスプローラーが確定していないため、設定されていれば
  // 汎用EVM検証を試みる。未設定なら「未検証」として扱う(住所を捏造しない)。
  return verifyEvmToken(chain, address);
}
