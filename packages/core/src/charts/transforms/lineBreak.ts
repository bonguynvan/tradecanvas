import type { OHLCBar, DataSeries } from '@chart-lib/commons';

/**
 * Three Line Break chart.
 * A new line is drawn only when the closing price exceeds the high or low
 * of the prior N lines (default: 3).
 */
export function toLineBreak(data: DataSeries, lineCount = 3): DataSeries {
  if (data.length === 0) return [];

  const lines: OHLCBar[] = [];
  let idx = 0;

  // First line
  lines.push({
    time: idx++,
    open: data[0].open,
    high: Math.max(data[0].open, data[0].close),
    low: Math.min(data[0].open, data[0].close),
    close: data[0].close,
    volume: data[0].volume,
  });

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
      lines.push({
        time: idx++,
        open: lastLine.close,
        high: price,
        low: lastLine.close,
        close: price,
        volume: data[i].volume,
      });
    } else if (!isUp && price < lastLine.close) {
      // Continuation down
      lines.push({
        time: idx++,
        open: lastLine.close,
        high: lastLine.close,
        low: price,
        close: price,
        volume: data[i].volume,
      });
    } else if (isUp && price < lowestLow) {
      // Reversal down
      lines.push({
        time: idx++,
        open: lastLine.close,
        high: lastLine.close,
        low: price,
        close: price,
        volume: data[i].volume,
      });
    } else if (!isUp && price > highestHigh) {
      // Reversal up
      lines.push({
        time: idx++,
        open: lastLine.close,
        high: price,
        low: lastLine.close,
        close: price,
        volume: data[i].volume,
      });
    }
  }

  return lines;
}
