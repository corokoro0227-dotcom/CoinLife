import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchAccountEquityUsd } from "@/lib/exchanges";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const connection = await prisma.exchangeConnection.findUnique({ where: { id } });
  if (!connection || connection.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = decrypt(connection.apiKeyEnc);
  const apiSecret = decrypt(connection.apiSecretEnc);

  let equityUsd: number;
  try {
    equityUsd = await fetchAccountEquityUsd(connection.exchange, apiKey, apiSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to sync exchange: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 502 },
    );
  }

  const snapshot = await prisma.balanceSnapshot.create({
    data: { exchangeConnectionId: connection.id, userId, equityUsd },
  });

  return NextResponse.json({ equityUsd, takenAt: snapshot.takenAt });
}
