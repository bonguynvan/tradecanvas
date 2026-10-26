// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar, SymbolInfo, TimeFrame } from '@tradecanvas/commons';
import { MARKET_HOSE } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const VN = 'Asia/Ho_Chi_Minh';
const HOUR = 3_600_000;

/** Hourly bars of 19 to 23 October 2026, 08:00 to 13:00 in Ho Chi Minh City (01:00 to 06:00 UTC). */
function vnHours(): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (let d = 19; d <= 23; d++) {
    for (let h = 1; h <= 6; h++) out.push({ time: Date.UTC(2026, 9, d, h), open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });
  }
  return out;
}

/** A feed of hours only, in Ho Chi Minh City's zone. */
function vnFeed(resolveSymbol: (symbol: string) => Promise<SymbolInfo | null>): DataAdapter {
  return {
    name: 'vn',
    supportedTimeframes: ['1h'] as TimeFrame[],
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: async (_s: string, _tf: TimeFrame, limit?: number) => vnHours().slice(-(limit ?? 500)),
    resolveSymbol,
    on: () => {},
    off: () => {},
    dispose: () => {},
  };
}

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart bars a feed’s hours build', () => {
  it('start 4h bars at the exchange’s midnight, and ask the feed about the symbol once', async () => {
    const resolveSymbol = vi.fn(async (symbol: string) => ({ symbol, timeZone: VN }));
    await chart.connect({ adapter: vnFeed(resolveSymbol), symbol: 'VN30F1M', timeframe: '4h', historyLimit: 50 });
    const times = [...new Set(chart.getData().map((b) => b.time % (24 * HOUR)))];
    expect(times).toEqual([1 * HOUR, 5 * HOUR]); // 08:00 and 12:00 there
    await vi.waitFor(() => expect(chart.getExchangeTimeZone()).toBe(VN));
    expect(resolveSymbol).toHaveBeenCalledTimes(1);
  });
});

describe('Chart.setMarket', () => {
  it('says the market changed', () => {
    const seen: unknown[] = [];
    chart.on('marketChange', (e) => seen.push(e.payload));
    chart.setMarket(MARKET_HOSE);
    expect(seen).toEqual([{ market: MARKET_HOSE }]);
  });

  it('dates the days on the axis, the crosshair and the card in the market’s zone', () => {
    type Parts = Record<'timeAxis' | 'crosshairHandler' | 'crosshairTooltip', { exchangeZone: string | null }>;
    const parts = chart as unknown as Parts;
    chart.setMarket(MARKET_HOSE);
    expect([parts.timeAxis.exchangeZone, parts.crosshairHandler.exchangeZone, parts.crosshairTooltip.exchangeZone]).toEqual([VN, VN, VN]);
    chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' });
    expect(parts.timeAxis.exchangeZone).toBe('America/New_York');
  });
});
