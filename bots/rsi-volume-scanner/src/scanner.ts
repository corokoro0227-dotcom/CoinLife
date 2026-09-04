import ccxt, { type Exchange } from "ccxt";
import type { Config } from "./config.js";
import { calculateRSI, volumeSpikeMultiplier } from "./indicators.js";
import type { AlertPayload } from "./notify.js";

export function createExchange(exchangeId: string): Exchange {
  const ExchangeClass = (ccxt as unknown as Record<string, new (opts: object) => Exchange>)[
    exchangeId
  ];
  if (!ExchangeClass) {
    throw new Error(`ccxtに存在しない取引所IDです: ${exchangeId}`);
  }
  return new ExchangeClass({
    enableRateLimit: true,
    options: { defaultType: "swap" },
  });
}

/**
 * 1つの取引所につきOHLCVを取得し、直近の"確定"足でRSI/出来高スパイク条件を評価する。
 * 最後に返る足は未確定(進行中)の可能性があるため評価対象から除外する。
 */
export async function evaluateExchange(
  exchange: Exchange,
  exchangeId: string,
  config: Config,
): Promise<AlertPayload | null> {
  const needed = Math.max(config.rsiPeriod + 1, config.volumeLookback + 1) + 2;
  const ohlcv = await exchange.fetchOHLCV(config.symbol, config.timeframe, undefined, needed);

  if (ohlcv.length < needed) {
    throw new Error(`OHLCVが不足しています (${ohlcv.length}/${needed}本)`);
  }

  // 最後の1本は未確定の可能性があるため除外する
  const closed = ohlcv.slice(0, -1);
  const closes = closed.map((c) => c[4] as number);
  const volumes = closed.map((c) => c[5] as number);
  const lastCandle = closed[closed.length - 1];

  const rsi = calculateRSI(closes, config.rsiPeriod);
  const { multiplier } = volumeSpikeMultiplier(volumes, config.volumeLookback);

  const rsiHit = rsi < config.rsiThreshold;
  const volumeHit = multiplier >= config.volumeSpikeMultiplier;

  console.log(
    `[scan] ${exchangeId} ${config.symbol} ${config.timeframe} ` +
      `RSI=${rsi.toFixed(2)} volMult=${multiplier.toFixed(2)}x ` +
      `${rsiHit && volumeHit ? "=> MATCH" : ""}`,
  );

  if (!rsiHit || !volumeHit) return null;

  return {
    exchangeId,
    symbol: config.symbol,
    timeframe: config.timeframe,
    price: closes[closes.length - 1],
    rsi,
    volumeMultiplier: multiplier,
    candleTime: new Date(lastCandle[0] as number),
  };
}
