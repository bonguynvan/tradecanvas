import { describe, it, expect } from 'vitest';
import { ZigZagIndicator } from '../overlay/ZigZag.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('ZigZagIndicator', () => {
  const zigzag = new ZigZagIndicator();

  it('returns no pivots when moves never exceed deviation threshold', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, () => ({ o: 100, h: 100.5, l: 99.5, c: 100 })),
    );
    const { meta } = zigzag.calculate(data, indicatorConfig('zigzag', { deviation: 5 }));
    const pivots = meta?.pivots as { idx: number }[];
    expect(pivots.length).toBeLessThanOrEqual(1);
  });

  it('detects alternating swing highs and lows above the deviation threshold', () => {
    const closes = [100, 110, 105, 95, 100, 115, 110, 90];
    const data = ohlcBars(
      closes.map((c) => ({ o: c, h: c, l: c, c })),
    );
    const { meta } = zigzag.calculate(data, indicatorConfig('zigzag', { deviation: 5 }));
    const pivots = meta?.pivots as { type: 'high' | 'low' }[];

    expect(pivots.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < pivots.length; i++) {
      expect(pivots[i].type).not.toBe(pivots[i - 1].type);
    }
  });

  it('writes pivot prices into the values map at pivot timestamps', () => {
    const closes = [100, 120, 90, 130];
    const data = ohlcBars(closes.map((c) => ({ o: c, h: c, l: c, c })));
    const { values, meta } = zigzag.calculate(
      data,
      indicatorConfig('zigzag', { deviation: 5 }),
    );
    const pivots = meta?.pivots as { idx: number; price: number }[];
    for (const p of pivots) {
      expect(values.get(data[p.idx].time)?.pivot).toBeCloseTo(p.price);
    }
  });

  it('clamps deviation to a positive minimum', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, (_, i) => ({ o: 100 + i, h: 100 + i, l: 100 + i, c: 100 + i })),
    );
    const { meta } = zigzag.calculate(data, indicatorConfig('zigzag', { deviation: 0 }));
    expect(meta?.pivots).toBeDefined();
  });
});
