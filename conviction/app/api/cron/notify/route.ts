import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { coinById } from "@/lib/coins";
import { fetchAllFeedItems, itemsForUser } from "@/lib/feeds";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [users, allItems] = await Promise.all([prisma.user.findMany(), fetchAllFeedItems()]);

  let notified = 0;
  for (const user of users) {
    const coin = coinById(user.coinId);
    if (!coin) continue;

    const since = user.lastNotifiedAt ?? user.createdAt;
    const newItems = itemsForUser(allItems, coin, user.stance).filter((item) => item.publishedAt > since);

    if (newItems.length > 0) {
      const lines = newItems
        .slice(0, 20)
        .map((item) => `- ${item.title} (${item.sourceName})\n  ${item.link}`)
        .join("\n\n");
      await sendEmail(
        user.email,
        `${newItems.length} new ${coin.symbol} ${user.stance === "BULLISH" ? "bullish" : "bearish"} article${newItems.length === 1 ? "" : "s"}`,
        `New articles matching your locked-in ${coin.name} / ${user.stance === "BULLISH" ? "bullish" : "bearish"} filter:\n\n${lines}`,
      );
      notified += 1;
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastNotifiedAt: now } });
  }

  return NextResponse.json({ checked: users.length, notified });
}
