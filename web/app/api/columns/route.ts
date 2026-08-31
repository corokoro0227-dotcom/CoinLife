import { NextRequest, NextResponse } from "next/server";
import { ColumnCategory } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_QUOTE_LENGTH, MIN_COMMENTARY_LENGTH } from "@/lib/columnLanguages";

export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get("category");
  const category =
    categoryParam && (Object.values(ColumnCategory) as string[]).includes(categoryParam)
      ? (categoryParam as ColumnCategory)
      : undefined;

  const columns = await prisma.column.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: "desc" },
    include: { author: { select: { displayName: true, walletAddress: true } } },
  });
  return NextResponse.json({ columns });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, sourceName, sourceUrl, quote, commentary, category } = body ?? {};

  if (category !== undefined && !(Object.values(ColumnCategory) as string[]).includes(category)) {
    return NextResponse.json({ error: "カテゴリが不正です" }, { status: 400 });
  }

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
      category: (category as ColumnCategory | undefined) ?? ColumnCategory.CRYPTO_NEWS,
      authorId: (session.user as { id: string }).id,
    },
  });

  return NextResponse.json({ id: column.id }, { status: 201 });
}
