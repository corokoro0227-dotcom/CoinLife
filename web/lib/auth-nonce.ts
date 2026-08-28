// In-memory nonce store for Sign-In With Solana (SIWS).
// Fine for a single-process dev/small deployment; move to a shared store
// (Redis, DB) before scaling to multiple server instances.

const NONCE_TTL_MS = 5 * 60 * 1000;

type Entry = { nonce: string; expiresAt: number };

const store = new Map<string, Entry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

export function issueNonce(walletAddress: string): string {
  cleanup();
  const nonce = crypto.randomUUID().replace(/-/g, "");
  store.set(walletAddress, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function consumeNonce(walletAddress: string, nonce: string): boolean {
  const entry = store.get(walletAddress);
  if (!entry) return false;
  store.delete(walletAddress);
  if (entry.expiresAt < Date.now()) return false;
  return entry.nonce === nonce;
}
