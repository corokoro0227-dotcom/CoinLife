import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { fetchAccountEquityUsd, isSupportedExchange } from "@/lib/exchanges";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.exchangeConnection.findMany({
    where: { userId: (session.user as { id: string }).id },
    select: {
      id: true,
      exchange: true,
      label: true,
      createdAt: true,
      balanceSnapshots: { orderBy: { takenAt: "desc" }, take: 1, select: { equityUsd: true, takenAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connections });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { exchange, label, apiKey, apiSecret } = body ?? {};

  if (!exchange || !isSupportedExchange(exchange)) {
    return NextResponse.json({ error: "Unsupported exchange" }, { status: 400 });
  }
  if (!label || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "label, apiKey and apiSecret are required" }, { status: 400 });
  }

  let equityUsd: number;
  try {
    equityUsd = await fetchAccountEquityUsd(exchange, apiKey, apiSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to connect to exchange: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 400 },
    );
  }

  const userId = (session.user as { id: string }).id;
  const connection = await prisma.exchangeConnection.create({
    data: {
      userId,
      exchange,
      label,
      apiKeyEnc: encrypt(apiKey),
      apiSecretEnc: encrypt(apiSecret),
    },
  });

  await prisma.balanceSnapshot.create({
    data: { exchangeConnectionId: connection.id, userId, equityUsd },
  });

  return NextResponse.json({ id: connection.id, equityUsd }, { status: 201 });
}
