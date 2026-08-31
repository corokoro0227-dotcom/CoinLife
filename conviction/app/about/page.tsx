import { cookies } from "next/headers";
import { FEEDS, BULLISH_WORDS, BEARISH_WORDS } from "@/lib/feeds";
import { COINS } from "@/lib/coins";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { translateToJapanese } from "@/lib/translate";

const SECTIONS_EN = {
  intro:
    "This page explains exactly how No Conviction, No Coin decides what you see, so the restriction feels like an honest tool rather than a black box.",
  sourcesTitle: "News sources",
  sourcesBody:
    "Articles come only from the public RSS feeds listed below. We don't write, edit, or select individual stories — every item that mentions your coin is included automatically, filtered only by the rules below.",
  languageTitle: "Language",
  languageBody:
    "All sources are in English — that's where the fastest, highest-volume crypto reporting is. Switching to Japanese does not add different sources; it machine-translates the same English headlines and excerpts, so translation quality is not guaranteed. The original article link is always shown so you can check the source directly.",
  coinMatchTitle: "How an article is matched to your coin",
  coinMatchBody:
    "An article is included if its title or excerpt mentions your coin's name or an unambiguous ticker/cashtag. For short or common-word tickers (like LINK, NEAR, ATOM, OP, UNI, DOT) we require the full project name or a $TICKER form rather than the bare symbol, to cut down on false matches — this means some real mentions may be missed too.",
  stanceTitle: "How bullish / bearish is decided",
  stanceBody:
    "This is a pure word count, nothing else. We count how many bullish-leaning words and how many bearish-leaning words appear in the title and excerpt; whichever count is higher decides the label. A tie, or zero of either, means the article isn't shown to anyone. This is not sentiment analysis and it is not our opinion of the coin — a headline about a crash is labeled bearish even for a reader who wants exactly that news to time a purchase.",
  bullishWordsTitle: "Bullish-leaning words",
  bearishWordsTitle: "Bearish-leaning words",
  disclaimerTitle: "Disclaimer",
  disclaimerBody:
    "No Conviction, No Coin does not provide financial advice and does not recommend buying, selling, or holding any asset. It aggregates existing public reporting only. The accuracy of any article is the responsibility of its original publisher, not us. Make your own decisions and do your own research.",
};

export default async function AboutPage() {
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get(LANG_COOKIE)?.value === "ja" ? "ja" : "en";

  let sections = SECTIONS_EN;
  if (lang === "ja") {
    const keys = Object.keys(SECTIONS_EN) as (keyof typeof SECTIONS_EN)[];
    const translated = await translateToJapanese(keys.map((key) => SECTIONS_EN[key]));
    if (translated) {
      sections = Object.fromEntries(keys.map((key, i) => [key, translated[i] ?? SECTIONS_EN[key]])) as typeof SECTIONS_EN;
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold">About</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{sections.intro}</p>
      </div>

      <section>
        <h2 className="text-base font-semibold">{sections.sourcesTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{sections.sourcesBody}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          {FEEDS.map((feed) => (
            <li key={feed.url}>
              <a href={feed.url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-zinc-800 dark:hover:text-zinc-200">
                {feed.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold">{sections.languageTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{sections.languageBody}</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">{sections.coinMatchTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{sections.coinMatchBody}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Candidate coins: {COINS.map((coin) => `${coin.name} (${coin.symbol})`).join(", ")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold">{sections.stanceTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{sections.stanceBody}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{sections.bullishWordsTitle}</h3>
            <p className="mt-1 text-xs text-zinc-500">{BULLISH_WORDS.map((w) => w.replace(/\\b/g, "")).join(", ")}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-red-700 dark:text-red-400">{sections.bearishWordsTitle}</h3>
            <p className="mt-1 text-xs text-zinc-500">{BEARISH_WORDS.map((w) => w.replace(/\\b/g, "")).join(", ")}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">{sections.disclaimerTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{sections.disclaimerBody}</p>
      </section>
    </div>
  );
}
