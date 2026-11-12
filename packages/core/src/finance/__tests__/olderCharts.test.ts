import { describe, it, expect } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { renderWaterfall } from '../WaterfallRenderer.js';
import { renderSparkline } from '../SparklineRenderer.js';
import { renderEquityCurve } from '../EquityCurveRenderer.js';
import { renderDepthChart } from '../DepthChartRenderer.js';
import { renderHeatmap } from '../HeatmapRenderer.js';
import { layoutSquarifiedTreemap, layoutUniformGrid } from '../HeatmapLayout.js';

interface Call { name: string; args: unknown[]; fillStyle: unknown }

/** A canvas stand-in that keeps every call, the fill it was made with, and the gradients' stops. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: Call[]; texts: string[]; stops: string[]; fills: unknown[] } {
  const calls: Call[] = [];
  const texts: string[] = [];
  const stops: string[] = [];
  const fills: unknown[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif' };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'createLinearGradient') return () => ({ addColorStop: (_at: number, color: string) => stops.push(color) });
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args, fillStyle: target.fillStyle });
        if (prop === 'fillText') texts.push(String(args[0]));
      };
    },
    set: (target, prop, value) => {
      target[prop] = value;
      if (prop === 'fillStyle') fills.push(value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, texts, stops, fills };
}

const named = (calls: Call[], name: string) => calls.filter((c) => c.name === name);
/** Every number a path or a rectangle was given. */
const coordinates = (calls: Call[]) =>
  calls.filter((c) => ['moveTo', 'lineTo', 'fillRect', 'rect', 'arc'].includes(c.name)).flatMap((c) => c.args as number[]);

describe('waterfall', () => {
  /** The tooltip of the last bar of three, at 400 by 300. */
  const lastTotal = (values: number[]) => {
    const { ctx, texts } = recorder();
    const data = values.map((value, i) => ({ label: 'ABC'[i], value }));
    renderWaterfall(ctx, 400, 300, { data }, DARK_THEME, { x: 340, y: 150 });
    return texts.find((t) => t.startsWith('Total:'));
  };

  it('keeps the running total through a step of zero', () => {
    expect(lastTotal([100, 0, 50])).toBe('Total: 150.00');
  });

  it('counts a step that is no number as no change', () => {
    expect(lastTotal([100, NaN, 50])).toBe('Total: 150.00');
  });

  it('still starts again from a bar given as a subtotal', () => {
    const { ctx, texts } = recorder();
    const data = [{ label: 'A', value: 100 }, { label: 'B', value: 30, type: 'subtotal' as const }, { label: 'C', value: 50 }];
    renderWaterfall(ctx, 400, 300, { data }, DARK_THEME, { x: 340, y: 150 });
    expect(texts).toContain('Total: 80.00');
  });

  it('turns long labels without dropping the canvas’s own scale', () => {
    const { ctx, calls } = recorder();
    const data = [{ label: 'A label far too long for its slot', value: 1 }, { label: 'B', value: 2 }];
    renderWaterfall(ctx, 200, 200, { data }, DARK_THEME, null);
    expect(named(calls, 'rotate').length).toBe(2);
    expect(named(calls, 'setTransform')).toEqual([]);
  });

  it('draws its background with nothing to show', () => {
    const { ctx, calls } = recorder();
    renderWaterfall(ctx, 200, 100, { data: [] }, DARK_THEME, null);
    expect(named(calls, 'fillRect').map((c) => c.args)).toEqual([[0, 0, 200, 100]]);
  });
});

describe('colours faded by the older charts', () => {
  it('fade a short hex, a hex with alpha and an rgb() in a sparkline’s area', () => {
    for (const [color, faded] of [['#0af', 'rgba(0, 170, 255, 0.25)'], ['#00aaff80', 'rgba(0, 170, 255, 0.25)'], ['rgb(0, 170, 255)', 'rgba(0, 170, 255, 0.25)']]) {
      const { ctx, stops } = recorder();
      renderSparkline(ctx, 100, 30, { data: [1, 2, 3], color }, DARK_THEME);
      expect(stops[0]).toBe(faded);
    }
  });

  it('fade them under an equity curve and its drawdown', () => {
    const data = [{ time: 0, value: 1 }, { time: 1000, value: 3 }, { time: 2000, value: 2 }];
    const { ctx, stops, fills } = recorder();
    const theme = { ...DARK_THEME, candleDown: '#f00' };
    renderEquityCurve(ctx, 400, 300, { data, lineColor: '#0af', fillArea: true, drawdown: true }, theme, null);
    expect(stops[0]).toBe('rgba(0, 170, 255, 0.25)');
    expect(fills).toContain('rgba(255, 0, 0, 0.19)');
  });

  it('fade them under a depth chart’s sides', () => {
    const { ctx, fills } = recorder();
    const data = { bids: [{ price: 99, volume: 1 }, { price: 98, volume: 2 }], asks: [{ price: 101, volume: 1 }, { price: 102, volume: 2 }] };
    renderDepthChart(ctx, 400, 300, { data, bidColor: 'rgb(1, 2, 3)', askColor: '#f00' }, DARK_THEME, null);
    expect(fills).toContain('rgba(1, 2, 3, 0.25)');
    expect(fills).toContain('rgba(255, 0, 0, 0.25)');
  });
});

describe('equity curve', () => {
  const data = [{ time: 0, value: 10 }, { time: 1000, value: 20 }, { time: 2000, value: 30 }, { time: 3000, value: 40 }];
  /** Left 70, right 20 from the edge: the plot is 310 wide at 400. */
  const xOf = (time: number) => 70 + (time / 3000) * 310;

  it('reads the benchmark at the pointed time, not at the curve’s index', () => {
    const benchmark = [{ time: 0, value: 5 }, { time: 3000, value: 8 }];
    const { ctx, texts } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, benchmark }, DARK_THEME, { x: xOf(2900), y: 100 });
    expect(texts).toContain('Value: 40.00');
    expect(texts).toContain('Benchmark: 8.00');
  });

  it('says nothing of a benchmark with no points', () => {
    const { ctx, texts } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, benchmark: [] }, DARK_THEME, { x: xOf(1000), y: 100 });
    expect(texts.some((t) => t.startsWith('Benchmark:'))).toBe(false);
  });

  it('marks the pointed value in the curve’s own colour', () => {
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, lineColor: '#123456' }, DARK_THEME, { x: xOf(1000), y: 100 });
    const dot = named(calls, 'fill').at(-1)!;
    expect(dot.fillStyle).toBe('#123456');
  });

  it('labels its values when every one is the same', () => {
    const flat = [{ time: 0, value: 50 }, { time: 1000, value: 50 }];
    const { ctx, texts, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data: flat, valueFormat: (v) => `v${v}` }, DARK_THEME, null);
    expect(texts.filter((t) => t.startsWith('v')).length).toBeGreaterThan(1);
    expect(coordinates(calls).every(Number.isFinite)).toBe(true);
    // The flat line runs through the middle of the plot, not along its floor.
    const line = named(calls, 'lineTo').at(-1)!;
    expect(line.args[1]).toBeCloseTo(145, 0);
  });

  it('keeps a benchmark that runs past the curve inside the plot', () => {
    const benchmark = [{ time: -5000, value: 5 }, { time: 9000, value: 8 }];
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, benchmark, benchmarkLabel: 'Index' }, DARK_THEME, null);
    expect(named(calls, 'clip').length).toBe(1);
    expect(named(calls, 'rect').map((c) => c.args)).toEqual([[70, 20, 310, 250]]);
    // Its name sits by the plot's right edge, not past the canvas where the line would have ended.
    const label = named(calls, 'fillText').find((c) => c.args[0] === 'Index')!;
    expect(label.args[1]).toBe(380 + 4);
  });

  it('reads nothing out when the times are no numbers', () => {
    const broken = [{ time: NaN, value: 1 }, { time: NaN, value: 2 }];
    const { ctx, texts } = recorder();
    expect(() => renderEquityCurve(ctx, 400, 300, { data: broken }, DARK_THEME, { x: 200, y: 100 })).not.toThrow();
    expect(texts.some((t) => t.startsWith('Value:'))).toBe(false);
  });

  it('draws its background with fewer than two points', () => {
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 200, 100, { data: [{ time: 0, value: 1 }] }, DARK_THEME, null);
    expect(named(calls, 'fillRect').map((c) => c.args)).toEqual([[0, 0, 200, 100]]);
  });
});

describe('depth chart', () => {
  it('draws a book of one level on one side', () => {
    const { ctx, calls } = recorder();
    renderDepthChart(ctx, 400, 300, { data: { bids: [{ price: 100, volume: 5 }], asks: [] } }, DARK_THEME, null);
    const numbers = coordinates(calls);
    expect(numbers.length).toBeGreaterThan(4);
    expect(numbers.every(Number.isFinite)).toBe(true);
    // Its volume runs as a shelf from its price out to the plot's left edge, at full height.
    expect(named(calls, 'lineTo').some((c) => c.args[0] === 50 && c.args[1] === 20)).toBe(true);
  });

  it('marks no middle and no spread on a book with one side', () => {
    const { ctx, texts } = recorder();
    renderDepthChart(ctx, 400, 300, { data: { bids: [{ price: 100, volume: 5 }, { price: 99, volume: 2 }], asks: [] } }, DARK_THEME, null);
    expect(texts.some((t) => t.startsWith('Spread'))).toBe(false);
    const both = recorder();
    renderDepthChart(both.ctx, 400, 300, { data: { bids: [{ price: 99, volume: 5 }], asks: [{ price: 101, volume: 2 }] } }, DARK_THEME, null);
    expect(both.texts.some((t) => t.startsWith('Spread'))).toBe(true);
  });

  it('draws its background with an empty book', () => {
    const { ctx, calls } = recorder();
    renderDepthChart(ctx, 200, 100, { data: { bids: [], asks: [] } }, DARK_THEME, null);
    expect(named(calls, 'fillRect').map((c) => c.args)).toEqual([[0, 0, 200, 100]]);
  });
});

describe('heatmap', () => {
  it('colours a cell with no number as it colours zero', () => {
    const cells = [{ id: 'a', label: 'A', value: NaN }, { id: 'b', label: 'B', value: 2 }];
    const rects = layoutUniformGrid(cells, { x: 0, y: 0, width: 200, height: 100 }, 2);
    const { ctx, fills, texts } = recorder();
    renderHeatmap(ctx, 200, 100, cells, rects, { data: cells, colorScale: { negative: '#ff0000', zero: '#101010', positive: '#00ff00' } }, DARK_THEME, null);
    expect(fills.some((f) => String(f).includes('NaN'))).toBe(false);
    expect(fills).toContain('#101010');
    // It shows its label and no value, where the other shows both.
    expect(texts).toContain('A');
    expect(texts).toContain('+2.00%');
    expect(texts.some((t) => t.includes('NaN'))).toBe(false);
  });

  it('gives a cell whose weight is no number no room, and lays out the rest', () => {
    const rects = layoutSquarifiedTreemap([{ id: 'a', weight: NaN }, { id: 'b', weight: 3 }, { id: 'c', weight: 1 }], { x: 0, y: 0, width: 200, height: 100 }, 0);
    const numbers = rects.flatMap((r) => [r.rect.x, r.rect.y, r.rect.width, r.rect.height]);
    expect(numbers.every(Number.isFinite)).toBe(true);
    const area = (id: string) => { const r = rects.find((x) => x.id === id)!.rect; return r.width * r.height; };
    expect(area('b')).toBeCloseTo(area('c') * 3, 0);
  });
});
