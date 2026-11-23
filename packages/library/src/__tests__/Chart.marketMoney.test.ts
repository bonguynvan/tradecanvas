// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MARKET_CRYPTO, MARKET_HOSE, MARKET_VN30F, type TradingConfig } from '@tradecanvas/commons';
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
