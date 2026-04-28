import type { OHLCBar, DataSeries } from '@tradecanvas/commons';

export interface RangeBarsConfig {
  /** Price distance per range bar. Each bar is closed when (high - low) >= rangeSize. */
  rangeSize: number;
}

/**
 * Transform OHLC data into fixed-range bars. Each bar's price range
 * (high - low) is capped at `rangeSize`; a new bar starts as soon as the cap
 * is met. Like Renko, range bars have no time axis — emitted timestamps are
 * monotonically incremented to preserve ordering for the renderer.
 *
 * Approximation: input is OHLC, not tick-level. We replay each bar's
 * extremes in the order implied by its candle direction (up bar:
 * low→high→close; down bar: high→low→close) which is the standard
 * approach for OHLC-derived range bars.
 */
export function toRangeBars(data: DataSeries, config: RangeBarsConfig): DataSeries {
  if (data.length === 0 || config.rangeSize <= 0) return [];

  const out: OHLCBar[] = [];
  let timeCursor = data[0].time;

  let openPrice = data[0].open;
  let curHigh = openPrice;
  let curLow = openPrice;
  let curVolume = 0;

  const pushExtreme = (price: number, vol: number) => {
    if (price > curHigh) curHigh = price;
    if (price < curLow) curLow = price;
    curVolume += vol;

    while (curHigh - curLow >= config.rangeSize) {
      const upward = price >= openPrice;
      const closePrice = upward
        ? openPrice + config.rangeSize
        : openPrice - config.rangeSize;
      out.push({
        time: timeCursor++,
        open: openPrice,
        high: upward ? closePrice : openPrice,
        low: upward ? openPrice : closePrice,
        close: closePrice,
        volume: curVolume,
      });
      openPrice = closePrice;
      curHigh = closePrice;
      curLow = closePrice;
      curVolume = 0;
    }
  };

  for (const bar of data) {
    const isUp = bar.close >= bar.open;
    const order = isUp ? [bar.low, bar.high, bar.close] : [bar.high, bar.low, bar.close];
    const volPer = bar.volume / order.length;
    for (const px of order) pushExtreme(px, volPer);
  }

  return out;
}
