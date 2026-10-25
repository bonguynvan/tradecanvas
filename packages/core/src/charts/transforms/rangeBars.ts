import type { OHLCBar, DataSeries } from '@tradecanvas/commons';

export interface RangeBarsConfig {
  /** Price distance per range bar. Each bar is closed when (high - low) >= rangeSize. */
  rangeSize: number;
  /**
   * Add the bar still forming, from the last close to the last price, as the
   * last bar (when it has moved, or no bar has closed yet). Default false.
   */
  includeForming?: boolean;
}

/**
 * Digits a close is kept to: the low plus the range reads as the price it is
 * (100.2, not 100.19999999999999), with every digit a feed sends.
 */
const PRICE_SIGNIFICANT_DIGITS = 15;

/**
 * Rounds a price to 15 significant digits of the series' largest price. One
 * scale for the whole series, worked out once, so a close costs a multiply
 * and a divide rather than a trip through text on every tick's replay.
 */
function priceRounder(data: DataSeries, range: number): (price: number) => number {
  let top = range;
  for (const bar of data) top = Math.max(top, Math.abs(bar.high), Math.abs(bar.low));
  const decimals = Number.isFinite(top) ? PRICE_SIGNIFICANT_DIGITS - Math.ceil(Math.log10(top)) : 0;
  if (decimals <= 0) return (price) => price;
  const scale = 10 ** decimals;
  return (price) => Math.round(price * scale) / scale;
}

/** The prices a bar went through after its open, in the order its candle implies. */
function pathOf(bar: OHLCBar): readonly number[] {
  return bar.close >= bar.open
    ? [bar.low, bar.high, bar.close]
    : [bar.high, bar.low, bar.close];
}

/**
 * Transform OHLC data into fixed-range bars. A bar closes once its high and
 * low are `rangeSize` apart, at the far end plus or minus the range: on the
 * way up at its low + range, on the way down at its high - range, so it
 * closes at a price it reached and keeps the wick of the way it went first.
 * The next bar opens at that close. A move of several ranges closes a bar for
 * each; so does a gap between two bars, whose bars stand at prices that did
 * not trade. Like Renko, range bars have no time axis: their times count up
 * by one from the first bar's.
 *
 * Approximation: input is OHLC, not tick-level. Each bar is replayed from
 * its open through its extremes in the order its candle implies (up bar:
 * open, low, high, close; down bar: open, high, low, close), its volume
 * shared by the three moves after the open.
 */
export function toRangeBars(data: DataSeries, config: RangeBarsConfig): DataSeries {
  const range = config.rangeSize;
  if (data.length === 0 || !(range > 0)) return [];

  const clean = priceRounder(data, range);
  const out: OHLCBar[] = [];
  let time = data[0].time;
  let open = data[0].open;
  let high = open;
  let low = open;
  let last = open;
  let volume = 0;
  // Where the bar forming closes, up and down: worked out when its low or high moves, not on every price.
  let upClose = clean(low + range);
  let downClose = clean(high - range);

  const close = (price: number, up: boolean) => {
    out.push({ time: time++, open, high: up ? price : high, low: up ? low : price, close: price, volume });
    open = price;
    high = price;
    low = price;
    upClose = clean(price + range);
    downClose = clean(price - range);
    volume = 0;
  };

  const visit = (price: number, vol: number) => {
    last = price;
    const first = out.length;
    for (;;) {
      if (price > high && price >= upClose) close(upClose, true);
      else if (price < low && price <= downClose) close(downClose, false);
      else break;
    }
    if (price > high) {
      high = price;
      downClose = clean(high - range);
    }
    if (price < low) {
      low = price;
      upClose = clean(low + range);
    }
    // A move that closes bars shares its volume over them; one inside the range adds to the bar forming.
    const closed = out.length - first;
    if (closed === 0) {
      volume += vol;
      return;
    }
    for (let i = first; i < out.length; i++) out[i].volume += vol / closed;
  };

  for (const bar of data) {
    visit(bar.open, 0);
    const path = pathOf(bar);
    for (const price of path) visit(price, bar.volume / path.length);
  }

  if (config.includeForming && (out.length === 0 || high > low)) {
    out.push({ time, open, high, low, close: last, volume });
  }
  return out;
}
