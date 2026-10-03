import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorPlot, IndicatorValue, ViewportState } from '@tradecanvas/commons';
import { paneValueRange, paneLogRange, renderPlots, plotColor, drawnKeys } from '../plots.js';

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
    expect(points.map((p) => p.y)).toEqual([80, 60, 10]);
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

  it('names the drawn fields and their colours', () => {
    const plot: IndicatorPlot = { key: 'value', title: 'SAR', color: 0, tone: { field: 'trend' }, downColor: 1 };
    expect(drawnKeys({ plots: [plot] })).toEqual(['value']);
    expect(drawnKeys({})).toBeNull();
    expect(plotColor(plot, style, { value: 1, trend: -1 })).toBe('#down');
    expect(plotColor(plot, style, null)).toBe('#up');
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
