// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MARKET_CRYPTO, MARKET_HOSE, MARKET_VN30F, type TradingConfig } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

let host: HTMLDivElement;
let chart: Chart;

const tradingConfig = () => (chart as unknown as { tradingManager: { config: TradingConfig } }).tradingManager.config;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
});

afterEach(() => {
  chart.destroy();
  host.remove();
});

// The tags on the chart wrote a profit as price times quantity on every market: 2.0 on a
// futures position the account panel had at 200,000 dong.
describe('Chart: the amounts on its trading tags', () => {
  it('are counted by the market’s multiplier, and by none once the market has none', () => {
    expect(tradingConfig().amountMultiplier).toBeUndefined();
    chart.setMarket(MARKET_VN30F);
    expect(tradingConfig().amountMultiplier).toBe(100_000);
    chart.setMarket(MARKET_HOSE);
    expect(tradingConfig().amountMultiplier).toBe(1000);
    chart.setMarket(MARKET_CRYPTO);
    expect(tradingConfig().amountMultiplier).toBeUndefined();
  });
});

// An account built with no multiplier counted a share at its figure while the chart and the panel
// counted it a thousand times that: one position, two profits.
describe('Chart: the account connected to it', () => {
  const said = (adapter: PaperExecutionAdapter) => (adapter as unknown as { multiplier: number }).multiplier;

  it('is told the market’s multiplier, when connected and when the market changes', () => {
    chart.setMarket(MARKET_HOSE);
    const adapter = new PaperExecutionAdapter({ markPrice: 26.4, balance: 100_000_000 });
    chart.connectExecution(adapter);
    expect(said(adapter)).toBe(1000);
    chart.setMarket(MARKET_VN30F);
    expect(said(adapter)).toBe(100_000);
    chart.setMarket(MARKET_CRYPTO);
    expect(said(adapter)).toBe(1);
  });

  it('sizes a bracket by risk in the market’s money', () => {
    chart.setData(Array.from({ length: 30 }, (_, i) => ({ time: Date.UTC(2025, 0, 1) + i * 3_600_000, open: 26.4, high: 26.6, low: 26.2, close: 26.4, volume: 1 })));
    chart.setMarket(MARKET_HOSE);
    const started: unknown[] = [];
    const manager = (chart as unknown as { tradingManager: { startBracket(...args: unknown[]): void } }).tradingManager;
    manager.startBracket = (...args: unknown[]) => { started.push(args[2]); };
    chart.startBracket('buy', 26.4, { risk: 5_000_000 });
    expect(started[0]).toEqual({ risk: 5_000_000, multiplier: 1000 });
    // One given is the host's own.
    chart.startBracket('buy', 26.4, { risk: 5_000_000, multiplier: 1 });
    expect(started[1]).toEqual({ risk: 5_000_000, multiplier: 1 });
    // A quantity is a quantity: nothing added.
    chart.startBracket('buy', 26.4, { quantity: 200 });
    expect(started[2]).toEqual({ quantity: 200 });
  });
});

// Looking at another market revalued what was open: +100,000 dong read +100, and was booked so.
describe('Chart: a position open while the chart’s market changes', () => {
  it('keeps its worth, its margin and the profit it books', async () => {
    chart.setMarket(MARKET_HOSE);
    const adapter = new PaperExecutionAdapter({ markPrice: 26.4, balance: 10_000_000 });
    chart.connectExecution(adapter);
    await adapter.placeOrder({ side: 'buy', type: 'market', quantity: 100, price: 26.4 });
    adapter.setMarkPrice(27.4);
    expect(adapter.getAccount()!.unrealisedPnl).toBeCloseTo(100_000, 6);

    chart.setMarket(MARKET_CRYPTO);
    expect(adapter.getAccount()!.unrealisedPnl).toBeCloseTo(100_000, 6);
    expect(adapter.getAccount()!.marginUsed).toBe(2_640_000);
    chart.setMarket(MARKET_VN30F);
    expect(adapter.getAccount()!.marginUsed).toBe(2_640_000);
    expect(adapter.getPositions()[0].multiplier).toBe(1000);

    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getAccount()!.balance).toBeCloseTo(10_100_000, 6);
  });
});

// The chart said its multiplier and sent the order a moment later: orders sent in one turn all
// took what was said last.
describe('Chart: orders sent in the same turn', () => {
  const settled = () => new Promise((r) => setTimeout(r, 0));

  it('are each counted at their own chart’s market, on one account', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100, balance: 1_000_000_000_000 });
    const others = [sizedHost(800, 500), sizedHost(800, 500)].map((el) => new Chart(el, { chartType: 'candlestick', features: { trading: true } }));
    const charts = [chart, ...others];
    const markets = [MARKET_HOSE, MARKET_VN30F, MARKET_CRYPTO];
    charts.forEach((c, i) => { c.setMarket(markets[i]); c.connectExecution(adapter); });
    for (const c of charts) c.placeOrderIntent({ side: 'buy', type: 'market', price: 100, quantity: 1 });
    await settled();
    expect(adapter.getPositions().map((p) => p.multiplier)).toEqual([1000, 100_000, 1]);
    adapter.setMarkPrice(101);
    expect(adapter.getAccount()!.unrealisedPnl).toBeCloseTo(101_001, 6);
    for (const c of others) c.destroy();
  });

  it('is counted at the market it was sent on, when the market changes right after', async () => {
    chart.setMarket(MARKET_HOSE);
    const adapter = new PaperExecutionAdapter({ markPrice: 26.4, balance: 10_000_000 });
    chart.connectExecution(adapter);
    chart.placeOrderIntent({ side: 'buy', type: 'market', price: 26.4, quantity: 100 });
    chart.setMarket(MARKET_CRYPTO);
    await settled();
    expect(adapter.getPositions()[0].multiplier).toBe(1000);
    expect(adapter.getAccount()!.marginUsed).toBe(2_640_000);
  });
});

// A confirmed bracket's order is made by the wiring, not sent by the chart: it took whatever
// multiplier was said last.
describe('Chart: a bracket confirmed', () => {
  const settled = () => new Promise((r) => setTimeout(r, 0));
  const bars = (price: number) => Array.from({ length: 30 }, (_, i) => ({ time: Date.UTC(2025, 0, 1) + i * 3_600_000, open: price, high: price + 0.2, low: price - 0.2, close: price, volume: 1 }));

  it('is counted at its own chart’s market, on one account with others', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100, balance: 1_000_000_000_000 });
    const others = [sizedHost(800, 500), sizedHost(800, 500)].map((el) => new Chart(el, { chartType: 'candlestick', features: { trading: true } }));
    const charts = [chart, ...others];
    const markets = [MARKET_HOSE, MARKET_VN30F, MARKET_CRYPTO];
    charts.forEach((c, i) => { c.setData(bars(100)); c.setMarket(markets[i]); c.connectExecution(adapter); });
    for (const c of charts) {
      expect(c.startBracket('buy', 100, { quantity: 1 })).toBe(true);
      expect(c.confirmBracket()).toBe(true);
    }
    await settled();
    adapter.setMarkPrice(100);
    await settled();
    expect(adapter.getPositions().map((p) => p.multiplier)).toEqual([1000, 100_000, 1]);
    for (const c of others) c.destroy();
  });

  it('is counted at the market it was confirmed on, when the market changes right after', async () => {
    chart.setData(bars(26.4));
    chart.setMarket(MARKET_HOSE);
    const adapter = new PaperExecutionAdapter({ markPrice: 26.4, balance: 10_000_000 });
    chart.connectExecution(adapter);
    chart.startBracket('buy', 26.4, { quantity: 100 });
    chart.confirmBracket();
    chart.setMarket(MARKET_CRYPTO);
    await settled();
    adapter.setMarkPrice(26.4);
    await settled();
    expect(adapter.getPositions()[0].multiplier).toBe(1000);
    expect(adapter.getAccount()!.marginUsed).toBe(2_640_000);
  });
});

// What a price is worth is the chart's business and the paper account's: a broker's adapter that
// passes the order on as it came must find nothing on it that the chart added for that.
describe('Chart: the order an adapter is given', () => {
  it('has no multiplier on it, which comes beside it', async () => {
    chart.setMarket(MARKET_HOSE);
    const adapter = new PaperExecutionAdapter({ markPrice: 26.4, balance: 10_000_000 });
    const given: unknown[][] = [];
    const place = adapter.placeOrder.bind(adapter);
    adapter.placeOrder = (...args: Parameters<typeof place>) => { given.push(args); return place(...args); };
    chart.connectExecution(adapter);
    chart.placeOrderIntent({ side: 'buy', type: 'market', price: 26.4, quantity: 100 });
    await new Promise((r) => setTimeout(r, 0));
    expect(given[0][0]).not.toHaveProperty('multiplier');
    expect(given[0][1]).toEqual({ multiplier: 1000 });
  });
});
