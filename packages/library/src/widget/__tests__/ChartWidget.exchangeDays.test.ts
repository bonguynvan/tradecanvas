// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, MarketConfig, OHLCBar, SymbolInfo } from '@tradecanvas/commons';
import { MARKET_HOSE } from '@tradecanvas/commons';
import { VWAPIndicator } from '@tradecanvas/core';

type Handler = (e: { type: string; payload: unknown }) => void;

/** Stand-in for the canvas-backed Chart: the bars it is given, the exchange's zone, its events. */
class FakeChart {
  static last: FakeChart;
  data: OHLCBar[] = [];
  symbolZone: string | null = null;
  marketZone: string | null = null;
  private handlers = new Map<string, Handler[]>();

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  on(event: string, handler: Handler): () => void {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return () => {};
  }
  private fire(event: string, payload: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) handler({ type: event, payload });
  }
  setData(data: OHLCBar[]): void { this.data = data; }
  getData(): OHLCBar[] { return this.data; }
  getExchangeTimeZone(): string | null { return this.symbolZone ?? this.marketZone; }
  setSymbolInfo(info: SymbolInfo | null): void {
    this.symbolZone = info?.timeZone ?? null;
    this.fire('symbolInfoChange', { info });
  }
  setMarket(market: MarketConfig): void {
    this.marketZone = market.timeZone ?? null;
    this.fire('marketChange', { market });
  }
  /** No view to keep: ChartWidget.zoneRebuildView.test.ts checks it on a real chart. */
  getVisibleTimeRange(): null { return null; }
  getPlotRect() { return { x: 0, y: 0, width: 1100, height: 500 }; }
  getActiveIndicators(): unknown[] { return []; }
  getAlerts(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Hourly bars of 19 to 23 October 2026, 09:00 to 14:00 in Ho Chi Minh City (02:00 to 07:00 UTC). */
function vnHours(): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (let d = 19; d <= 23; d++) {
    for (let h = 2; h <= 7; h++) out.push({ time: Date.UTC(2026, 9, d, h), open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });
  }
  return out;
}
const timesOfDay = () => [...new Set(FakeChart.last.data.map((b) => b.time % DAY))];

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget.destroy();
  host.remove();
});

describe('ChartWidget days built from its bars', () => {
  it('starts them at the exchange’s midnight', () => {
    widget = new ChartWidget(host, { symbol: 'FPT', timeframe: '1d', watchlist: false });
    FakeChart.last.symbolZone = 'Asia/Ho_Chi_Minh';
    widget.setData(vnHours());
    expect(FakeChart.last.data).toHaveLength(5);
    expect(timesOfDay()).toEqual([17 * HOUR]);
  });

  it('starts them at UTC’s midnight when no zone is known', () => {
    widget = new ChartWidget(host, { symbol: 'FPT', timeframe: '1d', watchlist: false });
    widget.setData(vnHours());
    expect(timesOfDay()).toEqual([0]);
  });

  it('builds them again when the symbol’s zone comes after the bars', () => {
    widget = new ChartWidget(host, { symbol: 'FPT', timeframe: '1d', watchlist: false });
    widget.setData(vnHours());
    FakeChart.last.setSymbolInfo({ symbol: 'FPT', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(timesOfDay()).toEqual([17 * HOUR]);
  });

  it('builds them again when the market set after the bars names a zone', () => {
    widget = new ChartWidget(host, { symbol: 'FPT', timeframe: '1d', watchlist: false });
    widget.setData(vnHours());
    widget.getChart().setMarket(MARKET_HOSE);
    expect(timesOfDay()).toEqual([17 * HOUR]);
  });

  it('leaves bars it builds that start where they did in any zone as they are: 15m from minutes', () => {
    widget = new ChartWidget(host, { symbol: 'FPT', timeframe: '15m', watchlist: false });
    const minutes = Array.from({ length: 240 }, (_, i) => ({ time: Date.UTC(2026, 9, 23, 2) + i * 60_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }));
    widget.setData(minutes);
    const built = FakeChart.last.data;
    widget.getChart().setMarket(MARKET_HOSE);
    FakeChart.last.setSymbolInfo({ symbol: 'FPT', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(FakeChart.last.data).toBe(built);
  });

  it('leaves bars it does not build alone when the zone comes', () => {
    widget = new ChartWidget(host, { symbol: 'FPT', timeframe: '1h', watchlist: false });
    const hours = vnHours();
    widget.setData(hours);
    FakeChart.last.setSymbolInfo({ symbol: 'FPT', timeZone: 'Asia/Ho_Chi_Minh' });
    expect(FakeChart.last.data).toBe(hours);
  });
});

describe('a monthly VWAP on the weeks the widget builds', () => {
  const NY = 'America/New_York';
  /** New York's regular hours as hourly bars, 14:00 to 20:00 UTC, each weekday from Monday 5 October 2026 for ten weeks; each day at its own price. */
  function nyHours(): OHLCBar[] {
    const out: OHLCBar[] = [];
    for (let d = 0; d < 70; d++) {
      const day = Date.UTC(2026, 9, 5) + d * DAY;
      const dow = new Date(day).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      for (let h = 14; h <= 20; h++) out.push({ time: day + h * HOUR, open: 10 + d, high: 10 + d, low: 10 + d, close: 10 + d, volume: 1 });
    }
    return out;
  }
  const config = { id: 'vwap', instanceId: 'v', params: { anchor: 'month' }, exchangeTimeZone: NY };
  /** The weeks, by their Monday's date, that start a month again. */
  const monthStarts = (weeks: OHLCBar[], dateOf: (t: number) => string): string[] => {
    const s = new VWAPIndicator().calculate(weeks, config).series!;
    return weeks.filter((b, i) => Math.abs(s[i]!.value! - (b.high + b.low + b.close) / 3) < 1e-9).map((b) => dateOf(b.time));
  };
  const nyDate = (t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: NY }).format(t);
  const utcDate = (t: number) => new Date(t).toISOString().slice(0, 10);

  it('starts each month at its first week, the weeks built at New York’s midnight', async () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', timeframe: '1h', watchlist: false });
    widget.getChart().setMarket({ type: 'stock', timeZone: NY });
    widget.setData(nyHours());
    await widget.setTimeframe('1w');
    const weeks = FakeChart.last.data;
    expect(weeks).toHaveLength(10);
    expect(monthStarts(weeks, nyDate)).toEqual(['2026-10-05', '2026-11-02', '2026-12-07']);
  });

  it('and on weeks a feed stamps at 00:00 UTC', async () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', timeframe: '1h', watchlist: false });
    widget.setData(nyHours());
    await widget.setTimeframe('1w');
    const weeks = FakeChart.last.data;
    expect(weeks.every((b) => b.time % DAY === 0)).toBe(true);
    expect(monthStarts(weeks, utcDate)).toEqual(['2026-10-05', '2026-11-02', '2026-12-07']);
  });
});
