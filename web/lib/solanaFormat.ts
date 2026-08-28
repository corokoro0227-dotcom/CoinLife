export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}
