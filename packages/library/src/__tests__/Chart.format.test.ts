// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { TimeAxis } from '@tradecanvas/core';
import { MARKET_HOSE } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 1);
const bars: OHLCBar[] = Array.from({ length: 80 }, (_, i) => {
  const p = 110 + Math.sin(i / 6) * 2;
  return { time: T0 + i * HOUR, open: p, high: p + 0.3, low: p - 0.3, close: p + 0.1, volume: 100 };
});

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart?.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type Probe = {
  viewport: { getState(): ViewportState };
  buildPanelRenderInfos(): { viewport: ViewportState }[];
};

describe('the tags beside the price axis', () => {
  it('group prices in the chart’s number locale, as the axis does', () => {
    chart = new Chart(host, { numberLocale: 'vi-VN' });
    chart.setData(bars);
    const state = () => (chart as unknown as Probe).viewport.getState();
    expect(state().numberLocale).toBe('vi-VN');
    chart.setNumberLocale('de-DE');
    expect(state().numberLocale).toBe('de-DE');
  });
});

describe('a chart’s price step', () => {
  it('is the symbol’s smallest step, a fraction’s unit, or one unit of the decimals shown', () => {
    chart = new Chart(host, {});
    chart.setData(bars);
    expect(chart.getPriceStep()).toBe(0.01);
    chart.setSymbolInfo({ symbol: 'VNM', pricePrecision: 0 });
    expect(chart.getPriceStep()).toBe(1);
    chart.setSymbolInfo({ symbol: 'VNM', pricePrecision: 0, minTick: 10 });
    expect(chart.getPriceStep()).toBe(10);
    chart.setSymbolInfo(null);
    chart.setPriceFormat({ denominator: 32 });
    expect(chart.getPriceStep()).toBe(1 / 32);
  });
});

describe('a chart on a market with price bands', () => {
  it('rounds to the step of the price’s band, and gives the step at a price', () => {
    chart = new Chart(host, {});
    chart.setData(bars);
    chart.setMarket(MARKET_HOSE);
    expect(chart.roundPrice(9.987)).toBe(9.99);
    expect(chart.roundPrice(25.37)).toBe(25.35);
    expect(chart.roundPrice(120.47)).toBe(120.5);
    expect(chart.getPriceStep(9.5)).toBe(0.01);
    expect(chart.getPriceStep(25)).toBe(0.05);
    // Without a price: the step at the last close (about 110 here).
    expect(chart.getPriceStep()).toBe(0.1);
    // A symbol's own step still comes first.
    chart.setSymbolInfo({ symbol: 'FPT', minTick: 0.01 });
    expect(chart.roundPrice(25.37)).toBe(25.37);
  });

  it('keeps the market it was given, and draws limits from a copy', () => {
    chart = new Chart(host, {});
    chart.setData(bars);
    chart.setMarket(MARKET_HOSE);
    chart.setPriceLimits(108);
    expect(chart.getMarket()?.priceLimits?.referencePrice).toBe(108);
    expect(MARKET_HOSE.priceLimits?.referencePrice).toBeUndefined();
  });
});

describe('a chart’s price format', () => {
  it('prints prices in fractions of a point, and rounds them to the fraction', () => {
    chart = new Chart(host, { priceFormat: { denominator: 32 } });
    chart.setData(bars);
    expect(chart.formatPrice(101.5)).toBe("101'16");
    expect(chart.roundPrice(101.51)).toBe(101.5);
    const vp = (chart as unknown as Probe).viewport.getState();
    expect(vp.formatPrice?.(110.25)).toBe("110'08");
    expect(vp.priceUnit).toBe(1 / 32);
  });

  it('takes a function of yours, and goes back to decimals', () => {
    chart = new Chart(host, { priceFormat: (p) => `$${p.toFixed(1)}` });
    chart.setData(bars);
    expect(chart.formatPrice(12.34)).toBe('$12.3');
    chart.setPriceFormat(null);
    expect(chart.formatPrice(12.34)).toBe('12.34');
    expect((chart as unknown as Probe).viewport.getState().formatPrice).toBeUndefined();
  });

  it('leaves indicator panes in their own numbers', () => {
    chart = new Chart(host, { priceFormat: { denominator: 32 } });
    chart.setData(bars);
    chart.addIndicator('rsi');
    const pane = (chart as unknown as Probe).buildPanelRenderInfos()[0].viewport;
    expect(pane.formatPrice).toBeUndefined();
    expect(pane.priceUnit).toBeUndefined();
  });

  it('widens the price axis for the labels it prints', () => {
    chart = new Chart(host, {});
    chart.setData(bars);
    const before = (chart as unknown as Probe).viewport.getState().priceAxisWidth ?? 0;
    chart.setPriceFormat((p) => `${p.toFixed(2)} long units label`);
    chart.resize();
    expect((chart as unknown as Probe).viewport.getState().priceAxisWidth ?? 0).toBeGreaterThan(before);
  });
});

describe('the market’s and the symbol’s decimals', () => {
  it('go on the viewport, for drawing labels, price limits and plugins', () => {
    chart = new Chart(host, {});
    chart.setData(bars);
    const state = () => (chart as unknown as Probe).viewport.getState();
    expect(state().pricePrecision).toBeUndefined();
    chart.setSymbolInfo({ symbol: 'BTC', pricePrecision: 1 });
    expect(state().pricePrecision).toBe(1);
    // The market's win over the symbol's, as on the axis.
    chart.setMarket({ type: 'crypto', pricePrecision: 3 });
    expect(state().pricePrecision).toBe(3);
    expect(chart.formatPrice(100_018.7)).toBe('100,018.700');
    chart.setSymbolInfo({ symbol: 'BTC', pricePrecision: 1 });
    expect(state().pricePrecision).toBe(3);
  });

  it('are cleared with the symbol’s, and stay off indicator panes', () => {
    chart = new Chart(host, {});
    chart.setData(bars);
    chart.setSymbolInfo({ symbol: 'BTC', pricePrecision: 1 });
    chart.addIndicator('rsi');
    expect((chart as unknown as Probe).buildPanelRenderInfos()[0].viewport.pricePrecision).toBeUndefined();
    chart.setSymbolInfo(null);
    expect((chart as unknown as Probe).viewport.getState().pricePrecision).toBeUndefined();
  });

  it('reach the pinned tooltip, in the number locale', () => {
    chart = new Chart(host, { numberLocale: 'de-DE' });
    chart.setData(bars);
    chart.setSymbolInfo({ symbol: 'BTC', pricePrecision: 1 });
    const tooltip = (chart as unknown as { pinnedTooltip: { pin(bar: OHLCBar, index: number, theme: unknown): void } }).pinnedTooltip;
    tooltip.pin({ time: T0, open: 100_000, high: 100_085.3, low: 99_990.1, close: 100_018.7, volume: 1 }, 0, chart.getTheme());
    expect(host.textContent).toContain('100.018,7');
  });
});

describe('a chart’s time format', () => {
  it('goes to the time axis, the crosshair and the tooltip', () => {
    const toAxis = vi.spyOn(TimeAxis.prototype, 'setTimeFormatter');
    const format = (time: number) => new Date(time).toISOString();
    chart = new Chart(host, { timeFormatter: format });
    expect(toAxis).toHaveBeenCalledWith(format);
    chart.setTimeFormatter(null);
    expect(toAxis).toHaveBeenLastCalledWith(null);
  });
});

describe('the chart’s shapes', () => {
  it('rounds its tags, through theme changes too', () => {
    chart = new Chart(host, { shapes: { tagRadius: 6 } });
    expect(chart.getShapes()).toEqual({ tagRadius: 6 });
    chart.setTheme('light');
    expect(chart.getShapes()).toEqual({ tagRadius: 6 });
    chart.setShapes({ tagRadius: 999 });
    expect(chart.getTheme().shape).toEqual({ tagRadius: 999 });
    chart.setShapes({ tagRadius: -3 });
    expect(chart.getShapes()).toEqual({ tagRadius: 999 }); // not a radius: nothing changes
    chart.setTheme('dark');
    expect(chart.getShapes()).toEqual({ tagRadius: 999 }); // and the shape still outlasts a theme switch
  });
});
