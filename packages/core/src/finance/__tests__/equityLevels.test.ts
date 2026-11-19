import { describe, it, expect } from 'vitest';
import { DARK_THEME, withAlpha } from '@tradecanvas/commons';
import type { EquityCurveOptions } from '@tradecanvas/commons';
import { computeEquityLayout, renderEquityCurve } from '../EquityCurveRenderer.js';
import { CHART_PAD, scaleToPx } from '../chartKit.js';

interface Call { name: string; args: unknown[]; fillStyle: unknown; strokeStyle: unknown; dash: unknown }

/**
 * A canvas stand-in that keeps every call with the fill, stroke and dash it was made with. `named` colours
 * read back as the hex a browser's canvas gives for them.
 */
function recorder(names: Record<string, string> = {}): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif', dash: [] };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
      return (...args: unknown[]) => {
        if (prop === 'setLineDash') target.dash = args[0];
        calls.push({ name: String(prop), args, fillStyle: target.fillStyle, strokeStyle: target.strokeStyle, dash: target.dash });
      };
    },
    set: (target, prop, value) => {
      target[prop] = (prop === 'fillStyle' || prop === 'strokeStyle') && typeof value === 'string' ? (names[value] ?? value) : value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

/** As the stand-in measures: 6 px a character. */
const measure = (text: string) => text.length * 6;
const named = (calls: Call[], name: string) => calls.filter((c) => c.name === name);
const text = (calls: Call[], value: string) => named(calls, 'fillText').find((c) => c.args[0] === value);

/** A year's closes between 100 and 140. */
const data = [{ time: 0, value: 100 }, { time: 1000, value: 120 }, { time: 2000, value: 140 }, { time: 3000, value: 130 }];

const layoutOf = (options: Partial<EquityCurveOptions>) => computeEquityLayout({ data, ...options }, 600, 300, measure);
const yOf = (options: Partial<EquityCurveOptions>, value: number) => {
  const { scale, plot } = layoutOf(options);
  return scaleToPx(scale, value, plot.y, plot.height, true);
};

describe('equity curve levels and bands', () => {
  it('widens the value scale to show a level and a band past the curve', () => {
    const options = { levels: [{ value: 180 }], bands: [{ from: 60, to: 80 }] };
    const { scale } = layoutOf(options);
    expect(scale.max).toBeGreaterThanOrEqual(180);
    expect(scale.min).toBeLessThanOrEqual(60);
  });

  it('keeps the scale to the curve with fitLevels off, and leaves out a level past it', () => {
    const options = { levels: [{ value: 180, label: 'BOS' }], fitLevels: false, valueFormat: (v: number) => `v${v}` };
    expect(layoutOf(options).scale.max).toBeLessThan(180);
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    expect(text(calls, 'BOS')).toBeUndefined();
    expect(text(calls, 'v180')).toBeUndefined();
  });

  it('draws a level across the plot at its value, dashed, with its label and its value at the axis', () => {
    const options = { levels: [{ value: 125, label: 'CHoCH', color: '#ff8800' }], valueFormat: (v: number) => `v${v}` };
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    const { plot } = layoutOf(options);
    const y = yOf(options, 125);
    const across = named(calls, 'lineTo').find((c) => Math.abs((c.args[1] as number) - y) < 1 && (c.args[0] as number) >= plot.x + plot.width - 1);
    expect(across).toBeDefined();
    expect(across!.strokeStyle).toBe('#ff8800');
    expect((across!.dash as number[]).length).toBeGreaterThan(0);
    // Its name in the plot, its value in a tag of its colour at the axis.
    const label = text(calls, 'CHoCH')!;
    expect(label.fillStyle).toBe('#ff8800');
    expect(label.args[1] as number).toBeGreaterThan(plot.x);
    const value = text(calls, 'v125')!;
    expect(value.args[1] as number).toBeLessThanOrEqual(plot.x);
    expect(named(calls, 'fillRect').some((c) => c.fillStyle === '#ff8800')).toBe(true);
  });

  it('takes a dash of [] as a solid line, and the theme’s colour when none is given', () => {
    const options = { levels: [{ value: 125, dash: [] }] };
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    const y = yOf(options, 125);
    const across = named(calls, 'lineTo').find((c) => Math.abs((c.args[1] as number) - y) < 1)!;
    expect(across.dash).toEqual([]);
    expect(across.strokeStyle).toBe(DARK_THEME.textSecondary);
  });

  it('writes a level’s value in full, not shortened as the axis is', () => {
    const big = [{ time: 0, value: 36_000 }, { time: 1000, value: 44_000 }];
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data: big, locale: 'en', levels: [{ value: 41_250.5 }] }, DARK_THEME, null);
    expect(text(calls, '41,250.5')).toBeDefined();
  });

  it('keeps a level’s name readable where the curve crosses it', () => {
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, levels: [{ value: 125, label: 'CHoCH' }] }, DARK_THEME, null);
    const halo = named(calls, 'strokeText').find((c) => c.args[0] === 'CHoCH')!;
    expect(halo.strokeStyle).toBe(DARK_THEME.background);
    expect(calls.indexOf(halo)).toBeLessThan(calls.indexOf(text(calls, 'CHoCH')!));
  });

  it('keeps the plot when a level’s value is too long to write in full', () => {
    const options = { levels: [{ value: 125 }], valueFormat: (v: number) => (v === 125 ? 'x'.repeat(200) : `${v}`) };
    const { plot } = layoutOf(options);
    expect(plot.width).toBeGreaterThan(600 * 0.6);
  });

  it('shows a level that falls on the plot’s bottom edge', () => {
    const options = { levels: [{ value: 100 }], fitLevels: false };
    const { plot, scale } = layoutOf(options);
    expect(scale.min).toBe(100);
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    const line = named(calls, 'lineTo').find((c) => c.strokeStyle === DARK_THEME.textSecondary && (c.args[0] as number) === plot.x + plot.width)!;
    expect(line.args[1] as number).toBeLessThan(plot.y + plot.height);
  });

  it('writes a level’s value in ink that reads on a named colour', () => {
    const { ctx, calls } = recorder({ gold: '#ffd700' });
    renderEquityCurve(ctx, 600, 300, { data, valueFormat: (v) => `v${v}`, levels: [{ value: 125, color: 'gold' }] }, DARK_THEME, null);
    expect(text(calls, 'v125')!.fillStyle).not.toBe('#ffffff');
  });

  it('cuts a name too long for the plot', () => {
    const long = 'a name much too long to fit across the whole of this plot, by far, really, it goes on and on and on';
    const options = { levels: [{ value: 125, label: long }], bands: [{ from: 105, to: 120, label: long }] };
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    const { plot } = layoutOf(options);
    const names = named(calls, 'fillText').filter((c) => String(c.args[0]).startsWith('a name'));
    expect(names.length).toBe(2);
    for (const c of names) expect(measure(String(c.args[0]))).toBeLessThanOrEqual(plot.width);
  });

  it('makes room at the axis for a level’s value', () => {
    const options = { levels: [{ value: 125 }], valueFormat: (v: number) => (v === 125 ? 'a very long value' : `${v}`) };
    expect(layoutOf(options).plot.x).toBeGreaterThanOrEqual(CHART_PAD + measure('a very long value'));
  });

  it('tints a band across the plot between its values, either way round, under the curve', () => {
    const options = { bands: [{ from: 135, to: 110, label: 'Premium' }] };
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    const { plot } = layoutOf(options);
    const top = yOf(options, 135);
    const bottom = yOf(options, 110);
    const band = named(calls, 'fillRect').find((c) => c.args[0] === plot.x && c.args[2] === plot.width && Math.abs((c.args[1] as number) - top) < 0.5)!;
    expect(band).toBeDefined();
    expect(band.args[3] as number).toBeCloseTo(bottom - top, 5);
    expect(band.fillStyle).toBe(withAlpha(DARK_THEME.textSecondary, 0.12));
    // Under the curve: tinted before the line is stroked.
    expect(calls.indexOf(band)).toBeLessThan(calls.findLastIndex((c) => c.name === 'stroke'));
    expect(text(calls, 'Premium')).toBeDefined();
  });

  it('uses a band’s colour as given', () => {
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, bands: [{ from: 110, to: 120, color: 'rgba(0, 200, 0, 0.2)' }] }, DARK_THEME, null);
    expect(named(calls, 'fillRect').some((c) => c.fillStyle === 'rgba(0, 200, 0, 0.2)')).toBe(true);
  });

  it('passes over levels and bands that are no numbers', () => {
    const options = { levels: [{ value: Number.NaN, label: 'gone' }], bands: [{ from: 110, to: Number.POSITIVE_INFINITY }] };
    const { scale } = layoutOf(options);
    expect(Number.isFinite(scale.min) && Number.isFinite(scale.max)).toBe(true);
    const { ctx, calls } = recorder();
    renderEquityCurve(ctx, 600, 300, { data, ...options }, DARK_THEME, null);
    expect(text(calls, 'gone')).toBeUndefined();
    for (const c of calls) for (const a of c.args) if (typeof a === 'number') expect(Number.isFinite(a)).toBe(true);
  });
});
