import "dotenv/config";
import type { Chain } from "./types.js";

function envOrNull(key: string): string | null {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v.trim() : null;
}

const allChains: Chain[] = ["solana", "base", "bnb", "hyperevm", "robinhood"];

export const config = {
  signalProvider: (envOrNull("SIGNAL_PROVIDER") ?? "mock") as "x" | "mock",
  xBearerToken: envOrNull("X_BEARER_TOKEN"),

  scanChains: (envOrNull("SCAN_CHAINS")?.split(",").map((s) => s.trim()) ?? allChains).filter(
    (c): c is Chain => (allChains as string[]).includes(c)
  ),

  rpcUrls: {
    solana: envOrNull("SOLANA_RPC_URL"),
    base: envOrNull("BASE_RPC_URL"),
    bnb: envOrNull("BNB_RPC_URL"),
    hyperevm: envOrNull("HYPEREVM_RPC_URL"),
    robinhood: envOrNull("ROBINHOOD_RPC_URL"),
  } satisfies Record<Chain, string | null>,

  pumpfunApiBase: envOrNull("PUMPFUN_API_BASE") ?? "https://frontend-api.pump.fun",

  notifyWebhookUrl: envOrNull("NOTIFY_WEBHOOK_URL"),
  notifyWebhookKind: (envOrNull("NOTIFY_WEBHOOK_KIND") ?? "generic") as
    | "discord"
    | "slack"
    | "generic",

  maxResults: Number(envOrNull("MAX_RESULTS") ?? "5"),
  watchIntervalMinutes: Number(envOrNull("WATCH_INTERVAL_MINUTES") ?? "15"),
};
