# CoinLife (web)

資金を預からない、取引所連携ベースの仮想通貨トレード実績コミュニティアプリ。設計の背景は `../.claude/plans/virtual-purring-wadler.md` 参照。

## 現状

- 認証: Solanaウォレット署名によるログイン(Sign-In With Solana, パスワード不要)
- 取引所連携: Binance/Bybit/OKXのAPIキー(読み取り専用推奨)を暗号化保存し、ccxt経由で残高を取得
- 大会: 作成・参加・損益率リーダーボード(資金移動なし)
- コミットロック機能: Solanaプログラム(`../program`)が未デプロイのため、UIは表示されるが「準備中」扱い。`../program/README.md` の手順でWSL上でビルド・デプロイし、環境変数を設定すると有効になる。

## セットアップ

```bash
npm install
cp .env.example .env   # 値を埋める。ENCRYPTION_KEY / NEXTAUTH_SECRET / CRON_SECRET は下記コマンドで生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # ENCRYPTION_KEY, NEXTAUTH_SECRET用
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"      # CRON_SECRET用
npx prisma migrate dev
npm run dev
```

## 取引所APIキーについて

接続時は**必ず「読み取り専用(Read-Only)」権限のみ**のAPIキーを発行してください。出金・取引権限を絶対に付与しないでください。シークレットはAES-256-GCMで暗号化してDBに保存されます(`lib/crypto.ts`)。

## 残高スナップショットの定期実行

`vercel.json` にVercel Cron設定済み(15分毎に `/api/cron/snapshot` を実行)。Vercelプロジェクトの環境変数に `CRON_SECRET` を設定すると、Vercelが自動的にその値をBearerトークンとして送信します。Vercel以外にデプロイする場合は、同等のスケジューラ(cron)から `Authorization: Bearer $CRON_SECRET` 付きでこのエンドポイントを叩いてください。

## コラムの自動投稿

`vercel.json` に毎日21時(JST、`0 12 * * *` UTC)実行の `/api/cron/daily-column` を設定済み。CoinDesk/Cointelegraph のRSSフィードから直近24時間で最新の記事を1本取得し、見出しと短い抜粋+引用元リンクだけを自動投稿します(本文の転載はしません)。外部APIの登録は不要です。同日中に既に自動投稿済みなら何もしません(1日1本)。

## ミームコイン掲示板

`/meme-coins` に、世界のミームコインのトレンド・今後の予想を集める掲示板を用意。`vercel.json` に毎日21時05分(JST、`30 12 * * *` UTC)実行の `/api/cron/daily-meme-coin` を設定済みで、CoinGeckoの公開API(登録不要)からミームコインカテゴリの時価総額上位銘柄の値動きと検索トレンドを取得し、自動投稿します(1日1本)。ログイン中のユーザーは `/meme-coins/new` から自分の情報・見解を投稿することもできます。掲載情報は投資助言ではなく、特定銘柄の売買を推奨するものではありません。

## メール通知を有効にする

ログイン方法(ウォレット署名)はそのままに、`/account` から通知用メールアドレスを任意で追加できます。実際にメールを送るには [Resend](https://resend.com) に登録してAPIキーを発行し、`.env` の `RESEND_API_KEY` に設定してください。未設定の場合は送信をスキップし、アプリ内通知(NavBarの「通知」)のみ動作します。独自ドメインを検証していない場合は `EMAIL_FROM` を既定の `onboarding@resend.dev` のままにしておけます(本番では自ドメインの検証を推奨)。

## Solanaロック機能を有効にする

1. `../program/README.md` の手順でWSL上にRust/Solana CLI/Anchorをセットアップ
2. treasuryキーを生成し `lib.rs` の `TREASURY` に反映してビルド・テスト
3. Devnetにデプロイ
4. `.env` の `NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID` と `NEXT_PUBLIC_TREASURY_PUBKEY` を設定
