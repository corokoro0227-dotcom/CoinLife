import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTodaysMemeCoinTrend } from "@/lib/memeCoinSource";
import { getOrCreateNewsBotUser } from "@/lib/newsBotUser";

export const maxDuration = 30;

function startOfTodayJST(now: Date): Date {
  const shifted = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600 * 1000);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const bot = await getOrCreateNewsBotUser();

  const alreadyPosted = await prisma.column.findFirst({
    where: { authorId: bot.id, isAutomated: true, category: "MEME_COIN", createdAt: { gte: startOfTodayJST(now) } },
  });
  if (alreadyPosted) {
    return NextResponse.json({ skipped: "already posted today", columnId: alreadyPosted.id });
  }

  const trend = await fetchTodaysMemeCoinTrend(now);
  if (!trend) {
    return NextResponse.json({ skipped: "no meme coin data available" });
  }

  const column = await prisma.column.create({
    data: {
      title: trend.title,
      language: "ja",
      sourceName: trend.sourceName,
      sourceUrl: trend.sourceUrl,
      quote: trend.quote,
      commentary: trend.commentary,
      isAutomated: true,
      category: "MEME_COIN",
      authorId: bot.id,
    },
  });

  return NextResponse.json({ created: column.id, title: column.title, source: column.sourceName });
}
