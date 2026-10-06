// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, NewsItem, SymbolInfo } from '@tradecanvas/commons';

const HOUR = 3_600_000;
/** Monday 5 Oct 2026, 21:00 UTC: 17:00 in New York, after the close. */
const NOW = Date.UTC(2026, 9, 5, 21);

class FakeChart {
  static last: FakeChart;
  static info: SymbolInfo | null = null;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }
  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  getSymbolInfo(): SymbolInfo | null { return FakeChart.info; }
  zoomIns = 0;
  zoomIn(): void { this.zoomIns++; }
  scrolled: number[] = [];
  scrollBars(n: number): void { this.scrolled.push(n); }
  /** Hourly bars: Friday's last at 99, then Monday's session. */
  getData() {
    const mon = Date.UTC(2026, 9, 5, 14);
    return [
      { time: Date.UTC(2026, 9, 2, 19), open: 98, high: 100, low: 97, close: 99, volume: 10 },
      { time: mon, open: 100, high: 104, low: 99, close: 103, volume: 20 },
      { time: mon + HOUR, open: 103, high: 106, low: 102, close: 105, volume: 30 },
    ];
  }
  formatPrice(v: number): string { return v.toFixed(2); }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getRequiredSymbols(): string[] { return []; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

const AAPL: SymbolInfo = {
  symbol: 'AAPL',
  description: 'Apple Inc.',
  exchange: 'NASDAQ',
  type: 'stock',
  currency: 'USD',
  minTick: 0.01,
  timezone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
};

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(NOW);
  localStorage.clear();
  FakeChart.info = AAPL;
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  vi.useRealTimers();
});

const panel = () => host.querySelector<HTMLElement>('.tcw-syminfo')!;
const stats = () => Object.fromEntries([...panel().querySelectorAll('.tcw-syminfo-stat')].map((r) => [r.firstChild!.textContent, r.lastChild!.textContent]));

describe('ChartWidget symbol info', () => {
  it('opens from its toolbar button, with the symbol’s names, status and day', () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'] });
    const button = host.querySelector<HTMLButtonElement>('[data-role="symbolInfo"]')!;
    button.click();
    expect(panel().hidden).toBe(false);
    expect(button.classList.contains('tcw-active')).toBe(true);
    expect(panel().querySelector('.tcw-syminfo-symbol')!.textContent).toBe('AAPL');
    expect(panel().querySelector('.tcw-syminfo-desc')!.textContent).toBe('Apple Inc.');
    expect(panel().querySelector('.tcw-syminfo-meta')!.textContent).toBe('NASDAQ · stock');
    expect(panel().querySelector('.tcw-syminfo-status')!.textContent).toBe('Market closed · opens in 17 hours');
    // The day from the bars: Monday's open, range and volume against Friday's close.
    expect(panel().querySelector('.tcw-syminfo-price')!.textContent).toBe('105.00');
    expect(panel().querySelector('.tcw-syminfo-change')!.textContent).toBe('+6.00 (+6.06%)');
    expect(stats()).toMatchObject({ Open: '100.00', High: '106.00', Low: '99.00', 'Prev. close': '99.00', Volume: '50' });
    expect(stats()['Trading hours']).toBe('⁦09:30–16:00⁩ Mon–Fri');
    expect(stats()['Time zone']).toBe('America/New_York');
    expect(stats()['Tick size']).toBe('0.01');
  });

  it('prefers a quote for the price, the move and the day', () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'] });
    widget.toggleSymbolInfo(true);
    widget.setQuotes([{ symbol: 'AAPL', last: 190, change: 2, changePercent: 1.06, high: 191, low: 186, volume: 1_250_000, bid: 189.9, ask: 190.1 }]);
    expect(panel().querySelector('.tcw-syminfo-price')!.textContent).toBe('190.00');
    expect(panel().querySelector('.tcw-syminfo-change')!.textContent).toBe('+2.00 (+1.06%)');
    expect(stats()).toMatchObject({ High: '191.00', Low: '186.00', Volume: '1.25M', Bid: '189.90', Ask: '190.10' });
  });

  it('says a market around the clock is so, and keeps the status bar in step', () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'] });
    expect(host.querySelector('.tcw-status-market')!.textContent).toBe('Market closed');
    FakeChart.info = { symbol: 'BTCUSDT', timezone: 'UTC' };
    FakeChart.last.emit('symbolInfoChange', { info: FakeChart.info });
    widget.toggleSymbolInfo(true);
    expect(panel().querySelector('.tcw-syminfo-status')!.textContent).toBe('Trades around the clock');
    expect(host.querySelector<HTMLElement>('.tcw-status-market')!.hidden).toBe(true);
  });

  it('counts down to the change as time passes', () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'] });
    widget.toggleSymbolInfo(true);
    vi.setSystemTime(Date.UTC(2026, 9, 6, 13, 0));
    vi.advanceTimersByTime(30_000);
    expect(panel().querySelector('.tcw-syminfo-status')!.textContent).toBe('Market closed · opens in 30 minutes');
  });

  it('loads news for the symbol from the news option, and again for the next symbol', async () => {
    const news = vi.fn(async (symbol: string): Promise<NewsItem[]> => [
      { title: `${symbol} headline`, url: 'https://news.example/1', source: 'Wire', time: NOW - 3 * HOUR },
    ]);
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL', 'MSFT'], news });
    widget.toggleSymbolInfo(true);
    await vi.waitFor(() => expect(panel().querySelector('.tcw-syminfo-news a')?.textContent).toBe('AAPL headline'));
    expect(panel().querySelector('.tcw-syminfo-news-meta')!.textContent).toBe('Wire · 3 hours ago');
    await widget.setSymbol('MSFT');
    await vi.waitFor(() => expect(panel().querySelector('.tcw-syminfo-news a')?.textContent).toBe('MSFT headline'));
    expect(news).toHaveBeenCalledWith('MSFT', 10);
  });

  it('shows no news part without a news source, and a failure as one', async () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'] });
    widget.toggleSymbolInfo(true);
    expect(panel().querySelector<HTMLElement>('.tcw-syminfo-news')!.hidden).toBe(true);
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'], news: async () => { throw new Error('down'); } });
    widget.toggleSymbolInfo(true);
    await vi.waitFor(() => expect(panel().querySelector('.tcw-syminfo-news')!.textContent).toBe('News could not be loaded.'));
  });

  it('puts navigation over the chart, unless asked not to', () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'] });
    host.querySelector<HTMLButtonElement>('.tcw-nav [data-nav="zoomIn"]')!.click();
    expect(FakeChart.last.zoomIns).toBe(1);
    FakeChart.last.emit('visibleRangeChange', { from: 0, to: 120 });
    const scroll = host.querySelector<HTMLButtonElement>('.tcw-nav [data-nav="scrollLeft"]')!;
    scroll.dispatchEvent(new MouseEvent('click', { detail: 0 })); // a keyboard press
    expect(FakeChart.last.scrolled).toEqual([-12]);
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'], navigation: false });
    expect(getComputedStyle(host.querySelector('.tcw-nav')!).display).toBe('none');
  });

  it('leaves the button out when asked', () => {
    widget = new ChartWidget(host, { symbol: 'AAPL', symbols: ['AAPL'], symbolInfo: false });
    expect(getComputedStyle(host.querySelector('[data-role="symbolInfo"]')!).display).toBe('none');
  });
});
