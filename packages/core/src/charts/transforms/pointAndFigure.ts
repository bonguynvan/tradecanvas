import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { barLimit, fromReached, reshapeOneABar, type LayBar, type ReshapeMemo } from './reshapeCap.js';

/** A point & figure chart's columns, and the box they were built on, to draw them that size. */
export interface PointAndFigureColumns {
  columns: DataSeries;
  boxSize: number;
}

/**
 * Point & Figure chart.
 * X columns for rising prices, O columns for falling prices.
 * Reversal requires N boxes (default: 3) in the opposite direction.
 *
 * The columns of `pointAndFigureColumns`, without their box.
 */
export function toPointAndFigure(data: DataSeries, boxSize: number, reversalBoxes = 3, memo?: ReshapeMemo): DataSeries {
  return pointAndFigureColumns(data, boxSize, reversalBoxes, memo).columns;
}

/**
 * The columns of a point & figure chart, and the box they were built on:
 * `boxSize`, or on a series long enough for a tiny box to make more than
 * 100,000 columns from the bars before the last (a source bar makes one at
 * most), the first of 2, 5, 10, 20… times it that makes no more. A renderer
 * draws the boxes that size. Where no box would (a reversal of no boxes),
 * every column is built on `boxSize`. A `memo` starts the next run on the
 * series, after a tick or a new bar, at the box it was raised to.
 */
export function pointAndFigureColumns(data: DataSeries, boxSize: number, reversalBoxes = 3, memo?: ReshapeMemo): PointAndFigureColumns {
  if (data.length === 0 || !(boxSize > 0)) return { columns: [], boxSize };
  const walk = (box: number, capped: boolean, lay?: LayBar) => walkColumns(data, box, reversalBoxes, capped, lay);
  const { bars, size } = fromReached(memo, `pointAndFigure:${reversalBoxes}`, boxSize, data, (start) => reshapeOneABar(boxSize, walk, start));
  return { columns: bars, boxSize: size };
}

/**
 * Walks the columns `data` makes at `boxSize`, handing each to `lay` when
 * given, the column still forming last. `capped`, false, before the column,
 * once the bars before the last would make more than MAX_RESHAPED_BARS.
 * False, capped or not, at a box so small that a price over it passes the
 * largest number (1e-310 for 60,000): no box can place that price, and a
 * larger box is tried, where the columns would have stood at Infinity.
 */
function walkColumns(data: DataSeries, boxSize: number, reversalBoxes: number, capped: boolean, lay?: LayBar): boolean {
  let direction = 1; // 1 = X (up), -1 = O (down)
  let idx = 0;
  const first = data[0].close;
  const startPrice = Math.round(first / boxSize) * boxSize;
  if (pastLargest(first, startPrice)) return false;
  let colHigh = startPrice;
  let colLow = startPrice;
  const reversal = boxSize * reversalBoxes;

  for (let i = 1; i < data.length; i++) {
    const close = data[i].close;
    const roundedPrice = Math.round(close / boxSize) * boxSize;
    if (pastLargest(close, roundedPrice)) return false;
    // A new box the column's way extends it; only a price that doesn't can reverse it.
    let reverses = false;
    if (direction === 1) {
      if (roundedPrice > colHigh) colHigh = roundedPrice;
      else reverses = colHigh - roundedPrice >= reversal;
    } else if (roundedPrice < colLow) colLow = roundedPrice;
    else reverses = roundedPrice - colLow >= reversal;
    if (!reverses) continue;
    if (capped && idx + 1 > barLimit(i, data.length, idx)) return false;
    // Close the column, and start one the other way a box from its end.
    lay?.(column(idx, direction === 1, colLow, colHigh, data[i].volume));
    idx++;
    if (direction === 1) {
      colLow = roundedPrice;
      colHigh -= boxSize;
    } else {
      colHigh = roundedPrice;
      colLow += boxSize;
    }
    direction = -direction;
  }

  // The column still forming
  lay?.(column(idx, direction === 1, colLow, colHigh, 0));
  return true;
}

/** Whether a finite `close` rounded to boxes came out no finite price: the box is too small to count it in. */
function pastLargest(close: number, rounded: number): boolean {
  return Number.isFinite(close) && !Number.isFinite(rounded);
}

/** A column from `low` to `high`: an X column (`up`) closes at its high, an O column at its low. */
function column(time: number, up: boolean, low: number, high: number, volume: number): OHLCBar {
  return { time, open: up ? low : high, high, low, close: up ? high : low, volume };
}
