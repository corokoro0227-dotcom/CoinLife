import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransactionTouchesAccount } from "@/lib/solana-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const record = await prisma.lockRecord.findUnique({ where: { id } });
  if (!record || record.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.unlockedAt) return NextResponse.json({ error: "Already unlocked" }, { status: 409 });

  const body = await request.json();
  const { unlockTxSig, feeLamports } = body ?? {};
  if (!unlockTxSig || feeLamports === undefined) {
    return NextResponse.json({ error: "unlockTxSig and feeLamports are required" }, { status: 400 });
  }

  const verified = await verifyTransactionTouchesAccount(unlockTxSig, record.vaultPda);
  if (!verified) {
    return NextResponse.json({ error: "Could not verify the unlock transaction on-chain" }, { status: 400 });
  }

  await prisma.lockRecord.update({
    where: { id },
    data: { unlockedAt: new Date(), unlockTxSig, feeLamports: BigInt(feeLamports) },
  });

  return NextResponse.json({ ok: true });
}
