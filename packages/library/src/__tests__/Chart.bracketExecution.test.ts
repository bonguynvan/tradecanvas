// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
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
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
  chart.setData(hourly(50));
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Start a long bracket at 99 and confirm it: one from the chart's own draft, with no quantity. */
const confirmLong = () => {
  chart.startBracket('buy', 99);
  return chart.confirmBracket();
};
/** A confirmed long bracket at 99 for 2 units, as one with a quantity reaches the chart's event. */
const confirmSized = () =>
  (chart as unknown as { eventBus: { emit(type: string, payload: unknown): void } }).eventBus.emit('bracketPlace', {
    side: 'buy', entry: 99, stopLoss: 98, takeProfit: 101, quantity: 2, riskReward: 2,
  });

describe('Chart: a confirmed bracket and the execution adapter', () => {
  it('goes to the adapter as an order, with its stop-loss and take-profit, when connected with brackets: place', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const orders: unknown[] = [];
    chart.on('bracketOrder', (e) => orders.push(e.payload));
    chart.connectExecution(broker, { brackets: 'place' });
    expect(chart.placesBrackets()).toBe(true);
    confirmSized();
    await flush();
    expect(broker.getOrders()).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 99, quantity: 2, stopLoss: 98, takeProfit: 101 })]);
    expect(chart.getOrders()).toHaveLength(1);
    expect(orders).toEqual([{ order: expect.objectContaining({ price: 99 }), bracket: expect.objectContaining({ side: 'buy', entry: 99 }) }]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('sends none of the chart’s own brackets yet, as they have no quantity, and says why', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const errors: { command?: string; reason?: string }[] = [];
    chart.on('executionError', (e) => errors.push(e.payload));
    chart.connectExecution(broker, { brackets: 'place' });
    expect(confirmLong()).toBe(true);
    await flush();
    expect(broker.getOrders()).toEqual([]);
    expect(errors).toEqual([expect.objectContaining({ command: 'bracketPlace', reason: 'noQuantity' })]);
  });

  it('stays an event without it, and says once that it was not sent', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    chart.connectExecution(broker);
    expect(chart.placesBrackets()).toBe(false);
    confirmLong();
    confirmLong();
    await flush();
    expect(broker.getOrders()).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("brackets: 'place'");
  });

  it('says nothing when the app asked for the event', async () => {
    chart.connectExecution(new PaperExecutionAdapter({ markPrice: 100 }), { brackets: 'event' });
    confirmLong();
    await flush();
    expect(warn).not.toHaveBeenCalled();
  });

  it('places nothing and says nothing with no adapter connected', () => {
    expect(chart.placesBrackets()).toBe(false);
    confirmLong();
    expect(warn).not.toHaveBeenCalled();
  });

  it('stops sending them once the adapter is disconnected', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    chart.connectExecution(broker, { brackets: 'place' });
    chart.disconnectExecution();
    expect(chart.placesBrackets()).toBe(false);
    confirmSized();
    await flush();
    expect(broker.getOrders()).toEqual([]);
  });
});
