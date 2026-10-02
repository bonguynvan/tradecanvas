// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartContextMenuPayload, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100, volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;
const state = () => (chart as unknown as { viewport: { getState(): ViewportState } }).viewport.getState();
const mouse = (type: string, x: number, y: number, button = 0) =>
  host.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true }));

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick', features: { priceAxisAddButton: true } });
  chart.setData(hourly(200));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart right-click menu', () => {
  it('reports where a right-click landed, with its price and time, and keeps the browser’s menu shut', () => {
    const menus: ChartContextMenuPayload[] = [];
    chart.on('chartContextMenu', (e) => menus.push(e.payload as ChartContextMenuPayload));
    const plot = state().chartRect;
    const inPlot = !mouse('contextmenu', plot.x + plot.width / 2, plot.y + plot.height / 2, 2);
    const onAxis = !mouse('contextmenu', plot.x + plot.width + 20, plot.y + 40, 2);
    expect([inPlot, onAxis]).toEqual([true, true]); // default prevented
    expect(menus[0]).toMatchObject({ area: 'plot', price: expect.any(Number), time: expect.any(Number) });
    expect(menus[1]).toMatchObject({ area: 'priceAxis', price: expect.any(Number) });
    expect(menus[1].time).toBeUndefined();
  });

  it('leaves the browser its menu when nothing listens', () => {
    const plot = state().chartRect;
    expect(mouse('contextmenu', plot.x + 50, plot.y + 50, 2)).toBe(true); // not prevented
  });
});

describe('Chart "+" by the price axis', () => {
  it('reports the price a click on it is at', () => {
    const adds: { price: number }[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload as { price: number }));
    const plot = state().chartRect;
    mouse('mousedown', plot.x + plot.width - 8, plot.y + plot.height / 2);
    mouse('mouseup', plot.x + plot.width - 8, plot.y + plot.height / 2);
    expect(adds).toHaveLength(1);
    const { min, max } = state().priceRange;
    expect(adds[0].price).toBeCloseTo((min + max) / 2, 1);
  });

  it('can be turned off', () => {
    const adds: unknown[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload));
    chart.setPriceAxisAddButton(false);
    const plot = state().chartRect;
    mouse('mousedown', plot.x + plot.width - 8, plot.y + 40);
    mouse('mouseup', plot.x + plot.width - 8, plot.y + 40);
    expect(adds).toEqual([]);
  });
});

describe('Chart trading state and fills', () => {
  it('marks the execution adapter’s fills and lists its orders and positions', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    chart.connectExecution(adapter);
    const fills: unknown[] = [];
    chart.on('executionFill', (e) => fills.push(e.payload));
    chart.placeOrderIntent({ side: 'buy', type: 'market', price: 100, quantity: 1 });
    chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 105, quantity: 1 });
    await new Promise((r) => setTimeout(r, 0));
    expect(chart.getPositions()).toHaveLength(1);
    expect(chart.getOrders()).toHaveLength(1);
    expect(chart.getFills()).toHaveLength(1);
    expect(fills).toHaveLength(1);
    chart.cancelOrderIntent(chart.getOrders()[0].id);
    chart.closePositionIntent(chart.getPositions()[0].id);
    await new Promise((r) => setTimeout(r, 0));
    expect(chart.getOrders()).toEqual([]);
    expect(chart.getPositions()).toEqual([]);
    expect(chart.getFills().at(-1)).toMatchObject({ reason: 'close' });
  });
});
