import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "conviction_session";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export async function destroySessionByToken(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

/**
 * Reads the current session cookie (server components/route handlers only)
 * and returns the logged-in user, or null. A locked-in user is exactly
 * {id, email, coinId, coinSymbol, coinName, stance, createdAt} — there is
 * nothing else to fetch, by design.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;

  return session.user;
}
