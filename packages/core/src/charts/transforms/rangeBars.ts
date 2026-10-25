import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { niceNumber } from '@tradecanvas/commons';

export interface RangeBarsConfig {
  /**
   * Price distance per range bar. Each bar is closed when (high - low) >= rangeSize.
   * A range so small that the move before the last bar, or the last bar's
   * own, would make more than 100,000 bars is raised to 2, 5, 10, 20… times
   * itself, the first that makes fewer.
   */
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
 * Range bars the move before the last bar makes at most, about, and the last
 * bar's own move as many again. The replay runs again on every tick, so a
 * range far too small for the move is raised rather than filling memory with
 * millions of bars.
 */
const MAX_RANGE_BARS = 100_000;

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
 * Every price the replay goes through, in order, from bar `from` to before
 * bar `to`: each bar's open, then its path, which carries its volume.
 */
function replay(data: DataSeries, visit: (price: number, volume: number) => void, from = 0, to = data.length): void {
  for (let i = from; i < to; i++) {
    const bar = data[i];
    visit(bar.open, 0);
    const path = pathOf(bar);
    for (const price of path) visit(price, bar.volume / path.length);
  }
}

/**
 * How far the replay travels from bar `from` to before bar `to`, the gap
 * before `from` included: each bar it closes takes a range of it.
 */
function pathLength(data: DataSeries, from: number, to: number): number {
  let length = 0;
  let last = from > 0 ? data[from - 1].close : data[0].open;
  replay(data, (price) => {
    length += Math.abs(price - last);
    last = price;
  }, from, to);
  return length;
}

/**
 * The range the bars are built on: the one asked for, unless the move would
 * make more than MAX_RANGE_BARS of it. Then the first of 2, 5, 10, 20… times
 * it that makes fewer: a whole multiple, so a range on the price step stays on it.
 * The last bar's move is weighed on its own, so a tick on the bar still forming
 * doesn't change the range unless that bar alone would make that many.
 */
function rangeFor(data: DataSeries, range: number): number {
  const lastBar = data.length - 1;
  const least = Math.max(pathLength(data, 0, lastBar), pathLength(data, lastBar, data.length)) / MAX_RANGE_BARS;
  if (!(range < least) || !Number.isFinite(least)) return range;
  return Number((range * niceNumber(least / range, false)).toPrecision(PRICE_SIGNIFICANT_DIGITS));
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
 * Closes are kept to 15 significant digits of the largest price, so a range
 * finer than that closes no bar. A range that would make more than 100,000
 * bars is raised to 2, 5, 10, 20… times itself, the first that makes fewer;
 * the last bar's move is weighed on its own, so the range holds as it moves.
 *
 * Approximation: input is OHLC, not tick-level. Each bar is replayed from
 * its open through its extremes in the order its candle implies (up bar:
 * open, low, high, close; down bar: open, high, low, close), its volume
 * shared by the three moves after the open.
 */
export function toRangeBars(data: DataSeries, config: RangeBarsConfig): DataSeries {
  if (data.length === 0 || !(config.rangeSize > 0)) return [];

  const range = rangeFor(data, config.rangeSize);
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
    // A close the kept digits can't tell from the bar's high (or low) would close bars of nothing without end.
    for (;;) {
      if (price > high && price >= upClose && upClose > high) close(upClose, true);
      else if (price < low && price <= downClose && downClose < low) close(downClose, false);
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

  replay(data, visit);

  if (config.includeForming && (out.length === 0 || high > low)) {
    out.push({ time, open, high, low, close: last, volume });
  }
  return out;
}
