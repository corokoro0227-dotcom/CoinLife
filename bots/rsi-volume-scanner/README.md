# RSI + 出来高スパイク スキャナー

BTC無期限先物(デフォルトは `BTC/USDT:USDT`)を複数取引所・単一時間足で常時監視し、

- RSI(デフォルト14期間)が **30未満**
- 直近確定足の出来高が、直前N本(デフォルト20本)平均の **+200%以上(3倍以上)**

の両方を満たした取引所をDiscord/Telegramへ通知するbotです。CoinLife本体(`web/`)はVercelのサーバーレス環境で動くため、この常駐プロセスはあえて独立したディレクトリに分離しています。

## セットアップ

```bash
cd bots/rsi-volume-scanner
npm install
cp .env.example .env
# .env を編集(取引所・通知先など)
npm run dev
```

本番運用では `npm run build && npm run start:dist`、または pm2 / systemd / Docker などで常駐させてください。

## 設定(`.env`)

`.env.example` を参照。主な項目:

| 変数 | 説明 | デフォルト |
|---|---|---|
| `EXCHANGES` | ccxtの取引所ID(カンマ区切り) | `binance,bybit,okx` |
| `SYMBOL` | ccxt統一シンボル | `BTC/USDT:USDT` |
| `TIMEFRAME` | 時間足 | `15m` |
| `RSI_PERIOD` / `RSI_THRESHOLD` | RSI期間・しきい値 | `14` / `30` |
| `VOLUME_LOOKBACK` | 出来高平均の対象本数 | `20` |
| `VOLUME_SPIKE_MULTIPLIER` | 出来高倍率のしきい値(3.0 = +200%) | `3.0` |
| `POLL_INTERVAL_SEC` | ポーリング間隔(秒) | `60` |
| `ALERT_COOLDOWN_SEC` | 同一取引所への再通知の最小間隔(秒) | `3600` |
| `DISCORD_WEBHOOK_URL` | Discord通知先 | 任意 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram通知先 | 任意 |

通知先を何も設定しない場合はコンソールログのみに出力されます。

## 仕組み

- `evaluateExchange`(`src/scanner.ts`)が各取引所のOHLCVを取得し、**最後の1本(未確定足)を除いた確定足のみ**でRSIと出来高倍率を計算します。
- RSIはWilder方式(`src/indicators.ts`)。
- 出来高倍率は「直近確定足の出来高」÷「その直前N本の平均出来高」。3.0以上で「平均比+200%以上」と判定します。
- 条件を満たした取引所ごとに、`ALERT_COOLDOWN_SEC` で再通知を抑制しつつDiscord/Telegramへ通知します。

## 注意事項

- これはシグナルの検知・通知のみを行うbotで、**自動発注は行いません**。
- 取引所によって無期限先物のシンボル表記・対応時間足が異なるため、`EXCHANGES` に追加する際はccxtの対応状況を確認してください。
- 取引は自己責任です。本botの通知は投資助言ではありません。
