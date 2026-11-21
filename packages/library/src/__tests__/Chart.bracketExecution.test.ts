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
  it('goes to the adapter as an order, with its stop-loss and take-profit', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const orders: unknown[] = [];
    chart.on('bracketOrder', (e) => orders.push(e.payload));
    chart.connectExecution(broker);
    expect(chart.placesBrackets()).toBe(true);
    confirmSized();
    await flush();
    expect(broker.getOrders()).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 99, quantity: 2, stopLoss: 98, takeProfit: 101 })]);
    expect(chart.getOrders()).toHaveLength(1);
    expect(orders).toEqual([{ order: expect.objectContaining({ price: 99 }), bracket: expect.objectContaining({ side: 'buy', entry: 99 }) }]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('sends the chart’s own bracket with the quantity it was started with', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    chart.connectExecution(broker);
    expect(chart.startBracket('buy', 99, { quantity: 3 })).toBe(true);
    expect(chart.getBracket()).toEqual(expect.objectContaining({ side: 'buy', entry: 99, quantity: 3 }));
    expect(chart.confirmBracket()).toBe(true);
    await flush();
    expect(broker.getOrders()).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 99, quantity: 3 })]);
    expect(chart.getBracket()).toBeNull();
  });

  it('sizes a bracket by the money at risk, and takes a new size while it is placed', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    chart.connectExecution(broker);
    chart.startBracket('buy', 100, { risk: 50 }); // the stop a point away
    expect(chart.getBracket()?.quantity).toBe(50);
    chart.setBracketSize({ quantity: 2 });
    chart.confirmBracket();
    await flush();
    expect(broker.getOrders()).toEqual([expect.objectContaining({ quantity: 2 })]);
  });

  it('does not confirm a bracket with no quantity: it says why and keeps it, to be given one', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const errors: { command?: string; reason?: string }[] = [];
    const confirmed: unknown[] = [];
    chart.on('executionError', (e) => errors.push(e.payload));
    chart.on('bracketPlace', (e) => confirmed.push(e.payload));
    chart.connectExecution(broker);
    expect(confirmLong()).toBe(false);
    await flush();
    expect(broker.getOrders()).toEqual([]);
    expect(confirmed).toEqual([]);
    expect(errors).toEqual([expect.objectContaining({ command: 'bracketPlace', reason: 'noQuantity' })]);
    expect(chart.isBracketActive()).toBe(true);
    chart.setBracketSize({ quantity: 2 });
    expect(chart.confirmBracket()).toBe(true);
    await flush();
    expect(broker.getOrders()).toEqual([expect.objectContaining({ quantity: 2 })]);
  });

  it('keeps it on Enter too, as the key confirms what the method does', () => {
    chart.connectExecution(new PaperExecutionAdapter({ markPrice: 100 }));
    chart.startBracket('buy', 99);
    host.querySelector('canvas')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(chart.isBracketActive()).toBe(true);
  });

  it('still reports a sizeless bracket that reaches the wiring from elsewhere', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const errors: { reason?: string }[] = [];
    chart.on('executionError', (e) => errors.push(e.payload));
    chart.connectExecution(broker);
    (chart as unknown as { eventBus: { emit(type: string, payload: unknown): void } }).eventBus.emit('bracketPlace', {
      side: 'buy', entry: 99, stopLoss: 98, takeProfit: 101, riskReward: 2,
    });
    await flush();
    expect(errors).toEqual([expect.objectContaining({ reason: 'noQuantity' })]);
  });

  it('stays an event for an app that places it itself (brackets: event), and says nothing', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const errors: unknown[] = [];
    chart.on('executionError', (e) => errors.push(e.payload));
    chart.connectExecution(broker, { brackets: 'event' });
    expect(chart.placesBrackets()).toBe(false);
    confirmSized();
    expect(confirmLong()).toBe(true);
    await flush();
    expect(broker.getOrders()).toEqual([]);
    expect(errors).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('places nothing and says nothing with no adapter connected', () => {
    expect(chart.placesBrackets()).toBe(false);
    confirmLong();
    expect(warn).not.toHaveBeenCalled();
  });

  it('stops sending them once the adapter is disconnected', async () => {
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    chart.connectExecution(broker);
    chart.disconnectExecution();
    expect(chart.placesBrackets()).toBe(false);
    confirmSized();
    await flush();
    expect(broker.getOrders()).toEqual([]);
  });
});
