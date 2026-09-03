import { config } from "../config.js";
import type { ScanReport } from "../types.js";

const MAX_LEN = 3800; // Discord/Slackのメッセージ長制限に収める

function truncate(text: string): string {
  return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}\n...(省略)` : text;
}

function buildPayload(markdown: string): Record<string, unknown> {
  switch (config.notifyWebhookKind) {
    case "discord":
      return { content: truncate(markdown) };
    case "slack":
      return { text: truncate(markdown) };
    default:
      return { text: truncate(markdown) };
  }
}

/**
 * 通知のみ。発注は一切行わない。webhook未設定なら何もしない
 * (呼び出し側でconsole出力と併用する想定)。
 */
export async function notifyWebhook(report: ScanReport, markdown: string): Promise<void> {
  if (!config.notifyWebhookUrl) return;
  if (report.candidates.length === 0) return; // ノイズを避けるため、候補がない回は送らない

  const res = await fetch(config.notifyWebhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildPayload(markdown)),
  });

  if (!res.ok) {
    throw new Error(`webhook通知に失敗しました: ${res.status} ${await res.text().catch(() => "")}`);
  }
}
