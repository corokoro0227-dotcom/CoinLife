import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransactionTouchesAccount } from "@/lib/solana-server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await prisma.lockRecord.findMany({
    where: { userId: (session.user as { id: string }).id },
    orderBy: { lockedAt: "desc" },
  });

  return NextResponse.json({
    records: records.map((record) => ({
      ...record,
      amountLamports: record.amountLamports.toString(),
      feeLamports: record.feeLamports?.toString() ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { vaultPda, amountLamports, contestId, lockTxSig } = body ?? {};

  if (!vaultPda || !amountLamports || !lockTxSig) {
    return NextResponse.json({ error: "vaultPda, amountLamports and lockTxSig are required" }, { status: 400 });
  }

  const verified = await verifyTransactionTouchesAccount(lockTxSig, vaultPda);
  if (!verified) {
    return NextResponse.json({ error: "Could not verify the lock transaction on-chain" }, { status: 400 });
  }

  const record = await prisma.lockRecord.create({
    data: {
      userId: (session.user as { id: string }).id,
      contestId: contestId ?? null,
      vaultPda,
      amountLamports: BigInt(amountLamports),
      lockTxSig,
    },
  });

  return NextResponse.json({ id: record.id }, { status: 201 });
}
