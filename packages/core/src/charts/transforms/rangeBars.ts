import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { MAX_RESHAPED_BARS, barLimit, sizeAt } from './reshapeCap.js';

export interface RangeBarsConfig {
  /**
   * Price distance per range bar. Each bar is closed when (high - low) >= rangeSize.
   * A range under half the 15th significant digit of the largest price closes
   * no bar, however the prices are written. A larger one so small that the
   * closed bars would make more than 100,000 range bars, or the last bar more
   * than 100,000 on its own, is raised to 2, 5, 10, 20… times itself, the
   * first that makes no more; every bar is then built on the raised range.
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

/** The prices a bar is replayed through after its open, its extremes and its close: they share its volume. */
const PATH_PRICES = 3;

/** Numbers kept for each closed bar: its close, the far end it started from, its volume. */
const CELLS_PER_BAR = 3;
/** Closed bars there is room for at least, before the store first grows; a long series starts with one for each of its bars. */
const MIN_ROOM_BARS = 64;

/**
 * How many of the last digit kept a range must be for a move of a range to
 * close a bar every time: below it, a close may read as the far end it starts
 * from, a bar may grow past the range, and the count in surelyTooMany is not sure.
 */
const MIN_RANGE_UNITS = 2;

/**
 * The largest price the bars reach, high or low, by size. A price that is no
 * finite number is left out, as the replay leaves it out: one would turn the
 * rounding off for every close.
 */
function largestPrice(data: DataSeries): number {
  let top = 0;
  for (const bar of data) {
    const high = Math.abs(bar.high);
    const low = Math.abs(bar.low);
    if (high > top && high !== Infinity) top = high;
    if (low > top && low !== Infinity) top = low;
  }
  return top;
}

/** How a try keeps its prices, worked out once for the whole series rather than through text on every tick's replay. */
interface KeptDigits {
  /** Rounds a price to 15 significant digits of the series' largest price, or of the range when that is larger. */
  clean: (price: number) => number;
  /** The last digit kept, as a price: a bar may span the range and this much again of float dust. */
  unit: number;
  /**
   * Half the last digit kept, or 0 when no digit is cut: a price nearer than this to a close reaches it, and a bar
   * that has moved less has not moved.
   */
  half: number;
}

function keptDigits(top: number, range: number): KeptDigits {
  const largest = Math.max(top, range);
  // Its digits before the point (3 for 100 as for 999, 0 for 0.5, -1 for 0.05): a power of ten has one more than its log.
  const leading = Math.floor(Math.log10(largest)) + 1;
  const decimals = Number.isFinite(largest) ? PRICE_SIGNIFICANT_DIGITS - leading : 0;
  const unit = 10 ** -decimals;
  if (decimals <= 0) return { clean: (price) => price, unit, half: 0 };
  const scale = 10 ** decimals;
  return { clean: (price) => Math.round(price * scale) / scale, unit, half: unit / 2 };
}

/**
 * How far the price spans within each source bar but the last, from the
 * close before it through its own prices, summed, and how many bars that is.
 * The bars forming while a source bar is replayed cover its span, each at
 * most a range wide, and one of them goes on into the next: a try makes at
 * least the summed span over the range, less one bar a source bar, closed
 * bars before it reaches the last bar.
 */
interface SpannedPath {
  /** Each source bar's span but the last one's, summed, in price. */
  distance: number;
  /** The source bars summed: all but the last. */
  bars: number;
}

function spannedPath(data: DataSeries): SpannedPath {
  let distance = 0;
  let last = data[0].open;
  for (let i = 0; i < data.length - 1; i++) {
    const { open, high, low, close } = data[i];
    let top = -Infinity;
    let bottom = Infinity;
    for (const price of [last, open, high, low, close]) {
      if (!Number.isFinite(price)) continue;
      top = Math.max(top, price);
      bottom = Math.min(bottom, price);
    }
    if (top > bottom) distance += top - bottom;
    // The replay ends a bar on its close. Without one, where the next bar starts from is left out of its span,
    // which can only make the sum smaller.
    last = close;
  }
  return { distance, bars: data.length - 1 };
}

/**
 * Whether a try at `range` is sure to close more than MAX_RESHAPED_BARS before
 * the last bar (see SpannedPath), so it need not be replayed. A price within
 * half a digit of a close is taken as that close, so each source bar's span
 * counts a digit less, and the count must pass the limit by more than a bar,
 * which the sum's own rounding can't make up.
 */
function surelyTooMany(path: SpannedPath, range: number, unit: number): boolean {
  if (range < MIN_RANGE_UNITS * unit) return false;
  return (path.distance - path.bars * unit) / (range + unit) - path.bars > MAX_RESHAPED_BARS + 1;
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
 * closed above the far end it started from went up: that end is its low. Its
 * open can't tell: a bar may close at the price it opened at.
 */
function barsOf(cells: Float64Array, count: number, open: number, time: number): OHLCBar[] {
  const bars: OHLCBar[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const close = cells[i * CELLS_PER_BAR];
    const from = cells[i * CELLS_PER_BAR + 1];
    const up = close > from;
    bars[i] = { time: time + i, open, high: up ? close : from, low: up ? from : close, close, volume: cells[i * CELLS_PER_BAR + 2] };
    open = close;
  }
  return bars;
}

/**
 * What a try at one range closed, as numbers (see CELLS_PER_BAR), and the bar
 * it left forming, or null when the try failed. `cells` is the store it wrote
 * to, grown or not, for the next try to write to again.
 */
interface RangeTry {
  cells: Float64Array;
  count: number;
  forming: OHLCBar | null;
}

/**
 * The bars `data` closes at `range`, written to `cells`, or no bar forming as
 * soon as the closed bars have made more than MAX_RESHAPED_BARS, or the last bar
 * that many on its own, or a bar would close more than a kept digit short of a
 * price it reached: the range is too small for the move or for the kept
 * digits, and the rest is not replayed. The closed bars are kept as numbers and
 * made into bars only by the try that passes, so a try that fails leaves
 * nothing behind to collect.
 */
function closeBars(data: DataSeries, range: number, digits: KeptDigits, cells: Float64Array): RangeTry {
  const { clean, unit, half } = digits;
  let count = 0;
  let open = data[0].open;
  let high = open;
  let low = open;
  let last = open;
  let volume = 0;
  // Where the bar forming closes, up and down: worked out when its low or high moves, not on every price.
  let upClose = clean(open + range);
  let downClose = clean(open - range);
  for (let i = 0; i < data.length; i++) {
    // The last bar may make as many again on its own, so a tick on it seldom moves the range.
    const limit = barLimit(i, data.length, count);
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
      // kept digits can't tell from the far end it starts from would close bars of nothing without end.
      // A price within half a kept digit of a close reaches it: a feed's whole ticks times its tick
      // size write 100209.4 as 100209.40000000001, and the bar closes there as on the price meant.
      for (;;) {
        const up = price > high && price >= upClose - half && upClose > low;
        if (!up && !(price < low && price <= downClose + half && downClose < high)) break;
        const at = up ? upClose : downClose;
        // A close more than a kept digit short of the bar's near end is a price the move went straight past. Only a
        // range near half a digit makes one: the digits round it to a whole digit one way and to nothing the other,
        // so a bar can't close that other way and grows past the range. A wider range is tried.
        if (up ? at < high - unit : at > low + unit) return { cells, count, forming: null };
        const cell = count * CELLS_PER_BAR;
        if (cell === cells.length) cells = grownCells(cells);
        cells[cell] = at;
        cells[cell + 1] = up ? low : high;
        cells[cell + 2] = volume;
        if (++count > limit) return { cells, count, forming: null };
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
 * under half the last of them closes no bar, however the prices are written,
 * and a price those digits read as a close (100209.40000000001 for 100209.4)
 * reaches it. When the closed bars would make more than 100,000 range bars,
 * or the last bar that many on its own, the range is raised to 2, 5, 10, 20…
 * times itself, the first that makes no more, and every bar is built again on
 * it; so is a range just over half a digit that the digits round to nothing
 * one way, which would leave a bar growing past it. The last bar is counted
 * on its own, so a tick on it changes the range only when that bar alone
 * makes that many.
 *
 * Approximation: input is OHLC, not tick-level. Each bar is replayed from
 * its open through its extremes in the order its candle implies (up bar:
 * open, low, high, close; down bar: open, high, low, close), its volume
 * shared by the three moves after the open.
 */
export function toRangeBars(data: DataSeries, config: RangeBarsConfig): DataSeries {
  if (data.length === 0 || !(config.rangeSize > 0)) return [];

  const top = largestPrice(data);
  // Room for a bar a source bar to start with, which most ranges come near; a try that fails leaves it grown for the next.
  let cells: Float64Array = new Float64Array(CELLS_PER_BAR * Math.max(MIN_ROOM_BARS, Math.min(data.length, MAX_RESHAPED_BARS)));
  // Worked out only once a range has failed: the ranges it shows too small are not replayed.
  let path: SpannedPath | null = null;
  // The range asked for, almost always: a try over the limit stops the moment it passes it.
  for (let n = 0; ; n++) {
    const range = sizeAt(config.rangeSize, n);
    const digits = keptDigits(top, range);
    if (n > 0) {
      path ??= spannedPath(data);
      if (surelyTooMany(path, range, digits.unit)) continue;
    }
    // A range under half the last digit kept can't move a close off the price it starts from, so only a price's
    // float dust would close a bar, at a price the move went straight past: it closes none, as a range no move reaches.
    const closed = closeBars(data, range < digits.half ? Infinity : range, digits, cells);
    cells = closed.cells;
    if (!closed.forming) continue;
    const bars = barsOf(cells, closed.count, data[0].open, data[0].time);
    const { forming } = closed;
    // A bar that has moved less than half a kept digit since the last close has not moved: 100.30000000000001 is 100.3.
    if (config.includeForming && (bars.length === 0 || forming.high - forming.low > digits.half)) bars.push(forming);
    return bars;
  }
}
