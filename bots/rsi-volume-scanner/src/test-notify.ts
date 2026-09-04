// 実際のシグナル成立を待たずに、Discord/Telegramの通知設定が正しいか確認するためのスクリプト。
import { loadConfig } from "./config.js";
import { sendAlert, type AlertPayload } from "./notify.js";

async function main() {
  const config = loadConfig();

  if (!config.discordWebhookUrl && !(config.telegramBotToken && config.telegramChatId)) {
    console.error(
      "[test-notify] DiscordまたはTelegramの通知先が.envに設定されていません。" +
        "DISCORD_WEBHOOK_URL、または TELEGRAM_BOT_TOKEN と TELEGRAM_CHAT_ID を設定してください。",
    );
    process.exit(1);
  }

  const dummyAlert: AlertPayload = {
    exchangeId: config.exchange,
    symbol: config.symbol,
    timeframe: config.timeframe,
    price: 65000,
    rsi: 27.3,
    volumeMultiplier: 3.2,
    bullishCloseCandle: true,
    trendTimeframe: config.trendTimeframe,
    trendEma: 63500,
    aboveTrend: true,
    candleTime: new Date(),
    isTest: true,
  };

  console.log("[test-notify] テスト通知を送信します(これはダミーデータで、実際のシグナルではありません)...");
  await sendAlert(config, dummyAlert);
  console.log("[test-notify] 送信処理が完了しました。DiscordやTelegramに届いているか確認してください。");
}

main().catch((err) => {
  console.error("[test-notify] エラー:", err);
  process.exit(1);
});
