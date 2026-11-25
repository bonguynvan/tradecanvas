import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { detectOrderBlocks } from '../overlay/detectOrderBlocks.js';
import { OrderBlocksIndicator } from '../overlay/OrderBlocks.js';

const MINUTE = 60_000;
const BASE = Date.UTC(2025, 0, 6);

/** Bars from [high, low, close]; the open is the middle of the range unless the close is given away from it. */
const bars = (rows: [number, number, number?][]): OHLCBar[] =>
  rows.map(([high, low, close], i) => ({ time: BASE + i * MINUTE, open: (high + low) / 2, high, low, close: close ?? (high + low) / 2, volume: 1 }));

/**
 * A swing high at bar 2 (15), known at bar 4; the lowest bar after it is bar 4 (7 to 12); bar 6 closes over 15.
 * A swing low at bar 4 (7), known at bar 6; bar 8 closes under 7, which also breaks the bullish block.
 */
const STORY: [number, number, number?][] = [
  [10, 8], [12, 9], [15, 11], [13, 10], [12, 7], [14, 9], [17, 13, 16.5], [16, 10, 11], [8, 6, 6.5], [9, 6.5], [10, 7],
];
const OPTIONS = { length: 2 };

describe('detectOrderBlocks', () => {
  it('finds a bullish block when a close breaks the last swing high: the lowest bar between the swing and the break', () => {
    const found = detectOrderBlocks(bars(STORY), OPTIONS);
    expect(found.filter((b) => b.kind === 'bullish')).toEqual([
      { kind: 'bullish', index: 4, formed: 6, top: 12, bottom: 7, swing: 2, brokenAt: 8 },
    ]);
  });

  it('finds a bearish one the same way down: the highest bar between the swing low and the close under it', () => {
    const found = detectOrderBlocks(bars(STORY), OPTIONS);
    expect(found.filter((b) => b.kind === 'bearish')).toEqual([
      { kind: 'bearish', index: 6, formed: 8, top: 17, bottom: 13, swing: 4, brokenAt: null },
    ]);
    // In the order they formed.
    expect(found.map((b) => b.formed)).toEqual([6, 8]);
  });

  it('uses a swing once, and knows it only once the bars to its right are in', () => {
    // A second close over 15 makes no second block from the same swing.
    const again = bars([...STORY.slice(0, 7), [18, 15, 17.5], [19, 16, 18.5]]);
    expect(detectOrderBlocks(again, OPTIONS).filter((b) => b.kind === 'bullish')).toHaveLength(1);
    // Up to bar 5 the swing high at bar 2 is known and not broken: nothing yet.
    expect(detectOrderBlocks(bars(STORY.slice(0, 6)), OPTIONS)).toEqual([]);
    expect(detectOrderBlocks([], OPTIONS)).toEqual([]);
  });

  it('takes a bar that is no number for none: it makes no swing and breaks nothing', () => {
    const data = bars(STORY);
    data[2] = { ...data[2], high: Number.NaN };
    expect(detectOrderBlocks(data, OPTIONS).filter((b) => b.kind === 'bullish')).toEqual([]);
  });
});

describe('the Order Blocks indicator', () => {
  const config = (params: Record<string, number> = {}) => ({ id: 'orderblocks', params: { length: 2, ...params } }) as never;

  it('gives each block at the bar that formed it, its top and bottom by its kind, and all of them for drawing', () => {
    const indicator = new OrderBlocksIndicator();
    expect(indicator.descriptor).toMatchObject({ id: 'orderblocks', placement: 'overlay', defaultConfig: { length: 5, showBroken: 0 } });
    expect(indicator.descriptor.plots!.map((p) => p.key)).toEqual(['bull', 'bullLow', 'bear', 'bearLow']);
    const out = indicator.calculate(bars(STORY), config());
    expect(out.series![6]).toEqual({ bull: 12, bullLow: 7 });
    expect(out.series![8]).toEqual({ bear: 17, bearLow: 13 });
    expect(out.series!.filter(Boolean)).toHaveLength(2);
    expect((out.meta!.blocks as unknown[])).toHaveLength(2);
  });

  it('draws a block still standing to the plot’s right edge, a broken one only when asked, to the bar that broke it', () => {
    const indicator = new OrderBlocksIndicator();
    const viewport = {
      visibleRange: { from: 0, to: 10 }, priceRange: { min: 0, max: 20 }, barWidth: 8, barSpacing: 2, offset: 0,
      chartRect: { x: 0, y: 0, width: 400, height: 200 },
    } as never;
    const style = { colors: ['#000', '#111', '#222', '#0a0', '#a00'], lineWidths: [1], opacity: 1, plots: {} } as never;
    const boxes = (params: Record<string, number>) => {
      const rects: number[][] = [];
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) => (key in target ? target[key] : key === 'fillRect' ? (...a: number[]) => rects.push(a) : () => {}),
        set: (target, key: string, value) => { target[key] = value; return true; },
      }) as unknown as CanvasRenderingContext2D;
      indicator.render(ctx, indicator.calculate(bars(STORY), config(params)), viewport, style);
      return rects;
    };
    // The bearish block stands: from its bar to the right edge. The bullish one was broken: not drawn.
    const standing = boxes({});
    expect(standing).toHaveLength(1);
    expect(standing[0][0] + standing[0][2]).toBe(400);
    // 13 to 17 on a 20-point, 200 px scale is 40 px.
    expect(Math.round(standing[0][3])).toBe(40);
    const all = boxes({ showBroken: 1 });
    expect(all).toHaveLength(2);
    expect(Math.max(...all.map((r) => r[0] + r[2]))).toBe(400);
    expect(Math.min(...all.map((r) => r[0] + r[2]))).toBeLessThan(400);
  });

  it('goes on from a tick to what a whole reckoning gives', () => {
    let seed = 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let close = 100;
    const data: OHLCBar[] = Array.from({ length: 500 }, (_, i) => {
      const open = close;
      close = open + (rand() - 0.5) * 4;
      return { time: BASE + i * MINUTE, open, high: Math.max(open, close) + rand(), low: Math.min(open, close) - rand(), close, volume: 1 };
    });
    const indicator = new OrderBlocksIndicator();
    const cfg = config({ length: 3, showBroken: 1 });
    const snapshot = (out: { meta?: Record<string, unknown>; series?: unknown; values: Map<number, unknown> }) =>
      ({ blocks: out.meta!.blocks, series: out.series, values: [...out.values].sort((a, b) => a[0] - b[0]) });
    let out = indicator.calculate(data.slice(0, 300), cfg);
    expect((out.meta!.blocks as unknown[]).length).toBeGreaterThan(5);
    for (let n = 301; n <= data.length; n++) {
      const series = data.slice(0, n);
      // A new bar, the bar before it back as it was; then the new bar moved: its close pulled half way back.
      const moved = [...series.slice(0, -1), { ...series[n - 1], close: (series[n - 1].close + series[n - 2].close) / 2 }];
      for (const [step, from] of [[series, n - 2], [moved, n - 1]] as [OHLCBar[], number][]) {
        const next = indicator.update!(step, cfg, out, from);
        expect(next).not.toBeNull();
        out = next!;
        expect(snapshot(out)).toEqual(snapshot(new OrderBlocksIndicator().calculate(step, cfg)));
      }
    }
  });
});
