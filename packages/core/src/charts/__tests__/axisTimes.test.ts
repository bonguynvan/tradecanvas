import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { axisTimes, toKagi, toLineBreak, toPointAndFigure, toRangeBars, toRenko } from '../transforms/index.js';

const DAY = 86_400_000;
const T0 = Date.UTC(2024, 0, 1);
/** A climb, a fall and a climb again, a bar a day. */
const bars: OHLCBar[] = [100, 104, 108, 112, 106, 100, 94, 100, 106, 112, 118].map((close, i) => ({
  time: T0 + i * DAY, open: close, high: close + 1, low: close - 1, close, volume: 10,
}));
const dataTimes = new Set(bars.map((b) => b.time));

describe('axisTimes', () => {
  const built = {
    renko: toRenko(bars, { brickSize: 2 }),
    kagi: toKagi(bars, 4, 'price'),
    lineBreak: toLineBreak(bars, 3),
    pointAndFigure: toPointAndFigure(bars, 2, 3),
    rangeBars: toRangeBars(bars, { rangeSize: 3, includeForming: true }),
  };

  for (const [type, series] of Object.entries(built)) {
    it(`dates ${type} by the bars they were finished on, in order`, () => {
      expect(series.length).toBeGreaterThan(1);
      const times = axisTimes(series).map((t) => t.time);
      expect(times).toHaveLength(series.length);
      for (const t of times) expect(dataTimes.has(t), `${type} ${t}`).toBe(true);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      // Their own times still count them, one apart, for lookups.
      expect(new Set(series.map((b) => b.time)).size).toBe(series.length);
    });
  }

  it('gives a series no transform built its own times, the same array', () => {
    expect(axisTimes(bars)).toBe(bars);
  });

  it('keeps the times while the series is the same array', () => {
    expect(axisTimes(built.renko)).toBe(axisTimes(built.renko));
  });
});
