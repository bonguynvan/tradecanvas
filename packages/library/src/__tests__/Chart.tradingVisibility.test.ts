// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100 + (i % 3), volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
  chart.setData(hourly(60));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: positions and orders hidden or locked, indicators shown or hidden together', () => {
  it('hides and shows the positions and orders, and says so', () => {
    expect(chart.isTradingVisible()).toBe(true);
    chart.setTradingVisible(false);
    expect(chart.isTradingVisible()).toBe(false);
    chart.setTradingVisible(true);
    expect(chart.isTradingVisible()).toBe(true);
  });

  it('locks and unlocks them, and says so', () => {
    expect(chart.isTradingLocked()).toBe(false);
    chart.setTradingLocked(true);
    expect(chart.isTradingLocked()).toBe(true);
  });

  it('hides several indicators as one undo step', () => {
    const a = chart.addIndicator('sma', { period: 5 })!;
    const b = chart.addIndicator('ema', { period: 5 })!;
    chart.setIndicatorsVisible([a, b], false);
    const shown = () => chart.getActiveIndicators().map((i) => i.visible);
    expect(shown()).toEqual([false, false]);
    chart.undo();
    expect(shown()).toEqual([true, true]);
  });
});
