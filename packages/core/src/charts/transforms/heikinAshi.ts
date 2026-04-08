import type { OHLCBar, DataSeries } from '@chart-lib/commons';

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
