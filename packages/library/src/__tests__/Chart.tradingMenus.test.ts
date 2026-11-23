// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartContextMenuPayload, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { PaperExecutionAdapter, PRICE_AXIS_ADD_STRIP } from '@tradecanvas/core';
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

  it('takes the click over a drawing’s body: a position’s zone reaching the axis does not swallow it', () => {
    const adds: { price: number }[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload as { price: number }));
    // Entry at 100, stop at 99, from bar 150 to past the last bar: the zone runs under the "+".
    const id = chart.addDrawing({ type: 'riskReward', anchors: [{ time: T0 + 150 * HOUR, price: 100 }, { time: T0 + 400 * HOUR, price: 99 }] });
    const { chartRect: plot, priceRange } = state();
    const y = plot.y + ((priceRange.max - 99.5) / (priceRange.max - priceRange.min)) * plot.height;
    mouse('mousedown', plot.x + plot.width - 8, y);
    mouse('mouseup', plot.x + plot.width - 8, y);
    expect(adds).toHaveLength(1);
    expect(adds[0].price).toBeCloseTo(99.5, 1);
    expect(chart.getSelectedDrawingId()).toBeNull();
    // Away from the strip the zone takes the click, as before.
    mouse('mousedown', plot.x + plot.width - 60, y);
    mouse('mouseup', plot.x + plot.width - 60, y);
    expect([adds.length, chart.getSelectedDrawingId()]).toEqual([1, id]);
  });

  it('leaves the eraser the drawing under it', () => {
    const adds: unknown[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload));
    chart.addDrawing({ type: 'riskReward', anchors: [{ time: T0 + 150 * HOUR, price: 100 }, { time: T0 + 400 * HOUR, price: 99 }] });
    const { chartRect: plot, priceRange } = state();
    const y = plot.y + ((priceRange.max - 99.5) / (priceRange.max - priceRange.min)) * plot.height;
    chart.setEraserMode(true);
    mouse('mousedown', plot.x + plot.width - 8, y);
    mouse('mouseup', plot.x + plot.width - 8, y);
    expect([adds.length, chart.getDrawings().length]).toEqual([0, 0]);
  });

  it('keeps the trading tags clear of it, and gives the room back when it is off', () => {
    const inset = () => (chart as unknown as { tradingManager: { tagInset: number } }).tradingManager.tagInset;
    expect(inset()).toBe(PRICE_AXIS_ADD_STRIP);
    chart.setPriceAxisAddButton(false);
    expect(inset()).toBe(0);
    chart.setPriceAxisAddButton(true);
    expect(inset()).toBe(PRICE_AXIS_ADD_STRIP);
  });

  it('follows setFeatures too, as ChartWidget turns it off and on', () => {
    const inset = () => (chart as unknown as { tradingManager: { tagInset: number } }).tradingManager.tagInset;
    const adds: unknown[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload));
    const plot = state().chartRect;
    chart.setFeatures({ priceAxisAddButton: false });
    mouse('mousedown', plot.x + plot.width - 8, plot.y + 40);
    mouse('mouseup', plot.x + plot.width - 8, plot.y + 40);
    expect([adds.length, inset()]).toEqual([0, 0]);
    chart.setFeatures({ priceAxisAddButton: true });
    expect(inset()).toBe(PRICE_AXIS_ADD_STRIP);
    // It rides on the crosshair.
    chart.setFeatures({ crosshair: false });
    expect(inset()).toBe(0);
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

describe('Chart crosshair while an order is dragged', () => {
  /** How many lines the crosshair draws now, and whether it writes a price on the axis. */
  const crosshairNow = () => {
    let lines = 0;
    const texts: string[] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => {
        if (key === 'lineTo') return () => { lines++; };
        if (key === 'fillText') return (text: string) => { texts.push(text); };
        if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
        return () => undefined;
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const handler = (chart as unknown as { crosshairHandler: { render(...a: unknown[]): void; renderAxisLabels(...a: unknown[]): void } }).crosshairHandler;
    const theme = (chart as unknown as { themeManager: { getTheme(): unknown } }).themeManager.getTheme();
    handler.render(ctx, state(), theme);
    // The labels' pills draw lines of their own: only the crosshair's count.
    const drawn = lines;
    handler.renderAxisLabels(ctx, state(), theme, chart.getData());
    return { lines: drawn, labels: texts.length };
  };

  it('draws no horizontal line and no price beside the line dragged, and both again once it is let go', () => {
    chart.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 100, quantity: 1, draggable: true }]);
    const moved: unknown[] = [];
    chart.on('orderModify', (e) => moved.push(e.payload));
    const plot = state().chartRect;
    const { min, max } = state().priceRange;
    const y = plot.y + ((max - 100) / (max - min)) * plot.height;
    const x = plot.x + plot.width / 2;
    mouse('mousemove', x, y);
    expect(crosshairNow()).toEqual({ lines: 2, labels: 2 });
    mouse('mousedown', x, y);
    mouse('mousemove', x, y - 30);
    // The vertical line and the time, not the price: the order's own tag has it.
    expect(crosshairNow()).toEqual({ lines: 1, labels: 1 });
    mouse('mouseup', x, y - 30);
    expect(moved).toHaveLength(1);
    expect(crosshairNow()).toEqual({ lines: 2, labels: 2 });
  });
});

describe('Chart: a price set by hand is a price of the market', () => {
  /** A market whose prices go in halves. */
  const halves = (price: number) => Math.abs(price * 2 - Math.round(price * 2)) < 1e-9;
  /** The y of `price` on the page. */
  const yOf = (price: number) => {
    const { chartRect: plot, priceRange } = state();
    return plot.y + ((priceRange.max - price) / (priceRange.max - priceRange.min)) * plot.height;
  };

  beforeEach(() => chart.setMarket({ type: 'stock', priceStep: 0.5 }));

  it('an order dragged lands on the market’s step, and so does its stop', () => {
    chart.setOrders([{ id: 'o1', side: 'buy', type: 'stopLimit', price: 100, stopPrice: 99, quantity: 1, draggable: true }]);
    const moved: { newPrice: number; newStopPrice?: number }[] = [];
    chart.on('orderModify', (e) => moved.push(e.payload as { newPrice: number; newStopPrice?: number }));
    const x = state().chartRect.x + state().chartRect.width / 2;
    mouse('mousemove', x, yOf(100));
    mouse('mousedown', x, yOf(100));
    mouse('mousemove', x, yOf(100) - 37);
    mouse('mouseup', x, yOf(100) - 37);
    expect(moved).toHaveLength(1);
    expect(moved[0].newPrice).not.toBe(100);
    expect(halves(moved[0].newPrice)).toBe(true);
    expect(moved[0].newStopPrice).toBe(moved[0].newPrice - 1);
  });

  it('the price of a right-click and of the "+" by the axis are on it too', () => {
    const menus: ChartContextMenuPayload[] = [];
    chart.on('chartContextMenu', (e) => menus.push(e.payload as ChartContextMenuPayload));
    const adds: { price: number }[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload as { price: number }));
    const plot = state().chartRect;
    mouse('contextmenu', plot.x + plot.width / 2, plot.y + 71, 2);
    mouse('contextmenu', plot.x + plot.width + 20, plot.y + 43, 2);
    mouse('mousemove', plot.x + plot.width / 2, plot.y + 97);
    mouse('mousedown', plot.x + plot.width - 8, plot.y + 97);
    mouse('mouseup', plot.x + plot.width - 8, plot.y + 97);
    expect(menus).toHaveLength(2);
    expect(menus.every((menu) => halves(menu.price!))).toBe(true);
    expect(adds).toHaveLength(1);
    expect(halves(adds[0].price)).toBe(true);
  });

  it('the crosshair writes the price under the pointer on the market’s step, as the "+" beside it gives it', () => {
    const plot = state().chartRect;
    const adds: { price: number }[] = [];
    chart.on('priceAxisAdd', (e) => adds.push(e.payload as { price: number }));
    mouse('mousemove', plot.x + plot.width / 2, plot.y + 97);
    const texts: string[] = [];
    const ctx = new Proxy({}, {
      get: (_, key) => (key === 'fillText' ? (text: string) => { texts.push(text); } : key === 'measureText' ? (text: string) => ({ width: text.length * 6 }) : () => undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const handler = (chart as unknown as { crosshairHandler: { renderAxisLabels(...a: unknown[]): void } }).crosshairHandler;
    const theme = (chart as unknown as { themeManager: { getTheme(): unknown } }).themeManager.getTheme();
    handler.renderAxisLabels(ctx, state(), theme, chart.getData());
    const written = Number(texts[0].replace(/,/g, ''));
    expect(halves(written)).toBe(true);
    mouse('mousedown', plot.x + plot.width - 8, plot.y + 97);
    mouse('mouseup', plot.x + plot.width - 8, plot.y + 97);
    expect(adds[0].price).toBe(written);
  });

  it('follows the market set later, and the decimals the axis shows with none', () => {
    chart.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 100, quantity: 1, draggable: true }]);
    const moved: { newPrice: number }[] = [];
    chart.on('orderModify', (e) => moved.push(e.payload as { newPrice: number }));
    const x = state().chartRect.x + state().chartRect.width / 2;
    const pull = (by: number) => {
      const from = yOf(chart.getOrders()[0].price);
      mouse('mousemove', x, from);
      mouse('mousedown', x, from);
      mouse('mousemove', x, from - by);
      mouse('mouseup', x, from - by);
    };
    chart.setMarket({ type: 'stock', priceStep: 0.25 });
    pull(41);
    expect(moved[0].newPrice * 4).toBeCloseTo(Math.round(moved[0].newPrice * 4), 9);
    expect(moved[0].newPrice).toBe(chart.roundPrice(moved[0].newPrice));
  });
});
