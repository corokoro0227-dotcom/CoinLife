import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, destroySessionByToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await destroySessionByToken(token);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const response = NextResponse.redirect(`${baseUrl}/`, { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
