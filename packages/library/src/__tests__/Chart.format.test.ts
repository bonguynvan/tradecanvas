// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { TimeAxis } from '@tradecanvas/core';
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
  });
});
