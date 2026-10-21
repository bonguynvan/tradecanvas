import { describe, it, expect } from 'vitest';
import type { ViewportState, OHLCBar } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 0, max: 1000 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 600, height: 200 },
};

const bar = (close: number): OHLCBar => ({ time: 0, open: close, high: close, low: close, close, volume: 1 });

function texts(legend: ChartLegend, data: OHLCBar[]): string[] {
  const out: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, p) => {
      if (p === 'fillText') return (text: string) => out.push(text);
      if (p === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return p in t ? t[p as string] : () => {};
    },
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  legend.render(ctx, viewport, DARK_THEME, data);
  return out;
}

describe('ChartLegend — the bar under the pointer', () => {
  it('shows its change from the bar before it, not from the series’ last bars', () => {
    const data = [bar(100), bar(110), bar(500), bar(600)];
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false });
    legend.setHoverBar(data[1], data[0]);
    const change = texts(legend, data).find((t) => t.includes('%'))!;
    expect(change).toContain('+10.00');
    expect(change).toContain('(+10.00%)');
  });

  it('shows no change for the first bar, which has none before it', () => {
    const data = [bar(100), bar(110), bar(500)];
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false });
    legend.setHoverBar(data[0], null);
    const change = texts(legend, data).find((t) => t.includes('%'))!;
    expect(change).toContain('(+0.00%)');
  });

  it('goes back to the last bar and its change when the pointer leaves', () => {
    const data = [bar(100), bar(110), bar(121)];
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false });
    legend.setHoverBar(data[0], null);
    legend.setHoverBar(null);
    expect(texts(legend, data).find((t) => t.includes('%'))).toContain('(+10.00%)');
  });
});
