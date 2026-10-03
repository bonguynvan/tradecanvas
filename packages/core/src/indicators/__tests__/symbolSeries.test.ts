import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { SymbolSeriesStore } from '../symbols/SymbolSeriesStore.js';
import { CompareSymbolIndicator, SpreadIndicator } from '../symbols/symbolIndicators.js';
import { CompareRenderer } from '../../charts/CompareRenderer.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bar = (time: number, close: number): OHLCBar => ({ time, open: close, high: close, low: close, close, volume: 1 });

/** The main symbol: hourly, 08:00 to 17:00. */
const main: DataSeries = Array.from({ length: 10 }, (_, i) => bar(T0 + (8 + i) * HOUR, 100 + i));
/** The other: hourly from 10:00, a bar missing at 13:00, ending at 15:00. */
const other: DataSeries = [10, 11, 12, 14, 15].map((h) => bar(T0 + h * HOUR, h * 2));

const config = (id: string, params: Record<string, string | number | boolean>): IndicatorConfig => ({ id, instanceId: `${id}_1`, params });

describe('SymbolSeriesStore', () => {
  it('gives a symbol’s close as of a time: its bar at or before it', () => {
    const store = new SymbolSeriesStore();
    store.set('B', other);
    expect(store.closeAt('B', T0 + 11 * HOUR)).toBe(22);
    expect(store.closeAt('B', T0 + 13 * HOUR)).toBe(24); // the 12:00 bar carries on
    expect(store.closeAt('B', T0 + 9 * HOUR)).toBeUndefined(); // before it starts
    expect(store.closeAt('B', T0 + 17 * HOUR)).toBeUndefined(); // well after it ends
    expect(store.closeAt('C', T0 + 11 * HOUR)).toBeUndefined();
  });

  it('matches bars timed in seconds with bars timed in milliseconds', () => {
    const store = new SymbolSeriesStore();
    store.set('S', other.map((b) => ({ ...b, time: b.time / 1000 })));
    expect(store.closeAt('S', T0 + 11 * HOUR)).toBe(22);
  });

  it('forgets a symbol, and says which it has', () => {
    const store = new SymbolSeriesStore();
    store.set('B', other);
    expect(store.has('B')).toBe(true);
    store.set('B', null);
    expect(store.has('B')).toBe(false);
  });
});

describe('the compare and spread indicators', () => {
  const store = new SymbolSeriesStore();
  store.set('B', other);

  it('draw the other symbol’s close on the main bars, by time', () => {
    const out = new CompareSymbolIndicator(store).calculate(main, config('compareSymbol', { symbol: 'B' }));
    expect(out.series?.map((v) => v?.value ?? null)).toEqual([null, null, 20, 22, 24, 24, 28, 30, null, null]);
  });

  it('take the spread or the ratio of the main close to the other’s', () => {
    const spread = new SpreadIndicator(store).calculate(main, config('spread', { symbol: 'B', mode: 'spread' }));
    expect(spread.series?.[2]?.value).toBe(102 - 20);
    const ratio = new SpreadIndicator(store).calculate(main, config('spread', { symbol: 'B', mode: 'ratio' }));
    expect(ratio.series?.[3]?.value).toBeCloseTo(103 / 22);
  });

  it('draw nothing without a symbol, or one not loaded', () => {
    const none = new CompareSymbolIndicator(store).calculate(main, config('compareSymbol', { symbol: '' }));
    expect(none.series?.every((v) => v === null)).toBe(true);
    const missing = new SpreadIndicator(store).calculate(main, config('spread', { symbol: 'Z' }));
    expect(missing.series?.every((v) => v === null)).toBe(true);
  });
});

describe('CompareRenderer', () => {
  // 10 px a bar, all ten on screen.
  const viewport: ViewportState = {
    visibleRange: { from: 0, to: 9 },
    priceRange: { min: 90, max: 120 },
    barWidth: 8,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 100, height: 300 },
  };

  it('lines the other series up with the main one by time', () => {
    const renderer = new CompareRenderer();
    renderer.addSymbol({ id: 'b', label: 'B', data: other, color: '#f00', visible: true });
    const points: number[][] = [];
    const ctx = {
      save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, stroke() {}, fillText() {},
      moveTo(x: number, y: number) { points.push([x, y]); },
      lineTo(x: number, y: number) { points.push([x, y]); },
    } as unknown as CanvasRenderingContext2D;
    renderer.render(ctx, main, viewport, DARK_THEME);
    // From the main bar at 10:00 (index 2) to 15:00 (index 7): six points.
    expect(points.map(([x]) => x)).toEqual([24, 34, 44, 54, 64, 74]);
  });

  it('gives the price range it covers, for the auto scale', () => {
    const renderer = new CompareRenderer();
    renderer.setMode('absolute');
    renderer.addSymbol({ id: 'b', label: 'B', data: other, color: '#f00', visible: true });
    expect(renderer.getPriceRange(main, viewport)).toEqual({ min: 20, max: 30 });
    renderer.setSymbolVisible('b', false);
    expect(renderer.getPriceRange(main, viewport)).toBeNull();
  });
});

describe('CompareRenderer on a series that grows', () => {
  it('follows bars added to the same array', () => {
    const renderer = new CompareRenderer();
    renderer.setMode('absolute');
    const longer: DataSeries = [...other, bar(T0 + 16 * HOUR, 40)];
    renderer.addSymbol({ id: 'b', label: 'B', data: longer, color: '#f00', visible: true });
    const growing = main.slice(0, 8);
    const vp = (to: number): ViewportState => ({
      visibleRange: { from: 0, to }, priceRange: { min: 0, max: 50 }, barWidth: 8, barSpacing: 2, offset: 0,
      chartRect: { x: 0, y: 0, width: 100, height: 300 },
    });
    expect(renderer.getPriceRange(growing, vp(7))?.max).toBe(30);
    growing.push(main[8]); // 16:00, on the same array
    expect(renderer.getPriceRange(growing, vp(8))?.max).toBe(40);
  });
});
