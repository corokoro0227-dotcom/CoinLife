import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { prisma } from "@/lib/prisma";
import { consumeNonce } from "@/lib/auth-nonce";
import { parseSiwsMessage } from "@/lib/siws";

const NONCE_MAX_AGE_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "solana",
      name: "Solana Wallet",
      credentials: {
        publicKey: { label: "Public Key", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
      },
      async authorize(credentials) {
        const publicKey = credentials?.publicKey as string | undefined;
        const signature = credentials?.signature as string | undefined;
        const message = credentials?.message as string | undefined;
        if (!publicKey || !signature || !message) return null;

        const parsed = parseSiwsMessage(message);
        if (!parsed || parsed.publicKey !== publicKey) return null;

        const issuedAt = Date.parse(parsed.issuedAt);
        if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > NONCE_MAX_AGE_MS) return null;

        if (!consumeNonce(publicKey, parsed.nonce)) return null;

        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(publicKey);
        const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        if (!verified) return null;

        const user = await prisma.user.upsert({
          where: { walletAddress: publicKey },
          update: {},
          create: { walletAddress: publicKey },
        });

        return { id: user.id, name: user.displayName ?? publicKey, walletAddress: user.walletAddress };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = (user as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.userId as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
