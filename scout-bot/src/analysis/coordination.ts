import type { Coordination, Post } from "../types.js";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "") // 絵文字・記号を除去(コピペ検知の邪魔になるため)
    .replace(/\s+/g, " ")
    .trim();
}

export interface CoordinationResult {
  coordination: Coordination;
  notes: string;
  independentAccountCount: number;
  duplicateTextRatio: number;
}

/**
 * 複数アカウントからの自然な拡散か、コピペ/bot連投による組織的な拡散かを
 * ヒューリスティックで判定する。断定はせず根拠(重複率・投稿間隔)を残す。
 */
export function analyzeCoordination(posts: Post[]): CoordinationResult {
  if (posts.length === 0) {
    return { coordination: "unknown", notes: "投稿が見つかりません", independentAccountCount: 0, duplicateTextRatio: 0 };
  }

  const uniqueAuthors = new Set(posts.map((p) => p.authorHandle));
  const independentAccountCount = uniqueAuthors.size;

  const normalized = posts.map((p) => normalizeText(p.text));
  const counts = new Map<string, number>();
  for (const t of normalized) counts.set(t, (counts.get(t) ?? 0) + 1);
  const maxDuplicateCount = Math.max(...counts.values());
  const duplicateTextRatio = maxDuplicateCount / posts.length;

  // 短時間(90秒以内)に連投されているペアの割合
  const sortedTimes = posts.map((p) => new Date(p.createdAt).getTime()).sort((a, b) => a - b);
  let burstPairs = 0;
  for (let i = 1; i < sortedTimes.length; i++) {
    if (sortedTimes[i] - sortedTimes[i - 1] < 90 * 1000) burstPairs++;
  }
  const burstRatio = sortedTimes.length > 1 ? burstPairs / (sortedTimes.length - 1) : 0;

  const authorDiversityRatio = independentAccountCount / posts.length;

  const signals: string[] = [];
  let coordinatedScore = 0;

  if (duplicateTextRatio >= 0.5) {
    coordinatedScore += 2;
    signals.push(`同一/ほぼ同一文面が${Math.round(duplicateTextRatio * 100)}%`);
  }
  if (burstRatio >= 0.5) {
    coordinatedScore += 1;
    signals.push(`90秒以内の連投が${Math.round(burstRatio * 100)}%`);
  }
  if (authorDiversityRatio < 0.4) {
    coordinatedScore += 1;
    signals.push(`投稿数に対して発信アカウント数が少ない(${independentAccountCount}/${posts.length})`);
  }

  let coordination: Coordination;
  if (posts.length < 3) {
    coordination = "unknown";
  } else if (coordinatedScore >= 3) {
    coordination = "coordinated";
  } else if (coordinatedScore >= 1) {
    coordination = "mixed";
  } else {
    coordination = "organic";
  }

  const notes =
    signals.length > 0
      ? signals.join(" / ")
      : `${independentAccountCount}件の独立アカウントから重複の少ない投稿`;

  return { coordination, notes, independentAccountCount, duplicateTextRatio };
}
