import { config } from "./config.js";
import { createSignalProvider } from "./providers/index.js";
import { verifyContract } from "./verify/index.js";
import { TickerDedupe } from "./analysis/dedupe.js";
import { analyzeCoordination } from "./analysis/coordination.js";
import { computeTractionScore } from "./analysis/scoring.js";
import { describeWhatStartedAttention, describeWhyMightSpread, buildWatchNextHour } from "./analysis/narrative.js";
import type { Chain, CoinCandidate, Post, ScanReport } from "./types.js";

const RECENT_HOURS = 3;
const BASELINE_HOURS = 24;
const MIN_INDEPENDENT_ACCOUNTS = 3; // これ未満は「有意な初動」とみなさない

function splitByRecency(posts: Post[], recentHours: number): { recent: Post[]; prior: Post[] } {
  const cutoff = Date.now() - recentHours * 60 * 60 * 1000;
  const recent: Post[] = [];
  const prior: Post[] = [];
  for (const p of posts) {
    (new Date(p.createdAt).getTime() >= cutoff ? recent : prior).push(p);
  }
  return { recent, prior };
}

/** ticker候補の中から実際にコントラクトアドレスらしき文字列を探す(公式リンク/自己申告のみ想定)。 */
function extractAddressCandidates(posts: Post[], chain: Chain): string[] {
  const re = chain === "solana" ? /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g : /\b0x[a-fA-F0-9]{40}\b/g;
  const found = new Set<string>();
  for (const p of posts) {
    for (const m of p.text.match(re) ?? []) found.add(m);
  }
  return [...found];
}

export async function runScan(): Promise<ScanReport> {
  const provider = createSignalProvider();
  const dedupe = new TickerDedupe();

  const candidateTickers = await provider.discoverCandidateTickers(BASELINE_HOURS);
  const newTickers: string[] = [];
  for (const t of candidateTickers) {
    if (await dedupe.isNew(t)) newTickers.push(t);
  }

  const windows = await provider.search(newTickers, BASELINE_HOURS);

  const candidates: CoinCandidate[] = [];

  for (const window of windows) {
    const { recent, prior } = splitByRecency(window.posts, RECENT_HOURS);
    if (recent.length === 0) continue;

    const coordinationResult = analyzeCoordination(recent);
    if (coordinationResult.independentAccountCount < MIN_INDEPENDENT_ACCOUNTS) continue;

    const traction = computeTractionScore({
      recentPosts: recent,
      priorPosts: prior,
      recentHours: RECENT_HOURS,
      priorHours: BASELINE_HOURS - RECENT_HOURS,
      coordination: coordinationResult.coordination,
      independentAccountCount: coordinationResult.independentAccountCount,
    });

    for (const chain of config.scanChains) {
      const addressCandidates = extractAddressCandidates(recent, chain);
      // 検証できるアドレスが投稿内に見つからない場合でも、注目度自体は報告する
      // (ただしverified=falseのまま。アドレスを推測・捏造することはしない)
      const verification = addressCandidates.length
        ? await verifyContract(chain, addressCandidates[0])
        : {
            verified: false,
            chain,
            address: null,
            name: null,
            symbol: null,
            source: "no contract address found in scanned posts",
            explorerUrl: null,
          };

      if (addressCandidates.length === 0 && chain !== config.scanChains[0]) continue; // 同じticker候補をチェーン数分重複報告しない

      const earliestAccounts = [...recent]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, 3)
        .map((p) => ({ handle: p.authorHandle, url: p.url, postedAt: p.createdAt }));

      candidates.push({
        ticker: window.query,
        chain,
        verification,
        firstSeenAt: new Date().toISOString(),
        whatStartedAttention: describeWhatStartedAttention(recent),
        earliestAccounts,
        whyMightSpread: describeWhyMightSpread(recent),
        coordination: coordinationResult.coordination,
        coordinationNotes: coordinationResult.notes,
        tractionScore: traction.score,
        watchNextHour: buildWatchNextHour({
          verified: verification.verified,
          coordination: coordinationResult.coordination,
          growthMultiplier: traction.growthMultiplier,
          independentAccountCount: coordinationResult.independentAccountCount,
        }),
        supportingPosts: recent.slice(0, 5).map((p) => ({
          url: p.url,
          authorHandle: p.authorHandle,
          postedAt: p.createdAt,
          text: p.text,
        })),
      });

      await dedupe.markSeen(window.query);
      break; // 最初にヒットしたチェーンで確定(複数チェーンに同名ティッカーが並列で出ることは稀)
    }
  }

  await dedupe.persist();

  candidates.sort((a, b) => b.tractionScore - a.tractionScore);
  const top = candidates.slice(0, config.maxResults);

  return {
    scannedAt: new Date().toISOString(),
    windowHours: RECENT_HOURS,
    chains: config.scanChains,
    candidates: top,
    note: top.length === 0 ? "有意な初動(独立アカウント3件以上での言及)は見つかりませんでした" : null,
  };
}
