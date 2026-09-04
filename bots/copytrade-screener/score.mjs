#!/usr/bin/env node
// MEXCコピートレードの画面に表示されている数値を手入力し、客観基準でスコアリングする。
// MEXCにはコピートレードのランキング/成績を取得できる公開APIが存在しないため、
// 自動取得は行わない(非公開エンドポイントの推測利用はしない)。

import { readFileSync } from "node:fs";

const WEIGHTS = {
  trackRecord: 25,
  drawdown: 25,
  winRate: 15,
  frequency: 10,
  profitShare: 10,
  leverage: 15,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function scoreTrackRecord(days) {
  if (days == null) return { score: 0, flag: "稼働日数が未入力(信頼性を評価できない)" };
  const score = clamp((days / 365) * 100, 0, 100);
  const flag = days < 90 ? "稼働期間が3ヶ月未満(複数の相場局面を経験していない可能性)" : null;
  return { score, flag };
}

function scoreDrawdown(pct) {
  if (pct == null) {
    return {
      score: 0,
      flag: "最大ドローダウンが未入力(最重要のリスク指標が不明。未入力は高リスク扱い)",
    };
  }
  const score = clamp(100 - pct * 2, 0, 100);
  const flag = pct >= 40 ? `最大ドローダウンが${pct}%と大きい` : null;
  return { score, flag };
}

function scoreWinRate(pct) {
  if (pct == null) return { score: 50, flag: "勝率が未入力" };
  let score;
  if (pct < 50) score = pct * 1.2;
  else if (pct < 90) score = 60 + (pct - 50);
  else score = clamp(100 - (pct - 90) * 4, 0, 100);
  const flag = pct >= 95 ? "勝率が極端に高い(母数が少ない/都合の良い実績のみ表示している可能性)" : null;
  return { score, flag };
}

function scoreFrequency(perWeek) {
  if (perWeek == null) return { score: 50, flag: "取引頻度が未入力" };
  let score;
  if (perWeek < 2) score = perWeek * 20;
  else if (perWeek <= 30) score = 100;
  else score = clamp(100 - (perWeek - 30) * 2, 0, 100);
  const flag =
    perWeek > 50
      ? "取引頻度が非常に高い(過剰トレード/ギャンブル的運用の可能性)"
      : perWeek < 1
        ? "取引頻度が非常に低い(休眠アカウントの可能性)"
        : null;
  return { score, flag };
}

function scoreProfitShare(pct) {
  if (pct == null) return { score: 50, flag: "利益分配率が未入力" };
  const score = clamp(100 - pct * 3, 0, 100);
  return { score, flag: null };
}

function scoreLeverage(x) {
  if (x == null) return { score: 50, flag: "レバレッジ倍率が未入力" };
  const score = clamp(100 - x * 1.5, 0, 100);
  const flag = x >= 30 ? `常用レバレッジが${x}倍と高い(強制清算リスク大)` : null;
  return { score, flag };
}

function evaluateTrader(t) {
  const parts = {
    trackRecord: scoreTrackRecord(t.trackRecordDays),
    drawdown: scoreDrawdown(t.maxDrawdownPct),
    winRate: scoreWinRate(t.winRate7dPct),
    frequency: scoreFrequency(t.tradesPerWeek),
    profitShare: scoreProfitShare(t.profitShareRatio),
    leverage: scoreLeverage(t.typicalLeverage),
  };

  let total = 0;
  const flags = [];
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    total += (parts[key].score * weight) / 100;
    if (parts[key].flag) flags.push(parts[key].flag);
  }

  if (
    t.trackRecordDays != null &&
    t.trackRecordDays < 60 &&
    t.aumUsdt != null &&
    t.aumUsdt > 100000
  ) {
    flags.push("稼働3ヶ月未満で運用資金(AUM)が急拡大している(一時的なブームの可能性)");
  }

  return { name: t.name, total: Math.round(total * 10) / 10, flags, parts };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("使い方: node score.mjs <traders.json>");
    process.exit(1);
  }

  const traders = JSON.parse(readFileSync(path, "utf8"));
  const results = traders.map(evaluateTrader).sort((a, b) => b.total - a.total);

  console.log("=== コピートレード スクリーニング結果(参考指標であり、投資助言ではありません) ===\n");
  for (const r of results) {
    console.log(`${r.name}: スコア ${r.total}/100`);
    if (r.flags.length > 0) {
      for (const f of r.flags) console.log(`  ⚠ ${f}`);
    }
    console.log();
  }

  console.log(
    "注意: このスコアは過去の入力データに基づく参考値であり、将来の成績を保証するものではありません。\n" +
      "スコアが高くても資産の一部のみで試す、複数トレーダーに分散する、といったリスク管理を推奨します。",
  );
}

main();
