import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getContestLeaderboard } from "@/lib/leaderboard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      createdBy: { select: { displayName: true, walletAddress: true } },
      prizePayouts: { include: { user: { select: { displayName: true, walletAddress: true } } } },
    },
  });
  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const leaderboard = await getContestLeaderboard(id);

  return NextResponse.json({ contest, leaderboard });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contest.createdById !== userId) {
    return NextResponse.json({ error: "Only the contest creator can update this contest" }, { status: 403 });
  }

  const body = await request.json();
  const { autoRenew } = body ?? {};
  if (typeof autoRenew !== "boolean") {
    return NextResponse.json({ error: "autoRenew (boolean) is required" }, { status: 400 });
  }

  await prisma.contest.update({ where: { id }, data: { autoRenew } });
  return NextResponse.json({ ok: true });
}
