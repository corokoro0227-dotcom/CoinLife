import { NextRequest, NextResponse } from "next/server";
import { LANG_COOKIE } from "@/lib/i18n";

const LANG_TTL_SECONDS = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") === "ja" ? "ja" : "en";
  const referer = request.headers.get("referer");
  const redirectTo = referer && referer.startsWith(request.nextUrl.origin) ? referer : `${request.nextUrl.origin}/`;

  const response = NextResponse.redirect(redirectTo);
  response.cookies.set(LANG_COOKIE, lang, { maxAge: LANG_TTL_SECONDS, path: "/" });
  return response;
}
