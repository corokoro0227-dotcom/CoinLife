// Must exactly match the tier schedule compiled into
// program/programs/lock_vault/src/lib.rs. The fee depends only on the
// amount locked — never on contest outcome or any other participant.

export const MIN_LOCK_SOL = 0.01;

const TIER_1_MAX_SOL = 0.09;
const TIER_1_FEE_BPS = 100n; // 1.0%
const TIER_2_MAX_SOL = 1.09;
const TIER_2_FEE_BPS = 50n; // 0.5%
const TIER_3_FEE_BPS = 20n; // 0.2%

export const FEE_TIERS = [
  { label: "0.01〜0.09 SOL", bps: 100, percent: "1.0%" },
  { label: "0.10〜1.09 SOL", bps: 50, percent: "0.5%" },
  { label: "1.10 SOL〜(上限なし)", bps: 20, percent: "0.2%" },
];

function feeBpsForAmountSol(amountSol: number): bigint {
  if (amountSol <= TIER_1_MAX_SOL) return TIER_1_FEE_BPS;
  if (amountSol <= TIER_2_MAX_SOL) return TIER_2_FEE_BPS;
  return TIER_3_FEE_BPS;
}

export function feeBpsLabelForAmountSol(amountSol: number): string {
  const bps = feeBpsForAmountSol(amountSol);
  return `${(Number(bps) / 100).toFixed(1)}%`;
}

export function computeFeeLamports(amountLamports: bigint): bigint {
  const amountSol = Number(amountLamports) / 1_000_000_000;
  const bps = feeBpsForAmountSol(amountSol);
  return (amountLamports * bps) / 10000n;
}
