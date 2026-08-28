import { Connection } from "@solana/web3.js";

function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Confirms a transaction actually landed on-chain and touches the given
 * account, so the API doesn't just trust whatever the client claims happened.
 * This does not decode instruction data — full verification would parse the
 * Anchor IDL to check the exact amounts, which is a reasonable follow-up
 * before handling real mainnet funds.
 */
export async function verifyTransactionTouchesAccount(signature: string, accountAddress: string): Promise<boolean> {
  const connection = getConnection();
  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
  if (!tx || tx.meta?.err) return false;

  const accountKeys = tx.transaction.message.accountKeys.map((key) => key.pubkey.toBase58());
  return accountKeys.includes(accountAddress);
}
