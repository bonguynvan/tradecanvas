import type { OHLCBar, DataSeries } from '@tradecanvas/commons';

export interface RangeBarsConfig {
  /**
   * Price distance per range bar. Each bar is closed when (high - low) >= rangeSize.
   * A range so small that the closed bars would make more than 100,000 range
   * bars, or the last bar more than 100,000 on its own, is raised to 2, 5, 10,
   * 20… times itself, the first that makes no more; every bar is then built
   * on the raised range.
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
 * (100.2, not 100.19999999999999), with every digit of a price up to 15
 * significant digits.
 */
const PRICE_SIGNIFICANT_DIGITS = 15;

/**
 * Range bars the closed bars may make, and the last bar as many again on its
 * own. The replay runs again on every tick, so a range far too small for the
 * move is raised rather than filling memory with millions of bars.
 */
const MAX_RANGE_BARS = 100_000;

/** The 1-2-5 steps a range too small is raised by: 2, 5, 10, 20, 50… times itself. */
const RANGE_STEPS = [1, 2, 5] as const;

/** The prices a bar is replayed through after its open, its extremes and its close: they share its volume. */
const PATH_PRICES = 3;

/** Numbers kept for each closed bar: its close, the far end it started from, its volume. */
const CELLS_PER_BAR = 3;
/** Closed bars there is room for at least, before the store first grows; a long series starts with one for each of its bars. */
const MIN_ROOM_BARS = 64;

/** The `n`th multiple a range is tried at: 1, 2, 5, 10, 20, 50… */
function rangeMultiple(n: number): number {
  return RANGE_STEPS[n % RANGE_STEPS.length] * 10 ** Math.floor(n / RANGE_STEPS.length);
}

/** The largest price the bars reach, high or low, by size. */
function largestPrice(data: DataSeries): number {
  let top = 0;
  for (const bar of data) top = Math.max(top, Math.abs(bar.high), Math.abs(bar.low));
  return top;
}

/**
 * Rounds a price to 15 significant digits of `top`, the series' largest price,
 * or of the range when that is larger. One scale for the whole series, worked
 * out once, so a close costs a multiply and a divide rather than a trip
 * through text on every tick's replay.
 */
function priceRounder(top: number, range: number): (price: number) => number {
  const largest = Math.max(top, range);
  const decimals = Number.isFinite(largest) ? PRICE_SIGNIFICANT_DIGITS - Math.ceil(Math.log10(largest)) : 0;
  if (decimals <= 0) return (price) => price;
  const scale = 10 ** decimals;
  return (price) => Math.round(price * scale) / scale;
}

/** `cells` with room for twice as many bars, the ones in it kept. */
function grownCells(cells: Float64Array): Float64Array {
  const grown = new Float64Array(cells.length * 2);
  grown.set(cells);
  return grown;
}

/** Shares `volume` over the closed bars `first` to before `count`. */
function shareVolume(cells: Float64Array, first: number, count: number, volume: number): void {
  const each = volume / (count - first);
  for (let i = first; i < count; i++) cells[i * CELLS_PER_BAR + 2] += each;
}

/**
 * The first `count` closed bars in `cells`, the first opening at `open` at
 * `time`, each later one at the close before it, a time after. A bar that
 * closed above its open went up: the end it started from is its low.
 */
function barsOf(cells: Float64Array, count: number, open: number, time: number): OHLCBar[] {
  const bars: OHLCBar[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const close = cells[i * CELLS_PER_BAR];
    const from = cells[i * CELLS_PER_BAR + 1];
    const up = close > open;
    bars[i] = { time: time + i, open, high: up ? close : from, low: up ? from : close, close, volume: cells[i * CELLS_PER_BAR + 2] };
    open = close;
  }
  return bars;
}

/** What a try at one range closed, as numbers (see CELLS_PER_BAR), and the bar it left forming. */
interface RangeTry {
  cells: Float64Array;
  count: number;
  forming: OHLCBar;
}

/**
 * The bars `data` closes at `range`, or null as soon as the closed bars have
 * made more than MAX_RANGE_BARS, or the last bar that many on its own: the
 * range is too small for the move, and the rest is not replayed. The closed
 * bars are kept as numbers and made into bars only by the try that passes, so
 * a try that fails leaves nothing behind to collect.
 */
function closeBars(data: DataSeries, range: number, clean: (price: number) => number): RangeTry | null {
  // Room for a bar a source bar to start with, which most ranges come near.
  let cells: Float64Array = new Float64Array(CELLS_PER_BAR * Math.max(MIN_ROOM_BARS, Math.min(data.length, MAX_RANGE_BARS)));
  let count = 0;
  let open = data[0].open;
  let high = open;
  let low = open;
  let last = open;
  let volume = 0;
  // Where the bar forming closes, up and down: worked out when its low or high moves, not on every price.
  let upClose = clean(open + range);
  let downClose = clean(open - range);
  let limit = MAX_RANGE_BARS;
  for (let i = 0; i < data.length; i++) {
    // The last bar may make as many again on its own, so a tick on it seldom moves the range.
    if (i === data.length - 1) limit = count + MAX_RANGE_BARS;
    const bar = data[i];
    const rising = bar.close >= bar.open;
    const share = bar.volume / PATH_PRICES;
    for (let k = 0; k <= PATH_PRICES; k++) {
      // Its open, then its extremes in the order its candle implies, then its close.
      const price = k === 0 ? bar.open : k === 1 ? (rising ? bar.low : bar.high) : k === 2 ? (rising ? bar.high : bar.low) : bar.close;
      // An infinite price would close bars without end, and one that is no number closes none.
      if (!Number.isFinite(price)) continue;
      last = price;
      const first = count;
      // The open first: a gap from the last close closes a bar for each range it skips. A close the
      // kept digits can't tell from the bar's high (or low) would close bars of nothing without end.
      for (;;) {
        const up = price > high && price >= upClose && upClose > high;
        if (!up && !(price < low && price <= downClose && downClose < low)) break;
        const at = up ? upClose : downClose;
        const cell = count * CELLS_PER_BAR;
        if (cell === cells.length) cells = grownCells(cells);
        cells[cell] = at;
        cells[cell + 1] = up ? low : high;
        cells[cell + 2] = volume;
        if (++count > limit) return null;
        open = high = low = at;
        upClose = clean(at + range);
        downClose = clean(at - range);
        volume = 0;
      }
      if (price > high) {
        high = price;
        downClose = clean(price - range);
      }
      if (price < low) {
        low = price;
        upClose = clean(price + range);
      }
      // A move that closes bars shares its volume over them; one inside the range adds to the bar forming.
      const moved = k === 0 ? 0 : share;
      if (count === first) volume += moved;
      else shareVolume(cells, first, count, moved);
    }
  }
  return { cells, count, forming: { time: data[0].time + count, open, high, low, close: last, volume } };
}

/**
 * Transform OHLC data into fixed-range bars. A bar closes once its high and
 * low are `rangeSize` apart, at the far end plus or minus the range: on the
 * way up at its low + range, on the way down at its high - range, so it
 * closes at a price it reached and keeps the wick of the way it went first.
 * The next bar opens at that close. A move of several ranges closes a bar for
 * each; so does a gap between two bars, whose bars stand at prices the gap
 * skipped, which did not trade. Like Renko, range bars have no time axis:
 * their times count up by one from the first bar's.
 *
 * Closes are kept to 15 significant digits of the largest price, so a range
 * finer than that closes no bar. When the closed bars would make more than
 * 100,000 range bars, or the last bar that many on its own, the range is
 * raised to 2, 5, 10, 20… times itself, the first that makes no more, and
 * every bar is built again on it. The last bar is counted on its own, so a
 * tick on it changes the range only when that bar alone makes that many.
 *
 * Approximation: input is OHLC, not tick-level. Each bar is replayed from
 * its open through its extremes in the order its candle implies (up bar:
 * open, low, high, close; down bar: open, high, low, close), its volume
 * shared by the three moves after the open.
 */
export function toRangeBars(data: DataSeries, config: RangeBarsConfig): DataSeries {
  if (data.length === 0 || !(config.rangeSize > 0)) return [];

  const top = largestPrice(data);
  // The range asked for, almost always: a try over the limit stops the moment it passes it.
  for (let n = 0; ; n++) {
    const range = n === 0
      ? config.rangeSize
      : Number((config.rangeSize * rangeMultiple(n)).toPrecision(PRICE_SIGNIFICANT_DIGITS));
    const closed = closeBars(data, range, priceRounder(top, range));
    if (!closed) continue;
    const bars = barsOf(closed.cells, closed.count, data[0].open, data[0].time);
    const { forming } = closed;
    if (config.includeForming && (bars.length === 0 || forming.high > forming.low)) bars.push(forming);
    return bars;
  }
}
