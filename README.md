# CoinLife

仮想通貨の売買損益を競うコミュニティWebアプリ。資金は一切預からず、各自の取引所口座を読み取り専用で連携して損益率を競う(Phase 1)。加えて、参加のコミットメントとして自分のSOLを自分でロックできるSolanaプログラムも用意(手数料は一律・不変で他の参加者への分配なし)。

設計判断の経緯(法的リスクの検討過程含む)は `../.claude/plans/virtual-purring-wadler.md` を参照。

```
coinlife/
  web/         # Next.jsアプリ本体 — セットアップは web/README.md 参照
  program/     # Solana Anchorプログラム(lock_vault) — セットアップは program/README.md 参照
  meme-board/  # ミームコイン情報ボード(CoinLifeとは独立した別アプリ) — meme-board/README.md 参照
```

## meme-board(ミームコイン情報ボード)について

`meme-board/` は、CoinLifeとはアカウント・DBを共有しない独立したアプリです。世界のミームコイン関連ニュースと市場データを複数の公開情報源からそのまま集約して並べるだけで、分析・予想・売買推奨は行いません。判断は閲覧者自身に委ねるコンセプトです。詳細は `meme-board/README.md` を参照してください。

## 今すぐ動かす

資金を扱わない部分(取引所連携・大会・リーダーボード)はWindows上でそのまま動きます:

```bash
cd web
npm install
npm run dev
```

## Solanaロック機能を使うには

WSL2上でRust/Anchorのセットアップが必要です。`program/README.md` を参照してください。
