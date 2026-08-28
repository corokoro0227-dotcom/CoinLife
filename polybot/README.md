# polybot — BTC Up/Down 無人取引bot (Polymarket)

Polymarketの「BTC Up or Down」時間足マーケットを対象に、Binance参照価格と
市場オッズの乖離(エッジ)を検出し、Kelly基準でサイズを決めて自動発注する
無人botです。スマホを見られない時間帯でも動かし続けられるよう常駐ループとして
書いています。

**このbotは「確実に勝つ」ことを保証しません。** 詳しくは下の「リスクと限界」を
必ず読んでから使ってください。

## 構成

```
polybot/
  bot.py          # メインループ (これを起動する)
  config.py       # .envの読み込み
  gamma.py        # Polymarket Gamma APIでアクティブな窓を探す
  price_feed.py   # Binanceから参照価格・始値・ボラティリティを取得
  edge_model.py   # 理論確率の計算とKellyサイジング
  trader.py       # py-clob-clientのラッパー (発注/dry-run)
  logging_utils.py
```

## セットアップ

```bash
cd polybot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env を編集して秘密鍵・アドレス等を入力
```

`.env` の主な項目:

- `POLY_PRIVATE_KEY` / `POLY_FUNDER_ADDRESS` / `POLY_SIGNATURE_TYPE`:
  Polymarketの Settings > API から取得。**取引専用の新規ウォレット推奨**。
  このリポジトリは公開前提のアプリ本体(`web/`)と同居しているので、
  `.env` を絶対にコミットしないこと(`.gitignore`済みだが、`git add -A`など
  乱暴なステージングをしないよう注意)。
- `POLY_SERIES_SLUG`: `btc-up-or-down-1h` (1時間足) か `btc-up-or-down-5m` (5分足)。
- `EDGE_THRESHOLD`: このエッジを超えたときだけ発注(デフォルト5%)。
- `KELLY_FRACTION`: フルKelly=1.0。フルKellyはモデル誤差に弱いので、
  慣らし運転中は 0.25〜0.5 を強く推奨(下記リスク参照)。
- `LIVE_TRADING`: `false`が初期値。**最初は必ずfalseのまま動かして**
  ログ(`polybot.log`)を見て判断が妥当か確認すること。`true`にすると
  実資金で発注する。
- `BANKROLL_OVERRIDE_USDC`: dry-run中の残高シミュレーション用、または
  `get_balance_allowance`の単位がSDKバージョンで変わったときの検算用。

## 実行

```bash
python3 bot.py
```

無人で回し続けるには `tmux`/`screen`、または systemd の
`Restart=on-failure` 付きサービスにするのが簡単です:

```ini
# /etc/systemd/system/polybot.service (例)
[Service]
WorkingDirectory=/path/to/CoinLife/polybot
ExecStart=/path/to/CoinLife/polybot/.venv/bin/python bot.py
Restart=on-failure
RestartSec=30
```

エラーが5回連続すると安全のため自動停止します(下記参照)。停止したら
`polybot.log` で原因を確認してから再起動してください。

## 実装している技術的セーフガード

これらは「いくら賭けるか」というビジネス判断には介入しません
(ご指定どおりKelly基準・上限なしで計算した額をそのまま発注します)。
あくまでバグや異常データで暴走しないための最低限のガードです。

- 参照価格取得・注文APIが**5回連続で失敗**したらプロセスを止める
  (壊れた/古いデータのまま発注し続けるのを防ぐ)
- 同じ窓(同じイベント)に**二重発注しない**
- Kelly比率は数学的に100%(全額)で頭打ち(100%超はあり得ないため)
- 残り時間が短すぎる窓(デフォルト10秒未満)には新規参入しない

## リスクと限界(必ず読んでください)

1. **BTC Up/Downは薄いジャンルではなく、Polymarketで最も出来高が多い
   カテゴリの一つです。** 「人気のないジャンルの方が有利」という当初の
   前提とは逆で、同じ裁定を狙うbotが既に多数動いています。エッジは
   小さく、すぐ消えます。
2. **参照価格の基準がずれています。** Polymarketの実際の決済は
   Chainlink BTC/USD Data Streams(有料・購読制)基準です。このbotは
   代替としてBinance現物を使っており、通常は近い値ですが取引所固有の
   フラッシュクラッシュや薄商い時間帯には乖離しえます。その乖離は
   「本物のエッジ」ではなく「モデルの誤差」です。
3. **モデルは無ドリフト対数正規という単純化です。** 実測ボラティリティ
   だけを使っており、ニュース速報直後のジャンプなどには対応できません。
   モデルの確率推定が外れれば、Kellyは統計的に正しい額ではなく
   単に大きすぎる額を賭けることになります。
4. **フルKelly(KELLY_FRACTION=1.0)・上限なしはハイリスクです。**
   Kelly基準は「真の確率が分かっている」前提の理論値で、モデル誤差が
   あると過大ベットになり、連敗で資金が急減する典型的な失敗パターンが
   知られています。ハーフKelly以下への引き下げを推奨します。
5. **決済トラブルのリスク。** UMAオラクル解決の遅延・異議申し立てで、
   読みが当たっていても資金がロックされる/違う結果になることがあります。
6. **規約・地域規制。** Polymarketは米国居住者・IPなど一部地域からの
   アクセスを制限しています。自分の居住地・利用規約を確認してください。
7. これは投資助言ではありません。実資金を投じる判断は自己責任です。
