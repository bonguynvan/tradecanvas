// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FillEvent, OHLCBar } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100, volume: 1 }));
const flush = () => new Promise((r) => setTimeout(r, 0));

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

describe('Chart: an order that the paper account fills in parts', () => {
  it('stays on the chart with what has filled of it, each part a fill, until the last takes it off', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100, fillSize: 2 });
    const fills: FillEvent[] = [];
    chart.on('executionFill', (e) => fills.push(e.payload));
    chart.connectExecution(broker);
    chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 });
    await flush();
    expect(chart.getOrders()).toEqual([expect.objectContaining({ quantity: 5 })]);
    expect(chart.getOrders()[0].filledQuantity).toBeUndefined();

    broker.setMarkPrice(95);
    expect(chart.getOrders()).toEqual([expect.objectContaining({ quantity: 5, filledQuantity: 2 })]);
    expect(chart.getPositions()).toEqual([expect.objectContaining({ quantity: 2, entryPrice: 95 })]);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ quantity: 2, remaining: 3 }));

    broker.setMarkPrice(95);
    broker.setMarkPrice(95);
    expect(chart.getOrders()).toEqual([]);
    expect(chart.getPositions()).toEqual([expect.objectContaining({ quantity: 5 })]);
    expect(fills.map((fill) => fill.quantity)).toEqual([2, 2, 1]);
    expect(fills.at(-1)).not.toHaveProperty('remaining');
  });

  it('logs the order placed and each part filled, and no cancellation when the last part takes it off', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100, fillSize: 2 });
    chart.connectExecution(broker);
    chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 4 });
    await flush();
    broker.setMarkPrice(95);
    broker.setMarkPrice(95);
    expect(chart.getActivityLog().map((entry) => [entry.kind, entry.quantity])).toEqual([['placed', 4], ['filled', 2], ['filled', 2]]);
  });

  it('logs what was left cancelled when a part-filled order is taken off', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100, fillSize: 2 });
    chart.connectExecution(broker);
    chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 4 });
    await flush();
    broker.setMarkPrice(95);
    chart.cancelOrderIntent(chart.getOrders()[0].id);
    await flush();
    expect(chart.getActivityLog().map((entry) => entry.kind)).toEqual(['placed', 'filled', 'cancelled']);
    expect(chart.getPositions()).toEqual([expect.objectContaining({ quantity: 2 })]);
  });
});
