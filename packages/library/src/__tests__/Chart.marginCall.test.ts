// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FillEvent, MarginCall, OHLCBar } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
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
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
  chart.setData(hourly(50));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: an account that is warned of its margin and stopped out', () => {
  it('passes the margin call on as its own event, and the stop-out as a fill', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100, balance: 1000, leverage: 10, marginCallLevel: 1, stopOutLevel: 0.5 });
    const calls: MarginCall[] = [];
    const fills: FillEvent[] = [];
    chart.on('marginCall', (e) => calls.push(e.payload));
    chart.on('executionFill', (e) => fills.push(e.payload));
    chart.connectExecution(broker);
    await broker.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 50 });
    expect(chart.getAccount()).toEqual(expect.objectContaining({ marginLevel: 2 }));

    broker.setMarkPrice(89);
    expect(calls).toEqual([{ marginLevel: 0.9, level: 1, equity: 450, marginUsed: 500 }]);
    expect(chart.getPositions()).toHaveLength(1);

    broker.setMarkPrice(84);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'liquidation', price: 84, quantity: 50, pnl: -800 }));
    expect(chart.getPositions()).toEqual([]);
    expect(chart.getAccount()).not.toHaveProperty('marginLevel');
  });

  it('says nothing of the margin of an account that was unwired', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100, balance: 1000, leverage: 10, marginCallLevel: 1 });
    const calls: MarginCall[] = [];
    chart.on('marginCall', (e) => calls.push(e.payload));
    chart.connectExecution(broker);
    await broker.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 50 });
    chart.disconnectExecution();
    broker.setMarkPrice(89);
    expect(calls).toEqual([]);
  });
});
