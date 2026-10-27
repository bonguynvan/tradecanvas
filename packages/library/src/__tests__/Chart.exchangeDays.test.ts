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

  it('start at the zone the feed names later once the chart loads the symbol again, never mixed with the UTC days', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let asks = 0;
    // Down the first time it is asked.
    const feed = vnFeed(async (symbol) => {
      if (++asks === 1) throw new Error('down');
      return { symbol, timeZone: VN };
    });
    // BBB's bars never come: the chart goes back to AAA with AAA's days still on screen,
    // older than the ones it loads then (as days paged in would be).
    let loads = 0;
    feed.fetchHistory = async (symbol) => {
      if (symbol === 'BBB') return new Promise(() => {});
      const first = loads++ === 0;
      return vnHours().filter((b) => first || b.time >= Date.UTC(2026, 9, 21));
    };
    const startHours = () => [...new Set(chart.getData().map((b) => (b.time % (24 * HOUR)) / HOUR))];
    await chart.connect({ adapter: feed, symbol: 'AAA', timeframe: '1d' });
    expect(startHours()).toEqual([0]);
    void chart.switchStream('BBB', '1d');
    await chart.switchStream('AAA', '1d');
    expect(startHours()).toEqual([17]); // 00:00 in Ho Chi Minh City
  });

  it('keep the bars on screen and the view when the chart comes back to the symbol, its days in the same zone', async () => {
    /** Sixty days of hours from 1 August 2026. */
    const hours: OHLCBar[] = Array.from({ length: 60 * 24 }, (_, i) => ({ time: Date.UTC(2026, 7, 1) + i * HOUR, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));
    const feed = vnFeed(async (symbol) => ({ symbol, timeZone: VN }));
    // BBB's bars never come: the chart goes back to AAA, whose next load holds only its last ten days.
    let loads = 0;
    feed.fetchHistory = async (symbol, _tf, limit) => {
      if (symbol === 'BBB') return new Promise(() => {});
      return loads++ === 0 ? hours.slice(-(limit ?? 500)) : hours.slice(-10 * 24);
    };
    await chart.connect({ adapter: feed, symbol: 'AAA', timeframe: '4h' });
    const shown = chart.getData().length;
    chart.scrollBars(-50);
    const view = chart.getVisibleTimeRange();
    void chart.switchStream('BBB', '4h');
    await chart.switchStream('AAA', '4h');
    expect(chart.getData()).toHaveLength(shown);
    expect(chart.getVisibleTimeRange()).toEqual(view);
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

  describe('dates the days built at the exchange’s midnight, shown in UTC', () => {
    // 20 to 23 October 2026 in Ho Chi Minh City: each starts at 17:00 UTC the day before.
    const vnDays = (): OHLCBar[] => [19, 20, 21, 22].map((d) => ({ time: Date.UTC(2026, 9, d, 17), open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));

    beforeEach(() => {
      chart.setMarket(MARKET_HOSE);
      chart.setTimeZone('UTC');
      chart.setData(vnDays());
    });

    it('in the tooltip Alt-click pins', () => {
      type Inside = { interactionManager: { onAltClick(pos: { x: number; y: number }): void }; viewport: { getState(): { offset: number; barWidth: number; barSpacing: number } } };
      const inside = chart as unknown as Inside;
      const vp = inside.viewport.getState();
      inside.interactionManager.onAltClick({ x: 3 * (vp.barWidth + vp.barSpacing) - vp.offset, y: 10 });
      expect(host.textContent).toContain('10/23/2026');
    });

    it('to a screen reader', () => {
      host.focus();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', bubbles: true }));
      expect(host.querySelector('.tc-sr-live')?.textContent).toMatch(/^Oct 23, 2026: open/);
    });
  });
});
