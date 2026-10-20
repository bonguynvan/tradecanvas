import { describe, it, expect } from 'vitest';
import type { BarChartOptions, DonutChartOptions, ScatterChartOptions } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { niceScale, layoutLegend, axisFormat } from '../chartKit.js';
import { computeBarLayout, hitBar, renderBarChart } from '../BarChartRenderer.js';
import { computeDonutLayout, hitSlice, renderDonut } from '../DonutRenderer.js';
import { computeScatterLayout, nearestPoint, renderScatter } from '../ScatterRenderer.js';
import { histogramBins, renderHistogram } from '../HistogramRenderer.js';

/** Text measured as 0.6 em a character, at the font's size. */
const measure = (text: string, size = 11) => text.length * size * 0.6;

describe('nice scales', () => {
  it('rounds the range out to whole steps of 1, 2, 2.5 or 5', () => {
    expect(niceScale(0, 97)).toEqual({ min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] });
    expect(niceScale(-35, 80).ticks).toEqual([-50, -25, 0, 25, 50, 75, 100]);
    expect(niceScale(0.1, 0.7).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });

  it('opens up a range of one value', () => {
    expect(niceScale(5, 5).ticks).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(niceScale(0, 0).ticks).toEqual([-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6]);
  });
});

describe('scale edge cases', () => {
  it('falls back to 0–1 for ranges it can’t step, and keeps tiny steps', () => {
    expect(niceScale(-1e308, 1e308).ticks.length).toBeGreaterThan(1);
    expect(niceScale(-1e308, 1e308).ticks.every(Number.isFinite)).toBe(true);
    const tiny = niceScale(1e-13, 5e-13);
    expect(tiny.step).toBeGreaterThan(0);
    expect(new Set(tiny.ticks).size).toBe(tiny.ticks.length);
  });

  it('labels ticks with as many decimals as the step needs, and no repeats', () => {
    const small = niceScale(-0.02, 0.02, 8);
    const labels = small.ticks.map(axisFormat(small));
    expect(new Set(labels).size).toBe(labels.length);
    const big = niceScale(10_000, 10_200);
    const bigLabels = big.ticks.map(axisFormat(big));
    expect(new Set(bigLabels).size).toBe(bigLabels.length);
    const round = niceScale(0, 80_000);
    expect(round.ticks.map(axisFormat(round))).toContain('20K');
  });
});

describe('legends', () => {
  it('lay items out in rows that fit the width', () => {
    const items = [{ label: 'Foreign', color: 'red' }, { label: 'Proprietary', color: 'blue' }, { label: 'Retail', color: 'green' }];
    const wide = layoutLegend(items, 400, measure);
    expect(wide.rows).toBe(1);
    const narrow = layoutLegend(items, 120, measure);
    expect(narrow.rows).toBe(3);
    expect(narrow.items[1].y).toBeGreaterThan(narrow.items[0].y);
  });
});

describe('bar charts', () => {
  const base: BarChartOptions = { categories: ['A', 'B'], series: [{ name: 'Net', values: [10, -5] }] };

  it('grows bars up from zero and down below it', () => {
    const layout = computeBarLayout(base, 400, 300, DARK_THEME, measure);
    const [a, b] = layout.bars;
    expect(layout.bars).toHaveLength(2);
    expect(a.y + a.height).toBeCloseTo(layout.zero);
    expect(b.y).toBeCloseTo(layout.zero);
    expect(a.height).toBeCloseTo(b.height * 2);
    expect(a.x + a.width).toBeLessThan(b.x);
  });

  it('colours one series by sign when asked', () => {
    const layout = computeBarLayout({ ...base, colorBySign: true }, 400, 300, DARK_THEME, measure);
    expect(layout.bars.map((bar) => bar.color)).toEqual([DARK_THEME.candleUp, DARK_THEME.candleDown]);
  });

  it('stacks positives up and negatives down, each from zero', () => {
    const layout = computeBarLayout({
      categories: ['A', 'B'],
      series: [{ name: 'One', values: [10, 5] }, { name: 'Two', values: [5, -5] }],
      mode: 'stacked',
    }, 400, 300, DARK_THEME, measure);
    const [a1, b1, a2, b2] = layout.bars;
    expect(a2.y + a2.height).toBeCloseTo(a1.y);
    expect(b2.y).toBeCloseTo(layout.zero);
    expect(b1.y + b1.height).toBeCloseTo(layout.zero);
    expect(a1.x).toBeCloseTo(a2.x);
  });

  it('puts grouped series side by side, and finds the bar under the pointer', () => {
    const layout = computeBarLayout({
      categories: ['A'],
      series: [{ name: 'One', values: [10] }, { name: 'Two', values: [8] }],
    }, 400, 300, DARK_THEME, measure);
    const [one, two] = layout.bars;
    expect(one.x + one.width).toBeLessThanOrEqual(two.x);
    expect(hitBar(layout, two.x + two.width / 2, two.y + two.height / 2)).toBe(two);
    expect(hitBar(layout, 1, 1)).toBeNull();
  });

  it('lays bars along the value axis sideways when horizontal', () => {
    const layout = computeBarLayout({ ...base, orientation: 'horizontal' }, 400, 300, DARK_THEME, measure);
    const [a, b] = layout.bars;
    expect(a.x).toBeCloseTo(layout.zero);
    expect(b.x + b.width).toBeCloseTo(layout.zero);
    expect(a.y + a.height).toBeLessThan(b.y);
  });
});

describe('donut charts', () => {
  const options: DonutChartOptions = {
    data: [{ label: 'Cash', value: 50 }, { label: 'Stocks', value: 30 }, { label: 'Bonds', value: 20 }, { label: 'None', value: 0 }],
  };

  it('splits the circle by share, clockwise from twelve o’clock', () => {
    const layout = computeDonutLayout(options, 300, 300, DARK_THEME, measure);
    expect(layout.slices.map((s) => s.label)).toEqual(['Cash', 'Stocks', 'Bonds']);
    expect(layout.slices.map((s) => s.share)).toEqual([0.5, 0.3, 0.2]);
    expect(layout.slices[0].start).toBeCloseTo(-Math.PI / 2);
    expect(layout.slices[2].end).toBeCloseTo(-Math.PI / 2 + Math.PI * 2);
    expect(layout.inner).toBeCloseTo(layout.radius * 0.6);
  });

  it('finds the slice under the pointer, and nothing in the hole', () => {
    const layout = computeDonutLayout(options, 300, 300, DARK_THEME, measure);
    const r = (layout.radius + layout.inner) / 2;
    // Stocks sits from half way round (6 o'clock) for 30%: try 7 o'clock-ish.
    const angle = Math.PI / 2 + 0.3;
    expect(hitSlice(layout, layout.cx + Math.cos(angle) * r, layout.cy + Math.sin(angle) * r)?.label).toBe('Stocks');
    expect(hitSlice(layout, layout.cx, layout.cy)).toBeNull();
    expect(computeDonutLayout({ ...options, innerRadius: 0 }, 300, 300, DARK_THEME, measure).inner).toBe(0);
  });
});

describe('scatter charts', () => {
  const options: ScatterChartOptions = {
    series: [{ name: 'Banks', points: [{ x: 1, y: 10, size: 4, label: 'VCB' }, { x: 3, y: 30, size: 16, label: 'TCB' }] }],
  };

  it('maps points into the plot, larger sizes to larger bubbles', () => {
    const layout = computeScatterLayout(options, 400, 300, DARK_THEME, measure);
    const [vcb, tcb] = layout.points;
    expect(vcb.px).toBeLessThan(tcb.px);
    expect(vcb.py).toBeGreaterThan(tcb.py);
    expect(tcb.r).toBeCloseTo(vcb.r * 2);
    for (const p of layout.points) {
      expect(p.px).toBeGreaterThanOrEqual(layout.plot.x);
      expect(p.px).toBeLessThanOrEqual(layout.plot.x + layout.plot.width);
    }
  });

  it('lays out a hundred thousand points, and keeps positive data off negative axes', () => {
    const points = Array.from({ length: 100_000 }, (_, i) => ({ x: i % 1000, y: (i * 7) % 500, size: 1 + (i % 9) }));
    const layout = computeScatterLayout({ series: [{ name: 'Many', points }] }, 800, 500, DARK_THEME, measure);
    expect(layout.points).toHaveLength(100_000);
    expect(layout.xScale.min).toBeGreaterThanOrEqual(0);
    expect(layout.yScale.min).toBeGreaterThanOrEqual(0);
  });

  it('finds the nearest point within reach', () => {
    const layout = computeScatterLayout(options, 400, 300, DARK_THEME, measure);
    const tcb = layout.points[1];
    expect(nearestPoint(layout, tcb.px + 3, tcb.py - 2)?.label).toBe('TCB');
    expect(nearestPoint(layout, layout.plot.x + 1, layout.plot.y + 1)).toBeNull();
  });
});

describe('histogram bins', () => {
  it('splits the range into equal bins, the last one closed', () => {
    expect(histogramBins([1, 2, 2, 3, 10], { bins: 3 })).toEqual([
      { from: 1, to: 4, count: 4 },
      { from: 4, to: 7, count: 0 },
      { from: 7, to: 10, count: 1 },
    ]);
  });

  it('takes a bin width on a grid of its own, and picks a count by itself', () => {
    expect(histogramBins([-0.012, 0.004, 0.019], { binWidth: 0.01 }).map((b) => [b.from, b.to, b.count])).toEqual([
      [-0.02, -0.01, 1], [-0.01, 0, 0], [0, 0.01, 1], [0.01, 0.02, 1],
    ]);
    // Sturges: ceil(log2(8)) + 1 = 4 bins.
    expect(histogramBins([1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(4);
    expect(histogramBins([])).toEqual([]);
    expect(histogramBins([5, 5, 5])).toEqual([{ from: 5, to: 5, count: 3 }]);
  });

  it('closes the last bin in width mode too, and caps the count', () => {
    expect(histogramBins([0, 0.2, 1], { binWidth: 0.5 }).map((b) => [b.from, b.to, b.count])).toEqual([[0, 0.5, 2], [0.5, 1, 1]]);
    expect(histogramBins([0, 1e6], { binWidth: 0.0001 }).length).toBeLessThanOrEqual(1000);
    expect(histogramBins([0, 1, 2], { bins: Infinity }).length).toBeLessThanOrEqual(1000);
    const many = Array.from({ length: 200_000 }, (_, i) => i % 97);
    expect(histogramBins(many).reduce((n, b) => n + b.count, 0)).toBe(200_000);
  });
});

/** Canvas stand-in: counts save/restore and keeps the text drawn. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; depth: () => number; texts: string[] } {
  let depth = 0;
  const texts: string[] = [];
  const state: Record<string, unknown> = { font: '11px sans-serif' };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop === 'save') return () => { depth++; };
      if (prop === 'restore') return () => { depth--; };
      if (prop === 'fillText') return (t: string) => { texts.push(t); };
      if (prop === 'measureText') return (t: string) => ({ width: t.length * 6.6 });
      if (prop === 'roundRect') return undefined;
      if (prop in target) return target[prop as string];
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, depth: () => depth, texts };
}

describe('drawing the charts', () => {
  it('draws bars with a tooltip for the category under the pointer', () => {
    const { ctx, depth, texts } = fakeCtx();
    const options: BarChartOptions = { categories: ['Mon', 'Tue'], series: [{ name: 'Foreign', values: [120, -80] }], showValues: true };
    const layout = renderBarChart(ctx, 400, 300, options, DARK_THEME, null);
    const bar = layout.bars[1];
    renderBarChart(ctx, 400, 300, options, DARK_THEME, { x: bar.x + bar.width / 2, y: bar.y + 2 });
    expect(depth()).toBe(0);
    expect(texts).toContain('Tue');
    expect(texts).toContain('Foreign: -80');
  });

  it('draws a donut with its centre and the hovered slice', () => {
    const { ctx, depth, texts } = fakeCtx();
    const options: DonutChartOptions = { data: [{ label: 'Cash', value: 1 }, { label: 'Stocks', value: 3 }], centerLabel: 'Total', centerValue: '4' };
    const layout = renderDonut(ctx, 300, 300, options, DARK_THEME, null);
    const s = layout.slices[1];
    const mid = (s.start + s.end) / 2;
    const r = (layout.radius + layout.inner) / 2;
    renderDonut(ctx, 300, 300, options, DARK_THEME, { x: layout.cx + Math.cos(mid) * r, y: layout.cy + Math.sin(mid) * r });
    expect(depth()).toBe(0);
    expect(texts).toEqual(expect.arrayContaining(['Total', '4', 'Stocks']));
  });

  it('draws a scatter and a histogram, with markers', () => {
    const { ctx, depth, texts } = fakeCtx();
    renderScatter(ctx, 400, 300, { series: [{ name: 'A', points: [{ x: -1, y: 2, label: 'P' }] }], xLabel: 'Risk', yLabel: 'Return', showLabels: true }, DARK_THEME, null);
    renderHistogram(ctx, 400, 300, { values: [-2, -1, 0, 1, 2, 3], colorBySign: true, markers: [{ value: 0.5, label: 'Mean' }] }, DARK_THEME, { x: 200, y: 200 });
    expect(depth()).toBe(0);
    expect(texts).toEqual(expect.arrayContaining(['Risk', 'Return', 'P', 'Mean 0.5']));
  });
});
