import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { barLimit, cappedSize, underCapAtAnySize } from './reshapeCap.js';

/** How a reversal is measured: a percent of the line's start, or an amount of price. */
type KagiMode = 'percent' | 'price';

/**
 * Kagi chart.
 * Changes direction when price reverses by the reversal amount: `reversal`
 * percent of the line's start, or `reversal` itself with `mode` 'price'.
 * Thick lines (yang) for uptrends, thin lines (yin) for downtrends.
 *
 * A source bar makes one line at most. On a series long enough for a tiny
 * reversal to make more than 100,000 lines from the bars before the last,
 * the reversal is raised to 2, 5, 10, 20… times itself, the first that
 * makes no more, as Renko's box and the range of range bars are.
 */
export function toKagi(data: DataSeries, reversal = 4, mode: KagiMode = 'percent'): DataSeries {
  if (data.length < 2) return data.slice();
  const size = underCapAtAnySize(data.length) ? reversal : cappedSize(reversal, (r) => walkKagi(data, r, mode));
  const lines: OHLCBar[] = [];
  walkKagi(data, size, mode, (line) => lines.push(line));
  return lines;
}

/**
 * Walks the lines `data` makes at `reversal`, handing each to `lay` when
 * given, the line still drawing last. False, before the line, once the bars
 * before the last would make more than MAX_RESHAPED_BARS.
 */
function walkKagi(data: DataSeries, reversal: number, mode: KagiMode, lay?: (line: OHLCBar) => void): boolean {
  let direction = data[1].close >= data[0].close ? 1 : -1;
  let high = data[0].close;
  let low = data[0].close;
  let lineStart = data[0].close;
  let idx = 0;

  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    const amount = mode === 'price' ? reversal : lineStart * (reversal / 100);
    if (direction === 1 && price > high) high = price;
    if (direction === -1 && price < low) low = price;
    const reverses = direction === 1 ? high - price >= amount : price - low >= amount;
    if (!reverses) continue;
    if (idx + 1 > barLimit(i, data.length, idx)) return false;
    // Finish the line, and start one the other way from where it turned.
    lay?.(line(idx, lineStart, direction === 1 ? high : low, data[i].volume));
    idx++;
    lineStart = direction === 1 ? high : low;
    direction = -direction;
    high = price;
    low = price;
  }

  // The line still drawing
  lay?.(line(idx, lineStart, direction === 1 ? high : low, 0));
  return true;
}

/** A line from `start` to `end`, up or down. */
function line(time: number, start: number, end: number, volume: number): OHLCBar {
  return { time, open: start, high: Math.max(start, end), low: Math.min(start, end), close: end, volume };
}
