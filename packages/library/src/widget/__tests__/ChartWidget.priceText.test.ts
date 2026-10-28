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
  bars = [BAR];
  /** An EMA on the price pane and an RSI in a pane of its own, when a test adds them. */
  indicators: unknown[] = [];
  outputs: Record<string, { series: Record<string, number>[] }> = {};
  panes: { instanceId: string; rect: { x: number; y: number; width: number; height: number } }[] = [];

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
  getData() { return this.bars; }
  getAlerts(): unknown[] { return [{ id: 'a', price: 100_018.7, condition: 'crossing' }]; }
  getActiveIndicators(): unknown[] { return this.indicators; }
  getIndicatorPanes(): unknown[] { return this.panes; }
  getIndicatorOutput(id: string) { return this.outputs[id] ?? null; }
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

  it('write the data window’s change, its percentage too, in the number locale', () => {
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, chartOptions: { numberLocale: 'de-DE' } });
    widget.openPanel('dataWindow');
    hoverBar();
    // The one bar moved 18.7 from its open of 100,000: 0.0187%.
    const change = [...host.querySelectorAll('.tcw-datawin-value')][4]?.textContent;
    expect(change).toBe('+18,70 (+0,02%)');
  });

  it('take a symbol’s decimals of null as none set, as the chart does', () => {
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, chartOptions: { numberLocale: 'de-DE' } });
    // A feed's JSON can carry null for a field it has no value for.
    FakeChart.last.setSymbolInfo({ symbol: 'AAA', pricePrecision: null as unknown as number });
    widget.openPanel('alerts');
    FakeChart.last.emit('alertAdd');
    expect(alertRow()).toBe('Crossing 100.018,70');
  });

  it('take the chart’s own price format first', () => {
    FakeChart.last.priceFormatter = (p) => `$${Math.round(p)}`;
    widget.openPanel('alerts');
    FakeChart.last.emit('alertAdd');
    expect(alertRow()).toBe('Crossing $100019');
  });

  it('write the data window’s change in the decimals its prices have, not the change’s own size', () => {
    // A move of 18.7494 on a price near 100,000: the prices show two decimals, so does the change.
    FakeChart.last.bars = [{ ...BAR, close: BAR.open + 18.7494 }];
    widget.openPanel('dataWindow');
    hoverBar();
    const change = [...host.querySelectorAll('.tcw-datawin-value')][4]?.textContent;
    expect(change).toBe('+18.75 (+0.02%)');
  });
});

describe('ChartWidget data window’s indicator values', () => {
  const addIndicators = () => {
    const chart = FakeChart.last;
    const descriptor = (id: string, name: string) => ({ id, name, defaultConfig: {}, plots: [{ key: 'value', title: name }] });
    chart.indicators = [
      { instanceId: 'ema', id: 'ema', params: {}, visible: true, descriptor: descriptor('ema', 'EMA') },
      { instanceId: 'rsi', id: 'rsi', params: {}, visible: true, descriptor: descriptor('rsi', 'RSI') },
    ];
    chart.outputs = { ema: { series: [{ value: 100_012.3456 }] }, rsi: { series: [{ value: 54.32198 }] } };
    chart.panes = [{ instanceId: 'rsi', rect: { x: 0, y: 300, width: 600, height: 100 } }];
  };
  const indicatorValues = () => [...host.querySelectorAll('.tcw-datawin-value')].slice(6).map((el) => el.textContent);

  it('read as the legend writes them: a price-pane line as the chart writes prices', () => {
    FakeChart.last.setSymbolInfo({ symbol: 'AAA', pricePrecision: 1 });
    addIndicators();
    widget.openPanel('dataWindow');
    hoverBar();
    expect(indicatorValues()).toEqual(['100,012.3', '54.32']);
  });

  it('are in the number locale', () => {
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, chartOptions: { numberLocale: 'de-DE' } });
    addIndicators();
    FakeChart.last.formatPrice = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    widget.openPanel('dataWindow');
    hoverBar();
    expect(indicatorValues()).toEqual(['100.012,35', '54,32']);
  });
});
