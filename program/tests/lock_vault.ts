import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import type { LockVault } from "../target/types/lock_vault";

// Must match the `TREASURY` constant compiled into lib.rs. It's just a
// receiving address here — the test only reads its balance, so no keypair
// (and definitely not its private key) is needed to run this suite.
const TREASURY = new PublicKey("49cQRProXVqA5eCXyZw1VCR73xcbq4s8kVnhWSvnNMPL");

// Must match the tier schedule in lib.rs.
const MIN_LOCK_LAMPORTS = 0.01 * LAMPORTS_PER_SOL;
function expectedFeeBps(lamports: number): number {
  if (lamports <= 0.09 * LAMPORTS_PER_SOL) return 100; // 1.0%
  if (lamports <= 1.09 * LAMPORTS_PER_SOL) return 50; // 0.5%
  return 20; // 0.2%
}

describe("lock_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LockVault as Program<LockVault>;

  async function fundedUser(lamports = 3 * LAMPORTS_PER_SOL): Promise<Keypair> {
    const keypair = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(keypair.publicKey, lamports),
    );
    return keypair;
  }

  function vaultPdaFor(user: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), user.toBuffer()], program.programId);
    return pda;
  }

  async function lockAndUnlock(user: Keypair, lockAmount: number) {
    const vault = vaultPdaFor(user.publicKey);

    await program.methods
      .lock(new anchor.BN(lockAmount))
      .accounts({ user: user.publicKey, vault, systemProgram: SystemProgram.programId })
      .signers([user])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vault);
    assert.equal(vaultAccount.lockedLamports.toNumber(), lockAmount);

    const treasuryBefore = await provider.connection.getBalance(TREASURY);
    const userBefore = await provider.connection.getBalance(user.publicKey);

    await program.methods
      .unlock()
      .accounts({ user: user.publicKey, vault, treasury: TREASURY })
      .signers([user])
      .rpc();

    const expectedFee = Math.floor((lockAmount * expectedFeeBps(lockAmount)) / 10_000);
    const expectedPayout = lockAmount - expectedFee;

    const treasuryAfter = await provider.connection.getBalance(TREASURY);
    assert.equal(treasuryAfter - treasuryBefore, expectedFee, `fee mismatch for ${lockAmount} lamports`);

    // The user also pays a small network tx fee and gets the vault's
    // rent-exempt deposit back, so check the payout loosely rather than exactly.
    const userAfter = await provider.connection.getBalance(user.publicKey);
    assert.isAtLeast(userAfter - userBefore, expectedPayout - 10_000);

    const vaultInfo = await provider.connection.getAccountInfo(vault);
    assert.isNull(vaultInfo, "vault account should be closed after unlock");
  }

  it("charges 1.0% for a lock in the 0.01–0.09 SOL tier", async () => {
    const user = await fundedUser();
    await lockAndUnlock(user, 0.05 * LAMPORTS_PER_SOL);
  });

  it("charges 0.5% for a lock in the 0.10–1.09 SOL tier", async () => {
    const user = await fundedUser(2 * LAMPORTS_PER_SOL);
    await lockAndUnlock(user, 1 * LAMPORTS_PER_SOL);
  });

  it("charges 0.2% for a lock of 1.10 SOL or more", async () => {
    const user = await fundedUser(3 * LAMPORTS_PER_SOL);
    await lockAndUnlock(user, 1.5 * LAMPORTS_PER_SOL);
  });

  it("rejects a lock below the 0.01 SOL minimum", async () => {
    const user = await fundedUser();
    const vault = vaultPdaFor(user.publicKey);

    try {
      await program.methods
        .lock(new anchor.BN(MIN_LOCK_LAMPORTS - 1))
        .accounts({ user: user.publicKey, vault, systemProgram: SystemProgram.programId })
        .signers([user])
        .rpc();
      assert.fail("expected the below-minimum lock to be rejected");
    } catch (error) {
      assert.include(String(error), "AmountBelowMinimum");
    }
  });

  it("rejects unlocking a vault that no longer exists", async () => {
    const user = await fundedUser();
    const vault = vaultPdaFor(user.publicKey);

    try {
      await program.methods
        .unlock()
        .accounts({ user: user.publicKey, vault, treasury: TREASURY })
        .signers([user])
        .rpc();
      assert.fail("expected unlock on a non-existent vault to fail");
    } catch (error) {
      assert.isOk(error);
    }
  });
});
