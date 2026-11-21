import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME, type FinanceChartKind, type FinanceChartOptionsMap, type HeatmapOptions } from '@tradecanvas/commons';
import { FINANCE_CHART_KINDS, renderFinanceChart } from '../renderFinanceChart.js';
import { computeHeatmapLayout } from '../HeatmapLayout.js';
import { recorder } from './charts3dKit.js';

const DAY = 86_400_000;
const start = Date.UTC(2026, 0, 5);
const bars = Array.from({ length: 80 }, (_, i) => {
  const close = 100 + Math.sin(i / 7) * 8;
  return { time: start + i * DAY, open: close - 1, high: close + 2, low: close - 2, close, volume: 1000 + Math.cos(i / 5) * 400 };
});

/** Every finance chart with a little of its data. */
const SAMPLES: { [K in FinanceChartKind]: FinanceChartOptionsMap[K] } = {
  bar: { categories: ['Mon', 'Tue'], series: [{ name: 'Net', values: [120, -80] }] },
  donut: { data: [{ label: 'Stocks', value: 60 }, { label: 'Cash', value: 40 }] },
  scatter: { series: [{ name: 'Holdings', points: [{ x: 1, y: 2 }, { x: 3, y: 1 }] }] },
  histogram: { values: [1, 2, 2, 3, 3, 3, 4, 5] },
  calendar: { data: [{ date: '2026-01-05', value: 1.2 }, { date: '2026-01-06', value: -0.4 }] },
  matrix: { rows: ['A', 'B'], values: [[1, 0.4], [0.4, 1]] },
  heatmap: { data: [{ id: 'a', label: 'AAA', value: 3 }, { id: 'b', label: 'BBB', value: -2 }] },
  counterClock: { data: bars, period: 10 },
  depth: { data: { bids: [{ price: 99, volume: 5 }, { price: 98, volume: 8 }], asks: [{ price: 101, volume: 4 }, { price: 102, volume: 9 }] } },
  equityCurve: { data: bars.map((b) => ({ time: b.time, value: b.close * 1000 })) },
  waterfall: { data: [{ label: 'Revenue', value: 120 }, { label: 'Costs', value: -45 }, { label: 'Net', value: 75, type: 'total' }] },
  gauge: { value: 62 },
  sparkline: { data: [3, 5, 4, 8, 6] },
  payoff: { legs: [{ type: 'call', side: 'long', strike: 100, premium: 5 }] },
  curve: { series: [{ name: '1M', points: [{ x: 90, y: 30 }, { x: 100, y: 24 }, { x: 110, y: 27 }] }] },
  boxPlot: { data: [{ label: 'Mon', values: [1, 2, 3, 4, 9] }] },
  radar: { axes: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], series: [{ name: 's', values: [1, 2, 3] }] },
  sunburst: { data: [{ label: 'Stocks', children: [{ label: 'Banks', value: 2 }] }, { label: 'Cash', value: 1 }] },
  stackedArea: { categories: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Stocks', values: [4, 5, 6] }, { name: 'Cash', values: [3, 2, 1] }] },
  surface: { x: [90, 100, 110], y: [30, 60], values: [[0.3, 0.2, 0.26], [0.28, 0.21, 0.25]] },
  bar3d: { categories: ['Q1', 'Q2'], series: [{ name: 'Stocks', values: [4, 6] }, { name: 'Bonds', values: [2, 3] }] },
};

describe('a finance chart drawn on a context of the caller’s', () => {
  it('needs no page: there is none here, and every chart draws', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    expect([...FINANCE_CHART_KINDS].sort()).toEqual(Object.keys(SAMPLES).sort());
    for (const kind of FINANCE_CHART_KINDS) {
      const { ctx, shapes, rects, texts } = recorder();
      expect(() => renderFinanceChart(ctx, kind, SAMPLES[kind], { width: 480, height: 320 }), kind).not.toThrow();
      expect(shapes.length + rects.length + texts.length, kind).toBeGreaterThan(1);
    }
  });

  it('draws at the size given, on the chart’s own ground', () => {
    for (const kind of FINANCE_CHART_KINDS) {
      // A sparkline has no ground of its own: it lies on the caller's.
      if (kind === 'sparkline') continue;
      const { ctx, rects } = recorder();
      renderFinanceChart(ctx, kind, SAMPLES[kind], { width: 640, height: 360 });
      expect(rects[0], kind).toEqual([0, 0, 640, 360]);
    }
  });

  it('draws in the theme and the font the options name, the dark one with none', () => {
    const ground = (options: FinanceChartOptionsMap['bar']) => {
      const state: { fills: string[] } = { fills: [] };
      const { ctx } = recorder();
      const watched = new Proxy(ctx, {
        get: (target, prop) => {
          if (prop === 'fillRect') return () => { state.fills.push(String(Reflect.get(target, 'fillStyle'))); };
          return Reflect.get(target, prop);
        },
        set: (target, prop, value) => Reflect.set(target, prop, value),
      });
      renderFinanceChart(watched, 'bar', options, { width: 400, height: 300 });
      return state.fills[0];
    };
    expect(ground(SAMPLES.bar)).toBe(DARK_THEME.background);
    expect(ground({ ...SAMPLES.bar, theme: 'light' })).toBe(LIGHT_THEME.background);
    expect(ground({ ...SAMPLES.bar, theme: { ...LIGHT_THEME, background: '#abcdef' } })).toBe('#abcdef');
    const { ctx, texts } = recorder();
    const fonts: string[] = [];
    const watched = new Proxy(ctx, {
      get: (target, prop) => Reflect.get(target, prop),
      set: (target, prop, value) => {
        if (prop === 'font') fonts.push(String(value));
        return Reflect.set(target, prop, value);
      },
    });
    renderFinanceChart(watched, 'bar', { ...SAMPLES.bar, font: { family: 'Menlo' } }, { width: 400, height: 300 });
    expect(texts.length).toBeGreaterThan(0);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((font) => font.includes('Menlo'))).toBe(true);
  });

  it('draws a gauge at its value, and a heatmap laid out for the size', () => {
    const gauge = recorder();
    renderFinanceChart(gauge.ctx, 'gauge', { value: 62, valueFormat: (v) => `at ${v}` }, { width: 300, height: 200 });
    expect(gauge.texts).toContain('at 62');
    const heatmap = recorder();
    renderFinanceChart(heatmap.ctx, 'heatmap', SAMPLES.heatmap, { width: 300, height: 200 });
    expect(heatmap.texts).toEqual(expect.arrayContaining(['AAA', 'BBB']));
  });

  it('says so for a chart it does not know, and for a size that is none', () => {
    const { ctx } = recorder();
    expect(() => renderFinanceChart(ctx, 'pie' as FinanceChartKind, SAMPLES.donut as never, { width: 300, height: 200 })).toThrow(/pie/);
    for (const size of [{ width: 0, height: 200 }, { width: 300, height: Number.NaN }, { width: -5, height: 5 }]) {
      const blank = recorder();
      renderFinanceChart(blank.ctx, 'bar', SAMPLES.bar, size);
      expect(blank.shapes.length + blank.rects.length + blank.texts.length).toBe(0);
    }
  });
});

describe('where a heatmap’s cells go', () => {
  const cells: HeatmapOptions['data'] = [
    { id: 'a', label: 'A', value: 3, weight: 6, group: 'Banks' },
    { id: 'b', label: 'B', value: -2, weight: 3, group: 'Banks' },
    { id: 'c', label: 'C', value: 1, weight: 1, group: 'Steel' },
  ];

  it('is a grid of equal cells when nothing says', () => {
    const { rects, groups } = computeHeatmapLayout({ data: cells }, 300, 200);
    expect(rects.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(groups).toEqual([]);
    const areas = rects.map((r) => r.rect.width * r.rect.height);
    expect(areas[0]).toBeCloseTo(areas[1], 6);
  });

  it('is a treemap by weight with `weighted`, and by group under each group’s name with `grouped`', () => {
    const weighted = computeHeatmapLayout({ data: cells, weighted: true }, 300, 200);
    const area = (id: string) => {
      const { rect } = weighted.rects.find((r) => r.id === id)!;
      return rect.width * rect.height;
    };
    expect(area('a')).toBeGreaterThan(area('b'));
    expect(area('b')).toBeGreaterThan(area('c'));
    const grouped = computeHeatmapLayout({ data: cells, grouped: true }, 300, 200);
    expect(grouped.groups.map((g) => g.name).sort()).toEqual(['Banks', 'Steel']);
    expect(grouped.rects).toHaveLength(3);
  });

  it('has no cell for no data or no room', () => {
    expect(computeHeatmapLayout({ data: [] }, 300, 200).rects).toEqual([]);
    expect(computeHeatmapLayout({ data: cells }, 0, 0).rects.every((r) => r.rect.width <= 0 || r.rect.height <= 0)).toBe(true);
  });
});
