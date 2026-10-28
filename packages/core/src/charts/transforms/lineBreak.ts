import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { madeFrom } from './axisTimes.js';

/**
 * Three Line Break chart.
 * A new line is drawn only when the closing price exceeds the high or low
 * of the prior N lines (default: 3).
 *
 * A source bar makes one line at most, and the count of lines is no price
 * size: no setting can make more lines than there are bars, so unlike
 * Renko's box or Kagi's reversal nothing here is raised.
 */
export function toLineBreak(data: DataSeries, lineCount = 3): DataSeries {
  if (data.length === 0) return [];

  const lines: OHLCBar[] = [];
  let idx = 0;

  // First line
  lines.push(madeFrom({
    time: idx++,
    open: data[0].open,
    high: Math.max(data[0].open, data[0].close),
    low: Math.min(data[0].open, data[0].close),
    close: data[0].close,
    volume: data[0].volume,
  }, data[0].time));

  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    const lastLine = lines[lines.length - 1];
    const isUp = lastLine.close >= lastLine.open;

    // Look back N lines for reversal detection
    const lookback = Math.min(lineCount, lines.length);
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = lines.length - lookback; j < lines.length; j++) {
      highestHigh = Math.max(highestHigh, lines[j].high);
      lowestLow = Math.min(lowestLow, lines[j].low);
    }

    if (isUp && price > lastLine.close) {
      // Continuation up
      lines.push(madeFrom({
        time: idx++,
        open: lastLine.close,
        high: price,
        low: lastLine.close,
        close: price,
        volume: data[i].volume,
      }, data[i].time));
    } else if (!isUp && price < lastLine.close) {
      // Continuation down
      lines.push(madeFrom({
        time: idx++,
        open: lastLine.close,
        high: lastLine.close,
        low: price,
        close: price,
        volume: data[i].volume,
      }, data[i].time));
    } else if (isUp && price < lowestLow) {
      // Reversal down
      lines.push(madeFrom({
        time: idx++,
        open: lastLine.close,
        high: lastLine.close,
        low: price,
        close: price,
        volume: data[i].volume,
      }, data[i].time));
    } else if (!isUp && price > highestHigh) {
      // Reversal up
      lines.push(madeFrom({
        time: idx++,
        open: lastLine.close,
        high: price,
        low: lastLine.close,
        close: price,
        volume: data[i].volume,
      }, data[i].time));
    }
  }

  return lines;
}
