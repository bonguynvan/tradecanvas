// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { sameBar } from '../DataManager.js';
import { formingAt, intrabarPath } from '../replay/intrabarPath.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 6);
/** Bars that close up, of which the sellers took most: an estimate from the close would read them the other way. */
const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 99, close: 101, volume: 10, buyVolume: 3 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: bars that say who took their trades', () => {
  it('keeps what the buyers took on its bars, and gives the delta indicator the true delta', () => {
    chart.setData(bars(30));
    expect(chart.getData()[0]).toEqual(expect.objectContaining({ volume: 10, buyVolume: 3 }));
    const id = chart.addIndicator('voldelta')!;
    const delta = chart.getIndicatorOutput(id)!.series!;
    // Three bought and seven sold: four down, though the bar closed up.
    expect(delta.at(-1)).toEqual(expect.objectContaining({ value: -4, up: 0 }));
  });

  it('takes a bar that only differs in what was bought as another bar', () => {
    chart.setData(bars(30));
    const id = chart.addIndicator('voldelta')!;
    const last = chart.getData().at(-1)!;
    expect(sameBar(last, { ...last, buyVolume: 9 })).toBe(false);
    expect(sameBar(last, { ...last })).toBe(true);
    chart.updateLastBar({ ...last, buyVolume: 9 });
    expect(chart.getData().at(-1)!.buyVolume).toBe(9);
    expect(chart.getIndicatorOutput(id)!.series!.at(-1)!.value).toBe(8);
  });

  it('reads a bar that does not say from the way it closed, as before', () => {
    chart.setData(bars(30).map(({ buyVolume: _bought, ...bar }) => bar));
    const id = chart.addIndicator('voldelta')!;
    expect(chart.getIndicatorOutput(id)!.series!.at(-1)!.value).toBe(10);
  });
});

describe('a bar replayed part of the way', () => {
  it('has the same part of what was bought as it has of the volume', () => {
    const bar: OHLCBar = { time: T0, open: 100, high: 104, low: 99, close: 103, volume: 90, buyVolume: 60 };
    const path = intrabarPath(bar);
    const half = formingAt(path, 0.5);
    expect(half.volume).toBeGreaterThan(0);
    expect(half.buyVolume! / half.volume).toBeCloseTo(60 / 90, 9);
    expect(formingAt(path, 1)).toEqual(bar);
    // Nothing traded yet: nothing bought.
    expect(formingAt(path, 0)).toEqual(expect.objectContaining({ volume: 0, buyVolume: 0 }));
    // A bar that does not say has no split at any point.
    const { buyVolume: _bought, ...plain } = bar;
    expect(formingAt(intrabarPath(plain), 0.5)).not.toHaveProperty('buyVolume');
  });
});

describe('Chart: a live trade that says who took it', () => {
  it('adds to what was bought in the forming bar, by the chart’s own tick method', () => {
    chart.setData(bars(30));
    const last = chart.getData().at(-1)!;
    chart.updateLastBarFromTick({ time: last.time + 1, price: 101, volume: 4, side: 'buy' });
    expect(chart.getData().at(-1)).toEqual(expect.objectContaining({ volume: 14, buyVolume: 7 }));
    chart.updateLastBarFromTick({ time: last.time + 2, price: 100, volume: 6, side: 'sell' });
    expect(chart.getData().at(-1)).toEqual(expect.objectContaining({ volume: 20, buyVolume: 7 }));
    // One that does not say leaves the bar with no split.
    chart.updateLastBarFromTick({ time: last.time + 3, price: 100, volume: 1 });
    expect(chart.getData().at(-1)).not.toHaveProperty('buyVolume');
  });

  it('starts the count in a bar that opened with nothing traded', () => {
    chart.setData(bars(30));
    const last = chart.getData().at(-1)!;
    chart.appendBar({ time: last.time + HOUR, open: 101, high: 101, low: 101, close: 101, volume: 0 });
    chart.updateLastBarFromTick({ time: last.time + HOUR + 1, price: 102, volume: 3, side: 'buy' });
    expect(chart.getData().at(-1)).toEqual(expect.objectContaining({ volume: 3, buyVolume: 3 }));
  });
});

describe('Chart: a bar that says what cannot be', () => {
  it('is kept without its split: more bought than traded, or no number', () => {
    const data = bars(30);
    data[5] = { ...data[5], buyVolume: 40 };
    data[6] = { ...data[6], buyVolume: Number.NaN };
    data[7] = { ...data[7], buyVolume: -2 };
    chart.setData(data);
    for (const i of [5, 6, 7]) expect(chart.getData()[i], String(i)).not.toHaveProperty('buyVolume');
    expect(chart.getData()[8].buyVolume).toBe(3);
  });
});
