import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "このメールアドレスは既に別のアカウントで使われています" }, { status: 409 });
  }

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      emailVerifiedAt: null,
      emailVerificationToken: token,
      emailVerificationExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const verifyUrl = `${baseUrl}/api/account/email/verify?token=${token}`;

  await sendEmail(
    email,
    "CoinLife: メールアドレスの確認",
    `以下のリンクをクリックして、CoinLifeの通知用メールアドレスを確認してください。\n\n${verifyUrl}\n\nこのリンクは30分で無効になります。心当たりがない場合はこのメールを無視してください。`,
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  await prisma.user.update({
    where: { id: userId },
    data: { email: null, emailVerifiedAt: null, emailVerificationToken: null, emailVerificationExpiresAt: null },
  });

  return NextResponse.json({ ok: true });
}
