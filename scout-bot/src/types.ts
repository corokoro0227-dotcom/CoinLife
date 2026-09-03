export type Chain = "solana" | "base" | "bnb" | "hyperevm" | "robinhood";

/** X(Twitter)の投稿1件。プロバイダはこの形に正規化して返す。 */
export interface Post {
  id: string;
  url: string;
  text: string;
  authorHandle: string;
  authorId: string;
  authorFollowers: number | null;
  authorCreatedAt: string | null; // ISO8601, アカウント作成日(bot判定に使う)
  createdAt: string; // ISO8601
  likeCount: number;
  repostCount: number;
}

/** 1つのティッカー/キーワードに対する検索結果。 */
export interface SignalWindow {
  query: string;
  posts: Post[];
}

/** live X Search を行うデータソースの共通インターフェース。 */
export interface SignalProvider {
  readonly name: string;
  /**
   * 指定した時間窓(sinceHours時間前〜now)の投稿を検索する。
   * queries は探索対象のキーワード/カシュタグ群(例: 新規上場コインのシンボル候補)。
   */
  search(queries: string[], sinceHours: number): Promise<SignalWindow[]>;
  /**
   * 直近で話題になっているカシュタグ/新規ティッカーらしき文字列を発見するための
   * 広いキーワードでの探索("new memecoin", "just launched" 等)。
   */
  discoverCandidateTickers(sinceHours: number): Promise<string[]>;
}

export interface ContractVerification {
  verified: boolean;
  chain: Chain;
  address: string | null;
  name: string | null;
  symbol: string | null;
  source: string; // どこで検証したか(例: "solana-rpc+pumpfun", "base-rpc", "unverified: no RPC configured")
  explorerUrl: string | null;
}

export type Coordination = "organic" | "coordinated" | "mixed" | "unknown";

export interface CoinCandidate {
  ticker: string;
  chain: Chain;
  verification: ContractVerification;
  firstSeenAt: string; // ISO8601, このボットが最初に検出した時刻
  whatStartedAttention: string;
  earliestAccounts: { handle: string; url: string; postedAt: string }[];
  whyMightSpread: string[];
  coordination: Coordination;
  coordinationNotes: string;
  tractionScore: number; // 1-10
  watchNextHour: string[];
  supportingPosts: { url: string; authorHandle: string; postedAt: string; text: string }[];
}

export interface ScanReport {
  scannedAt: string;
  windowHours: number;
  chains: Chain[];
  candidates: CoinCandidate[];
  note: string | null; // 例: "有意な初動は見つかりませんでした"
}
