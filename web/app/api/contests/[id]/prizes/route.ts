import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contestId } = await params;
  const userId = (session.user as { id: string }).id;

  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contest.createdById !== userId) {
    return NextResponse.json({ error: "Only the contest creator can record prizes" }, { status: 403 });
  }
  if (new Date() < contest.endAt) {
    return NextResponse.json({ error: "Prizes can only be recorded after the contest has ended" }, { status: 400 });
  }

  const body = await request.json();
  const { winnerUserId, amountSol, rank, note } = body ?? {};

  if (!winnerUserId || typeof amountSol !== "number" || amountSol <= 0) {
    return NextResponse.json({ error: "winnerUserId and a positive amountSol are required" }, { status: 400 });
  }

  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId: winnerUserId } },
  });
  if (!participant) {
    return NextResponse.json({ error: "That user is not a participant in this contest" }, { status: 400 });
  }

  const payout = await prisma.prizePayout.create({
    data: {
      contestId,
      userId: winnerUserId,
      amountSol,
      rank: typeof rank === "number" ? rank : null,
      note: note || null,
    },
  });

  return NextResponse.json({ id: payout.id }, { status: 201 });
}
