// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2026, 0, 5, 14);
const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: T0 + i * 3_600_000, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 10 + i,
}));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart?.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const live = () => host.querySelector<HTMLElement>('.tc-sr-live')!;
const key = (k: string, init: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));

describe('chart accessibility', () => {
  it('keeps its screen-reader text out of mouse selection, so a press stays a pan', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    expect(host.style.userSelect).toBe('none');
  });

  it('tells the new summary when the chart type’s settings change', () => {
    // A box bigger than the whole move builds no brick: nothing to tell.
    chart = new Chart(host, { chartType: 'renko', chartTypeOptions: { renko: { boxSize: 1_000 } } });
    chart.setData(bars);
    expect(host.getAttribute('aria-label')).toBe('Chart, no data.');
    chart.setChartTypeOptions({ renko: { boxSize: 5 } });
    expect(host.getAttribute('aria-label')).toBe('renko. Last price 160.00.');
  });

  it('is a focusable chart with a summary a screen reader reads', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    expect(host.getAttribute('role')).toBe('application');
    expect(host.getAttribute('aria-roledescription')).toBe('chart');
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 160.00.');
    const keys = document.getElementById(host.getAttribute('aria-describedby')!)!;
    expect(keys.textContent).toContain('Comma and period');
  });

  it('says what is on screen after the keys move the view', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    host.focus();
    key('ArrowLeft');
    expect(live().textContent).toBe('');
    vi.advanceTimersByTime(500);
    expect(live().textContent).toMatch(/^Showing \d+ bars, .+ to .+\. High [\d.]+, low [\d.]+\.$/);
  });

  it('reads the bars one at a time with comma and period', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    host.focus();
    key('.');
    const last = live().textContent!;
    expect(last).toMatch(/open 159\.00, high 161\.00, low 158\.00, close 160\.00, volume 69\.$/);
    key(',');
    expect(live().textContent).toMatch(/close 159\.00, volume 68\.$/);
    key('.');
    key('.'); // past the last bar: stays on it
    expect(live().textContent).toBe(last);
  });

  it('takes labels of its own, and can be left out', () => {
    chart = new Chart(host, {
      chartType: 'line',
      a11y: { labels: { role: 'biểu đồ', summary: '{what}. Giá cuối {close}.', typeName: (t) => (t === 'line' ? 'đường' : t) } },
    });
    chart.setData(bars);
    expect(host.getAttribute('aria-roledescription')).toBe('biểu đồ');
    expect(host.getAttribute('aria-label')).toBe('đường. Giá cuối 160.00.');
    chart.destroy();
    host.remove();
    host = sizedHost();
    chart = new Chart(host, { a11y: false });
    expect(host.getAttribute('role')).toBeNull();
    expect(host.querySelector('.tc-sr-live')).toBeNull();
  });

  it('follows the forming bar’s price, at most once a second', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    const last = bars[bars.length - 1];
    chart.updateLastBar({ ...last, high: 171, close: 170 });
    chart.updateLastBarFromTick({ price: 171, volume: 1, time: last.time });
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 160.00.');
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 171.00.');
  });

  it('follows a bar appended again at the last bar’s time', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    const last = bars[bars.length - 1];
    chart.appendBar({ ...last, high: 175, close: 174 });
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 174.00.');
    chart.appendBars([{ ...last, high: 177, close: 176 }]);
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 176.00.');
  });

  it('follows a replay’s bars, not the price it started on', () => {
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.setData(bars);
    chart.replayStart({ startIndex: 10, paused: true });
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 111.00.');
    chart.replaySeekToBar(20);
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('candlestick. Last price 121.00.');
  });

  it('follows a feed’s forming bar, which sends no dataUpdate', async () => {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter: DataAdapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => bars,
      on: ((type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); }) as DataAdapter['on'],
      off: () => {},
      dispose: () => {},
    };
    chart = new Chart(host, { chartType: 'candlestick' });
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '1h', historyLimit: 60 });
    expect(host.getAttribute('aria-label')).toBe('AAA, candlestick, 1h. Last price 160.00.');
    const last = bars[bars.length - 1];
    for (const close of [165, 167]) handlers.get('bar')?.({ data: { bar: { ...last, high: 168, close }, closed: false } });
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('AAA, candlestick, 1h. Last price 167.00.');
    // The same bar closed, at a last price of its own.
    handlers.get('bar')?.({ data: { bar: { ...last, high: 168, close: 166 }, closed: true } });
    vi.advanceTimersByTime(1_000);
    expect(host.getAttribute('aria-label')).toBe('AAA, candlestick, 1h. Last price 166.00.');
  });
});
