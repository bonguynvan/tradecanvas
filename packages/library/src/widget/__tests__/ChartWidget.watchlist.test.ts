// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, DataAdapter, Quote } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: anything not written here is a no-op. */
class FakeChart {
  static last: FakeChart;
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
  getData(): { close: number; open: number; time: number }[] { return [{ open: 90, close: 100, time: 0 }]; }
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
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  vi.useRealTimers();
});

const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-watchlist-row')].map((r) => r.dataset.symbol);
const price = (symbol: string) => host.querySelector(`.tcw-watchlist-row[data-symbol="${symbol}"] .tcw-watchlist-price`)?.textContent;

/** A quote source that records what it was asked for and lets the test send quotes. */
function quoteSource() {
  const asked: string[][] = [];
  let send: (q: Quote[]) => void = () => {};
  let stopped = 0;
  return {
    asked,
    stopped: () => stopped,
    send: (q: Quote[]) => send(q),
    subscribeQuotes(symbols: readonly string[], onQuotes: (q: Quote[]) => void) {
      asked.push([...symbols]);
      send = onQuotes;
      return () => { stopped++; };
    },
  };
}

describe('ChartWidget watchlists', () => {
  it('starts with one list of the symbols, as before', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA', 'BBB'], watchlist: true });
    expect(rows()).toEqual(['AAA', 'BBB']);
    expect(widget.getWatchlists()).toEqual([{ id: 'default', name: 'Watchlist', symbols: ['AAA', 'BBB'] }]);
    widget.setSymbols(['AAA', 'CCC']);
    expect(rows()).toEqual(['AAA', 'CCC']);
  });

  it('takes lists, switches between them, and adds and removes symbols', () => {
    const onChange = vi.fn();
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      symbols: ['AAA'],
      watchlist: { lists: [{ id: 'c', name: 'Crypto', symbols: ['BTCUSDT'] }, { id: 's', name: 'Stocks', symbols: ['AAPL'] }], onChange },
    });
    expect(rows()).toEqual(['BTCUSDT']);
    widget.setActiveWatchlist('s');
    expect(rows()).toEqual(['AAPL']);
    expect(widget.getActiveWatchlist()).toBe('s');
    widget.addToWatchlist('MSFT');
    widget.addToWatchlist('ETHUSDT', 'c');
    widget.removeFromWatchlist('AAPL');
    expect(rows()).toEqual(['MSFT']);
    expect(widget.getWatchlists().find((l) => l.id === 'c')!.symbols).toEqual(['BTCUSDT', 'ETHUSDT']);
    expect(onChange).toHaveBeenLastCalledWith(widget.getWatchlists(), 's');
    // setSymbols leaves lists the host gave alone.
    widget.setSymbols(['ZZZ']);
    expect(rows()).toEqual(['MSFT']);
  });

  it('keeps the lists in this browser when asked', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], watchlist: { persist: true } });
    widget.addToWatchlist('BBB');
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], watchlist: { persist: true } });
    expect(rows()).toEqual(['AAA', 'BBB']);
  });

  it('adds what the symbol search picks from the + button', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA', 'BBB'], watchlist: true });
    widget.removeFromWatchlist('BBB');
    host.querySelector<HTMLButtonElement>('.tcw-watchlist-add')!.click();
    const option = [...document.querySelectorAll<HTMLElement>('.tcw-cmd-item')].find((el) => el.textContent?.includes('BBB'));
    expect(option).toBeTruthy();
    option!.click();
    expect(rows()).toEqual(['AAA', 'BBB']);
    // Picking added the symbol; the chart stays on AAA.
    expect(host.querySelector('.tcw-watchlist-active')?.getAttribute('data-symbol')).toBe('AAA');
  });

  it('fills its rows from a quote source, and follows the shown list', () => {
    const source = quoteSource();
    const adapter = { name: 'fake', subscribeQuotes: source.subscribeQuotes.bind(source) } as unknown as DataAdapter;
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      symbols: ['AAA', 'BBB'],
      watchlist: { lists: [{ id: 'a', name: 'A', symbols: ['AAA', 'BBB'] }, { id: 'b', name: 'B', symbols: ['CCC'] }], quotes: adapter as never },
    });
    expect(source.asked).toEqual([['AAA', 'BBB']]);
    source.send([{ symbol: 'BBB', last: 1234.5, change: 34.5 }]);
    expect(price('BBB')).toBe('1,234.50');
    expect(widget.getQuote('BBB')).toMatchObject({ last: 1234.5 });
    widget.setActiveWatchlist('b');
    expect(source.stopped()).toBe(1);
    expect(source.asked.at(-1)).toEqual(['CCC']);
    widget.addToWatchlist('DDD');
    expect(source.asked.at(-1)).toEqual(['CCC', 'DDD']);
    widget.destroy();
    expect(source.stopped()).toBe(3);
  });

  it('takes quotes the host pushes, and refuses what isn’t one', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA', 'BBB'], watchlist: true });
    widget.setQuotes([{ symbol: 'BBB', last: 50, prevClose: 40 }, { symbol: 'BBB', last: Number.NaN } as Quote]);
    expect(price('BBB')).toBe('50.0000');
    expect(widget.getQuote('BBB')).toMatchObject({ last: 50, change: 10 });
    expect(widget.getQuote('ZZZ')).toBeNull();
  });
});

describe('ChartWidget watchlist quotes, after review', () => {
  it('keeps one subscription through a reorder, and keeps what a later quote leaves out', () => {
    const source = quoteSource();
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      symbols: ['AAA', 'BBB'],
      watchlist: { lists: [{ id: 'a', name: 'A', symbols: ['AAA', 'BBB'] }], quotes: source as never },
    });
    expect(source.asked).toHaveLength(1);
    widget.setWatchlists([{ id: 'a', name: 'A', symbols: ['BBB', 'AAA'] }]);
    expect(source.asked).toHaveLength(1);

    source.send([{ symbol: 'BBB', last: 10, bid: 9.9, ask: 10.1, prevClose: 9 }]);
    source.send([{ symbol: 'BBB', last: 11 }]);
    expect(widget.getQuote('BBB')).toMatchObject({ last: 11, bid: 9.9, prevClose: 9 });
    source.send([{ symbol: 'BBB', last: Number.NaN } as Quote, null as never]);
    expect(widget.getQuote('BBB')?.last).toBe(11);
  });
});
