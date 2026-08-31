import { ColumnPostForm } from "@/components/ColumnPostForm";

export default function NewColumnPage() {
  return (
    <ColumnPostForm
      category="CRYPTO_NEWS"
      heading="コラムを書く"
      intro="引用は短い範囲にとどめ、必ず引用元へのリンクを添えてください。あなた自身のコメントも書いてください。"
      loginPrompt="コラムを書くにはウォレットでログインしてください。"
      sourceNameLabel="引用元の名前(メディア名など)"
      quoteLabel="引用"
      commentaryLabel="あなたのコメント"
      detailBasePath="/columns"
    />
  );
}
