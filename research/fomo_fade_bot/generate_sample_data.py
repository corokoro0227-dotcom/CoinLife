"""動作確認用の合成OHLCVデータを生成するスクリプト。

ランダムウォークに加えて、出来高急増を伴う急騰(FOMOスパイク)を
一定確率で挟み込み、backtest.py の動作確認をすぐ行えるようにする。
実データではないため、パラメータ調整の最終判断には使わないこと。
"""

from __future__ import annotations

import argparse

import numpy as np
import pandas as pd


def generate(
    num_bars: int,
    start_price: float,
    seed: int,
    spike_probability: float,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    timestamps = pd.date_range("2024-01-01", periods=num_bars, freq="5min")

    price = start_price
    base_volume = 100.0
    rows = []
    spike_remaining = 0

    for _ in range(num_bars):
        if spike_remaining == 0 and rng.random() < spike_probability:
            spike_remaining = rng.integers(2, 5)

        if spike_remaining > 0:
            drift = rng.uniform(0.008, 0.02)
            volume = base_volume * rng.uniform(3.0, 6.0)
            spike_remaining -= 1
        else:
            drift = rng.normal(0, 0.003)
            volume = base_volume * rng.uniform(0.6, 1.4)

        open_price = price
        close_price = max(open_price * (1 + drift), 0.01)
        high_price = max(open_price, close_price) * (1 + rng.uniform(0, 0.002))
        low_price = min(open_price, close_price) * (1 - rng.uniform(0, 0.002))

        rows.append((open_price, high_price, low_price, close_price, volume))
        price = close_price

    df = pd.DataFrame(rows, columns=["open", "high", "low", "close", "volume"])
    df.insert(0, "timestamp", timestamps)
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="バックテスト動作確認用の合成OHLCVを生成")
    parser.add_argument("--out", default="sample_ohlcv.csv")
    parser.add_argument("--num-bars", type=int, default=5000)
    parser.add_argument("--start-price", type=float, default=100.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--spike-probability", type=float, default=0.01)
    args = parser.parse_args()

    df = generate(args.num_bars, args.start_price, args.seed, args.spike_probability)
    df.to_csv(args.out, index=False)
    print(f"{len(df)}本のサンプルOHLCVを書き出しました: {args.out}")


if __name__ == "__main__":
    main()
