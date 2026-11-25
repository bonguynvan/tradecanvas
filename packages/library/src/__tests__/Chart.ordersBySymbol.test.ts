// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FillEvent, OHLCBar, TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { MockAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2025, 0, 1);
const bars: OHLCBar[] = Array.from({ length: 120 }, (_, i) => ({
  time: T0 + i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 3), volume: 5,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** What the chart draws: the engine's own orders, positions and fills, by their ids. */
const drawn = () => {
  const engine = (chart as unknown as { tradingManager: { getOrders(): TradingOrder[]; getPositions(): TradingPosition[]; getFills(): FillEvent[] } }).tradingManager;
  return { orders: engine.getOrders().map((o) => o.id), positions: engine.getPositions().map((p) => p.id), fills: engine.getFills().map((f) => f.orderId) };
};
const LONG: TradingPosition = { id: 'p1', side: 'buy', entryPrice: 100, quantity: 1, symbol: 'AAA' };
const LIMIT: TradingOrder = { id: 'o1', side: 'buy', type: 'limit', price: 95, quantity: 1, symbol: 'AAA' };
const FILL: FillEvent = { orderId: 'f1', side: 'buy', price: 100, quantity: 1, time: T0, pnl: 3 };

// A long of BTC stayed on the chart when the symbol became ETHUSDT, its profit worked out from ETH's price.
describe('Chart: an account that trades more than the symbol shown', () => {
  beforeEach(async () => {
    await chart.connect({ adapter: new MockAdapter({ historySize: 50 }), symbol: 'AAA', timeframe: '1m' });
  });

  it('draws a position, an order and a fill on their own symbol, and keeps them in the account on another', async () => {
    chart.setPositions([LONG]);
    chart.setOrders([LIMIT]);
    chart.addFill(FILL);
    expect(drawn()).toEqual({ orders: ['o1'], positions: ['p1'], fills: ['f1'] });
    await chart.switchStream('BBB', '1m');
    expect(drawn()).toEqual({ orders: [], positions: [], fills: [] });
    expect(chart.getPositions()).toEqual([LONG]);
    expect(chart.getOrders()).toEqual([LIMIT]);
    // The fill named no symbol: it is of the one the chart showed as it came.
    expect(chart.getFills()).toEqual([{ ...FILL, symbol: 'AAA' }]);
    // Back on its symbol, it is drawn again.
    await chart.switchStream('AAA', '1m');
    expect(drawn()).toEqual({ orders: ['o1'], positions: ['p1'], fills: ['f1'] });
  });

  it('draws what names another symbol on that symbol only, whichever is shown as it is told', async () => {
    chart.setPositions([LONG, { ...LONG, id: 'p2', symbol: 'BBB' }]);
    expect(drawn().positions).toEqual(['p1']);
    await chart.switchStream('BBB', '1m');
    expect(drawn().positions).toEqual(['p2']);
  });

  it('draws what names no symbol on whatever it shows, and gives it none: it is never kept off the chart of its own on a guess', async () => {
    const unnamed: TradingPosition = { id: 'p9', side: 'sell', entryPrice: 100, quantity: 1 };
    const { symbol: _symbol, ...unnamedOrder } = { ...LIMIT, id: 'o9' };
    chart.setPositions([unnamed]);
    chart.setOrders([unnamedOrder]);
    await chart.switchStream('BBB', '1m');
    expect(drawn()).toMatchObject({ orders: ['o9'], positions: ['p9'] });
    expect(chart.getPositions()).toEqual([unnamed]);
  });

  it('takes a fill for its position’s symbol, whatever is shown as it comes', async () => {
    chart.setPositions([LONG]);
    await chart.switchStream('BBB', '1m');
    chart.addFill({ ...FILL, orderId: 'stop', positionId: 'p1', reason: 'stopLoss' });
    expect(drawn().fills).toEqual([]);
    expect(chart.getFills()[0].symbol).toBe('AAA');
  });

  it('tells its events of every order and position, as they were given, and none of a change of symbol', async () => {
    const told: unknown[] = [];
    chart.on('positionsChange', (e) => told.push(e.payload.positions));
    chart.on('ordersChange', (e) => told.push(e.payload.orders));
    chart.on('executionFill', (e) => told.push(e.payload));
    const other = { ...LONG, id: 'p2', symbol: 'BBB' };
    chart.setPositions([LONG, other]);
    chart.setOrders([LIMIT]);
    chart.addFill(FILL);
    expect(told).toEqual([[LONG, other], [LIMIT], { ...FILL, symbol: 'AAA' }]);
    await chart.switchStream('BBB', '1m');
    expect(told).toHaveLength(3);
  });

  it('sums the profit realised of every symbol', async () => {
    chart.addFill(FILL);
    await chart.switchStream('BBB', '1m');
    chart.addFill({ ...FILL, orderId: 'f2', pnl: -1 });
    expect(chart.getRealisedPnl()).toBe(2);
    chart.clearFills();
    expect(chart.getRealisedPnl()).toBe(0);
    expect(chart.getFills()).toEqual([]);
  });

  it('says which symbol it shows', async () => {
    expect(chart.getSymbol()).toBe('AAA');
    await chart.switchStream('BBB', '1m');
    expect(chart.getSymbol()).toBe('BBB');
  });

  it('keeps no order or position of any symbol once trading is switched off', async () => {
    chart.setPositions([LONG]);
    chart.setOrders([LIMIT]);
    await chart.switchStream('BBB', '1m');
    chart.setFeatures({ trading: false });
    expect(chart.getPositions()).toEqual([]);
    expect(chart.getOrders()).toEqual([]);
    chart.setFeatures({ trading: true });
    await chart.switchStream('AAA', '1m');
    expect(drawn()).toMatchObject({ orders: [], positions: [] });
  });

  it('names the symbol it shows on an order asked for, unless the order names another', () => {
    expect(chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 1 })?.symbol).toBe('AAA');
    expect(chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 1, symbol: 'ZZZ' })?.symbol).toBe('ZZZ');
  });
});

describe('Chart: bars set by hand', () => {
  beforeEach(() => chart.setData(bars));

  it('draws everything it is told while no symbol is said for them, as before, and names none on an order', () => {
    chart.setPositions([LONG, { ...LONG, id: 'p2', symbol: 'BBB' }]);
    chart.setOrders([LIMIT]);
    chart.addFill(FILL);
    expect(drawn()).toEqual({ orders: ['o1'], positions: ['p1', 'p2'], fills: ['f1'] });
    expect(chart.getFills()[0]).not.toHaveProperty('symbol');
    expect(chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 1 })).not.toHaveProperty('symbol');
    expect(chart.getSymbol()).toBe('');
  });

  it('draws those of the symbol said for them (setSymbol), and names it on an order', () => {
    chart.setPositions([LONG, { ...LONG, id: 'p2', symbol: 'BBB' }]);
    chart.setOrders([LIMIT]);
    chart.setSymbol('BBB');
    expect(chart.getSymbol()).toBe('BBB');
    expect(drawn()).toMatchObject({ orders: [], positions: ['p2'] });
    expect(chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 1 })?.symbol).toBe('BBB');
    chart.setSymbol('AAA');
    expect(drawn()).toMatchObject({ orders: ['o1'], positions: ['p1'] });
    // Taken back: everything is drawn.
    chart.setSymbol('');
    expect(drawn().positions).toEqual(['p1', 'p2']);
  });
});
