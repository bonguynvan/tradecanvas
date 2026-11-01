import { describe, it, expect } from 'vitest';
import type { ViewportState, OHLCBar } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 90, max: 120 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 600, height: 200 },
};

const bar = (close: number): OHLCBar => ({ time: 0, open: 100, high: 111, low: 99, close, volume: 1500 });

/** Records the grounds (rects) and texts drawn, in order, with the fill and alpha each was drawn in. */
function recordingCtx() {
  const ops: ({ kind: 'rect'; x: number; y: number; w: number; h: number; fill: string; alpha: number } | { kind: 'text'; text: string; x: number; y: number })[] = [];
  let fill = '';
  let alpha = 1;
  const saved: number[] = [];
  const ctx = {
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    set fillStyle(v: string) { fill = v; },
    get fillStyle() { return fill; },
    set globalAlpha(v: number) { alpha = v; },
    get globalAlpha() { return alpha; },
    save: () => { saved.push(alpha); },
    restore: () => { alpha = saved.pop() ?? 1; },
    fillRect: (x: number, y: number, w: number, h: number) => ops.push({ kind: 'rect', x, y, w, h, fill, alpha }),
    fillText: (text: string, x: number, y: number) => ops.push({ kind: 'text', text, x, y }),
    measureText: (text: string) => ({ width: text.length * 7 }),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

describe('ChartLegend — a ground under its rows', () => {
  it('puts a see-through ground of the background under each row, before its text', () => {
    const legend = new ChartLegend();
    legend.setIndicatorValues([{ name: 'EMA 21', color: '#3b82f6', value: '105.20' }]);
    const { ctx, ops } = recordingCtx();
    legend.render(ctx, viewport, DARK_THEME, [bar(105), bar(106)]);
    const rects = ops.filter((o) => o.kind === 'rect');
    // The prices' row, the volume's and the indicators'.
    expect(rects.length).toBe(3);
    for (const r of rects) {
      expect(r.kind === 'rect' && r.fill).toBe(DARK_THEME.background);
      expect(r.kind === 'rect' && r.alpha).toBeGreaterThan(0);
      expect(r.kind === 'rect' && r.alpha).toBeLessThan(1);
    }
    // Each text sits inside a ground drawn before it.
    ops.forEach((o, i) => {
      if (o.kind !== 'text') return;
      const under = ops.slice(0, i).filter((r) => r.kind === 'rect' && o.y >= r.y && o.y < r.y + r.h && o.x >= r.x - 0.01 && o.x < r.x + r.w);
      expect(under.length, `ground under "${o.text}"`).toBeGreaterThan(0);
    });
  });

  it('draws none with ground off', () => {
    const legend = new ChartLegend();
    legend.setConfig({ ground: false });
    const { ctx, ops } = recordingCtx();
    legend.render(ctx, viewport, DARK_THEME, [bar(105), bar(106)]);
    expect(ops.some((o) => o.kind === 'rect')).toBe(false);
  });
});
