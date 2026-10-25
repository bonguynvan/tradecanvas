// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, SymbolInfo } from '@tradecanvas/commons';

const BAR = { time: 0, open: 100_000, high: 100_085.3, low: 99_990.1, close: 100_018.7, volume: 5 };

/**
 * Stand-in for the canvas-backed Chart: one bar near 100,000, one alert on
 * it, and prices written as the real chart writes them once a market or a
 * symbol sets their decimals.
 */
class FakeChart {
  static last: FakeChart;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  symbolInfo: SymbolInfo | null = null;
  market: { pricePrecision?: number } | null = null;
  priceFormatter: ((price: number) => string) | null = null;

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown = {}): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  setSymbolInfo(info: SymbolInfo | null): void {
    this.symbolInfo = info;
    this.emit('symbolInfoChange', { info });
  }
  getSymbolInfo(): SymbolInfo | null { return this.symbolInfo; }
  getMarket(): { pricePrecision?: number } | null { return this.market; }
  getPriceFormatter(): ((price: number) => string) | null { return this.priceFormatter; }
  /** As Chart writes a price: its format, else the market's decimals over the symbol's, else two. */
  formatPrice(v: number): string {
    if (this.priceFormatter) return this.priceFormatter(v);
    const decimals = this.market?.pricePrecision ?? this.symbolInfo?.pricePrecision ?? 2;
    return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  getFeatures(): Record<string, unknown> { return {}; }
  getData() { return [BAR]; }
  getAlerts(): unknown[] { return [{ id: 'a', price: 100_018.7, condition: 'crossing' }]; }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getIndicatorOutput(): null { return null; }
  getDrawings(): unknown[] { return []; }
  getSelectedDrawingIds(): string[] { return []; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  getPaneScale() { return { log: false, invert: false, percent: false }; }
  roundPrice(p: number): number { return p; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getStyleValue(): unknown { return null; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  localStorage.clear();
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
  host = document.createElement('div');
  document.body.appendChild(host);
  widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
});

afterEach(() => {
  widget.destroy();
  host.remove();
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
});

const dataWindowValues = () => [...host.querySelectorAll('.tcw-datawin-value')].slice(0, 4).map((el) => el.textContent);
const alertRow = () => host.querySelector('.tcw-alerts-row-main')?.textContent;
const hoverBar = () => FakeChart.last.emit('crosshairMove', { barIndex: 0 });

describe('ChartWidget panels’ prices', () => {
  it('keep the decimals of the price’s size while nothing sets the symbol’s', () => {
    widget.openPanel('dataWindow');
    hoverBar();
    expect(dataWindowValues()).toEqual(['100,000.00', '100,085.30', '99,990.10', '100,018.70']);
  });

  it('read as the chart writes them once the symbol sets its decimals', () => {
    FakeChart.last.setSymbolInfo({ symbol: 'AAA', pricePrecision: 1 });
    widget.openPanel('dataWindow');
    hoverBar();
    expect(dataWindowValues()).toEqual(['100,000.0', '100,085.3', '99,990.1', '100,018.7']);
  });

  it('follow the market’s decimals', () => {
    FakeChart.last.market = { pricePrecision: 1 };
    widget.openPanel('alerts');
    FakeChart.last.emit('alertAdd');
    expect(alertRow()).toBe('Crossing 100,018.7');
  });

  it('are written again when the symbol’s details arrive after the lists', () => {
    widget.openPanel('alerts');
    FakeChart.last.emit('alertAdd');
    expect(alertRow()).toBe('Crossing 100,018.70');
    FakeChart.last.setSymbolInfo({ symbol: 'AAA', pricePrecision: 1 });
    expect(alertRow()).toBe('Crossing 100,018.7');
  });

  it('are written again in the data window it shows', () => {
    widget.openPanel('dataWindow');
    hoverBar();
    FakeChart.last.setSymbolInfo({ symbol: 'AAA', pricePrecision: 1 });
    expect(dataWindowValues()[3]).toBe('100,018.7');
  });

  it('take the chart’s own price format first', () => {
    FakeChart.last.priceFormatter = (p) => `$${Math.round(p)}`;
    widget.openPanel('alerts');
    FakeChart.last.emit('alertAdd');
    expect(alertRow()).toBe('Crossing $100019');
  });
});
