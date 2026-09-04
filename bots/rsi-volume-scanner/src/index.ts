import type { Exchange } from "ccxt";
import { loadConfig } from "./config.js";
import { createExchange, evaluateExchange } from "./scanner.js";
import { sendAlert, type AlertPayload } from "./notify.js";

async function main() {
  const config = loadConfig();

  if (!config.discordWebhookUrl && !(config.telegramBotToken && config.telegramChatId)) {
    console.warn(
      "[init] DiscordまたはTelegramの通知先が設定されていません。コンソールログのみになります。",
    );
  }

  console.log(
    `[init] 監視開始: symbol=${config.symbol} timeframe=${config.timeframe} ` +
      `exchanges=${config.exchanges.join(",")} rsi<${config.rsiThreshold} ` +
      `volume>=${config.volumeSpikeMultiplier}x poll=${config.pollIntervalSec}s`,
  );

  const exchanges = new Map<string, Exchange>();
  for (const id of config.exchanges) {
    try {
      exchanges.set(id, createExchange(id));
    } catch (err) {
      console.error(`[init] 取引所 ${id} の初期化に失敗しました:`, err);
    }
  }

  const lastAlertAt = new Map<string, number>();
  let stopped = false;

  const tick = async () => {
    for (const [id, exchange] of exchanges) {
      try {
        const alert: AlertPayload | null = await evaluateExchange(exchange, id, config);
        if (!alert) continue;

        const now = Date.now();
        const last = lastAlertAt.get(id) ?? 0;
        if (now - last < config.alertCooldownSec * 1000) {
          console.log(`[cooldown] ${id} は条件成立中ですがクールダウン中のため通知をスキップ`);
          continue;
        }

        lastAlertAt.set(id, now);
        await sendAlert(config, alert);
      } catch (err) {
        console.error(`[scan] ${id} の評価中にエラー:`, err);
      }
    }
  };

  await tick();
  const interval = setInterval(() => {
    if (!stopped) void tick();
  }, config.pollIntervalSec * 1000);

  const shutdown = async () => {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    console.log("[shutdown] 停止中...");
    await Promise.allSettled(Array.from(exchanges.values()).map((ex) => ex.close?.()));
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
