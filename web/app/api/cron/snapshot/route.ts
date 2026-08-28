import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchAccountEquityUsd } from "@/lib/exchanges";
import { rotateContestSeries } from "@/lib/contestRotation";
import { sendContestReminders } from "@/lib/notifications";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  await prisma.contest.updateMany({ where: { status: "UPCOMING", startAt: { lte: now } }, data: { status: "ACTIVE" } });
  await prisma.contest.updateMany({ where: { status: "ACTIVE", endAt: { lte: now } }, data: { status: "ENDED" } });

  const { created: roundsCreated } = await rotateContestSeries(now);
  const { notified } = await sendContestReminders(now);

  const connections = await prisma.exchangeConnection.findMany();

  let synced = 0;
  let failed = 0;
  for (const connection of connections) {
    try {
      const apiKey = decrypt(connection.apiKeyEnc);
      const apiSecret = decrypt(connection.apiSecretEnc);
      const equityUsd = await fetchAccountEquityUsd(connection.exchange, apiKey, apiSecret);
      await prisma.balanceSnapshot.create({
        data: { exchangeConnectionId: connection.id, userId: connection.userId, equityUsd },
      });
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ synced, failed, total: connections.length, roundsCreated, notified });
}
