import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeContestStatus, computeEndAt, computeStartAt } from "@/lib/contestSchedule";

export async function GET() {
  const contests = await prisma.contest.findMany({
    orderBy: { startAt: "desc" },
    include: { _count: { select: { participants: true } }, createdBy: { select: { displayName: true, walletAddress: true } } },
  });
  return NextResponse.json({ contests });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, entryOpensAt, prizeNote, reviewHours, autoRenew } = body ?? {};

  if (!title || !description || !entryOpensAt) {
    return NextResponse.json({ error: "title, description and entryOpensAt are required" }, { status: 400 });
  }

  const entryOpens = new Date(entryOpensAt);
  if (Number.isNaN(entryOpens.getTime())) {
    return NextResponse.json({ error: "entryOpensAt must be a valid date" }, { status: 400 });
  }

  const parsedReviewHours = reviewHours === undefined ? 24 : Number(reviewHours);
  if (!Number.isFinite(parsedReviewHours) || parsedReviewHours < 24 || parsedReviewHours > 48) {
    return NextResponse.json({ error: "reviewHours must be between 24 and 48" }, { status: 400 });
  }

  const start = computeStartAt(entryOpens);
  const end = computeEndAt(start);

  const contest = await prisma.contest.create({
    data: {
      title,
      description,
      entryOpensAt: entryOpens,
      startAt: start,
      endAt: end,
      status: computeContestStatus({ startAt: start, endAt: end }),
      createdById: (session.user as { id: string }).id,
      prizeNote: prizeNote || null,
      reviewHours: parsedReviewHours,
      autoRenew: autoRenew === undefined ? true : Boolean(autoRenew),
    },
  });

  return NextResponse.json({ id: contest.id }, { status: 201 });
}
