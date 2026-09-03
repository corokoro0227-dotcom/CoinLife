import type { Post, SignalProvider, SignalWindow } from "../types.js";

/**
 * APIキー無しでパイプライン(検証・スコアリング・レポート整形・通知)を
 * 動作確認するための固定フィクスチャ。実データではない。
 * 本番運用では SIGNAL_PROVIDER=x に切り替えること。
 */
export class MockSignalProvider implements SignalProvider {
  readonly name = "mock-fixture";

  async search(queries: string[], _sinceHours: number): Promise<SignalWindow[]> {
    const now = Date.now();
    const minutesAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();

    const fixtures: Record<string, Post[]> = {
      TESTCOIN: [
        makePost("alice_degen", 1, "TESTCOIN", "$TESTCOIN just launched, funny mascot, chart looks clean", minutesAgo(50), 40, 5),
        makePost("bob_onchain", 2, "TESTCOIN", "everyone in my TL is suddenly posting $TESTCOIN, weird timing", minutesAgo(35), 120, 20),
        makePost("carol_trader", 3, "TESTCOIN", "not financial advice but $TESTCOIN narrative is spreading fast", minutesAgo(20), 30, 3),
      ],
      SPAMCOIN: [
        makePost("bot_acct_01", 4, "SPAMCOIN", "🚀🚀 $SPAMCOIN to the moon 🚀🚀 buy now", minutesAgo(10), 2, 400),
        makePost("bot_acct_02", 5, "SPAMCOIN", "🚀🚀 $SPAMCOIN to the moon 🚀🚀 buy now", minutesAgo(9), 1, 380),
        makePost("bot_acct_03", 6, "SPAMCOIN", "🚀🚀 $SPAMCOIN to the moon 🚀🚀 buy now", minutesAgo(9), 0, 410),
      ],
    };

    return queries.map((query) => ({
      query,
      posts: fixtures[query.toUpperCase()] ?? [],
    }));
  }

  async discoverCandidateTickers(_sinceHours: number): Promise<string[]> {
    return ["TESTCOIN", "SPAMCOIN"];
  }
}

function makePost(
  handle: string,
  authorId: number,
  ticker: string,
  text: string,
  createdAt: string,
  followers: number,
  likes: number
): Post {
  return {
    id: `${ticker}-${authorId}-${createdAt}`,
    url: `https://x.com/${handle}/status/mock-${authorId}`,
    text,
    authorHandle: handle,
    authorId: String(authorId),
    authorFollowers: followers,
    authorCreatedAt: null,
    createdAt,
    likeCount: likes,
    repostCount: 0,
  };
}
