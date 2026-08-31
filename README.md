# CoinLife

仮想通貨の売買損益を競うコミュニティWebアプリ。資金は一切預からず、各自の取引所口座を読み取り専用で連携して損益率を競う(Phase 1)。加えて、参加のコミットメントとして自分のSOLを自分でロックできるSolanaプログラムも用意(手数料は一律・不変で他の参加者への分配なし)。

設計判断の経緯(法的リスクの検討過程含む)は `../.claude/plans/virtual-purring-wadler.md` を参照。

```
coinlife/
  web/          # Next.jsアプリ本体 — セットアップは web/README.md 参照
  program/      # Solana Anchorプログラム(lock_vault) — セットアップは program/README.md 参照
  conviction/   # Conviction(CoinLifeとは独立した別アプリ) — conviction/README.md 参照
```

## conviction について

`conviction/` は、CoinLifeとはアカウント・DBを共有しない独立したアプリです。登録時にコインを1つ、スタンス(強気/弱気どちらの報道を追いたいか)を1つだけ選び、以降は変更できません。ダッシュボードにはそのコイン・その方向性に一致する記事だけが表示されます — 他の意見に判断を揺さぶられないための、意図的な情報制限をコンセプトにしたアプリです。詳細は `conviction/README.md` を参照してください。

## 今すぐ動かす

資金を扱わない部分(取引所連携・大会・リーダーボード)はWindows上でそのまま動きます:

```bash
cd web
npm install
npm run dev
```

## Solanaロック機能を使うには

WSL2上でRust/Anchorのセットアップが必要です。`program/README.md` を参照してください。
