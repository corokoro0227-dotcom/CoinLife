import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/account?emailError=missing_token`);
  }

  const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
  if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/account?emailError=invalid_or_expired`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationExpiresAt: null },
  });

  return NextResponse.redirect(`${baseUrl}/account?emailVerified=1`);
}
