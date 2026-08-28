import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_QUOTE_LENGTH, MIN_COMMENTARY_LENGTH } from "@/lib/columnLanguages";

export async function GET() {
  const columns = await prisma.column.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { displayName: true, walletAddress: true } } },
  });
  return NextResponse.json({ columns });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, sourceName, sourceUrl, quote, commentary } = body ?? {};

  if (!title || !sourceName || !sourceUrl || !quote || !commentary) {
    return NextResponse.json({ error: "すべての項目を入力してください" }, { status: 400 });
  }
  if (typeof quote !== "string" || quote.length > MAX_QUOTE_LENGTH) {
    return NextResponse.json({ error: `引用は${MAX_QUOTE_LENGTH}文字以内にしてください` }, { status: 400 });
  }
  if (typeof commentary !== "string" || commentary.length < MIN_COMMENTARY_LENGTH) {
    return NextResponse.json({ error: `コメントは${MIN_COMMENTARY_LENGTH}文字以上書いてください` }, { status: 400 });
  }
  try {
    new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "引用元URLの形式が正しくありません" }, { status: 400 });
  }

  const column = await prisma.column.create({
    data: {
      title,
      language: "ja",
      sourceName,
      sourceUrl,
      quote,
      commentary,
      isAutomated: false,
      authorId: (session.user as { id: string }).id,
    },
  });

  return NextResponse.json({ id: column.id }, { status: 201 });
}
