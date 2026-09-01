# FOMOフェード(過熱逆張り)戦略 バックテスト

短期急騰(価格急伸+出来高急増+RSI過熱)を「群衆のFOMO買いによる過熱」とみなし、
反落を狙ってショートするデイトレード戦略のバックテスト実装。CoinLife本体(Web/Solana部分)
とは独立した、個人の売買botの検証用スクリプト。

**免責事項**: これはバックテストのみを行う研究用ツールで、実際に注文を発注するbotではない。
過去データでの検証結果は将来の成績を保証しない。過学習(パラメータの後付け最適化)に注意し、
実運用前に手数料・スリッページ・取引所APIの制約を必ず確認すること。投資助言ではない。

## セットアップ

```bash
cd research/fomo_fade_bot
pip install -r requirements.txt
```

## 動作確認(合成データ)

実データがなくてもすぐ試せるよう、ランダムウォーク+FOMOスパイクの合成OHLCVを生成できる。

```bash
python generate_sample_data.py --out sample.csv --num-bars 8000
python backtest.py sample.csv --trades-csv trades.csv
```

合成データはデフォルトのシグナル閾値だとほぼトレードが発生しない(意図的に厳しめ)。
挙動を見たい場合は閾値を緩めて試す:

```bash
python backtest.py sample.csv \
  --price-spike-pct 1.5 --volume-spike-ratio 2.0 \
  --rsi-threshold 65 --deviation-pct 1.5 \
  --trades-csv trades.csv
```

## 実データでの検証

取引所APIから取得したOHLCVを以下の形式のCSVに変換して使う。

```
timestamp,open,high,low,close,volume
2024-01-01 00:00:00,100.0,101.2,99.8,100.9,1234.5
...
```

例えば[ccxt](https://github.com/ccxt/ccxt)で取得する場合:

```python
import ccxt
import pandas as pd

exchange = ccxt.binance()
ohlcv = exchange.fetch_ohlcv("BTC/USDT", timeframe="5m", limit=1000)
df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
df.to_csv("btcusdt_5m.csv", index=False)
```

## 戦略ロジック

1. **過熱検知(シグナル)**: 直近`lookback_bars`本の騰落率・出来高倍率・RSI・移動平均乖離率が
   すべて閾値を超えたら「過熱」フラグを立てる。
2. **レジームフィルター**: 上位足に相当する`regime_ma_window`本の移動平均が上昇中かつ
   価格がその上にある(強い上昇トレンド)場合は過熱フラグを無効化し、踏み上げを避ける。
3. **エントリー確認**: 過熱フラグ後、`confirmation_pullback_pct`分の高値からの押し、
   または陰線確定のどちらかが出たらショートエントリー。`confirmation_timeout_bars`本
   待っても出なければ見送り。
4. **エグジット**: 直近高値の上に`stop_buffer_pct`分の逆指値、
   移動平均回帰またはフィボナッチ戻し(`take_profit_mode`)で利確、
   `max_holding_bars`本経過でタイムストップ。
5. **サイジング**: 1トレードあたり`risk_per_trade_pct`(資金に対する%)を
   ストップ幅で割ってポジションサイズを決定。

## 主なパラメータ(CLI引数)

| 引数 | 意味 | デフォルト |
|---|---|---|
| `--lookback-bars` | 急騰判定に使う期間(本数) | 3 |
| `--price-spike-pct` | 過熱とみなす騰落率(%) | 3.0 |
| `--volume-spike-ratio` | 過熱とみなす出来高倍率 | 2.5 |
| `--rsi-threshold` | 過熱とみなすRSI | 75 |
| `--deviation-pct` | 過熱とみなす移動平均乖離率(%) | 4.0 |
| `--stop-buffer-pct` | 高値からの逆指値バッファ(%) | 1.5 |
| `--take-profit-mode` | `ma`(移動平均回帰) or `fib`(戻し) | ma |
| `--max-holding-bars` | 最大保有本数(タイムストップ) | 12 |
| `--risk-per-trade-pct` | 1トレードあたりのリスク(%) | 1.0 |
| `--fee-pct` | 往復手数料の概算(片道%) | 0.05 |
| `--no-regime-filter` | 上位足フィルターを無効化 | 無効化しない |

`python backtest.py --help` で全オプションを確認できる。

## ライブbot(Binance USDT-M無期限先物・全銘柄スクリーニング)

`live_bot.py` は、Binanceの流動性のあるUSDT-M無期限先物を出来高でスクリーニングし、
銘柄を限定せずに同じシグナルロジック(`strategy.py`)を適用して自動でショート/決済まで行う。
バックテストと寸分違わぬロジックにするため、シグナル計算は`strategy.py`に一本化して両者から参照している。

### 重要な注意事項(必ず読むこと)

- **既定はdry-run(発注シミュレーション)**。実際に注文を送るには `--live` に加えて環境変数
  `I_UNDERSTAND_THE_RISK=1` を明示的に設定する必要がある(事故防止の二重ロック)。
- **このリポジトリのセッション(サンドボックス)からは外部ネットワークがブロックされており、
  Binance APIへの実際の疎通確認ができていない**。ロジック部分(シグナル判定・状態遷移)は
  合成データによるオフラインテストで検証済みだが、注文まわりのコード(注文タイプ・精度丸め等)は
  必ず自分の環境で**まずBinance Futures Testnet(`--testnet`)、次に本番APIでのdry-run**の順に
  動作確認してから`--live`を使うこと。
- **APIキーはAPI取引権限のみ付与し、出金権限は絶対に付けない**。キーは環境変数
  `BINANCE_API_KEY` / `BINANCE_API_SECRET` で渡し、コードやリポジトリに書かない
  (`.env`は`.gitignore`済み)。
- **日本居住者はBinance利用の可否・税務・現地法令を自分で確認すること**。Binanceの国際プラットフォーム
  (binance.com)は過去に日本の金融庁から警告を受けており、日本向けには別法人(Binance Japan)が
  限定的な商品ラインナップで運営している。国際版口座で無期限先物を使えるかどうかは自己責任で確認が必要。
- 日次最大損失(`--max-daily-loss-pct`、既定3%)に達すると新規エントリーを止めるキルスイッチを実装しているが、
  **これは損失を保証しない**。想定外の相場急変・API障害・取引所メンテナンス等のリスクは残る。
- ポジション状態はプロセス内メモリのみで保持しており、**bot再起動でポジション追跡がリセットされる**
  (実際の建玉は取引所側に残るため、再起動時は必ず取引所の管理画面で建玉を確認すること)。

### 使い方

```bash
export BINANCE_API_KEY=xxxx
export BINANCE_API_SECRET=xxxx

# 1. まずTestnetでdry-run
python live_bot.py --testnet

# 2. 本番APIでdry-run(実弾は送らず、監視対象・シグナル発生をログで確認)
python live_bot.py

# 3. 動作に納得できたら少額・低レバレッジで実弾(必ず自己責任で)
I_UNDERSTAND_THE_RISK=1 python live_bot.py --live --leverage 2 --max-positions 1 --risk-per-trade-pct 0.5
```

主なCLIオプション(戦略パラメータは`backtest.py`と共通):

| 引数 | 意味 | デフォルト |
|---|---|---|
| `--testnet` | Binance Futures Testnetを使用 | 無効 |
| `--live` | 実弾発注を有効化 | 無効(dry-run) |
| `--min-quote-volume-usdt` | スクリーニング対象の最低24h出来高(USDT) | 5,000,000 |
| `--max-symbols` | 監視する銘柄数の上限 | 30 |
| `--max-positions` | 同時保有ポジション数の上限 | 3 |
| `--max-daily-loss-pct` | 日次最大損失(%、到達で新規停止) | 3.0 |
| `--timeframe` | ローソク足の時間軸 | 5m |
| `--poll-interval-sec` | ポーリング間隔(秒) | 60 |
| `--leverage` | 実弾時のレバレッジ | 2 |

`python live_bot.py --help` で全オプションを確認できる。

## 次にやること(推奨)

- 実データ(できれば複数銘柄・複数期間)でパラメータ感度を確認し、過学習を避ける
- ウォークフォワード検証(学習期間と検証期間を分ける)を追加する
- 出来高・RSI以外のFOMOシグナル(SNS言及数急増など)を組み込む
- 検証結果が安定したら、まず少額・紙トレード(ペーパートレード)で実運用を試す
