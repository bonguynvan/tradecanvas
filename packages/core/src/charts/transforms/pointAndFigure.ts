import type { OHLCBar, DataSeries } from '@chart-lib/commons';

/**
 * Point & Figure chart.
 * X columns for rising prices, O columns for falling prices.
 * Reversal requires N boxes (default: 3) in the opposite direction.
 */
export function toPointAndFigure(data: DataSeries, boxSize: number, reversalBoxes = 3): DataSeries {
  if (data.length === 0 || boxSize <= 0) return [];

  const columns: OHLCBar[] = [];
  let direction = 0; // 1 = X (up), -1 = O (down)
  let colHigh = 0;
  let colLow = 0;
  let idx = 0;

  // Initialize
  const startPrice = Math.round(data[0].close / boxSize) * boxSize;
  colHigh = startPrice;
  colLow = startPrice;
  direction = 1;

  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    const roundedPrice = Math.round(price / boxSize) * boxSize;

    if (direction === 1) {
      if (roundedPrice > colHigh) {
        colHigh = roundedPrice;
      } else if (colHigh - roundedPrice >= boxSize * reversalBoxes) {
        // Close X column, start O column
        columns.push({
          time: idx++,
          open: colLow,
          high: colHigh,
          low: colLow,
          close: colHigh, // X = up
          volume: data[i].volume,
        });
        direction = -1;
        colLow = roundedPrice;
        colHigh = colHigh - boxSize;
      }
    } else {
      if (roundedPrice < colLow) {
        colLow = roundedPrice;
      } else if (roundedPrice - colLow >= boxSize * reversalBoxes) {
        // Close O column, start X column
        columns.push({
          time: idx++,
          open: colHigh,
          high: colHigh,
          low: colLow,
          close: colLow, // O = down
          volume: data[i].volume,
        });
        direction = 1;
        colHigh = roundedPrice;
        colLow = colLow + boxSize;
      }
    }
  }

  // Close final column
  columns.push({
    time: idx,
    open: direction === 1 ? colLow : colHigh,
    high: colHigh,
    low: colLow,
    close: direction === 1 ? colHigh : colLow,
    volume: 0,
  });

  return columns;
}
