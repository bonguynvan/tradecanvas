import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { padPriceRange } from '@tradecanvas/commons';
import { PriceAxis } from '../PriceAxis.js';
import { priceToY } from '../../viewport/ScaleMapping.js';

const view = (min: number, max: number, height = 400, extra: Partial<ViewportState> = {}): ViewportState => ({
  visibleRange: { from: 0, to: 10 },
  priceRange: { min, max },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 500, height },
  ...extra,
});

/** Pixel gaps between consecutive ticks. */
const gaps = (ticks: number[], vp: ViewportState) =>
  ticks.slice(1).map((t, i) => Math.abs(priceToY(t, vp) - priceToY(ticks[i], vp)));

describe('PriceAxis ticks — density follows the height', () => {
  it('keeps labels apart on a short pane and fills a tall one', () => {
    const axis = new PriceAxis();
    const short = view(0, 100, 120);
    const tall = view(0, 100, 1400);
    expect(Math.min(...gaps(axis.ticks(short), short))).toBeGreaterThanOrEqual(30);
    expect(axis.ticks(tall).length).toBeGreaterThan(axis.ticks(short).length * 3);
    expect(Math.min(...gaps(axis.ticks(tall), tall))).toBeGreaterThanOrEqual(30);
  });

  it('still gives the usual steps at the usual height', () => {
    expect(new PriceAxis().ticks(view(83_000, 85_000))).toContain(84_000);
  });
});

describe('PriceAxis ticks — logarithmic', () => {
  const log = view(100, 120_000, 400, { scaleMode: 'logarithmic', logScale: true });

  it('labels the whole scale, the bottom too, with round prices', () => {
    const ticks = new PriceAxis().ticks(log);
    const ys = ticks.map((t) => priceToY(t, log));
    // Labels in the lower half as well as the upper.
    expect(ys.some((y) => y > 300)).toBe(true);
    expect(ys.some((y) => y < 100)).toBe(true);
    // Round prices: three significant digits at most (14,000, 150, 2.5).
    for (const t of ticks) expect(Number(t.toPrecision(3)), String(t)).toBeCloseTo(t, 9);
  });

  it('never puts two labels on top of each other', () => {
    const ticks = new PriceAxis().ticks(log);
    expect(Math.min(...gaps(ticks, log))).toBeGreaterThanOrEqual(30);
  });
});

describe('PriceAxis ticks — percent and indexed scales', () => {
  it('steps in round percents from the baseline', () => {
    const vp = view(95, 112, 400, { scaleMode: 'percentage', scaleBaseline: 103 });
    const pct = new PriceAxis().ticks(vp).map((p) => (p / 103 - 1) * 100);
    expect(pct.length).toBeGreaterThan(3);
    for (const v of pct) expect(Math.abs(v * 100 - Math.round(v * 100))).toBeLessThan(1e-6);
    // Round: whole multiples of the step, zero among them.
    expect(pct.some((v) => Math.abs(v) < 1e-9)).toBe(true);
  });

  it('steps in round index points on an indexed scale', () => {
    const vp = view(95, 112, 400, { scaleMode: 'indexedTo100', scaleBaseline: 103 });
    const idx = new PriceAxis().ticks(vp).map((p) => (p / 103) * 100);
    expect(idx.some((v) => Math.abs(v - 100) < 1e-9)).toBe(true);
    for (const v of idx) expect(Math.abs(v - Math.round(v))).toBeLessThan(1e-6);
  });
});

describe('padPriceRange', () => {
  it('pads a log range by ratio, so it stays above zero', () => {
    const { min, max } = padPriceRange(100, 120_000, 0.08, true);
    expect(min).toBeGreaterThan(0);
    expect(min).toBeLessThan(100);
    expect(max).toBeGreaterThan(120_000);
    // The same share of the log scale on each side.
    expect(Math.log(100 / min)).toBeCloseTo(Math.log(max / 120_000), 9);
  });

  it('pads a linear range by its span', () => {
    expect(padPriceRange(100, 200, 0.1, false)).toEqual({ min: 90, max: 210 });
  });
});

describe('PriceAxis ticks — degenerate ranges', () => {
  it('stops on a huge price with a step too fine to move it', async () => {
    const { stepTicks } = await import('../PriceAxis.js');
    expect(stepTicks(1e17, 1e17 + 1e3, 1e-3).length).toBeLessThanOrEqual(200);
    expect(stepTicks(Number.NaN, 1, 0.1)).toEqual([]);
  });

  it('labels a log scale with a coarse price step too', () => {
    const axis = new PriceAxis();
    axis.setPriceTick(1000);
    const vp = view(100, 120_000, 400, { scaleMode: 'logarithmic', logScale: true });
    expect(axis.ticks(vp).length).toBeGreaterThan(1);
  });
});
