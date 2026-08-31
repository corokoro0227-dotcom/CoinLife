import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  if (!token) return NextResponse.redirect(`${baseUrl}/login?error=missing_token`);

  const loginToken = await prisma.loginToken.findUnique({ where: { token } });
  if (!loginToken || loginToken.consumedAt || loginToken.expiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_or_expired`);
  }

  let userId = loginToken.userId;
  if (!userId) {
    // Fresh signup: the User row (and its permanent coin/stance) is only
    // created now, on confirmation — an abandoned signup never occupies an
    // email address.
    if (!loginToken.coinId || !loginToken.coinSymbol || !loginToken.coinName || !loginToken.stance) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
    }
    const existing = await prisma.user.findUnique({ where: { email: loginToken.email } });
    if (existing) {
      userId = existing.id;
    } else {
      const user = await prisma.user.create({
        data: {
          email: loginToken.email,
          coinId: loginToken.coinId,
          coinSymbol: loginToken.coinSymbol,
          coinName: loginToken.coinName,
          stance: loginToken.stance,
        },
      });
      userId = user.id;
    }
  }

  await prisma.loginToken.update({ where: { id: loginToken.id }, data: { consumedAt: new Date(), userId } });

  const sessionToken = await createSession(userId);
  const response = NextResponse.redirect(`${baseUrl}/dashboard`);
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return response;
}
