import ccxt, { type Exchange } from "ccxt";
import type { Config } from "./config.js";
import { calculateEMA, calculateRSI, volumeSpikeMultiplier } from "./indicators.js";
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
 * OHLCVを取得し、直近の"確定"足でRSI/出来高スパイク/陽線/上位足トレンドの
 * 4条件をすべて評価する。最後に返る足は未確定(進行中)の可能性があるため
 * 評価対象から除外する。
 *
 * 条件がすべて揃った場合のみアラートを返す(トレンドフィルタは「強い下降
 * トレンド中の逆張りを避ける」ためのゲートで、上位足EMAより下ではシグナル
 * を出さない)。
 */
export async function evaluateExchange(
  exchange: Exchange,
  exchangeId: string,
  config: Config,
): Promise<AlertPayload | null> {
  const needed = Math.max(config.rsiPeriod + 1, config.volumeLookback + 1) + 2;
  const trendNeeded = Math.max(config.trendEmaPeriod * 2, config.trendEmaPeriod + 100) + 1;

  const [ohlcv, trendOhlcv] = await Promise.all([
    exchange.fetchOHLCV(config.symbol, config.timeframe, undefined, needed),
    exchange.fetchOHLCV(config.symbol, config.trendTimeframe, undefined, trendNeeded),
  ]);

  if (ohlcv.length < needed) {
    throw new Error(`OHLCVが不足しています (${ohlcv.length}/${needed}本)`);
  }
  if (trendOhlcv.length < config.trendEmaPeriod + 1) {
    throw new Error(
      `トレンド足のOHLCVが不足しています (${trendOhlcv.length}/${config.trendEmaPeriod + 1}本)`,
    );
  }

  // 最後の1本は未確定の可能性があるため除外する(実行足・トレンド足とも)
  const closed = ohlcv.slice(0, -1);
  const closes = closed.map((c) => c[4] as number);
  const volumes = closed.map((c) => c[5] as number);
  const lastCandle = closed[closed.length - 1];
  const lastOpen = lastCandle[1] as number;
  const lastClose = lastCandle[4] as number;

  const trendClosed = trendOhlcv.slice(0, -1);
  const trendCloses = trendClosed.map((c) => c[4] as number);
  const trendEma = calculateEMA(trendCloses, config.trendEmaPeriod);

  const rsi = calculateRSI(closes, config.rsiPeriod);
  const { multiplier } = volumeSpikeMultiplier(volumes, config.volumeLookback);
  const bullishCloseCandle = lastClose > lastOpen;
  const aboveTrend = lastClose > trendEma;

  const rsiHit = rsi < config.rsiThreshold;
  const volumeHit = multiplier >= config.volumeSpikeMultiplier;
  const bullishHit = !config.requireBullishCloseCandle || bullishCloseCandle;
  const allHit = rsiHit && volumeHit && bullishHit && aboveTrend;

  console.log(
    `[scan] ${exchangeId} ${config.symbol} ${config.timeframe} ` +
      `RSI=${rsi.toFixed(2)} volMult=${multiplier.toFixed(2)}x ` +
      `bullish=${bullishCloseCandle} aboveEMA${config.trendTimeframe}=${aboveTrend} ` +
      `${allHit ? "=> MATCH" : ""}`,
  );

  if (!allHit) return null;

  return {
    exchangeId,
    symbol: config.symbol,
    timeframe: config.timeframe,
    price: lastClose,
    rsi,
    volumeMultiplier: multiplier,
    bullishCloseCandle,
    trendTimeframe: config.trendTimeframe,
    trendEma,
    aboveTrend,
    candleTime: new Date(lastCandle[0] as number),
  };
}
