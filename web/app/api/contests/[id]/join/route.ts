import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserCurrentEquityUsd } from "@/lib/leaderboard";
import { isEntryOpen } from "@/lib/contestSchedule";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contestId } = await params;
  const userId = (session.user as { id: string }).id;

  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  if (now < contest.entryOpensAt) {
    return NextResponse.json({ error: "エントリー期間はまだ開始していません" }, { status: 400 });
  }
  if (!isEntryOpen(contest, now)) {
    return NextResponse.json({ error: "エントリー期間は終了しました(大会は現在進行中または終了しています)" }, { status: 400 });
  }

  const connectionCount = await prisma.exchangeConnection.count({ where: { userId } });
  if (connectionCount === 0) {
    return NextResponse.json({ error: "Connect at least one exchange account before joining" }, { status: 400 });
  }

  const existing = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });
  if (existing) return NextResponse.json({ error: "Already joined" }, { status: 409 });

  const startEquityUsd = await getUserCurrentEquityUsd(userId);

  const participant = await prisma.contestParticipant.create({
    data: { contestId, userId, startEquityUsd },
  });

  return NextResponse.json({ id: participant.id, startEquityUsd }, { status: 201 });
}
