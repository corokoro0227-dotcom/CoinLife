import { prisma } from "@/lib/prisma";

// A fixed, deterministic placeholder "wallet address" — obviously not a real
// Solana pubkey — used only to satisfy User.walletAddress's uniqueness so
// automated columns have a valid author to attribute to.
const NEWS_BOT_WALLET_ADDRESS = "SYSTEM_NEWS_BOT_0000000000000000000000000";

export async function getOrCreateNewsBotUser() {
  return prisma.user.upsert({
    where: { walletAddress: NEWS_BOT_WALLET_ADDRESS },
    update: {},
    create: { walletAddress: NEWS_BOT_WALLET_ADDRESS, displayName: "CoinLife 編集部(自動投稿)" },
  });
}
