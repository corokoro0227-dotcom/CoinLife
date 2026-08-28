function clusterSuffix(): string {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  return cluster === "mainnet-beta" || cluster === "mainnet" ? "" : `?cluster=${cluster}`;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}${clusterSuffix()}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}${clusterSuffix()}`;
}
