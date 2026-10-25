// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, DataAdapter, SymbolInfo } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: anything not written here is a no-op. */
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

const VNM: SymbolInfo = { symbol: 'VNM', description: 'Vinamilk', exchange: 'HOSE', type: 'stock', logo: 'https://cdn.example/vnm.png' };

beforeEach(() => {
  localStorage.clear();
  FakeChart.info = null;
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  document.body.innerHTML = '';
});

const watchlistRows = () => [...host.querySelectorAll<HTMLElement>('.tcw-watchlist-row')].map((r) => r.dataset.symbol);
const symbolButton = () => host.querySelector<HTMLButtonElement>('[data-role="symbol"]')!;
const searchRows = () => [...document.querySelectorAll<HTMLElement>('.tcw-ss-row')];
const desc = (row: Element | undefined) => row?.querySelector('.tcw-ss-desc')?.textContent;
const panel = () => host.querySelector<HTMLElement>('.tcw-syminfo')!;

describe('ChartWidget symbols given with their info', () => {
  it('starts the chart on the first, and makes the watchlist of their tickers', () => {
    widget = new ChartWidget(host, { symbols: [VNM, 'FPT'], watchlist: true });
    expect(widget.getSymbol()).toBe('VNM');
    expect(widget.getWatchlists()[0].symbols).toEqual(['VNM', 'FPT']);
    expect(watchlistRows()).toEqual(['VNM', 'FPT']);
  });

  it('keeps the list made from them in tickers when they are set again', () => {
    widget = new ChartWidget(host, { symbols: ['AAA'], watchlist: true });
    widget.setSymbols([{ symbol: 'BBB', description: 'B corp' }, 'CCC']);
    expect(widget.getWatchlists()[0].symbols).toEqual(['BBB', 'CCC']);
    expect(watchlistRows()).toEqual(['BBB', 'CCC']);
  });

  it('opens the symbol search with their names, and a letter typed on the chart opens it too', () => {
    widget = new ChartWidget(host, { symbols: [VNM, 'FPT'], watchlist: false });
    symbolButton().click();
    expect(searchRows().map((r) => r.dataset.symbol)).toEqual(['VNM', 'FPT']);
    expect(desc(searchRows()[0])).toBe('Vinamilk');
    expect(searchRows()[0].querySelector('img.tcw-ss-badge')?.getAttribute('src')).toBe('https://cdn.example/vnm.png');
    document.querySelector<HTMLElement>('.tcw-ss-input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    host.querySelector<HTMLElement>('.tcw-root')!.dispatchEvent(new Event('pointerdown'));
    expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', cancelable: true }))).not.toThrow();
    expect(document.querySelector<HTMLInputElement>('.tcw-ss-input')?.value).toBe('f');
    expect(searchRows().map((r) => r.dataset.symbol)).toEqual(['FPT']);
  });

  it('gives the search what the chart knows of its symbol', () => {
    FakeChart.info = { symbol: 'VCB', description: 'Vietcombank', exchange: 'HOSE' };
    widget = new ChartWidget(host, { symbol: 'VCB', symbols: ['VCB', 'FPT'], watchlist: false });
    symbolButton().click();
    expect(desc(searchRows()[0])).toBe('Vietcombank');
    expect(desc(searchRows()[1])).toBeUndefined();
  });

  it('titles the toolbar’s symbol from the given info when the chart knows none, the chart’s own first', async () => {
    widget = new ChartWidget(host, { symbols: [VNM, 'FPT'], watchlist: false });
    expect(symbolButton().title).toBe('Vinamilk · HOSE');
    await widget.setSymbol('FPT');
    expect(symbolButton().hasAttribute('title')).toBe(false);
    await widget.setSymbol('VNM');
    expect(symbolButton().title).toBe('Vinamilk · HOSE');
    FakeChart.info = { symbol: 'VNM', description: 'Vinamilk JSC' };
    FakeChart.last.emit('symbolInfoChange', { info: FakeChart.info });
    expect(symbolButton().title).toBe('Vinamilk JSC · HOSE');
    // What the chart knows of another symbol names nothing here.
    await widget.setSymbol('FPT');
    expect(symbolButton().hasAttribute('title')).toBe(false);
  });

  it('names the symbol in the info panel from the given info, the market’s hours from the chart only', async () => {
    FakeChart.info = { symbol: 'FPT', description: 'FPT Corp', timeZone: 'UTC' };
    widget = new ChartWidget(host, { symbol: 'VNM', symbols: [VNM, 'FPT'], watchlist: false });
    widget.toggleSymbolInfo(true);
    expect(panel().querySelector('.tcw-syminfo-desc')?.textContent).toBe('Vinamilk');
    expect(panel().querySelector('.tcw-syminfo-meta')?.textContent).toBe('HOSE · stock');
    // The chart's own (here still another symbol's) gives the hours, as before.
    expect(panel().querySelector('.tcw-syminfo-status')?.textContent).toBe('Trades around the clock');
  });

  it('lists the given names in the compare dialog', () => {
    const adapter = { name: 'fake', searchSymbols: async () => [] } as unknown as DataAdapter;
    widget = new ChartWidget(host, { adapter, symbol: 'FPT', symbols: [VNM, 'FPT'], watchlist: false });
    host.querySelector<HTMLButtonElement>('[data-role="compare"]')!.click();
    const rows = [...document.querySelectorAll<HTMLElement>('.tcw-ss.tcw-ss--compare .tcw-ss-row')];
    expect(rows.map((r) => r.dataset.symbol)).toEqual(['VNM']);
    expect(desc(rows[0])).toBe('Vinamilk');
  });
});
