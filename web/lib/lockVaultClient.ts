import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

// Built against the raw instruction layout of program/programs/lock_vault
// rather than a generated IDL/@coral-xyz/anchor Program instance, so the web
// app can be developed before the Anchor toolchain (WSL-only on this
// machine) produces one. Once `anchor build` exists, this can be swapped for
// an IDL-driven `Program` client without changing the calling UI code.

export function getLockVaultProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID;
  if (!id) throw new Error("NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID is not set — deploy the program first");
  return new PublicKey(id);
}

export function getVaultPda(user: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), user.toBuffer()], programId);
}

async function anchorSighash(namespace: string, name: string): Promise<Buffer> {
  const preimage = `${namespace}:${name}`;
  const bytes = new TextEncoder().encode(preimage);
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Buffer.from(digest).subarray(0, 8);
}

export async function buildLockInstruction(user: PublicKey, amountLamports: bigint): Promise<TransactionInstruction> {
  const programId = getLockVaultProgramId();
  const [vault] = getVaultPda(user, programId);

  const discriminator = await anchorSighash("global", "lock");
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amountLamports);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator, amountBuf]),
  });
}

export async function buildUnlockInstruction(user: PublicKey, treasury: PublicKey): Promise<TransactionInstruction> {
  const programId = getLockVaultProgramId();
  const [vault] = getVaultPda(user, programId);

  const discriminator = await anchorSighash("global", "unlock");

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
    ],
    data: discriminator,
  });
}
