import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { HiLoRenderer } from '../HiLoRenderer.js';
import { PriceLines } from '../../ui/PriceLines.js';
import { toKagi } from '../transforms/kagi.js';
import { toRenko } from '../transforms/renko.js';

const bar = (i: number, low: number, high: number, open = low, close = high): OHLCBar =>
  ({ time: i, open, high, low, close, volume: 1 });

/** Records rects, filled text and line ends. */
function recorder() {
  const rects: number[][] = [];
  const texts: string[] = [];
  const state: Record<string, unknown> = { fillStyle: '', strokeStyle: '' };
  const ctx = new Proxy(state, {
    get: (t, key) => {
      if (key === 'fillRect') return (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]);
      if (key === 'fillText') return (text: string) => texts.push(text);
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (key in t) return t[key as string];
      return vi.fn();
    },
    set: (t, key, v) => { t[key as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rects, texts };
}

// 100 px per price unit (0…10 over 1000 px), bars 20 px apart.
const viewport = (barWidth: number): ViewportState => ({
  visibleRange: { from: 0, to: 2 },
  priceRange: { min: 0, max: 10 },
  barWidth,
  barSpacing: 4,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 400, height: 1000 },
});

describe('HiLoRenderer', () => {
  const data: DataSeries = [bar(0, 2, 5), bar(1, 3, 8, 7, 4), bar(2, 1, 4)];

  it('draws each bar from its low to its high', () => {
    const { ctx, rects } = recorder();
    new HiLoRenderer().render(ctx, data, viewport(16), DARK_THEME);
    expect(rects).toHaveLength(3);
    const [, y, , h] = rects[0];
    expect(y).toBeCloseTo(500); // high 5
    expect(y + h).toBeCloseTo(800); // low 2
  });

  it('writes the high and the low by wide bars only', () => {
    const narrow = recorder();
    new HiLoRenderer().render(narrow.ctx, data, viewport(6), DARK_THEME);
    expect(narrow.texts).toEqual([]);
    const wide = recorder();
    new HiLoRenderer().render(wide.ctx, data, { ...viewport(40), formatPrice: (p) => `p${p}` }, DARK_THEME);
    expect(wide.texts).toEqual(expect.arrayContaining(['p5', 'p2', 'p8', 'p3']));
  });
});

describe('PriceLines', () => {
  const data: DataSeries = [bar(0, 2, 5), bar(1, 3, 8), bar(2, 1, 4), bar(3, 0.5, 9.5)];

  it('marks the highest high and lowest low on screen', () => {
    const lines = new PriceLines();
    lines.setHighLow(true);
    expect(lines.levels(data, viewport(16))).toEqual([
      { kind: 'high', price: 8 },
      { kind: 'low', price: 1 },
    ]);
    const { ctx, texts } = recorder();
    lines.renderAxisTags(ctx, { ...viewport(16), formatPrice: (p) => `p${p}` }, DARK_THEME, data);
    expect(texts).toEqual(expect.arrayContaining(['p8', 'p1']));
  });

  it('marks the bid and the ask, and nothing once cleared', () => {
    const lines = new PriceLines();
    lines.setBidAsk({ bid: 4.5, ask: 4.6 });
    expect(lines.levels(data, viewport(16))).toEqual([
      { kind: 'bid', price: 4.5 },
      { kind: 'ask', price: 4.6 },
    ]);
    lines.setBidAsk(null);
    expect(lines.levels(data, viewport(16))).toEqual([]);
  });

  it('takes no bid or ask that isn’t a number', () => {
    const lines = new PriceLines();
    lines.setBidAsk({ bid: Number.NaN, ask: 4.6 });
    expect(lines.levels(data, viewport(16))).toEqual([{ kind: 'ask', price: 4.6 }]);
  });
});

describe('chart type settings in the transforms', () => {
  const rising: DataSeries = Array.from({ length: 40 }, (_, i) => bar(i, 100 + i - 0.5, 100 + i + 0.5, 100 + i, 100 + i));

  it('reverses Kagi on a price amount as well as a percent', () => {
    // Around 1000, 5 is a 6-point dip's worth; 5% is 50.
    const zig: DataSeries = [1000, 1010, 1004, 1020, 1017, 1030].map((c, i) => bar(i, c, c, c, c));
    expect(toKagi(zig, 5, 'price').length).toBeGreaterThan(toKagi(zig, 5, 'percent').length);
  });

  it('sizes Renko bricks from the latest bars’ true range', () => {
    const calmThenWild: DataSeries = [
      ...Array.from({ length: 30 }, (_, i) => bar(i, 99.9, 100.1, 100, 100)),
      ...Array.from({ length: 14 }, (_, i) => bar(30 + i, 100 - 5, 100 + 5, 100, 100)),
    ];
    const bricks = toRenko([...calmThenWild, bar(44, 100, 140, 100, 140)], { brickSize: 0, useATR: true, atrPeriod: 14 });
    // Bricks of about 10 (the wild bars' range), not about 0.2 (the calm ones').
    expect(bricks.length).toBeGreaterThan(0);
    expect(bricks.length).toBeLessThan(10);
    expect(toRenko(rising, { brickSize: 5 }).every((b) => Math.abs(b.close - b.open - 5) < 1e-9)).toBe(true);
  });
});

describe('round 8 review', () => {
  it('keeps Renko’s brick size while the forming bar moves', () => {
    const series: DataSeries = Array.from({ length: 40 }, (_, i) => bar(i, 100 + i - 1, 100 + i + 1, 100 + i, 100 + i));
    const size = (d: DataSeries) => { const b = toRenko(d, { brickSize: 0, useATR: true, atrPeriod: 14 }); return Math.abs(b[0].close - b[0].open); };
    const wider = [...series.slice(0, -1), { ...series[series.length - 1], high: 200, low: 50 }];
    expect(size(wider)).toBe(size(series));
  });

  it('sizes Renko from the bars there are, even fewer than its length', () => {
    const few: DataSeries = Array.from({ length: 6 }, (_, i) => bar(i, 0.5 + i * 0.01 - 0.005, 0.5 + i * 0.01 + 0.005, 0.5 + i * 0.01, 0.5 + i * 0.01));
    expect(toRenko(few, { brickSize: 0, useATR: true, atrPeriod: 200 }).length).toBeGreaterThan(0);
  });

  it('prints its tags the chart’s way, and leaves the quote out when told', () => {
    const lines = new PriceLines();
    lines.setHighLow(true);
    lines.setBidAsk({ bid: 4.5, ask: 4.6 });
    lines.setPriceText((p) => `≈${p}`);
    const { ctx, texts } = recorder();
    lines.renderAxisTags(ctx, viewport(16), DARK_THEME, [bar(0, 2, 5), bar(1, 3, 8)]);
    expect(texts).toEqual(expect.arrayContaining(['≈8', '≈2', '≈4.5', '≈4.6']));
    lines.setQuoteShown(false);
    expect(lines.levels([bar(0, 2, 5)], viewport(16)).map((l) => l.kind)).toEqual(['high', 'low']);
  });
});
