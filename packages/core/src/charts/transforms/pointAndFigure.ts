import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { barLimit, cappedSize, underCapAtAnySize } from './reshapeCap.js';

/**
 * Point & Figure chart.
 * X columns for rising prices, O columns for falling prices.
 * Reversal requires N boxes (default: 3) in the opposite direction.
 *
 * The columns are built on `pointAndFigureBoxSize(data, boxSize,
 * reversalBoxes)`: the box asked for, or on a series long enough for a tiny
 * box to make more than 100,000 columns from the bars before the last, the
 * first of 2, 5, 10, 20… times it that makes no more. A renderer draws the
 * boxes that size.
 */
export function toPointAndFigure(data: DataSeries, boxSize: number, reversalBoxes = 3): DataSeries {
  if (data.length === 0 || !(boxSize > 0)) return [];
  const columns: OHLCBar[] = [];
  walkColumns(data, pointAndFigureBoxSize(data, boxSize, reversalBoxes), reversalBoxes, (column) => columns.push(column));
  return columns;
}

/**
 * The box `toPointAndFigure` builds its columns on: `boxSize`, or when the
 * bars before the last would make more than 100,000 columns with it (a
 * source bar makes one at most, so only a longer series can), the first of
 * 2, 5, 10, 20… times it that makes no more.
 */
export function pointAndFigureBoxSize(data: DataSeries, boxSize: number, reversalBoxes = 3): number {
  if (data.length === 0 || underCapAtAnySize(data.length)) return boxSize;
  return cappedSize(boxSize, (box) => walkColumns(data, box, reversalBoxes));
}

/**
 * Walks the columns `data` makes at `boxSize`, handing each to `lay` when
 * given, the column still forming last. False, before the column, once the
 * bars before the last would make more than MAX_RESHAPED_BARS.
 */
function walkColumns(data: DataSeries, boxSize: number, reversalBoxes: number, lay?: (column: OHLCBar) => void): boolean {
  let direction = 1; // 1 = X (up), -1 = O (down)
  let idx = 0;
  const startPrice = Math.round(data[0].close / boxSize) * boxSize;
  let colHigh = startPrice;
  let colLow = startPrice;
  const reversal = boxSize * reversalBoxes;

  for (let i = 1; i < data.length; i++) {
    const roundedPrice = Math.round(data[i].close / boxSize) * boxSize;
    // A new box the column's way extends it; only a price that doesn't can reverse it.
    let reverses = false;
    if (direction === 1) {
      if (roundedPrice > colHigh) colHigh = roundedPrice;
      else reverses = colHigh - roundedPrice >= reversal;
    } else if (roundedPrice < colLow) colLow = roundedPrice;
    else reverses = roundedPrice - colLow >= reversal;
    if (!reverses) continue;
    if (idx + 1 > barLimit(i, data.length, idx)) return false;
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

/** A column from `low` to `high`: an X column (`up`) closes at its high, an O column at its low. */
function column(time: number, up: boolean, low: number, high: number, volume: number): OHLCBar {
  return { time, open: up ? low : high, high, low, close: up ? high : low, volume };
}
