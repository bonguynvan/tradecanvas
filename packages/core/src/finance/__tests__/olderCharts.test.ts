import { describe, it, expect } from 'vitest';
import { DARK_THEME, DEFAULT_FONT_FAMILY, LIGHT_THEME, SANS_FONT_FAMILY } from '@tradecanvas/commons';
import { financeTheme } from '../BaseFinanceChart.js';
import { computeWaterfallLayout, hitWaterfallBar, renderWaterfall } from '../WaterfallRenderer.js';
import { renderSparkline } from '../SparklineRenderer.js';
import { computeEquityLayout, renderEquityCurve } from '../EquityCurveRenderer.js';
import { computeDepthLayout, renderDepthChart } from '../DepthChartRenderer.js';
import { axisFormat, decimalsFor, hairline, niceScale, numberFormat, percentFormat, timeTicks } from '../chartKit.js';
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

/** As the stand-in measures: 6 px a character. */
const measure = (text: string) => text.length * 6;
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
    return texts.find((t) => t.startsWith('= '));
  };

  it('keeps the running total through a step of zero', () => {
    expect(lastTotal([100, 0, 50])).toBe('= 150');
  });

  it('counts a step that is no number as no change', () => {
    expect(lastTotal([100, NaN, 50])).toBe('= 150');
  });

  it('still starts again from a bar given as a subtotal', () => {
    const { ctx, texts } = recorder();
    const data = [{ label: 'A', value: 100 }, { label: 'B', value: 30, type: 'subtotal' as const }, { label: 'C', value: 50 }];
    renderWaterfall(ctx, 400, 300, { data }, DARK_THEME, { x: 340, y: 150 });
    expect(texts).toContain('= 80');
  });

  it('leaves the room its value labels take, and no more than the labels under it need', () => {
    const short = computeWaterfallLayout({ data: [{ label: 'A', value: 5 }, { label: 'B', value: -2 }] }, 400, 300, measure);
    expect(short.turned).toBe(false);
    // 12 from the left edge, the widest tick, 8 to the plot; 12 at the right and the top.
    const tick = Math.max(...short.scale.ticks.map((t) => measure(String(t))));
    expect(short.plot).toEqual({ x: 12 + tick + 8, y: 12, width: 400 - (12 + tick + 8) - 12, height: 300 - 24 - 20 });
    const long = computeWaterfallLayout({ data: [{ label: 'A label far too long for its slot', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 2 }, { label: 'D', value: 2 }, { label: 'E', value: 2 }] }, 300, 300, measure);
    expect(long.turned).toBe(true);
    expect(long.labelRoom).toBeGreaterThan(20);
    expect(long.labelRoom).toBeLessThanOrEqual(300 * 0.382);
    expect(long.plot.y + long.plot.height + long.labelRoom).toBe(300 - 12);
  });

  it('writes a value only where it runs into none before it', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ label: String(i), value: 1000.25 }));
    const { ctx, texts } = recorder();
    renderWaterfall(ctx, 240, 200, { data }, DARK_THEME, null);
    const values = texts.filter((t) => t.startsWith('+'));
    expect(values.length).toBeGreaterThan(0);
    expect(values.length).toBeLessThan(12);
  });

  it('picks a bar by its slot', () => {
    const layout = computeWaterfallLayout({ data: [{ label: 'A', value: 5 }, { label: 'B', value: -2 }] }, 400, 300, measure);
    expect(hitWaterfallBar(layout, layout.plot.x + 1)).toBe(0);
    expect(hitWaterfallBar(layout, layout.plot.x + layout.plot.width - 1)).toBe(1);
    expect(hitWaterfallBar(layout, layout.plot.x - 1)).toBe(-1);
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
  const plotOf = (options: Parameters<typeof computeEquityLayout>[0]) => computeEquityLayout(options, 400, 300, measure).plot;
  /** Where a time falls across the plot of the curve drawn alone, or with a benchmark. */
  const xOf = (time: number, options: Parameters<typeof computeEquityLayout>[0] = { data }) => plotOf(options).x + (time / 3000) * plotOf(options).width;

  it('reads the benchmark at the pointed time, not at the curve’s index', () => {
    const benchmark = [{ time: 0, value: 5 }, { time: 3000, value: 8 }];
    const { ctx, texts } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, benchmark }, DARK_THEME, { x: xOf(2900, { data, benchmark }), y: 100 });
    expect(texts).toContain('40');
    expect(texts).toContain('Benchmark: 8');
  });

  it('says nothing of a benchmark with no points', () => {
    const { ctx, texts } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, benchmark: [] }, DARK_THEME, { x: xOf(1000), y: 100 });
    expect(texts.some((t) => t.startsWith('Benchmark:'))).toBe(false);
  });

  it('marks the pointed value in the curve’s own colour', () => {
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, lineColor: '#123456' }, DARK_THEME, { x: xOf(1000), y: 100 });
    const arc = calls.findIndex((c) => c.name === 'arc');
    const dot = calls.slice(arc).find((c) => c.name === 'fill')!;
    expect(dot.fillStyle).toBe('#123456');
  });

  it('labels its values when every one is the same', () => {
    const flat = [{ time: 0, value: 50 }, { time: 1000, value: 50 }];
    const { ctx, texts, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data: flat, valueFormat: (v) => `v${v}` }, DARK_THEME, null);
    expect(texts.filter((t) => t.startsWith('v')).length).toBeGreaterThan(1);
    expect(coordinates(calls).every(Number.isFinite)).toBe(true);
    // The flat line runs through the middle of the plot, not along its floor.
    const plot = plotOf({ data: flat, valueFormat: (v) => `v${v}` });
    const line = named(calls, 'lineTo').at(-1)!;
    expect(line.args[1]).toBeCloseTo(plot.y + plot.height / 2, 5);
  });

  it('keeps a benchmark that runs past the curve inside the plot', () => {
    const benchmark = [{ time: -5000, value: 5 }, { time: 9000, value: 8 }];
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data, benchmark, benchmarkLabel: 'Index' }, DARK_THEME, null);
    expect(named(calls, 'clip').length).toBe(1);
    const plot = plotOf({ data, benchmark, benchmarkLabel: 'Index' });
    expect(named(calls, 'rect').map((c) => c.args)).toContainEqual([plot.x, plot.y, plot.width, plot.height]);
    // Its name is over the plot, whole, wherever the line ends.
    const label = named(calls, 'fillText').find((c) => c.args[0] === 'Index')!;
    expect(label.args[1] as number).toBeGreaterThanOrEqual(plot.x);
    expect((label.args[1] as number) + measure('Index')).toBeLessThanOrEqual(400);
    expect(label.args[2] as number).toBeLessThan(plot.y);
  });

  it('takes its times as they come, in any order', () => {
    const shuffled = [data[2], data[0], data[3], data[1]];
    const layout = computeEquityLayout({ data: shuffled }, 400, 300, measure);
    expect([layout.timeMin, layout.timeMax]).toEqual([0, 3000]);
    // Drawn left to right all the same: the same path as the points in order give.
    const path = (points: typeof data) => {
      const { ctx, calls } = recorder();
      renderEquityCurve(ctx, 400, 300, { data: points, drawdown: true }, DARK_THEME, null);
      return calls.filter((c) => c.name === 'lineTo' || c.name === 'moveTo').map((c) => c.args);
    };
    expect(path(shuffled)).toEqual(path(data));
  });

  it('shades a drawdown past a value that is no number', () => {
    const broken = [{ time: 0, value: 10 }, { time: 1000, value: NaN }, { time: 2000, value: 30 }, { time: 3000, value: 20 }];
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 400, 300, { data: broken, drawdown: true }, DARK_THEME, null);
    const ys = named(calls, 'lineTo').map((c) => c.args[1] as number);
    // The peak line still reaches the last point, at the height of 30.
    expect(ys.filter(Number.isFinite).length).toBeGreaterThan(ys.length - 4);
  });

  it('reads its time axis by the step between the ticks', () => {
    const day = 86_400_000;
    const start = Date.UTC(2026, 0, 5);
    const days = Array.from({ length: 5 }, (_, i) => ({ time: start + i * day, value: i }));
    const { ctx, texts } = recorder();
    renderEquityCurve(ctx, 600, 300, { data: days }, DARK_THEME, null);
    const labels = texts.filter((t) => /\d/.test(t) && /[A-Za-z:]/.test(t));
    // Four days in steps of a day or half a day: no two ticks read the same.
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);
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
    const { plot } = computeDepthLayout({ data: { bids: [{ price: 100, volume: 5 }], asks: [] } }, 400, 300, measure);
    expect(named(calls, 'lineTo').some((c) => c.args[0] === plot.x && c.args[1] === plot.y)).toBe(true);
  });

  it('reads out the volume resting from the best price to the pointed one', () => {
    const data = { bids: [{ price: 99, volume: 5 }, { price: 98, volume: 2 }], asks: [{ price: 101, volume: 4 }, { price: 102, volume: 3 }] };
    const layout = computeDepthLayout({ data }, 400, 300, measure);
    const xOf = (price: number) => layout.plot.x + ((price - layout.priceMin) / (layout.priceMax - layout.priceMin)) * layout.plot.width;
    const at = (price: number) => {
      const { ctx, texts } = recorder();
      renderDepthChart(ctx, 400, 300, { data, spreadLabel: false }, DARK_THEME, { x: xOf(price), y: 100 });
      return texts.slice(-2);
    };
    // Between two levels it reads the one the volume is counted to.
    expect(at(98.5)).toEqual(['99', '5']);
    expect(at(97.8)).toEqual(['98', '7']);
    expect(at(102.2)).toEqual(['102', '7']);
    // Inside the spread there is no volume to read, only the price.
    expect(at(100.4).at(-1)).toBe('100');
    expect(layout.mid).toBe(100);
    expect(layout.spread).toBe(2);
    // A volume below zero takes some back: the scale still reaches the highest the running volume got.
    const dipped = computeDepthLayout({ data: { bids: [{ price: 99, volume: 9 }, { price: 98, volume: -4 }], asks: [] } }, 400, 300, measure);
    expect(dipped.volume.max).toBeGreaterThanOrEqual(9);
  });

  it('writes small prices in full', () => {
    const data = { bids: [{ price: 0.00001234, volume: 5 }], asks: [{ price: 0.00001236, volume: 4 }] };
    const { ctx, texts } = recorder();
    renderDepthChart(ctx, 400, 300, { data }, DARK_THEME, null);
    expect(texts).toContain('Spread: 0.00000002');
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

describe('the kit the charts share', () => {
  it('puts a one-pixel line on whole device pixels at any ratio', () => {
    for (const ratio of [1, 1.25, 1.5, 2, 3]) {
      const ctx = { getTransform: () => ({ a: ratio, d: ratio, e: 0, f: 0 }) } as unknown as CanvasRenderingContext2D;
      const line = hairline(ctx);
      const device = line.width * ratio;
      expect(Number.isInteger(device)).toBe(true);
      for (const v of [0, 10.3, 57.5, 120.75]) {
        // Its two edges fall on device pixel boundaries.
        const left = line.x(v) * ratio - device / 2;
        expect(Math.abs(left - Math.round(left))).toBeLessThan(1e-9);
        expect(Math.abs(line.x(v) - v)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('steps a time axis by round times', () => {
    const day = 86_400_000;
    const start = Date.UTC(2026, 0, 1, 7, 30);
    const ticks = timeTicks(start, start + 60 * day, 4);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks.every((t) => t % day === 0)).toBe(true);
    expect(timeTicks(5, 5, 4)).toEqual([]);
    expect(timeTicks(start, start + 40 * 365 * day, 4).length).toBeLessThanOrEqual(5);
    // Past a fortnight: the first of a month, whatever the months' lengths.
    const months = timeTicks(Date.UTC(2026, 0, 10), Date.UTC(2026, 6, 20), 4);
    expect(months.map((m) => new Date(m).toISOString().slice(0, 10))).toEqual(['2026-03-01', '2026-05-01', '2026-07-01']);
    const years = timeTicks(Date.UTC(2001, 5, 1), Date.UTC(2031, 5, 1), 4);
    expect(years.every((y) => new Date(y).getUTCMonth() === 0 && new Date(y).getUTCDate() === 1)).toBe(true);
  });

  it('counts the decimals prices are written with', () => {
    expect(decimalsFor([100, 99.5, 101.25])).toBe(2);
    expect(decimalsFor([0.00001234])).toBe(8);
    expect(decimalsFor([NaN, 5])).toBe(0);
  });
});

describe('numbers and dates in a language', () => {
  it('writes numbers as the locale does, and falls back for a tag it cannot read', () => {
    expect(numberFormat('de-DE')(1234.5)).toBe('1.234,5');
    expect(numberFormat('en-US')(1234.5)).toBe('1,234.5');
    expect(numberFormat('en-US')(12_300)).toBe('12.3K');
    expect(percentFormat('de-DE')(0.125).replace(/\s/g, '')).toBe('12,5%');
    expect(axisFormat(niceScale(0, 1.5), 'de-DE')(0.5)).toBe('0,5');
    expect(() => numberFormat('not a tag')(1)).not.toThrow();
  });

  it('reaches a chart’s axis and tooltip through `locale`', () => {
    const { ctx, texts } = recorder();
    renderWaterfall(ctx, 400, 300, { locale: 'de-DE', data: [{ label: 'A', value: 1234.5 }, { label: 'B', value: 0.5 }] }, DARK_THEME, { x: 100, y: 100 });
    expect(texts).toContain('+1.234,5');
    const depth = recorder();
    renderDepthChart(depth.ctx, 400, 300, { locale: 'de-DE', data: { bids: [{ price: 99.5, volume: 1 }], asks: [{ price: 100.5, volume: 1 }] } }, DARK_THEME, null);
    expect(depth.texts).toContain('Spread: 1,0');
    const months = recorder();
    const day = 86_400_000;
    const data = Array.from({ length: 90 }, (_, i) => ({ time: Date.UTC(2026, 0, 1) + i * day, value: i }));
    renderEquityCurve(months.ctx, 600, 300, { locale: 'vi', data }, DARK_THEME, null);
    expect(months.texts.some((t) => /thg|tháng/i.test(t))).toBe(true);
  });

  it('writes a depth chart’s spread under a word of yours', () => {
    const { ctx, texts } = recorder();
    renderDepthChart(ctx, 400, 300, { spreadLabel: 'Chênh lệch', data: { bids: [{ price: 99, volume: 1 }], asks: [{ price: 101, volume: 1 }] } }, DARK_THEME, null);
    expect(texts).toContain('Chênh lệch: 2');
  });
});

describe('the face of a finance chart’s text', () => {
  it('is the system’s sans face unless the theme or the options name one', () => {
    expect(financeTheme('dark').font.family).toBe(SANS_FONT_FAMILY);
    expect(financeTheme(LIGHT_THEME).font.family).toBe(SANS_FONT_FAMILY);
    expect(financeTheme(LIGHT_THEME).background).toBe(LIGHT_THEME.background);
    // A theme with a face of its own keeps it; the option wins over both; the monospaced one comes back by name.
    const own = { ...DARK_THEME, font: { ...DARK_THEME.font, family: 'Georgia, serif' } };
    expect(financeTheme(own).font.family).toBe('Georgia, serif');
    expect(financeTheme(own, { family: 'Tahoma' }).font.family).toBe('Tahoma');
    expect(financeTheme('dark', { family: DEFAULT_FONT_FAMILY }).font.family).toBe(DEFAULT_FONT_FAMILY);
    expect(financeTheme('dark', { sizeSmall: 10 }).font).toMatchObject({ family: SANS_FONT_FAMILY, sizeSmall: 10 });
    // A size given as undefined leaves the theme's.
    expect(financeTheme('dark', { sizeSmall: undefined, family: undefined }).font).toMatchObject({ family: SANS_FONT_FAMILY, sizeSmall: DARK_THEME.font.sizeSmall });
  });
});
