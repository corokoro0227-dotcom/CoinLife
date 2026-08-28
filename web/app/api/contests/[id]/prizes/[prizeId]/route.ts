import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewEndsAt, isReviewComplete } from "@/lib/prizeReview";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contestId, prizeId } = await params;
  const userId = (session.user as { id: string }).id;

  const payout = await prisma.prizePayout.findUnique({ where: { id: prizeId }, include: { contest: true } });
  if (!payout || payout.contestId !== contestId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payout.contest.createdById !== userId) {
    return NextResponse.json({ error: "Only the contest creator can update this prize" }, { status: 403 });
  }
  if (!isReviewComplete(payout.contest)) {
    return NextResponse.json(
      {
        error: "不正がないか確認するための審査期間中です。審査完了後に送金済みへ変更できます。",
        reviewEndsAt: getReviewEndsAt(payout.contest).toISOString(),
      },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { txSignature } = body ?? {};
  if (!txSignature) {
    return NextResponse.json({ error: "txSignature is required to mark a prize as sent" }, { status: 400 });
  }

  await prisma.prizePayout.update({
    where: { id: prizeId },
    data: { status: "SENT", txSignature, sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; prizeId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contestId, prizeId } = await params;
  const userId = (session.user as { id: string }).id;

  const payout = await prisma.prizePayout.findUnique({ where: { id: prizeId } });
  if (!payout || payout.contestId !== contestId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (contest?.createdById !== userId) {
    return NextResponse.json({ error: "Only the contest creator can delete this prize" }, { status: 403 });
  }

  await prisma.prizePayout.delete({ where: { id: prizeId } });
  return NextResponse.json({ ok: true });
}
