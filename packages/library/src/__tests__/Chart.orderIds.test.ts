// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ExecutionErrorPayload, OHLCBar, OrderPlaceIntent, TradingOrder } from '@tradecanvas/commons';
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

const LIMIT = { side: 'buy', type: 'limit', price: 95, quantity: 1 } as const;

// An order went out with nothing to know it by: a broker could not tell a press sent twice from two orders, nor an app which order was refused.
describe('Chart: the id an order goes out with', () => {
  it('gives each order asked for an id of its own, and says which it sent', () => {
    const sent: OrderPlaceIntent[] = [];
    chart.on('orderPlace', (e) => sent.push(e.payload));
    const first = chart.placeOrderIntent(LIMIT);
    const second = chart.placeOrderIntent(LIMIT);
    expect(first?.clientOrderId).toBeTruthy();
    expect(second?.clientOrderId).toBeTruthy();
    expect(second?.clientOrderId).not.toBe(first?.clientOrderId);
    expect(sent).toEqual([first, second]);
    // The order asked for is not changed: the id is on what was sent.
    expect(LIMIT).not.toHaveProperty('clientOrderId');
  });

  it('keeps an id the app gave the order', () => {
    expect(chart.placeOrderIntent({ ...LIMIT, clientOrderId: 'mine-1' })?.clientOrderId).toBe('mine-1');
  });

  it('gives ids that another chart on the page does not', () => {
    const other = new Chart(sizedHost(800, 500), { chartType: 'candlestick', features: { trading: true } });
    const ids = new Set([chart.placeOrderIntent(LIMIT)?.clientOrderId, other.placeOrderIntent(LIMIT)?.clientOrderId]);
    other.destroy();
    expect(ids.size).toBe(2);
  });

  it('gives one to an order asked for on the chart itself: a draft dragged out and confirmed', () => {
    const sent: OrderPlaceIntent[] = [];
    chart.on('orderPlace', (e) => sent.push(e.payload));
    expect(chart.startOrderDraft('buy', 95)).toBe(true);
    expect(chart.confirmOrderDraft()).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].clientOrderId).toBeTruthy();
  });

  it('gives one to the order a confirmed bracket is sent as', async () => {
    const asked: OrderPlaceIntent[] = [];
    const broker = new PaperExecutionAdapter({ markPrice: 100 });
    const place = broker.placeOrder.bind(broker);
    broker.placeOrder = (intent) => {
      asked.push(intent);
      return place(intent);
    };
    chart.connectExecution(broker);
    chart.startBracket('buy', 99, { quantity: 1 });
    chart.confirmBracket();
    await flush();
    expect(asked).toHaveLength(1);
    expect(asked[0].clientOrderId).toBeTruthy();
  });

  it('sends nothing, and says so, with trading off', () => {
    const plain = new Chart(sizedHost(800, 500), { chartType: 'candlestick', features: { trading: false } });
    expect(plain.placeOrderIntent(LIMIT)).toBeNull();
    plain.destroy();
  });
});

describe('Chart: what became of an order an adapter was asked for', () => {
  it('says the adapter took it, with the order it made of it', async () => {
    const taken: { intent: OrderPlaceIntent; order: TradingOrder }[] = [];
    chart.on('orderPlaced', (e) => taken.push(e.payload));
    chart.connectExecution(new PaperExecutionAdapter({ markPrice: 100 }));
    const sent = chart.placeOrderIntent(LIMIT);
    await flush();
    expect(taken).toHaveLength(1);
    expect(taken[0].intent).toEqual(sent);
    expect(taken[0].order).toMatchObject({ side: 'buy', type: 'limit', price: 95 });
    expect(chart.getOrders().map((order) => order.id)).toEqual([taken[0].order.id]);
  });

  it('names the order a refusal is of', async () => {
    const errors: ExecutionErrorPayload[] = [];
    chart.on('executionError', (e) => errors.push(e.payload));
    const taken: unknown[] = [];
    chart.on('orderPlaced', (e) => taken.push(e.payload));
    chart.connectExecution(new PaperExecutionAdapter({ markPrice: 100 }));
    // Good till a date, with no date: the paper account refuses it.
    const sent = chart.placeOrderIntent({ ...LIMIT, timeInForce: 'gtd' });
    await flush();
    expect(taken).toEqual([]);
    expect(errors).toEqual([expect.objectContaining({ command: 'orderPlace', clientOrderId: sent?.clientOrderId })]);
  });

  it('says nothing of an order with no adapter to take it: it is the app’s', async () => {
    const taken: unknown[] = [];
    chart.on('orderPlaced', (e) => taken.push(e.payload));
    chart.placeOrderIntent(LIMIT);
    await flush();
    expect(taken).toEqual([]);
  });
});
