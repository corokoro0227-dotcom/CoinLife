/**
 * Wilder's RSI。closes は古い順の終値配列で、少なくとも period+1 本必要。
 * 戻り値は最後の終値時点でのRSI(0-100)。
 */
export function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) {
    throw new Error(
      `RSI計算には最低 ${period + 1} 本の終値が必要ですが ${closes.length} 本しかありません`,
    );
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += -change;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * 直近の確定足の出来高が、その直前 lookback 本の平均出来高に対して
 * 何倍(倍率)かを返す。例: 3.0 は平均比+200%。
 */
export function volumeSpikeMultiplier(
  volumes: number[],
  lookback: number,
): { latestVolume: number; averageVolume: number; multiplier: number } {
  if (volumes.length < lookback + 1) {
    throw new Error(
      `出来高比較には最低 ${lookback + 1} 本の確定足が必要ですが ${volumes.length} 本しかありません`,
    );
  }

  const latestVolume = volumes[volumes.length - 1];
  const baseline = volumes.slice(volumes.length - 1 - lookback, volumes.length - 1);
  const averageVolume = baseline.reduce((sum, v) => sum + v, 0) / baseline.length;

  const multiplier = averageVolume === 0 ? Infinity : latestVolume / averageVolume;
  return { latestVolume, averageVolume, multiplier };
}
