import type { OHLCBar, DataSeries } from '@chart-lib/commons';

/**
 * Kagi chart.
 * Changes direction when price reverses by the reversal amount.
 * Thick lines (yang) for uptrends, thin lines (yin) for downtrends.
 */
export function toKagi(data: DataSeries, reversalPercent = 4): DataSeries {
  if (data.length < 2) return data.slice();

  const lines: OHLCBar[] = [];
  let direction = data[1].close >= data[0].close ? 1 : -1;
  let high = data[0].close;
  let low = data[0].close;
  let lineStart = data[0].close;
  let idx = 0;

  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    const reversal = lineStart * (reversalPercent / 100);

    if (direction === 1) {
      if (price > high) high = price;
      if (high - price >= reversal) {
        // Finish up line, start down
        lines.push({
          time: idx++,
          open: lineStart,
          high,
          low: lineStart,
          close: high,
          volume: data[i].volume,
        });
        direction = -1;
        lineStart = high;
        low = price;
        high = price;
      }
    } else {
      if (price < low) low = price;
      if (price - low >= reversal) {
        // Finish down line, start up
        lines.push({
          time: idx++,
          open: lineStart,
          high: lineStart,
          low,
          close: low,
          volume: data[i].volume,
        });
        direction = 1;
        lineStart = low;
        high = price;
        low = price;
      }
    }
  }

  // Close final line
  if (direction === 1) {
    lines.push({ time: idx, open: lineStart, high, low: lineStart, close: high, volume: 0 });
  } else {
    lines.push({ time: idx, open: lineStart, high: lineStart, low, close: low, volume: 0 });
  }

  return lines;
}
