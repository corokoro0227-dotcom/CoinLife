# 本番公開チェックリスト(Devnet運用)

各項目に「あなたがやること」「私が用意できること」を明記しています。上から順に進めれば公開できます。

## 1. コードをGitHubに置く

- [ ] **あなた**: GitHubアカウントを用意し、新規リポジトリを作成
- [ ] **私**: ローカルでgit初期化・コミットの準備(実際のpushはあなたの許可を得てから)

```bash
cd coinlife
git init
git add .
git commit -m "Initial commit"
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

## 2. 本番データベース(Postgres)を用意する

今はローカルのSQLiteファイルを使っていますが、Vercelなどのサーバーレス環境では消えてしまうため、ホスティング型Postgresが必要です。

- [ ] **あなた**: [Neon](https://neon.tech)(無料枠あり、おすすめ)か[Supabase](https://supabase.com)にサインアップし、DBを作成、接続文字列(`postgresql://...`)を取得
- [ ] **私**: 接続文字列をいただければ、`prisma/schema.prisma`の`provider`を`postgresql`に変更し、Postgres向けのマイグレーションを作り直します(SQLite用マイグレーションはそのままでは使えないため)

⚠️ この切り替えを行うと、**ローカル開発でもPostgres接続が必要**になります(Neon等の無料枠を開発用DBとしてそのまま使えます)。

## 3. Vercelにデプロイする

- [ ] **あなた**: [Vercel](https://vercel.com)にサインアップし、GitHubリポジトリを接続してインポート(`coinlife/web`をルートディレクトリに指定)
- [ ] **あなた**: Vercelのプロジェクト設定 → Environment Variables に、以下を**新しく生成して**設定:

```bash
# それぞれ新しい値を生成(開発用を使い回さない)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # NEXTAUTH_SECRET, ENCRYPTION_KEY用に2回実行
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"      # CRON_SECRET用
```

| 変数 | 値 |
|---|---|
| `DATABASE_URL` | 手順2のPostgres接続文字列 |
| `NEXTAUTH_SECRET` | 新規生成 |
| `NEXTAUTH_URL` | 本番ドメイン(例: `https://coinlife.example.com`) |
| `ENCRYPTION_KEY` | 新規生成・**必ず安全な場所に控えておく**(紛失すると取引所APIキーが全て復号不能) |
| `CRON_SECRET` | 新規生成 |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com`(将来的にHeliusなど専用RPCへの切り替え推奨) |
| `NEXT_PUBLIC_TREASURY_PUBKEY` | 既存の値をそのまま |
| `RESEND_API_KEY` / `EMAIL_FROM` | Resendのキーを設定済みなら本番用に |

⚠️ **今セッションで使った開発用の`NEXTAUTH_SECRET`・`ENCRYPTION_KEY`・`CRON_SECRET`は、この会話ログに残っているため本番では絶対に使い回さないでください。**

## 4. Vercel Cronのプラン確認

`vercel.json`に15分毎・毎日21時のcronを2つ設定済みです。VercelのHobby(無料)プランはcronの実行頻度に制限がある場合があるため、[Vercelの最新のCron料金・制限](https://vercel.com/docs/cron-jobs/usage-and-pricing)を確認してください。頻度が足りない場合はProプラン($20/月)が必要になることがあります。

- [ ] **あなた**: Vercelの現在のCron制限を確認し、必要ならプランをアップグレード

## 5. ドメインを取得して接続

- [ ] **あなた**: お名前.com、Cloudflare Registrarなどでドメインを取得
- [ ] **あなた**: Vercelのプロジェクト設定 → Domains でドメインを追加し、DNSレコードを設定

## 6. Solanaロック機能をDevnetにデプロイ

`program/README.md`の手順に沿って進めます。

- [ ] **あなた**: WSL2をインストール(`wsl --install`、要再起動)
- [ ] **私**: WSL内でRust/Solana CLI/Anchorのセットアップ、プログラムのビルド・テスト・Devnetデプロイをサポート
- [ ] **あなた**: デプロイ後のprogram idを教えてもらい、Vercelの`NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID`に設定

## 7. 公開前の最終確認

- [ ] エラー監視サービス(例: [Sentry](https://sentry.io)無料枠)の導入を検討
- [ ] `ENCRYPTION_KEY`のバックアップ(パスワードマネージャー等)
- [ ] 利用規約(`/terms`)の内容を実際の運営体制に合わせて見直す
- [ ] 個人情報(メールアドレス等)を扱う旨のプライバシーポリシーの要否を検討(利用規約内には通知メールの取り扱いのみ記載済み)
- [ ] 本番の`/api/cron/*`エンドポイントが正しくスケジュール通り動いているかログで確認

## 8. Mainnet移行を検討する場合

Devnetでの運用が安定し、実資金を扱う判断をする際は:

- [ ] 弁護士に金融規制(賭博罪・金融商品取引法・資金決済法)の適法性を確認
- [ ] `program/README.md`の「Mainnet運用前の注意」に従い、upgrade authorityのimmutable化を検討
- [ ] 本番用の信頼できるSolana RPCプロバイダ(Helius, QuickNode等)への切り替え
