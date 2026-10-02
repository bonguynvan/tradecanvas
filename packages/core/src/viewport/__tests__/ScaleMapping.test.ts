import { describe, it, expect, vi } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import {
  barTimeStep, barTimeStepMs, barIndexToTime, timestampToBarIndex, xToTime, timeToX,
  priceToY, priceToYMapper, yToPrice, priceBucketRow,
} from '../ScaleMapping.js';
import { TimeAxis } from '../../axis/TimeAxis.js';

const MIN = 60_000;
/** Ten 1-minute bars starting at t = 0, with one 5-minute gap after bar 4. */
const data = Array.from({ length: 10 }, (_, i) => ({ time: (i < 5 ? i : i + 4) * MIN }));

describe('barTimeStep', () => {
  it('is the median interval, so one gap does not skew it', () => {
    expect(barTimeStep(data)).toBe(MIN);
  });

  it('is 0 without at least two bars', () => {
    expect(barTimeStep([{ time: 5 }])).toBe(0);
  });
});

describe('time ↔ index beyond the data', () => {
  it('extrapolates times past the newest and before the oldest bar', () => {
    expect(barIndexToTime(9, data)).toBe(13 * MIN);
    expect(barIndexToTime(12, data)).toBe(16 * MIN); // 3 bars into the future
    expect(barIndexToTime(-2, data)).toBe(-2 * MIN);
  });

  it('maps future timestamps back to future indices instead of clamping to the last bar', () => {
    expect(timestampToBarIndex(16 * MIN, data)).toBe(12);
    expect(timestampToBarIndex(-2 * MIN, data)).toBe(-2);
    expect(timestampToBarIndex(13 * MIN, data)).toBe(9);
  });

  it('round-trips a drawing anchor placed in the future', () => {
    const vp: ViewportState = {
      visibleRange: { from: 0, to: 9 },
      priceRange: { min: 0, max: 100 },
      barWidth: 10,
      barSpacing: 0,
      offset: 0,
      chartRect: { x: 0, y: 0, width: 300, height: 100 },
      data,
    };
    const x = 12 * 10 + 5; // slot 12, past the last bar (9)
    const t = xToTime(x, vp);
    expect(t).toBe(16 * MIN);
    expect(timeToX(t, vp)).toBe(x);
  });
});

describe('TimeAxis', () => {
  it('labels slots in the empty future, not only loaded bars', () => {
    const texts: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key) => {
        if (key === 'fillText') return (t: string) => texts.push(t);
        if (key === 'measureText') return (t: string) => ({ width: t.length * 6 });
        return vi.fn();
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const vp: ViewportState = {
      visibleRange: { from: 0, to: 9 },
      priceRange: { min: 0, max: 100 },
      barWidth: 80,
      barSpacing: 0,
      offset: 0,
      chartRect: { x: 0, y: 0, width: 2000, height: 100 },
    };
    const axis = new TimeAxis();
    axis.setTimezoneOffset(0);
    axis.render(ctx, vp, DARK_THEME, data);
    // 25 slots fit; bars 10–24 are future and get labels too (one per slot at 80px).
    expect(texts.filter((t) => t !== 'UTC').length).toBeGreaterThan(10);
  });
});

describe('price ↔ y on every scale', () => {
  // Plot from y = 10 to y = 210; prices 100..200.
  const base = {
    visibleRange: { from: 0, to: 10 }, priceRange: { min: 100, max: 200 },
    barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 10, width: 500, height: 200 },
  } as ViewportState;
  const scales: [string, ViewportState][] = [
    ['linear', base],
    ['linear inverted', { ...base, invertScale: true }],
    ['log', { ...base, logScale: true }],
    ['log inverted', { ...base, logScale: true, invertScale: true }],
  ];

  it('puts the top price at the top, or at the bottom when inverted', () => {
    expect([priceToY(200, base), priceToY(100, base)]).toEqual([10, 210]);
    const inv = { ...base, invertScale: true };
    expect([priceToY(200, inv), priceToY(100, inv)]).toEqual([210, 10]);
  });

  it.each(scales)('%s: the mapper agrees with priceToY, and yToPrice undoes it', (_name, vp) => {
    const toY = priceToYMapper(vp);
    for (const price of [100, 117.5, 150, 199]) {
      expect(toY(price)).toBeCloseTo(priceToY(price, vp), 9);
      expect(yToPrice(priceToY(price, vp), vp)).toBeCloseTo(price, 9);
    }
  });

  it('log puts the geometric mean in the middle', () => {
    const vp = { ...base, logScale: true };
    expect(priceToY(Math.sqrt(100 * 200), vp)).toBeCloseTo(110, 9);
  });

  it('places price buckets on screen, lowest bucket nearest the low edge', () => {
    const toY = priceToYMapper(base);
    expect(priceBucketRow(0, 4, base, toY)).toEqual({ top: 160, height: 50, mid: 185 });
    const inv = { ...base, invertScale: true };
    expect(priceBucketRow(0, 4, inv, priceToYMapper(inv))).toEqual({ top: 10, height: 50, mid: 35 });
  });
});

describe('barTimeStepMs', () => {
  it('reports the bar spacing in ms for ms and for second timestamps', () => {
    const ms = Array.from({ length: 10 }, (_, i) => ({ time: 1_790_000_000_000 + i * 3_600_000 }));
    const sec = ms.map((b) => ({ time: b.time / 1000 }));
    expect(barTimeStepMs(ms)).toBe(3_600_000);
    expect(barTimeStepMs(sec)).toBe(3_600_000);
  });
});
