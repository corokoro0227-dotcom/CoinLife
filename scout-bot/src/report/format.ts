import type { CoinCandidate, ScanReport } from "../types.js";

function formatCandidate(c: CoinCandidate, index: number): string {
  const v = c.verification;
  const contractLine = v.verified
    ? `${v.address} (${v.source}${v.explorerUrl ? `, ${v.explorerUrl}` : ""})`
    : `未検証(${v.source})`;

  const accounts = c.earliestAccounts
    .map((a) => `  - @${a.handle} — ${a.postedAt} — ${a.url}`)
    .join("\n");

  return [
    `## ${index + 1}. $${c.ticker} (${c.chain})`,
    "",
    `1. **名称/ティッカー/チェーン/コントラクト**: $${c.ticker} / ${c.chain} / ${contractLine}`,
    `2. **注目のきっかけ**: ${c.whatStartedAttention}`,
    `3. **最初に発信した信頼できるアカウント**:\n${accounts || "  (該当なし)"}`,
    `4. **今後も拡散しそうな理由**: ${c.whyMightSpread.map((r) => `- ${r}`).join("\n")}`,
    `5. **自然発生 or 組織的**: ${c.coordination}(${c.coordinationNotes})`,
    `6. **早期トラクションスコア**: ${c.tractionScore}/10`,
    `7. **次の1時間で見るべきこと**:\n${c.watchNextHour.map((w) => `  - ${w}`).join("\n")}`,
    "",
    "根拠となった投稿:",
    ...c.supportingPosts.map((p) => `  - [${p.postedAt}] @${p.authorHandle}: "${p.text}" — ${p.url}`),
  ].join("\n");
}

export function formatReportMarkdown(report: ScanReport): string {
  const header = [
    `# Memecoin Scout レポート`,
    `スキャン時刻: ${report.scannedAt}`,
    `対象チェーン: ${report.chains.join(", ")}`,
    `直近ウィンドウ: ${report.windowHours}時間 (過去24時間平均と比較)`,
    "",
  ].join("\n");

  if (report.candidates.length === 0) {
    return `${header}${report.note ?? "候補はありませんでした"}\n`;
  }

  return `${header}${report.candidates.map((c, i) => formatCandidate(c, i)).join("\n\n---\n\n")}\n`;
}
