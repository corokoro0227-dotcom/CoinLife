import type { Config } from "./config.js";

export interface AlertPayload {
  exchangeId: string;
  symbol: string;
  timeframe: string;
  price: number;
  rsi: number;
  volumeMultiplier: number;
  bullishCloseCandle: boolean;
  trendTimeframe: string;
  trendEma: number;
  aboveTrend: boolean;
  candleTime: Date;
}

function formatMessage(a: AlertPayload): string {
  const pct = ((a.volumeMultiplier - 1) * 100).toFixed(0);
  return (
    `🔔 BTC先物 押し目買いシグナル\n` +
    `取引所: ${a.exchangeId}\n` +
    `シンボル: ${a.symbol} (${a.timeframe})\n` +
    `価格: ${a.price}\n` +
    `RSI(${a.timeframe}): ${a.rsi.toFixed(2)} (< 閾値)\n` +
    `出来高: 過去平均比 +${pct}%\n` +
    `陽線確認: ${a.bullishCloseCandle ? "○" : "×"}\n` +
    `トレンドフィルタ: 価格 ${a.aboveTrend ? ">" : "<"} EMA${a.trendTimeframe} (${a.trendEma.toFixed(1)}) ${a.aboveTrend ? "○" : "×"}\n` +
    `足の時刻: ${a.candleTime.toISOString()}`
  );
}

async function sendDiscord(webhookUrl: string, content: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(`Discord通知に失敗しました: ${res.status} ${await res.text()}`);
  }
}

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    throw new Error(`Telegram通知に失敗しました: ${res.status} ${await res.text()}`);
  }
}

export async function sendAlert(config: Config, alert: AlertPayload): Promise<void> {
  const message = formatMessage(alert);
  console.log(`[ALERT] ${message.replace(/\n/g, " | ")}`);

  const tasks: Promise<void>[] = [];
  if (config.discordWebhookUrl) {
    tasks.push(sendDiscord(config.discordWebhookUrl, message));
  }
  if (config.telegramBotToken && config.telegramChatId) {
    tasks.push(sendTelegram(config.telegramBotToken, config.telegramChatId, message));
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[notify] 通知送信エラー:", r.reason);
    }
  }
}
