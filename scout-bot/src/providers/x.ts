import { config } from "../config.js";
import type { Post, SignalProvider, SignalWindow } from "../types.js";

const API_BASE = "https://api.x.com/2";

interface XApiUser {
  id: string;
  username: string;
  created_at?: string;
  public_metrics?: { followers_count?: number };
}

interface XApiTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: { like_count?: number; retweet_count?: number };
}

interface XApiSearchResponse {
  data?: XApiTweet[];
  includes?: { users?: XApiUser[] };
  meta?: { next_token?: string };
  errors?: unknown[];
  title?: string;
  detail?: string;
}

/**
 * 公式 X API v2 の "recent search" エンドポイントを使う実装。
 * Basic以上の有料プランと Bearer Token (X_BEARER_TOKEN) が必要。
 * https://developer.x.com/en/docs/x-api/tweets/search/api-reference/get-tweets-search-recent
 */
export class XApiProvider implements SignalProvider {
  readonly name = "x-api-recent-search";

  constructor(private readonly bearerToken: string) {}

  private async searchOnce(query: string, sinceHours: number): Promise<Post[]> {
    const startTime = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({
      query: `${query} -is:retweet`,
      start_time: startTime,
      max_results: "100",
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "created_at,public_metrics",
    });

    const res = await fetch(`${API_BASE}/tweets/search/recent?${params.toString()}`, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as XApiSearchResponse | null;
      throw new Error(
        `X API error ${res.status} for query "${query}": ${body?.title ?? ""} ${body?.detail ?? ""}`.trim()
      );
    }

    const body = (await res.json()) as XApiSearchResponse;
    const usersById = new Map((body.includes?.users ?? []).map((u) => [u.id, u]));

    return (body.data ?? []).map((t): Post => {
      const author = usersById.get(t.author_id);
      return {
        id: t.id,
        url: `https://x.com/${author?.username ?? "i"}/status/${t.id}`,
        text: t.text,
        authorHandle: author?.username ?? t.author_id,
        authorId: t.author_id,
        authorFollowers: author?.public_metrics?.followers_count ?? null,
        authorCreatedAt: author?.created_at ?? null,
        createdAt: t.created_at,
        likeCount: t.public_metrics?.like_count ?? 0,
        repostCount: t.public_metrics?.retweet_count ?? 0,
      };
    });
  }

  async search(queries: string[], sinceHours: number): Promise<SignalWindow[]> {
    const out: SignalWindow[] = [];
    for (const query of queries) {
      out.push({ query, posts: await this.searchOnce(query, sinceHours) });
    }
    return out;
  }

  async discoverCandidateTickers(sinceHours: number): Promise<string[]> {
    // 「新規ミームコイン」を示唆する広いクエリで投稿を集め、$TICKER形式の
    // カシュタグを頻度順に抽出する。実際の売買判断はしない、候補抽出のみ。
    const broadQueries = [
      '("just launched" OR "new memecoin" OR "new coin" OR "just deployed") (solana OR base OR bnb OR "hyperevm")',
      "(pump.fun OR pumpfun) (new OR launch)",
    ];
    const windows = await this.search(broadQueries, sinceHours);
    const counts = new Map<string, number>();
    const cashtagRe = /\$[A-Za-z][A-Za-z0-9]{1,9}\b/g;
    for (const w of windows) {
      for (const post of w.posts) {
        const matches = post.text.match(cashtagRe) ?? [];
        for (const m of matches) {
          const ticker = m.slice(1).toUpperCase();
          counts.set(ticker, (counts.get(ticker) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([ticker]) => ticker);
  }
}

export function createXApiProviderFromConfig(): SignalProvider {
  if (!config.xBearerToken) {
    throw new Error(
      "SIGNAL_PROVIDER=x ですが X_BEARER_TOKEN が設定されていません。.env に X APIのBearer Tokenを設定してください。"
    );
  }
  return new XApiProvider(config.xBearerToken);
}
