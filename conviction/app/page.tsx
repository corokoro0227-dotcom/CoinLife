import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { translateToJapanese } from "@/lib/translate";

const PITCH_EN = [
  "Crypto information is noisy on purpose. Hype threads, contradicting takes, and \"experts\" flip-flopping by the hour make it hard to hold a decision you already made carefully.",
  "No Conviction, No Coin is built around one restriction: at signup you pick exactly one coin (Bitcoin or a serious, established altcoin — no meme coins) and exactly one stance — do you want to keep seeing bullish-leaning coverage, or bearish/risk-leaning coverage?",
  "That's it. Afterward you can't change it. Your dashboard only ever shows news matching that coin and that direction, pulled straight from real news sources with links back to the original article. No editorializing, no predictions from us — just the sources that match what you decided to pay attention to.",
];

const PITCH_JA_FALLBACK = [
  "暗号資産の情報は意図的にノイズだらけです。煽りスレッド、矛盾する意見、コロコロ変わる「専門家」の見解に振り回されて、せっかく慎重に決めた判断を保つのが難しくなります。",
  "No Conviction, No Coin はたった一つの制約で成り立っています: 登録時にコインを1つだけ(ビットコインか、真面目で確立されたアルトコイン — ミームコインは対象外)、スタンスを1つだけ(強気寄りの報道を見続けたいか、弱気・警戒寄りの報道を見続けたいか)選びます。",
  "それだけです。以降は変更できません。ダッシュボードには、そのコイン・その方向性に一致するニュースだけが、元記事へのリンク付きでそのまま表示されます。当サイトによる分析や予想は一切なし — あなたが注目すると決めた情報源だけです。",
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get(LANG_COOKIE)?.value === "ja" ? "ja" : "en";

  let pitch = PITCH_EN;
  if (lang === "ja") {
    const translated = await translateToJapanese(PITCH_EN);
    pitch = translated ?? PITCH_JA_FALLBACK;
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          {lang === "ja" ? "1つのコイン。1つのスタンス。もう迷わない。" : "One coin. One stance. No wavering."}
        </h1>
        <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {pitch.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href="/onboarding"
          className="bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          {lang === "ja" ? "コインとスタンスを決める" : "Lock in your coin & stance"}
        </Link>
        <Link
          href="/login"
          className="border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
        >
          {lang === "ja" ? "ログイン" : "Log in"}
        </Link>
      </div>
    </div>
  );
}
