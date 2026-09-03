import { config } from "./config.js";
import { runScan } from "./scan.js";
import { formatReportMarkdown } from "./report/format.js";
import { notifyConsole } from "./notify/console.js";
import { notifyWebhook } from "./notify/webhook.js";

async function runOnce(): Promise<void> {
  const report = await runScan();
  const markdown = formatReportMarkdown(report);
  notifyConsole(markdown);
  await notifyWebhook(report, markdown);
}

async function main() {
  const command = process.argv[2] ?? "scan";

  if (command === "scan") {
    await runOnce();
    return;
  }

  if (command === "watch") {
    console.log(
      `watchモード開始: ${config.watchIntervalMinutes}分間隔でスキャンします。Ctrl+Cで終了。自動発注は行いません(通知のみ)。`
    );
    // 初回は即実行、以降は間隔ごとに実行
    await runOnce().catch((err) => console.error("スキャン中にエラー:", err));
    setInterval(() => {
      runOnce().catch((err) => console.error("スキャン中にエラー:", err));
    }, config.watchIntervalMinutes * 60 * 1000);
    return;
  }

  console.error(`不明なコマンド: ${command} (使えるのは "scan" または "watch")`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
