import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTodaysTopCryptoNews } from "@/lib/newsSource";
import { getOrCreateNewsBotUser } from "@/lib/newsBotUser";
import { MAX_QUOTE_LENGTH } from "@/lib/columnLanguages";

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
    where: { authorId: bot.id, isAutomated: true, createdAt: { gte: startOfTodayJST(now) } },
  });
  if (alreadyPosted) {
    return NextResponse.json({ skipped: "already posted today", columnId: alreadyPosted.id });
  }

  const news = await fetchTodaysTopCryptoNews(now);
  if (!news) {
    return NextResponse.json({ skipped: "no recent news found" });
  }

  const column = await prisma.column.create({
    data: {
      title: news.title,
      language: "en",
      sourceName: news.sourceName,
      sourceUrl: news.link,
      quote: news.description.slice(0, MAX_QUOTE_LENGTH),
      commentary: null,
      isAutomated: true,
      authorId: bot.id,
    },
  });

  return NextResponse.json({ created: column.id, title: column.title, source: column.sourceName });
}
