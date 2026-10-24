// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, FeaturesConfig } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: emits the menus' events on demand and records what's switched. */
class FakeChart {
  static last: FakeChart;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  features: Partial<FeaturesConfig>;

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    this.features = { ...options.features };
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
  paneTitles: boolean[] = [];
  setPaneTitlesVisible(on: boolean): void { this.paneTitles.push(on); }
  resizes = 0;
  resize(): void { this.resizes++; }
  setFeatures(patch: Partial<FeaturesConfig>): void { this.features = { ...this.features, ...patch }; }
  getFeatures(): Partial<FeaturesConfig> { return this.features; }
  tools: (string | null)[] = [];
  setDrawingTool(tool: string | null): void { this.tools.push(tool); }
  drawings = [{ id: 'd1', type: 'trendLine', locked: false, visible: true, group: null }];
  getDrawings(): unknown[] { return this.drawings; }
  getSelectedDrawingIds(): string[] { return ['d1']; }
  canAddDrawingAlert(): boolean { return true; }
  roundPrice(p: number): number { return Math.round(p); }
  getData(): { close: number; time: number }[] { return [{ close: 100, time: 0 }]; }
  getActiveIndicators(): unknown[] { return this.indicators; }
  getIndicatorPanes(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getIndicatorOutput(): null { return null; }
  getPaneScale() { return { log: false, invert: false, percent: false }; }
  getAlerts(): unknown[] { return []; }
  formatPrice(v: number): string { return v.toFixed(2); }
  // What the chart menus' entries do.
  copied = false;
  pasted = 0;
  canPasteDrawings(): boolean { return this.copied; }
  pasteDrawings(): string[] { this.pasted++; return []; }
  indicators: { id: string; instanceId: string }[] = [];
  removed: string[][] = [];
  removeIndicators(ids: string[]): void { this.removed.push(ids); }
  calls: [string, unknown][] = [];
  fitContent(): void { this.calls.push(['fitContent', null]); }
  setScaleMode(mode: string): void { this.calls.push(['setScaleMode', mode]); }
  setLeftPriceScaleVisible(on: boolean): void { this.calls.push(['setLeftPriceScaleVisible', on]); }
  setBarCountdownVisible(on: boolean): void { this.calls.push(['setBarCountdownVisible', on]); }
  setTimezone(zone: unknown): void { this.calls.push(['setTimezone', zone]); }
  applyOverrides(patch: unknown): void { this.calls.push(['applyOverrides', patch]); }
  getStyleValue(key: string): unknown { return key === 'lastPrice.visible' ? true : null; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

/** jsdom lays nothing out: a laptop's width, unless a test says otherwise. */
let width = 1366;

beforeEach(() => {
  localStorage.clear();
  width = 1366;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget.destroy();
  host.remove();
  // Back to jsdom's own, on Element.
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, ...options });
  return widget;
};
const railPages = () => [...host.querySelectorAll<HTMLElement>('.tcw-dock-rail [data-page]')].map((b) => b.dataset.page);
const railButton = (page: string) => host.querySelector<HTMLButtonElement>(`.tcw-dock-rail [data-page="${page}"]`)!;
const panel = () => host.querySelector<HTMLElement>('.tcw-dock-panel')!;
const inPanel = (selector: string) => panel().querySelector<HTMLElement>(selector);
const visible = (el: Element | null) => !!el && getComputedStyle(el).display !== 'none' && !(el as HTMLElement).hidden;
const toolbarButton = (part: string) => host.querySelector<HTMLButtonElement>(`.tcw-toolbar [data-tcw-part~="${part}"]`)!;

describe('ChartWidget dock', () => {
  it('docks the panels by the chart, a rail button for each, the watchlist open to start with', () => {
    make({ watchlist: true });
    const body = host.querySelector('.tcw-body')!;
    const order = [...body.children].map((el) => el.className.split(' ')[0]);
    expect(order.indexOf('tcw-chart-container')).toBeLessThan(order.indexOf('tcw-dock'));
    expect(railPages()).toEqual(['watchlist', 'alerts', 'objectTree', 'dataWindow', 'symbolInfo']);
    expect(visible(panel())).toBe(true);
    expect(visible(inPanel('.tcw-watchlist'))).toBe(true);
    expect(railButton('watchlist').getAttribute('aria-pressed')).toBe('true');
  });

  it('starts shut on a phone, the rail’s place taken by the toolbar’s buttons', () => {
    width = 390;
    make({ watchlist: true });
    expect(host.querySelector('.tcw-root')!.hasAttribute('data-tcw-narrow')).toBe(true);
    expect(panel().hidden).toBe(true);
    expect(visible(toolbarButton('toolbar.alerts'))).toBe(true);
    toolbarButton('toolbar.alerts').click();
    expect(visible(inPanel('.tcw-alerts-panel'))).toBe(true);
  });

  it('starts shut without a watchlist', () => {
    make();
    expect(railPages()).toEqual(['alerts', 'objectTree', 'dataWindow', 'symbolInfo']);
    expect(panel().hidden).toBe(true);
  });

  it('opens a panel from the rail in place of the one open, and shuts it from its own button', () => {
    make({ watchlist: true });
    railButton('alerts').click();
    expect(visible(inPanel('.tcw-alerts-panel'))).toBe(true);
    expect(visible(inPanel('.tcw-watchlist'))).toBe(false);
    railButton('objectTree').click();
    expect(visible(inPanel('.tcw-tree-panel'))).toBe(true);
    inPanel('.tcw-tree-close')!.click();
    expect(panel().hidden).toBe(true);
    railButton('dataWindow').click();
    expect(visible(inPanel('.tcw-datawin'))).toBe(true);
  });

  it('shuts the dock from each panel’s own close button', () => {
    make({ watchlist: true });
    const pages: [string, string][] = [
      ['watchlist', '.tcw-watchlist-close'],
      ['alerts', '.tcw-alerts-close'],
      ['objectTree', '.tcw-tree-close'],
      ['dataWindow', '.tcw-datawin-close'],
      ['symbolInfo', '.tcw-syminfo-close'],
    ];
    for (const [page, close] of pages) {
      if (panel().hidden || railButton(page).getAttribute('aria-pressed') !== 'true') railButton(page).click();
      inPanel(close)!.click();
      expect(panel().hidden, page).toBe(true);
    }
  });

  it('opens the symbol info from the button by the symbol, in the dock', () => {
    make();
    toolbarButton('toolbar.symbolInfo').click();
    expect(visible(inPanel('.tcw-syminfo'))).toBe(true);
    expect(railButton('symbolInfo').getAttribute('aria-pressed')).toBe('true');
    toolbarButton('toolbar.symbolInfo').click();
    expect(panel().hidden).toBe(true);
  });

  // (While the rail shows, the toolbar's alerts and objects buttons hide: WidgetPanels.css, seen in a browser;
  // the widget's stylesheets don't load under jsdom, only the switches' rules do.)
  it('with the rail off, opens the panels from the toolbar into the dock', () => {
    make();
    widget.setFeatures({ dock: false });
    expect(visible(host.querySelector('.tcw-dock-rail'))).toBe(false);
    expect(visible(toolbarButton('toolbar.alerts'))).toBe(true);
    toolbarButton('toolbar.alerts').click();
    expect(visible(inPanel('.tcw-alerts-panel'))).toBe(true);
    toolbarButton('toolbar.alerts').click();
    expect(panel().hidden).toBe(true);
  });

  it('takes a panel away with its switch, shutting it if it was open', () => {
    make();
    railButton('alerts').click();
    widget.setFeatures({ alerts: false });
    expect(panel().hidden).toBe(true);
    expect(visible(railButton('alerts'))).toBe(false);
    widget.setFeatures({ alerts: true, 'dock.dataWindow': false });
    expect(visible(railButton('alerts'))).toBe(true);
    expect(visible(railButton('dataWindow'))).toBe(false);
  });

  it('opens and shuts a panel from code, saying which is open', () => {
    width = 390;
    make({ watchlist: true });
    expect(widget.getOpenPanel()).toBeNull();
    expect(widget.openPanel('watchlist')).toBe(true);
    expect(widget.getOpenPanel()).toBe('watchlist');
    expect(visible(inPanel('.tcw-watchlist'))).toBe(true);
    expect(widget.openPanel('dataWindow')).toBe(true);
    expect(widget.getOpenPanel()).toBe('dataWindow');
    widget.closePanel();
    expect(widget.getOpenPanel()).toBeNull();
    expect(panel().hidden).toBe(true);
  });

  it('opens no panel that is not there', () => {
    make({ features: { alerts: false } });
    expect(widget.openPanel('watchlist')).toBe(false);
    expect(widget.openPanel('alerts')).toBe(false);
    expect(widget.getOpenPanel()).toBeNull();
  });

  it('keeps the width it was given for the next widget', () => {
    make();
    railButton('alerts').click();
    const edge = host.querySelector<HTMLElement>('.tcw-dock-resize')!;
    edge.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    widget.destroy();
    host.replaceChildren();
    make();
    expect(host.querySelector<HTMLElement>('.tcw-dock')!.style.getPropertyValue('--tcw-dock-w')).toBe('377px');
  });
});
