// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BracketPlacePayload, OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100, volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hourly(50));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart — a bracket started from a drawing’s levels', () => {
  it('starts at them, and reports them back with the quantity when placed', () => {
    const placed: BracketPlacePayload[] = [];
    chart.on('bracketPlace', (e) => placed.push(e.payload));
    expect(chart.startBracket('buy', 100, { stopLoss: 90, takeProfit: 120, quantity: 1.5 })).toBe(true);
    expect(chart.isBracketActive()).toBe(true);
    expect(chart.confirmBracket()).toBe(true);
    expect(placed).toEqual([{ side: 'buy', entry: 100, stopLoss: 90, takeProfit: 120, quantity: 1.5, riskReward: 2 }]);
  });
});
