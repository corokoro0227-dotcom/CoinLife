import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Don't reveal whether the account exists — always respond ok, only actually
  // send an email when it does.
  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.loginToken.create({
      data: { token, email, userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
    await sendEmail(email, "Your Conviction login link", `Click to log in:\n\n${verifyUrl}\n\nThis link expires in 30 minutes.`);
  }

  return NextResponse.json({ ok: true });
}
