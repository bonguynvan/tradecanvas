import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { counterClockPoints, counterClockPhase, computeCounterClockLayout, nearestCounterClockPoint, renderCounterClock } from '../CounterClockRenderer.js';

const measure = (text: string, size = 11) => text.length * size * 0.6;

function bars(closes: number[], volumes: number[]): OHLCBar[] {
  return closes.map((c, i) => ({ time: i * 86_400_000, open: c, high: c + 1, low: c - 1, close: c, volume: volumes[i] }));
}

describe('counter-clock points', () => {
  it('averages volume and close over the period, from the first full window', () => {
    const pts = counterClockPoints(bars([10, 20, 30, 40], [100, 200, 300, 400]), 2);
    expect(pts).toEqual([
      { time: 86_400_000, volume: 150, price: 15 },
      { time: 2 * 86_400_000, volume: 250, price: 25 },
      { time: 3 * 86_400_000, volume: 350, price: 35 },
    ]);
    expect(counterClockPoints(bars([1], [1]), 5)).toEqual([]);
  });
});

describe('counter-clock phases', () => {
  const at = (volume: number, price: number, time = 0) => ({ time, volume, price });
  it('names the last move’s direction, counter-clockwise from volume rising', () => {
    // Spans of 10 in each, so the moves below are read at their true angles.
    const frame = [at(0, 0), at(10, 10)];
    const phase = (dv: number, dp: number) => counterClockPhase([...frame, at(5, 5), at(5 + dv, 5 + dp)]);
    expect(phase(2, 0)).toBe(1);
    expect(phase(2, 2)).toBe(2);
    expect(phase(0, 2)).toBe(3);
    expect(phase(-2, 2)).toBe(4);
    expect(phase(-2, 0)).toBe(5);
    expect(phase(-2, -2)).toBe(6);
    expect(phase(0, -2)).toBe(7);
    expect(phase(2, -2)).toBe(8);
    expect(counterClockPhase([at(1, 1)])).toBeNull();
    expect(counterClockPhase([at(1, 1), at(1, 1)])).toBeNull();
  });
});

describe('counter-clock layout', () => {
  const n = 120;
  const data = bars(
    Array.from({ length: n }, (_, i) => 100 + 10 * Math.sin(i / 10)),
    Array.from({ length: n }, (_, i) => 1000 + 300 * Math.cos(i / 10)),
  );

  it('places the newest points inside the plot, older ones fainter', () => {
    const layout = computeCounterClockLayout({ data, period: 10, points: 40 }, 500, 360, DARK_THEME, measure);
    expect(layout.points).toHaveLength(40);
    for (const p of layout.points) {
      expect(p.px).toBeGreaterThanOrEqual(layout.plot.x);
      expect(p.px).toBeLessThanOrEqual(layout.plot.x + layout.plot.width);
      expect(p.py).toBeGreaterThanOrEqual(layout.plot.y);
      expect(p.py).toBeLessThanOrEqual(layout.plot.y + layout.plot.height);
    }
    expect(layout.points[0].alpha).toBeLessThan(layout.points[39].alpha);
    expect(layout.phase).toBeGreaterThanOrEqual(1);
    const p = layout.points[20];
    expect(nearestCounterClockPoint(layout, p.px + 2, p.py - 2)).toBe(p);
    expect(nearestCounterClockPoint(layout, -50, -50)).toBeNull();
  });

  it('draws with a tooltip and axis titles, and nothing for too few bars', () => {
    const texts: string[] = [];
    let depth = 0;
    const state: Record<string, unknown> = {};
    const ctx = new Proxy(state, {
      get: (t, prop) => {
        if (prop === 'save') return () => { depth++; };
        if (prop === 'restore') return () => { depth--; };
        if (prop === 'fillText') return (s: string) => { texts.push(s); };
        if (prop === 'measureText') return (s: string) => ({ width: s.length * 6.6 });
        if (prop === 'roundRect') return undefined;
        if (prop in t) return t[prop as string];
        return () => {};
      },
      set: (t, prop, v) => { t[prop as string] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const options = { data, period: 10, xLabel: 'Volume', yLabel: 'Price', timeFormat: (t: number) => `day ${t / 86_400_000}` };
    const layout = renderCounterClock(ctx, 500, 360, options, DARK_THEME, null);
    const last = layout.points[layout.points.length - 1];
    renderCounterClock(ctx, 500, 360, options, DARK_THEME, { x: last.px, y: last.py });
    expect(depth).toBe(0);
    expect(texts).toEqual(expect.arrayContaining(['Volume', 'Price', `day ${n - 1}`]));
    expect(computeCounterClockLayout({ data: data.slice(0, 3), period: 10 }, 500, 360, DARK_THEME, measure).points).toHaveLength(0);
  });
});

describe('counter-clock edge cases', () => {
  it('reads a flat price with rising volume as phase 1, and keeps the axis plain', () => {
    const data = bars(Array.from({ length: 80 }, () => 12.3), Array.from({ length: 80 }, (_, i) => 1000 + i * 10));
    const points = counterClockPoints(data, 25);
    expect(new Set(points.map((p) => p.price)).size).toBe(1);
    expect(counterClockPhase(points)).toBe(1);
    const layout = computeCounterClockLayout({ data, period: 25 }, 400, 300, DARK_THEME, measure);
    expect(layout.yScale.ticks.every((t) => String(t).length < 8)).toBe(true);
  });

  it('keeps only the newest points it can draw, and a bad period falls back', () => {
    const data = bars(Array.from({ length: 50 }, (_, i) => i), Array.from({ length: 50 }, () => 1));
    expect(counterClockPoints(data, 5, 10)).toHaveLength(10);
    expect(counterClockPoints(data, Number.NaN)).toHaveLength(26);
    expect(computeCounterClockLayout({ data, period: 5, points: 1e9 }, 400, 300, DARK_THEME, measure).points).toHaveLength(46);
  });
});

