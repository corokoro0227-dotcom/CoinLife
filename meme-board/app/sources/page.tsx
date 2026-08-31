import type { Metadata } from "next";
import { FEEDS } from "@/lib/feeds";

export const metadata: Metadata = {
  title: "情報源について | ミームコイン情報ボード",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default function SourcesPage() {
  return (
    <div className="flex flex-col gap-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold">情報源について</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          このページでは、トップページに表示している情報がどこから来て、どういう機械的なルールで振り分けられているかを説明します。
          当サイトの担当者が記事を選んだり、書き直したり、意見を加えたりすることはありません。
        </p>
      </div>

      <Section title="ニュース記事の情報源">
        <p>以下のRSSフィードを定期的に取得し、内容にミームコイン関連のキーワードが含まれる記事だけを抽出しています。</p>
        <ul className="list-disc space-y-1 pl-5">
          {FEEDS.map((feed) => (
            <li key={feed.url}>
              <a href={feed.url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-zinc-800 dark:hover:text-zinc-200">
                {feed.name}
              </a>
            </li>
          ))}
        </ul>
        <p>
          記事のタイトル・抜粋の全文を転載することはなく、短い抜粋と出典元へのリンクのみを掲載しています。全文は必ずリンク先の出典記事でご確認ください。
        </p>
      </Section>

      <Section title="「トレンド」「今後の予想」の振り分け方">
        <p>
          取得した記事のうち、見出し・抜粋に predict / forecast / outlook / price target / could reach / expects /
          projection / set to / next bull run といった、予想・見通しを示す英語表現が含まれる記事を「今後の予想として報じられている記事」に、
          それ以外を「現在のトレンドとして報じられている記事」に振り分けています。
        </p>
        <p>
          これはあくまで文字列の一致による機械的な分類であり、当サイトがその予想の妥当性を評価・保証するものではありません。
          分類がずれている場合もあり得ます。
        </p>
      </Section>

      <Section title="市場データの情報源">
        <p>
          価格・時価総額・24時間騰落率は
          <a
            href="https://www.coingecko.com/en/categories/meme-token"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mx-1 underline hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            CoinGecko(ミームコインカテゴリ)
          </a>
          の公開APIからそのまま取得しており、当サイトによる加工・解釈(強気・弱気といった評価)は行っていません。
        </p>
      </Section>

      <Section title="免責事項">
        <p>
          当サイトは特定の暗号資産の売買を推奨・勧誘するものではなく、投資助言に該当するものでもありません。
          掲載情報は各出典元の内容にそのまま依拠しており、その正確性・完全性・最新性を保証するものではありません。
          取引の判断は、常にご自身の情報収集と責任において行ってください。
        </p>
      </Section>
    </div>
  );
}
