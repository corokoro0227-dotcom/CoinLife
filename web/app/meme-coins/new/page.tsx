import { ColumnPostForm } from "@/components/ColumnPostForm";

export default function NewMemeCoinPostPage() {
  return (
    <ColumnPostForm
      category="MEME_COIN"
      heading="ミームコイン情報を投稿する"
      intro="引用は短い範囲にとどめ、必ず引用元へのリンクを添えてください。トレンドや今後の予想はあなた自身の見解として書いてください(投資助言ではありません)。"
      loginPrompt="投稿するにはウォレットでログインしてください。"
      sourceNameLabel="引用元の名前(メディア・SNS・データソースなど)"
      quoteLabel="引用・データ"
      commentaryLabel="あなたのコメント・今後の予想"
      detailBasePath="/columns"
    />
  );
}
