import { NextRequest, NextResponse } from "next/server";
import { issueNonce } from "@/lib/auth-nonce";

export async function GET(request: NextRequest) {
  const publicKey = request.nextUrl.searchParams.get("publicKey");
  if (!publicKey) {
    return NextResponse.json({ error: "publicKey query param is required" }, { status: 400 });
  }
  const nonce = issueNonce(publicKey);
  return NextResponse.json({ nonce });
}
