import { loadConfig } from "./config.js";
import { createExchange, evaluateExchange } from "./scanner.js";
import { sendAlert } from "./notify.js";

async function main() {
  const config = loadConfig();

  if (!config.discordWebhookUrl && !(config.telegramBotToken && config.telegramChatId)) {
    console.warn(
      "[init] DiscordまたはTelegramの通知先が設定されていません。コンソールログのみになります。",
    );
  }

  console.log(
    `[init] 監視開始: exchange=${config.exchange} symbol=${config.symbol} ` +
      `timeframe=${config.timeframe} rsi<${config.rsiThreshold} ` +
      `volume>=${config.volumeSpikeMultiplier}x trend=EMA${config.trendEmaPeriod}(${config.trendTimeframe}) ` +
      `bullishClose=${config.requireBullishCloseCandle} poll=${config.pollIntervalSec}s`,
  );

  const exchange = createExchange(config.exchange);

  let lastAlertAt = 0;
  let stopped = false;

  const tick = async () => {
    try {
      const alert = await evaluateExchange(exchange, config.exchange, config);
      if (!alert) return;

      const now = Date.now();
      if (now - lastAlertAt < config.alertCooldownSec * 1000) {
        console.log(`[cooldown] 条件成立中ですがクールダウン中のため通知をスキップ`);
        return;
      }

      lastAlertAt = now;
      await sendAlert(config, alert);
    } catch (err) {
      console.error(`[scan] ${config.exchange} の評価中にエラー:`, err);
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
    await exchange.close?.();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
