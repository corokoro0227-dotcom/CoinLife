import type { Metadata } from "next";
import Link from "next/link";
import { IconWallet, IconCycle, IconSeedling, IconStack, IconGlobe } from "@/components/icons";

export const metadata: Metadata = {
  title: "コンセプト | CoinLife",
  description: "仮想通貨のある日常を。CoinLifeが目指していること。",
};

function Point({
  icon: Icon,
  title,
  description,
  linkHref,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex gap-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <Icon className="h-8 w-8 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">{description}</p>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="mt-2 inline-block text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300">
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ConceptPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 pb-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">仮想通貨のある日常を。</h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          仮想通貨というと、大きく稼いだ人の話ばかりが目立ちます。でも実際に多くの人が求めているのは、そういう特別な出来事ではなく、無理なく続けられる習慣だと思います。CoinLifeは、仮想通貨を特別なイベントではなく暮らしの一部にするためのコミュニティです。
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">作っている人について</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          CoinLifeは、仮想通貨大好き大学生が一人で作っているサービスです。授業の合間にチャートを眺めたり、友人と値動きの話で盛り上がったりするうちに、この面白さをもっと多くの人に知ってほしいと思うようになりました。難しい専門用語や大きな資金が必要な世界だと思われがちな仮想通貨を、もっと身近なものにしたい。CoinLifeは、その気持ちから作りました。
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold">その気持ちを支える仕組み</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          仮想通貨の魅力を広めるといっても、無理に煽ったり、大きなリスクを取らせたりしたくはありません。誰でも安心して始められるように、次のような仕組みを用意しています。
        </p>
        <Point
          icon={IconWallet}
          title="気負わず参加できる"
          description="資金は一切預からず、参加費もありません。取引所口座を読み取り専用で連携するだけです。"
          linkHref="/exchanges"
          linkLabel="取引所を連携する"
        />
        <Point
          icon={IconCycle}
          title="生活のリズムに合わせる"
          description="大会はエントリー期間3日、大会期間1週間のサイクルで、終わった瞬間から次の回が自動で始まります。毎週のルーティンとして続けられます。"
          linkHref="/contests"
          linkLabel="大会一覧を見る"
        />
        <Point
          icon={IconSeedling}
          title="小さく始められる"
          description="コミットロック機能は0.01 SOLという少額から試せます。大きく賭ける必要はありません。"
          linkHref="/transparency"
          linkLabel="手数料の内訳を見る"
        />
        <Point
          icon={IconStack}
          title="積み重ねが見える"
          description="累計ロック額に応じたバッジや連続参加の記録がプロフィールに残ります。一発の成果ではなく、日々の積み重ねが実績になります。"
        />
        <Point
          icon={IconGlobe}
          title="世界の話題を届ける"
          description="海外・国内で話題になっている仮想通貨関連の記事を、短い引用と一言コメントで紹介するコラムを掲載しています。"
          linkHref="/columns"
          linkLabel="コラムを読む"
        />
      </div>

      <div className="flex gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Link
          href="/contests"
          className="rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          大会に参加する
        </Link>
        <Link
          href="/"
          className="rounded-none border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        >
          トップに戻る
        </Link>
      </div>
    </div>
  );
}
