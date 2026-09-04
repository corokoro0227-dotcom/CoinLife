import "dotenv/config";

function envString(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`環境変数 ${name} は数値である必要があります: ${v}`);
  }
  return n;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (!v) return fallback;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

export interface Config {
  exchange: string;
  symbol: string;
  timeframe: string;
  rsiPeriod: number;
  rsiThreshold: number;
  volumeLookback: number;
  volumeSpikeMultiplier: number;
  requireBullishCloseCandle: boolean;
  trendTimeframe: string;
  trendEmaPeriod: number;
  pollIntervalSec: number;
  alertCooldownSec: number;
  discordWebhookUrl: string | undefined;
  telegramBotToken: string | undefined;
  telegramChatId: string | undefined;
}

export function loadConfig(): Config {
  return {
    exchange: envString("EXCHANGE", "binance").toLowerCase(),
    symbol: envString("SYMBOL", "BTC/USDT:USDT"),
    timeframe: envString("TIMEFRAME", "15m"),
    rsiPeriod: envNumber("RSI_PERIOD", 14),
    rsiThreshold: envNumber("RSI_THRESHOLD", 30),
    volumeLookback: envNumber("VOLUME_LOOKBACK", 20),
    volumeSpikeMultiplier: envNumber("VOLUME_SPIKE_MULTIPLIER", 3.0),
    requireBullishCloseCandle: envBoolean("REQUIRE_BULLISH_CLOSE", true),
    trendTimeframe: envString("TREND_TIMEFRAME", "4h"),
    trendEmaPeriod: envNumber("TREND_EMA_PERIOD", 200),
    pollIntervalSec: envNumber("POLL_INTERVAL_SEC", 60),
    alertCooldownSec: envNumber("ALERT_COOLDOWN_SEC", 3600),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || undefined,
    telegramChatId: process.env.TELEGRAM_CHAT_ID || undefined,
  };
}
