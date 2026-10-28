import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { barLimit, fromReached, reshape, type LayBar, type ReshapeMemo } from './reshapeCap.js';
import { madeFrom } from './axisTimes.js';

export interface RenkoConfig {
  /**
   * The price move a brick stands for. One so small that the bars before the
   * last would make more than 100,000 bricks, or the last bar more than
   * 100,000 on its own, is raised to 2, 5, 10, 20… times itself, the first
   * that makes no more.
   */
  brickSize: number;
  /** Take the brick size from the ATR instead of `brickSize`. */
  useATR?: boolean;
  /** The ATR's period with `useATR`. Default 14. */
  atrPeriod?: number;
}

/**
 * Transform OHLC data to Renko bricks.
 * Each brick represents a fixed price movement.
 * No time axis — bricks form only when price moves by brickSize.
 *
 * A box so small for the prices that the bars before the last would make
 * more than 100,000 bricks, or the last bar that many on its own, is raised
 * to 2, 5, 10, 20… times itself, the first that makes no more, and every
 * brick is laid on it: a box typed far too small, or carried by a link,
 * can't fill the page's memory. A close that is no finite number is passed
 * over. A `memo` starts the next run on the series, after a tick or a new
 * bar, at the box it was raised to.
 */
export function toRenko(data: DataSeries, config: RenkoConfig, memo?: ReshapeMemo): DataSeries {
  if (data.length === 0) return [];
  const asked = askedBrickSize(data, config);
  const walk = (box: number, capped: boolean, lay?: LayBar) => walkBricks(data, box, capped, lay);
  return fromReached(memo, 'renko', asked, data, (start) => reshape(asked, walk, start)).bars;
}

/** The box asked for: the one set, or the ATR's; for a flat market, a hundredth of the price. */
function askedBrickSize(data: DataSeries, config: RenkoConfig): number {
  const box = config.useATR && data.length > 2 ? computeATRBrickSize(data, config.atrPeriod ?? 14) : config.brickSize;
  return box > 0 ? box : Math.abs(data[data.length - 1].close) / 100 || 1;
}

/**
 * Walks the bricks `data` makes at `size`, handing each to `lay` when given.
 * `capped`, false, before laying the bar's bricks, once the bars before the
 * last make more than MAX_RESHAPED_BARS or the last that many on its own. A
 * close that is no finite number is passed over: an infinite one would lay
 * bricks without end.
 */
function walkBricks(data: DataSeries, size: number, capped: boolean, lay?: LayBar): boolean {
  const first = data.findIndex((bar) => Number.isFinite(bar.close));
  if (first < 0) return true;
  const start = data[0].time;
  let level = Math.round(data[first].close / size) * size;
  let count = 0;
  for (let i = first + 1; i < data.length; i++) {
    const { close, volume } = data[i];
    const move = close - level;
    const bricks = Math.floor(Math.abs(move) / size);
    if (!Number.isFinite(close) || !(bricks >= 1)) continue;
    if (capped && count + bricks > barLimit(i, data.length, count)) return false;
    const direction = move > 0 ? 1 : -1;
    for (let j = 0; j < bricks; j++) {
      const open = level;
      level += direction * size;
      lay?.(madeFrom(brick(start + count + j, open, level, volume / bricks), data[i].time));
    }
    count += bricks;
  }
  return true;
}

/** A brick from `open` to `close`, with its share of the volume. */
function brick(time: number, open: number, close: number, volume: number): OHLCBar {
  return { time, open, high: Math.max(open, close), low: Math.min(open, close), close, volume };
}

/**
 * The average true range of the last `period` closed bars (the forming one
 * left out, so a tick doesn't re-brick the history), to two significant
 * digits so it holds still while the market moves a little.
 */
function computeATRBrickSize(data: DataSeries, period: number): number {
  const end = data.length - 1; // the forming bar
  const from = Math.max(1, end - period);
  let sum = 0;
  for (let i = from; i < end; i++) {
    sum += Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close),
    );
  }
  const atr = end > from ? sum / (end - from) : 0;
  if (!(atr > 0)) return 0;
  const scale = 10 ** (Math.floor(Math.log10(atr)) - 1);
  return Math.round(atr / scale) * scale;
}
