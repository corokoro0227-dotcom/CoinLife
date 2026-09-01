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

## 次にやること(推奨)

- 実データ(できれば複数銘柄・複数期間)でパラメータ感度を確認し、過学習を避ける
- ウォークフォワード検証(学習期間と検証期間を分ける)を追加する
- 出来高・RSI以外のFOMOシグナル(SNS言及数急増など)を組み込む
- 検証結果が安定したら、まず少額・紙トレード(ペーパートレード)で実運用を試す
