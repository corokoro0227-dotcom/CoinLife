import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { coinById } from "@/lib/coins";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const coinId = typeof body?.coinId === "string" ? body.coinId : "";
  const stance = body?.stance === "BULLISH" || body?.stance === "BEARISH" ? body.stance : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  const coin = coinById(coinId);
  if (!coin) {
    return NextResponse.json({ error: "Pick a valid coin" }, { status: 400 });
  }
  if (!stance) {
    return NextResponse.json({ error: "Pick a stance" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account already exists for this email. Log in instead — your coin and stance are already locked in." },
      { status: 409 },
    );
  }

  const token = randomBytes(32).toString("hex");
  await prisma.loginToken.create({
    data: {
      token,
      email,
      coinId: coin.id,
      coinSymbol: coin.symbol,
      coinName: coin.name,
      stance,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  await sendEmail(
    email,
    "Confirm your No Conviction, No Coin account",
    `Click the link below to permanently lock in ${coin.name} (${coin.symbol}), ${
      stance === "BULLISH" ? "bullish signals" : "bearish / risk signals"
    }:\n\n${verifyUrl}\n\nThis link expires in 30 minutes. This choice cannot be changed once confirmed — that's the point.`,
  );

  return NextResponse.json({ ok: true });
}
