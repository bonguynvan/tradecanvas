import { describe, it, expect, vi } from 'vitest';
import type { ViewportState, DepthLevel } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { DepthHeatmapRenderer } from '../DepthHeatmapRenderer.js';

const viewport = (): ViewportState => ({
  visibleRange: { from: 0, to: 20 },
  priceRange: { min: 90, max: 110 },
  barWidth: 10,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 240, height: 200 },
});

function ctx() {
  const rects: number[][] = [];
  return {
    rects,
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn((x: number, y: number, w: number, h: number) => rects.push([x, y, w, h])),
      fillStyle: '',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D,
  };
}

/** Levels a step of 0.5 apart that count how often their prices are read. */
function counted(from: number, dir: number, count: number): { levels: DepthLevel[]; reads: () => number } {
  let reads = 0;
  const levels = Array.from({ length: count }, (_, i) => ({
    get price() { reads++; return from + dir * i * 0.5; },
    volume: 10 + i,
  }));
  return { levels, reads: () => reads };
}

describe('DepthHeatmapRenderer', () => {
  it('draws a cell per level, as tall as the levels are apart', () => {
    const heat = new DepthHeatmapRenderer();
    heat.setVisible(true);
    heat.push(5, { bids: counted(99.5, -1, 4).levels, asks: counted(100.5, 1, 4).levels });
    const { ctx: c, rects } = ctx();
    heat.render(c, viewport(), DARK_THEME);
    expect(rects).toHaveLength(8);
    // 0.5 of a 20-wide price range on a 200 px plot.
    for (const r of rects) expect(r[3]).toBeCloseTo(5);
  });

  // 240 snapshots of 80 levels each frame: sorting each one's prices again every frame was most of the heatmap's cost.
  it("measures how far apart a snapshot's levels are when it comes in, once", () => {
    const heat = new DepthHeatmapRenderer();
    heat.setVisible(true);
    // Levels out of order and one gap wider: the spacing is the median gap.
    heat.push(5, { bids: [99.5, 98.5, 99, 97].map((price) => ({ price, volume: 5 })), asks: [] });
    const sort = vi.spyOn(Array.prototype, 'sort');
    const { ctx: c, rects } = ctx();
    heat.render(c, viewport(), DARK_THEME);
    const sorts = sort.mock.calls.length;
    sort.mockRestore();
    expect(sorts).toBe(0);
    for (const r of rects) expect(r[3]).toBeCloseTo(5);
  });
});
