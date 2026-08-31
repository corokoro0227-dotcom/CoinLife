// Core UI chrome only — always available instantly, no API dependency.
// Longer prose (landing pitch, /about methodology, legal text) stays
// English-canonical and is machine-translated on the fly via
// lib/translate.ts when the reader is in Japanese mode, same as article
// headlines. See /about for why: one English source of truth, translated
// for display rather than duplicated by hand.
export type Lang = "en" | "ja";

export const LANG_COOKIE = "conviction_lang";

const STRINGS = {
  en: {
    siteName: "No Conviction, No Coin",
    tagline: "One coin. One stance. No wavering.",
    navDashboard: "Dashboard",
    navAbout: "About",
    navLogout: "Log out",
    navLogin: "Log in",
    navLangToggle: "日本語",
    footerDisclaimer:
      "No Conviction, No Coin only aggregates existing public news. It does not analyze, predict, or recommend any trade. Nothing here is financial advice. Always make your own decisions.",
    yourCommitment: "Your commitment",
    coinLabel: "Coin",
    stanceLabel: "Watching for",
    bullish: "Bullish signals",
    bearish: "Bearish / risk signals",
    joinedOn: "Locked in on",
    tickerLoading: "Loading price…",
    tickerUnavailable: "Price temporarily unavailable",
    change24h: "24h",
    articlesHeading: "Matching articles",
    noArticles: "No matching articles right now — check back later.",
    emailNote: "New matching articles are emailed to you automatically. No need to check back.",
  },
  ja: {
    siteName: "No Conviction, No Coin",
    tagline: "コインは1つ、スタンスも1つ。もう迷わない。",
    navDashboard: "ダッシュボード",
    navAbout: "About",
    navLogout: "ログアウト",
    navLogin: "ログイン",
    navLangToggle: "English",
    footerDisclaimer:
      "No Conviction, No Coinは既存の公開ニュースを集約するだけです。分析・予想・売買推奨は一切行いません。掲載内容は投資助言ではありません。判断は必ずご自身で行ってください。",
    yourCommitment: "あなたのコミットメント",
    coinLabel: "コイン",
    stanceLabel: "追いたい材料",
    bullish: "強気(上昇)材料",
    bearish: "弱気(下落・警戒)材料",
    joinedOn: "確定日",
    tickerLoading: "価格を読み込み中…",
    tickerUnavailable: "現在、価格を取得できません",
    change24h: "24時間",
    articlesHeading: "該当する記事",
    noArticles: "現在、該当する記事はありません。また後で確認してください。",
    emailNote: "新着の該当記事は自動的にメールで届きます。見に来る必要はありません。",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

export function t(lang: Lang, key: StringKey): string {
  return STRINGS[lang][key];
}
