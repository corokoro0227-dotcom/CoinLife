import type { Coordination, Post } from "../types.js";

export interface TractionInput {
  recentPosts: Post[];
  priorPosts: Post[]; // recentPosts を含まない、それより前の24h分
  recentHours: number;
  priorHours: number;
  coordination: Coordination;
  independentAccountCount: number;
}

export interface TractionResult {
  score: number; // 1-10
  growthMultiplier: number;
  reasoning: string;
}

/**
 * 「直近1-3時間」対「それ以前の24時間」の投稿密度の伸び、独立アカウント数、
 * エンゲージメント、組織的拡散の疑いを組み合わせて 1-10 のスコアを出す。
 * 断定的な投資判断ではなく、あくまで早期注目度の目安。
 */
export function computeTractionScore(input: TractionInput): TractionResult {
  const recentDensity = input.recentPosts.length / Math.max(input.recentHours, 0.5);
  const priorDensity = input.priorPosts.length / Math.max(input.priorHours, 1);
  const growthMultiplier = recentDensity / Math.max(priorDensity, 0.1);

  let score = Math.min(5, input.independentAccountCount);

  if (growthMultiplier >= 5) score += 3;
  else if (growthMultiplier >= 2) score += 2;
  else if (growthMultiplier >= 1.2) score += 1;

  const totalLikes = input.recentPosts.reduce((sum, p) => sum + p.likeCount, 0);
  const avgLikes = input.recentPosts.length > 0 ? totalLikes / input.recentPosts.length : 0;
  if (avgLikes >= 20) score += 1;

  if (input.coordination === "coordinated") score = Math.min(score, 3);
  else if (input.coordination === "mixed") score = Math.max(1, score - 2);

  score = Math.max(1, Math.min(10, Math.round(score)));

  const reasoning =
    `独立アカウント${input.independentAccountCount}件、` +
    `直近${input.recentHours}時間の投稿密度は過去24時間平均の約${growthMultiplier.toFixed(1)}倍、` +
    `平均いいね${avgLikes.toFixed(0)}、拡散パターンは${input.coordination}`;

  return { score, growthMultiplier, reasoning };
}
