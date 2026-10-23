import { describe, it, expect, vi } from 'vitest';
import type { ViewportState, DataSeries } from '@tradecanvas/commons';
import { LIGHT_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

const CHAR = 7;

function viewport(width: number): ViewportState {
  return {
    visibleRange: { from: 0, to: 10 },
    priceRange: { min: 71_000, max: 73_000 },
    barWidth: 6,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 40, width, height: 300 },
  };
}

const data: DataSeries = [
  { time: 0, open: 71_600, high: 71_700, low: 71_500, close: 71_605.75, volume: 100 },
  { time: 1, open: 71_605.75, high: 71_663.14, low: 71_502.76, close: 71_558.11, volume: 15_930 },
];

/** A context that notes each text with where it went; every character 7 px wide. */
function recorder() {
  const texts: { text: string; x: number; y: number }[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, key: string) {
      if (key === 'measureText') return (t: string) => ({ width: t.length * CHAR });
      if (key === 'fillText') return (text: string, x: number, y: number) => texts.push({ text, x, y });
      if (key in target) return target[key];
      return vi.fn();
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

function legendWith(width: number) {
  const legend = new ChartLegend();
  legend.setSymbol('BTCUSDT');
  legend.setTimeframe('5m');
  legend.setExchange('Binance');
  const { ctx, texts } = recorder();
  legend.render(ctx, viewport(width), LIGHT_THEME, data);
  return { legend, texts };
}

describe('the legend’s title line', () => {
  it('names the symbol, interval and exchange, with the prices on the same line', () => {
    const { texts } = legendWith(1200);
    const title = texts.find((t) => t.text === 'BTCUSDT · 5m · Binance')!;
    expect(title).toBeDefined();
    const open = texts.find((t) => t.text === 'O')!;
    expect(open.y).toBe(title.y);
    expect(open.x).toBeGreaterThan(title.x);
  });

  it('wraps what doesn’t fit onto the next line instead of running off the plot', () => {
    const { texts } = legendWith(260);
    const title = texts.find((t) => t.text.startsWith('BTCUSDT'))!;
    const close = texts.find((t) => t.text === 'C')!;
    expect(close.y).toBeGreaterThan(title.y);
    for (const t of texts) expect(t.x + t.text.length * CHAR, t.text).toBeLessThanOrEqual(260);
  });

  it('reports the height it drew, wrapped lines and volume included', () => {
    const wide = legendWith(1200).legend.getHeight();
    const narrow = legendWith(260).legend.getHeight();
    expect(narrow).toBeGreaterThan(wide);
  });

  it('forgets the height it drew when what it shows changes', () => {
    const { legend } = legendWith(260);
    const wrapped = legend.getHeight();
    legend.setConfig({ showOHLC: false });
    expect(legend.getHeight()).toBeLessThan(wrapped);
  });

  it('counts a status line before its first draw', () => {
    const legend = new ChartLegend();
    legend.setConfig({ showOHLC: false, showVolume: false });
    expect(legend.getHeight()).toBeLessThan(12);
    legend.setStatusText('LIVE');
    expect(legend.getHeight()).toBeGreaterThan(12);
  });

  it('leaves no blank line when it has no title', () => {
    const legend = new ChartLegend();
    const { ctx, texts } = recorder();
    legend.render(ctx, viewport(1200), LIGHT_THEME, data);
    const open = texts.find((t) => t.text === 'O')!;
    expect(open.y).toBeLessThan(40 + 12);
  });
});
