import type { OHLCBar, DataSeries } from '@tradecanvas/commons';

/** The bars the smoothed Heikin-Ashi averages over when not told. */
export const SMOOTHED_HEIKIN_ASHI_PERIOD = 10;

/**
 * Smoothed Heikin-Ashi: each bar's open, high, low and close taken as an
 * exponential average over `period` bars first (started at the first bar),
 * then made Heikin-Ashi. Its candles turn later than Heikin-Ashi's and less
 * often: a trend reads as one run of a colour.
 */
export function toSmoothedHeikinAshi(data: DataSeries, period = SMOOTHED_HEIKIN_ASHI_PERIOD): DataSeries {
  if (data.length === 0) return [];
  const span = Number.isFinite(period) ? Math.max(1, Math.floor(period)) : SMOOTHED_HEIKIN_ASHI_PERIOD;
  const alpha = 2 / (span + 1);
  let { open, high, low, close } = data[0];
  const smooth = (was: number, now: number) => was + alpha * (now - was);
  return toHeikinAshi(data.map((bar, i) => {
    if (i > 0) {
      open = smooth(open, bar.open);
      high = smooth(high, bar.high);
      low = smooth(low, bar.low);
      close = smooth(close, bar.close);
    }
    return { time: bar.time, open, high, low, close, volume: bar.volume };
  }));
}

/**
 * Transform OHLC data to Heikin Ashi.
 * HA Close = (O+H+L+C) / 4
 * HA Open  = (prev HA Open + prev HA Close) / 2
 * HA High  = max(H, HA Open, HA Close)
 * HA Low   = min(L, HA Open, HA Close)
 */
export function toHeikinAshi(data: DataSeries): DataSeries {
  if (data.length === 0) return [];

  const result: OHLCBar[] = [];
  let prevOpen = data[0].open;
  let prevClose = (data[0].open + data[0].high + data[0].low + data[0].close) / 4;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const haClose = (bar.open + bar.high + bar.low + bar.close) / 4;
    const haOpen = i === 0 ? bar.open : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(bar.high, haOpen, haClose);
    const haLow = Math.min(bar.low, haOpen, haClose);

    result.push({
      time: bar.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: bar.volume,
    });

    prevOpen = haOpen;
    prevClose = haClose;
  }

  return result;
}
