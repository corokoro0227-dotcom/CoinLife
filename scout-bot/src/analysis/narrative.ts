import type { Post } from "../types.js";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "is", "are", "this", "that",
  "just", "now", "so", "im", "its", "it's", "for", "with", "at", "be", "not", "financial", "advice",
]);

const NARRATIVE_HINTS: { label: string; keywords: string[] }[] = [
  { label: "マスコット/画像ミーム由来", keywords: ["mascot", "cat", "dog", "frog", "meme image", "pfp"] },
  { label: "著名人/インフルエンサー言及", keywords: ["elon", "trump", "kol", "influencer"] },
  { label: "イベント/ニュース便乗", keywords: ["breaking", "news", "event", "announcement"] },
  { label: "取引所/プラットフォーム上場示唆", keywords: ["listing", "cex", "binance", "coinbase"] },
  { label: "エアドロップ/インセンティブ", keywords: ["airdrop", "reward", "incentive"] },
];

/** 実際に取得した投稿本文から、根拠のある「何が注目を集め始めたか」を作る。推測での創作はしない。 */
export function describeWhatStartedAttention(recentPosts: Post[]): string {
  if (recentPosts.length === 0) return "直近ウィンドウでの投稿が見つかりません";
  const earliest = [...recentPosts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0];
  const quote = earliest.text.length > 140 ? `${earliest.text.slice(0, 140)}...` : earliest.text;
  return `最初に検出された投稿(@${earliest.authorHandle}, ${earliest.createdAt}): "${quote}"`;
}

export function describeWhyMightSpread(posts: Post[]): string[] {
  const joined = posts.map((p) => p.text.toLowerCase()).join(" \n ");
  const reasons: string[] = [];

  for (const hint of NARRATIVE_HINTS) {
    if (hint.keywords.some((kw) => joined.includes(kw))) {
      reasons.push(hint.label);
    }
  }

  const wordCounts = new Map<string, number>();
  for (const p of posts) {
    const words = p.text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .match(/[a-z0-9']+/g) ?? [];
    for (const w of words) {
      if (w.length < 3 || STOPWORDS.has(w) || w.startsWith("$")) continue;
      wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
    }
  }
  const topWords = [...wordCounts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
  if (topWords.length > 0) {
    reasons.push(`繰り返し出てくるキーワード: ${topWords.join(", ")}`);
  }

  if (reasons.length === 0) {
    reasons.push("明確な拡散要因は投稿本文からは特定できず(要目視確認)");
  }
  return reasons;
}

export function buildWatchNextHour(params: {
  verified: boolean;
  coordination: string;
  growthMultiplier: number;
  independentAccountCount: number;
}): string[] {
  const items: string[] = [];
  if (!params.verified) {
    items.push("コントラクトが未検証。公式ローンチページ/エクスプローラーで実在を確認できるまで判断を保留");
  }
  if (params.coordination === "coordinated") {
    items.push("コピペ/bot連投の疑いが強い。新規の独立アカウントが増えるかどうかを確認");
  } else if (params.coordination === "mixed") {
    items.push("組織的な投稿と自然発生的な投稿が混在。次の1時間で独立アカウント比率が上がるか監視");
  } else {
    items.push("直近の伸びが1時間後も継続するか(投稿密度・独立アカウント数の推移)を確認");
  }
  if (params.independentAccountCount < 5) {
    items.push("発信元アカウント数がまだ少ない。他の独立アカウントに広がるかを注視");
  }
  if (params.growthMultiplier < 2) {
    items.push("伸び率がまだ緩やか。過去24時間平均比の倍率が加速するか確認");
  }
  return items;
}
