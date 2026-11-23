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
