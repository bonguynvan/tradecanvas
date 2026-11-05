import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorPlot, IndicatorValue, ViewportState } from '@tradecanvas/commons';
import { paneValueRange, paneLogRange, renderPlots, plotColor, drawnKeys } from '../plots.js';
import { strokeRecorder } from '../../__tests__/strokeRecorder.js';

const out = (series: (IndicatorValue | null)[]): IndicatorOutput => ({ values: new Map(), series });
const ALL = { keys: null };

describe('paneValueRange', () => {
  it('is null with nothing visible and no fixed bound', () => {
    expect(paneValueRange(null, 0, 10, ALL)).toBeNull();
    expect(paneValueRange(out([{ value: 5 }]), 3, 9, ALL)).toBeNull();
  });

  it('pads the visible values by 10% of their span, inside [from, to] only', () => {
    const range = paneValueRange(out([{ value: -100 }, { value: 10 }, null, { value: 30 }, { value: 9999 }]), 1, 3, ALL)!;
    expect(range.min).toBeCloseTo(8);
    expect(range.max).toBeCloseTo(32);
  });

  it('counts only the drawn fields', () => {
    // A trend flag of ±1 must not drag a price scale down to -1.
    const range = paneValueRange(out([{ value: 100, trend: -1 }, { value: 110, trend: 1 }]), 0, 1, { keys: ['value'] })!;
    expect(range.min).toBeCloseTo(99);
    expect(range.max).toBeCloseTo(111);
  });

  it('skips missing and non-finite values', () => {
    const range = paneValueRange(out([{ value: NaN }, { value: Infinity }, { value: 25 }, { value: 35, other: undefined }]), 0, 3, ALL)!;
    expect([range.min, range.max]).toEqual([24, 36]);
  });

  it('pads a flat series in proportion to its value', () => {
    const range = paneValueRange(out([{ value: 50 }, { value: 50 }]), 0, 1, ALL)!;
    expect([range.min, range.max]).toEqual([45, 55]);
  });

  it('keeps fixed bounds, levels and zero', () => {
    const rsi = out([{ value: 40 }, { value: 60 }]);
    expect(paneValueRange(rsi, 0, 1, { keys: ['value'], scale: { min: 0, max: 100 } })).toEqual({ min: 0, max: 100 });
    expect(paneValueRange(out([]), 0, 1, { keys: ['value'], scale: { min: 0, max: 100 } })).toEqual({ min: 0, max: 100 });
    const cci = paneValueRange(out([{ value: -20 }, { value: 40 }]), 0, 1, { keys: ['value'], levels: [-100, 100] })!;
    expect([cci.min, cci.max]).toEqual([-100, 100]);
    const atr = paneValueRange(out([{ value: 2 }, { value: 4 }]), 0, 1, { keys: ['value'], zero: true })!;
    expect(atr.min).toBe(0);
    expect(atr.max).toBeCloseTo(4.2);
  });

  it('reads a plugin without `series` in bar order', () => {
    const values = new Map<number, IndicatorValue>([[1000, { value: 10 }], [2000, { value: 30 }], [3000, { value: 999 }]]);
    const range = paneValueRange({ values }, 0, 1, ALL)!;
    expect([range.min, range.max]).toEqual([8, 32]);
  });
});

/** Records every point drawn and the colour it was drawn in. */
function recorder() {
  const points: { x: number; y: number; color: string }[] = [];
  let stroke = '';
  let fill = '';
  const ctx = {
    set strokeStyle(c: string) { stroke = c; }, get strokeStyle() { return stroke; },
    set fillStyle(c: string) { fill = c; }, get fillStyle() { return fill; },
    lineWidth: 1, lineJoin: 'round',
    beginPath() {}, stroke() {}, fill() {},
    moveTo(x: number, y: number) { points.push({ x, y, color: stroke }); },
    lineTo(x: number, y: number) { points.push({ x, y, color: stroke }); },
    arc(x: number, y: number) { points.push({ x, y, color: fill }); },
    rect(x: number, y: number, _w: number, h: number) { points.push({ x, y: y + h, color: fill }); },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, points };
}

// 10 px per bar; values 0..100 over y 0..100 (100 at the top).
const viewport = {
  visibleRange: { from: 0, to: 3 }, priceRange: { min: 0, max: 100 },
  barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 40, height: 100 },
} as ViewportState;
const style = { colors: ['#up', '#down', '#third'], lineWidths: [1.5], opacity: 1 };

describe('renderPlots', () => {
  it('draws a line on the viewport scale, broken at gaps', () => {
    const { ctx, points } = recorder();
    renderPlots(ctx, out([{ value: 20 }, { value: 40 }, null, { value: 90 }]), viewport, style, [{ key: 'value', title: 'V', color: 0 }]);
    // The point alone after the gap is drawn as a short level stroke through it.
    expect(points.map((p) => p.y)).toEqual([80, 60, 10, 10, 10]);
  });

  it('colours a two-tone line segment by the bar it ends on', () => {
    const { ctx, points } = recorder();
    const plot: IndicatorPlot = { key: 'value', title: 'ST', color: 0, tone: { field: 'trend' }, downColor: 1 };
    renderPlots(ctx, out([{ value: 50, trend: 1 }, { value: 60, trend: 1 }, { value: 40, trend: -1 }]), viewport, style, [plot]);
    // up pass: segment 0→1; down pass: segment 1→2
    expect(points.map((p) => [p.y, p.color])).toEqual([[50, '#up'], [40, '#up'], [40, '#down'], [60, '#down']]);
  });

  it('grows histogram bars from zero, by sign', () => {
    const { ctx, points } = recorder();
    const zeroCentred = { ...viewport, priceRange: { min: -50, max: 50 } };
    const plot: IndicatorPlot = { key: 'h', title: 'H', color: 0, kind: 'histogram', tone: 'sign', downColor: 1 };
    renderPlots(ctx, out([{ h: 10 }, { h: -20 }]), zeroCentred, style, [plot]);
    expect(points.map((p) => p.color)).toEqual(['#up', '#down']);
  });

  it('falls back to the first colour when a plot’s colour is not in the list', () => {
    const { ctx, points } = recorder();
    const plots: IndicatorPlot[] = [{ key: 'h', title: 'H', color: 2, kind: 'histogram', tone: 'sign', downColor: 3 }];
    renderPlots(ctx, out([{ h: 10 }, { h: -20 }]), { ...viewport, priceRange: { min: -50, max: 50 } }, { ...style, colors: ['#only'] }, plots);
    expect(points.map((p) => p.color)).toEqual(['#only', '#only']);
  });

  it('leaves out a plot that is hidden, and dashes a plot as its style says', () => {
    const rec = strokeRecorder();
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0 }, { key: 'b', title: 'B', color: 1 }];
    const series = out([{ a: 20, b: 30 }, { a: 40, b: 50 }]);
    renderPlots(rec.ctx, series, viewport, { ...style, plots: { a: { visible: false }, b: { lineStyle: 'dashed' } } }, plots);
    expect(rec.strokes).toHaveLength(1);
    expect(rec.strokes[0].dash.length).toBeGreaterThan(0);

    const plain = strokeRecorder();
    renderPlots(plain.ctx, series, viewport, style, plots);
    expect(plain.strokes.map((s) => s.dash)).toEqual([[], []]);
  });

  it('names the drawn fields and their colours', () => {
    const plot: IndicatorPlot = { key: 'value', title: 'SAR', color: 0, tone: { field: 'trend' }, downColor: 1 };
    expect(drawnKeys({ plots: [plot] })).toEqual(['value']);
    expect(drawnKeys({})).toBeNull();
    expect(plotColor(plot, style, { value: 1, trend: -1 })).toBe('#down');
    expect(plotColor(plot, style, null)).toBe('#up');
  });
});

describe("renderPlots: the look a descriptor declares", () => {
  const hex = { colors: ['#102030', '#405060'], lineWidths: [2], opacity: 1 };
  const band: IndicatorPlot[] = [{ key: 'upper', title: 'Upper', color: 0 }, { key: 'lower', title: 'Lower', color: 0 }];

  it('shades between two plots in the fill colour at its opacity, under the lines', () => {
    const rec = strokeRecorder();
    const order: string[] = [];
    const ctx = new Proxy(rec.ctx, {
      get: (target, key) => {
        const value = Reflect.get(target, key);
        if (key === 'fill' || key === 'stroke') return () => { order.push(key); (value as () => void)(); };
        return value;
      },
    });
    renderPlots(ctx, out([{ upper: 60, lower: 40 }, { upper: 70, lower: 30 }]), viewport, hex, band, [{ between: ['upper', 'lower'], color: 1, opacity: 0.2 }]);
    expect(rec.pathFills.map((f) => f.color)).toEqual(['rgba(64, 80, 96, 0.2)']);
    expect(order[0]).toBe('fill');
    expect(rec.strokes).toHaveLength(2);
  });

  it('shades only where both plots have a value, in one piece per run', () => {
    const rec = strokeRecorder();
    const series = out([{ upper: 60, lower: 40 }, { upper: 61, lower: 41 }, { upper: 62 }, { upper: 63, lower: 43 }, { upper: 64, lower: 44 }]);
    renderPlots(rec.ctx, series, { ...viewport, visibleRange: { from: 0, to: 4 } }, hex, band, [{ between: ['upper', 'lower'], color: 0 }]);
    expect(rec.pathFills).toHaveLength(2);
    // Unset, a fill is drawn at a tenth of its colour.
    expect(rec.pathFills[0].color).toBe('rgba(16, 32, 48, 0.1)');
  });

  it('draws a plot at its own width, unless the style gives one for its place', () => {
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0 }, { key: 'b', title: 'B', color: 1, width: 1 }];
    const series = out([{ a: 20, b: 30 }, { a: 40, b: 50 }]);
    const own = strokeRecorder();
    renderPlots(own.ctx, series, viewport, hex, plots);
    expect(own.strokes.map((s) => s.width)).toEqual([2, 1]);
    const set = strokeRecorder();
    renderPlots(set.ctx, series, viewport, { ...hex, lineWidths: [2, 3] }, plots);
    expect(set.strokes.map((s) => s.width)).toEqual([2, 3]);
  });

  it('dashes a plot declared dashed, until its style says otherwise', () => {
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0, lineStyle: 'dashed' }];
    const series = out([{ a: 20 }, { a: 40 }]);
    const dashed = strokeRecorder();
    renderPlots(dashed.ctx, series, viewport, hex, plots);
    expect(dashed.strokes[0].dash.length).toBeGreaterThan(0);
    const solid = strokeRecorder();
    renderPlots(solid.ctx, series, viewport, { ...hex, plots: { a: { lineStyle: 'solid' } } }, plots);
    expect(solid.strokes[0].dash).toEqual([]);
  });

  it('draws a plot at its own opacity, and leaves the context as it found it', () => {
    const rec = strokeRecorder();
    const plots: IndicatorPlot[] = [{ key: 'a', title: 'A', color: 0, opacity: 0.5 }, { key: 'b', title: 'B', color: 1 }];
    renderPlots(rec.ctx, out([{ a: 20, b: 30 }, { a: 40, b: 50 }]), viewport, hex, plots);
    expect(rec.strokes.map((s) => s.alpha)).toEqual([0.5, 1]);
    expect(rec.ctx.globalAlpha).toBe(1);
  });

  it('breaks a line where its period field changes, except between periods of one bar each', () => {
    const plots: IndicatorPlot[] = [{ key: 'value', title: 'VWAP', color: 0, breakOn: 'session' }];
    const wide = { ...viewport, visibleRange: { from: 0, to: 3 } };
    const intraday = strokeRecorder();
    renderPlots(intraday.ctx, out([{ value: 10, session: 1 }, { value: 20, session: 1 }, { value: 30, session: 2 }, { value: 40, session: 2 }]), wide, hex, plots);
    expect(intraday.strokes[0].segments.map((s) => s[3])).toEqual([80, 60]);
    const daily = strokeRecorder();
    renderPlots(daily.ctx, out([{ value: 10, session: 1 }, { value: 20, session: 2 }, { value: 30, session: 3 }]), wide, hex, plots);
    expect(daily.strokes[0].segments).toHaveLength(2);
  });
});

describe('paneLogRange', () => {
  it('pads by ratio and leaves zero out, so a volume pane can go log', () => {
    const range = paneLogRange(out([{ value: 10 }, { value: 1000 }]), 0, 1, { keys: null, zero: true, levels: [0, 500] }) as { min: number; max: number };
    expect(range.min).toBeGreaterThan(0);
    expect(range.min).toBeLessThan(10);
    expect(range.max).toBeGreaterThan(1000);
    // Equal ratios either side.
    expect(10 / range.min).toBeCloseTo(range.max / 1000, 6);
  });

  it('is false with a value at or below zero, and null with nothing visible', () => {
    expect(paneLogRange(out([{ value: 5 }, { value: 0 }]), 0, 1, ALL)).toBe(false);
    expect(paneLogRange(out([{ value: -1 }, { value: 3 }]), 0, 1, ALL)).toBe(false);
    expect(paneLogRange(out([{ value: 5 }]), 3, 9, ALL)).toBeNull();
  });
});
