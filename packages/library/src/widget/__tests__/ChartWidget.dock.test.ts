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
  // The feed's trades: how many times they were asked for, and let go of.
  follows = 0;
  unfollows = 0;
  followTrades(): () => void {
    this.follows++;
    return () => { this.unfollows++; };
  }
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
  setTimeZone(zone: unknown): void { this.calls.push(['setTimeZone', zone]); }
  applyOverrides(patch: unknown): void { this.calls.push(['applyOverrides', patch]); }
  getStyleValue(key: string): unknown { return key === 'lastPrice.visible' ? true : null; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

/** jsdom lays nothing out: a laptop's width, unless a test says otherwise. */
let width = 1366;
/** jsdom has no ResizeObserver: these stand in, called by `resize`. */
let observers: (() => void)[] = [];
class FakeResizeObserver {
  constructor(private readonly cb: () => void) {}
  observe(): void { observers.push(this.cb); }
  unobserve(): void {}
  disconnect(): void { observers = observers.filter((cb) => cb !== this.cb); }
}
const resize = (to: number) => {
  width = to;
  for (const cb of [...observers]) cb();
};

beforeEach(() => {
  localStorage.clear();
  width = 1366;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  observers = [];
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget.destroy();
  host.remove();
  // Back to jsdom's own, on Element.
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
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
  it('docks the panels by the chart, a rail button for each, all shut until one is opened', () => {
    make({ watchlist: true });
    const body = host.querySelector('.tcw-body')!;
    const order = [...body.children].map((el) => el.className.split(' ')[0]);
    expect(order.indexOf('tcw-chart-container')).toBeLessThan(order.indexOf('tcw-dock'));
    expect(railPages()).toEqual(['watchlist', 'alerts', 'objectTree', 'dataWindow', 'symbolInfo', 'orderTicket']);
    expect(panel().hidden).toBe(true);
    expect(railButton('watchlist').getAttribute('aria-pressed')).toBe('false');
    widget.openPanel('watchlist');
    expect(visible(inPanel('.tcw-watchlist'))).toBe(true);
    expect(railButton('watchlist').getAttribute('aria-pressed')).toBe('true');
  });

  it('holds the depth ladder as a page of its own when the widget has one, its rail button under a switch', () => {
    make({ watchlist: true, depthLadder: true });
    expect(railPages()).toEqual(['watchlist', 'alerts', 'objectTree', 'dataWindow', 'symbolInfo', 'orderTicket', 'depthLadder']);
    expect(widget.openPanel('depthLadder')).toBe(true);
    expect(visible(inPanel('.tcw-ladder'))).toBe(true);
    widget.closePanel();
    widget.setFeatures({ 'dock.depthLadder': false });
    expect(railButton('depthLadder').hidden || getComputedStyle(railButton('depthLadder')).display === 'none').toBe(true);
    widget.setFeatures({ depthLadder: false });
    expect(widget.openPanel('depthLadder')).toBe(false);
  });

  it('holds the tape as a page of its own when the widget has one, and follows the feed’s trades while it is open', () => {
    make({ tape: true });
    expect(railPages()).toEqual(['alerts', 'objectTree', 'dataWindow', 'symbolInfo', 'orderTicket', 'tape']);
    expect(FakeChart.last.follows).toBe(0);
    expect(widget.openPanel('tape')).toBe(true);
    expect(visible(inPanel('.tcw-tape'))).toBe(true);
    expect(FakeChart.last.follows).toBe(1);
    // Shut, it lets go of them.
    widget.closePanel();
    expect(FakeChart.last.unfollows).toBe(1);
    widget.openPanel('tape');
    expect(FakeChart.last.follows).toBe(2);
    // Its rail button under one switch, the whole tape under another: off, an open tape shuts.
    widget.setFeatures({ 'dock.tape': false });
    expect(railButton('tape').hidden || getComputedStyle(railButton('tape')).display === 'none').toBe(true);
    widget.setFeatures({ tape: false });
    expect(FakeChart.last.unfollows).toBe(2);
    expect(widget.openPanel('tape')).toBe(false);
  });

  it('lists the chart’s trades on the tape, and starts again for another symbol', () => {
    make({ tape: { minSize: 2 } });
    widget.openPanel('tape');
    const rows = () => [...host.querySelectorAll('.tcw-tape-row')];
    FakeChart.last.emit('trades', { trades: [{ time: 1000, price: 100, volume: 1, side: 'buy' }, { time: 2000, price: 101, volume: 5, side: 'sell' }], recent: true });
    // Shut and opened again: what it took in is there, the trade under the least size left out.
    widget.closePanel();
    widget.openPanel('tape');
    expect(rows()).toHaveLength(1);
    expect((rows()[0] as HTMLElement).dataset.side).toBe('sell');
    expect(rows()[0].children[1].textContent).toBe('101.00');
    FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
    expect(rows()).toHaveLength(0);
  });

  describe('what a reader chose on the tape', () => {
    const least = () => host.querySelector<HTMLInputElement>('.tcw-tape-min')!;
    const type = (text: string) => {
      least().value = text;
      least().dispatchEvent(new Event('input'));
    };
    const choices = () => host.querySelector<HTMLButtonElement>('.tcw-tape-more')!;
    const pick = (label: string) => {
      choices().click();
      [...host.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^="menuitem"]')].find((entry) => entry.querySelector('.tcw-context-label')?.textContent === label)!.click();
    };
    const checked = () => {
      choices().click();
      const marks = [...host.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^="menuitem"]')].map((entry) => entry.getAttribute('aria-checked'));
      choices().click();
      return marks;
    };

    it('is there the next time a widget is made in this browser: the side, the grouping, the symbol’s least size', () => {
      make({ tape: true });
      widget.openPanel('tape');
      pick('Sold');
      pick('Group trades made together');
      type('3');
      widget.destroy();
      make({ tape: true });
      widget.openPanel('tape');
      expect(least().value).toBe('3');
      expect(checked()).toEqual(['false', 'false', 'true', 'true']);
    });

    it('keeps a least size for each symbol: another symbol starts with its own, or with none', () => {
      make({ tape: true });
      widget.openPanel('tape');
      type('3');
      FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
      expect(least().value).toBe('');
      type('500');
      FakeChart.last.emit('symbolChange', { symbol: 'AAA', previous: 'BBB' });
      expect(least().value).toBe('3');
      FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
      expect(least().value).toBe('500');
    });

    it('starts from the options where the reader has chosen nothing, and from the reader’s choice where they have', () => {
      make({ tape: { minSize: 0.5, side: 'buy' } });
      widget.openPanel('tape');
      expect(least().value).toBe('0.5');
      expect(checked()).toEqual(['false', 'true', 'false', 'false']);
      // A symbol with no least size of its own starts from the option too.
      FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
      expect(least().value).toBe('0.5');
      // Cleared by the reader, it stays clear; all trades chosen, they stay chosen.
      type('');
      pick('All trades');
      widget.destroy();
      make({ symbol: 'BBB', tape: { minSize: 0.5, side: 'buy' } });
      widget.openPanel('tape');
      expect(least().value).toBe('');
      expect(checked()).toEqual(['true', 'false', 'false', 'false']);
    });

    it('keeps only what the reader chose: the rest is still the host’s to set', () => {
      make({ tape: { minSize: 5 } });
      widget.openPanel('tape');
      pick('Group trades made together');
      expect(JSON.parse(localStorage.getItem('tcw:tape')!)).toEqual({ group: true, minSizes: [] });
      widget.destroy();
      // The host starts its tape otherwise the next time: where the reader chose nothing, it does.
      make({ tape: { minSize: 10, side: 'sell' } });
      widget.openPanel('tape');
      expect(least().value).toBe('10');
      expect(checked()).toEqual(['false', 'false', 'true', 'true']);
    });

    it('keeps a least size under the symbol it was typed on, and nothing of the symbols a reader only looked at', () => {
      make({ tape: true });
      widget.openPanel('tape');
      FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
      pick('Sold');
      FakeChart.last.emit('symbolChange', { symbol: 'CCC', previous: 'BBB' });
      type('7');
      expect(JSON.parse(localStorage.getItem('tcw:tape')!)).toEqual({ side: 'sell', minSizes: [['CCC', 7]] });
    });

    it('keeps nothing when told not to, and starts from its options every time', () => {
      localStorage.setItem('tcw:tape', JSON.stringify({ side: 'sell', group: true, minSizes: [['AAA', 9]] }));
      make({ tape: { persist: false, minSize: 2 } });
      widget.openPanel('tape');
      expect(least().value).toBe('2');
      expect(checked()).toEqual(['true', 'false', 'false', 'false']);
      pick('Bought');
      type('4');
      expect(JSON.parse(localStorage.getItem('tcw:tape')!)).toEqual({ side: 'sell', group: true, minSizes: [['AAA', 9]] });
      FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
      expect(least().value).toBe('2');
    });

    it('lists the trades as chosen: a kept least size leaves the smaller ones out from the first', () => {
      make({ tape: true });
      widget.openPanel('tape');
      type('2');
      widget.destroy();
      make({ tape: true });
      widget.openPanel('tape');
      FakeChart.last.emit('trades', { trades: [{ time: 1000, price: 100, volume: 1, side: 'buy' }, { time: 2000, price: 101, volume: 5, side: 'sell' }], recent: false });
      widget.closePanel();
      widget.openPanel('tape');
      expect(host.querySelectorAll('.tcw-tape-row')).toHaveLength(1);
    });
  });

  it('writes every size on the tape to the decimals the finest of them needs, so the column lines up', () => {
    make({ tape: true });
    widget.openPanel('tape');
    const sizes = () => [...host.querySelectorAll('.tcw-tape-row .tcw-tape-size')].map((el) => el.textContent);
    FakeChart.last.emit('trades', { trades: [{ time: 1000, price: 100, volume: 3, side: 'buy' }], recent: false });
    widget.closePanel();
    widget.openPanel('tape');
    expect(sizes()).toEqual(['3']);
    FakeChart.last.emit('trades', { trades: [{ time: 2000, price: 100, volume: 0.25, side: 'buy' }, { time: 3000, price: 100, volume: 1500, side: 'sell' }], recent: false });
    widget.closePanel();
    widget.openPanel('tape');
    // A size of a thousand and over is shortened, as volumes are.
    expect(sizes()).toEqual(['1.50K', '0.25', '3.00']);
    // Another symbol's sizes are its own.
    FakeChart.last.emit('symbolChange', { symbol: 'BBB', previous: 'AAA' });
    FakeChart.last.emit('trades', { trades: [{ time: 4000, price: 100, volume: 7, side: 'buy' }], recent: false });
    widget.closePanel();
    widget.openPanel('tape');
    expect(sizes()).toEqual(['7']);
  });

  it('makes no tape unless asked, whatever its switch says, and lets go of the feed when the widget goes', () => {
    make({ features: { tape: true } });
    expect(railPages()).not.toContain('tape');
    expect(widget.openPanel('tape')).toBe(false);
    widget.destroy();
    make({ tape: true });
    widget.openPanel('tape');
    const chart = FakeChart.last;
    widget.destroy();
    expect(chart.unfollows).toBe(1);
    make();
  });

  // A switch only hides: switches restored from getFeatures() (all on) must not add a ladder.
  it('makes no ladder from its switch alone, which is on already', () => {
    make({ features: { depthLadder: true } });
    expect(railPages()).not.toContain('depthLadder');
    expect(widget.openPanel('depthLadder')).toBe(false);
  });

  it('makes no ladder from the switches of another widget, all on', () => {
    const other = new ChartWidget(document.createElement('div'), { symbol: 'BBB', watchlist: false });
    const switches = other.getFeatures();
    other.destroy();
    make({ features: switches });
    expect(railPages()).not.toContain('depthLadder');
  });

  it('leaves the ladder out without trading, its option set', () => {
    make({ trading: false, depthLadder: true });
    expect(widget.openPanel('depthLadder')).toBe(false);
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

  it('opens no panel by itself, however wide: the host opens the one it wants', () => {
    width = 1920;
    make({ watchlist: true });
    expect(widget.getOpenPanel()).toBeNull();
    resize(2560);
    expect(widget.getOpenPanel()).toBeNull();
  });

  it('shuts any panel on going narrow, and opens none on going wide again', () => {
    make({ watchlist: true });
    widget.openPanel('watchlist');
    resize(390);
    expect(panel().hidden).toBe(true);
    resize(1366);
    expect(widget.getOpenPanel()).toBeNull();
  });

  it('on a phone, gives the keyboard to "more" when a panel opened from it shuts', () => {
    width = 390;
    make({ watchlist: true });
    widget.openPanel('alerts');
    inPanel('input')!.focus();
    inPanel('.tcw-alerts-close')!.click();
    expect(document.activeElement).toBe(host.querySelector('.tcw-toolbar-more'));
  });

  it('gives the keyboard to the Trade menu when the ladder shuts without its rail button', () => {
    make({ depthLadder: true, features: { 'dock.depthLadder': false } });
    widget.openPanel('depthLadder');
    inPanel('.tcw-ladder-close')!.focus();
    inPanel('.tcw-ladder-close')!.click();
    expect(document.activeElement).toBe(host.querySelector('.tcw-toolbar [data-role="trade"]'));
  });

  it('keeps a Tab stop on the rail with the watchlist’s button off', () => {
    make({ watchlist: true, features: { 'dock.watchlist': false } });
    expect(railButton('watchlist').tabIndex).toBe(-1);
    expect(railButton('alerts').tabIndex).toBe(0);
    widget.setFeatures({ 'dock.watchlist': true, 'dock.alerts': false });
    expect(railButton('watchlist').tabIndex).toBe(0);
  });

  it('starts shut without a watchlist', () => {
    make();
    expect(railPages()).toEqual(['alerts', 'objectTree', 'dataWindow', 'symbolInfo', 'orderTicket']);
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

  it('leaves the toolbar its alerts and objects buttons, and "more" too, only where the rail has none', () => {
    make();
    expect(visible(toolbarButton('toolbar.alerts'))).toBe(false);
    expect(visible(toolbarButton('toolbar.objectTree'))).toBe(false);
    widget.setFeatures({ 'dock.alerts': false });
    expect(visible(toolbarButton('toolbar.alerts'))).toBe(true);
    expect(visible(toolbarButton('toolbar.objectTree'))).toBe(false);
    resize(390);
    expect(visible(toolbarButton('toolbar.objectTree'))).toBe(true);
  });

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

  it('with the rail off, opens and shuts the watchlist from a toolbar button, as a grid’s charts have it', () => {
    make({ watchlist: { lists: [{ id: 'a', name: 'A', symbols: ['AAA'] }] } });
    const button = () => host.querySelector<HTMLButtonElement>('.tcw-toolbar [data-role="watchlist"]')!;
    // The rail has its own button for it.
    expect(visible(button())).toBe(false);
    widget.setFeatures({ dock: false });
    expect(visible(button())).toBe(true);
    button().click();
    expect(widget.getOpenPanel()).toBe('watchlist');
    expect(button().getAttribute('aria-pressed')).toBe('true');
    button().click();
    expect(panel().hidden).toBe(true);
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });

  it('has no watchlist button without a watchlist, or with its switch off', () => {
    make();
    widget.setFeatures({ dock: false });
    expect(host.querySelector('.tcw-toolbar [data-role="watchlist"]')).toBeNull();
    widget.destroy();
    make({ watchlist: { lists: [{ id: 'a', name: 'A', symbols: ['AAA'] }] }, features: { dock: false, 'dock.watchlist': false } });
    expect(visible(host.querySelector('.tcw-toolbar [data-role="watchlist"]'))).toBe(false);
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

describe('ChartWidget dock, pages of the host’s own', () => {
  const page = (id = 'fundamentals') => {
    const element = document.createElement('div');
    element.className = 'host-figures';
    element.textContent = 'P/E 12.4';
    const shown: string[] = [];
    return { spec: { id, label: 'Key figures', icon: 'info', element, onShow: () => shown.push('show'), onHide: () => shown.push('hide') }, element, shown };
  };

  it('puts its button on the rail after the built-in ones, and opens it from there and from code', () => {
    make({ watchlist: true });
    const { spec, element, shown } = page();
    const handle = widget.addDockPage(spec);
    expect(handle).not.toBeNull();
    expect(railPages()).toEqual(['watchlist', 'alerts', 'objectTree', 'dataWindow', 'symbolInfo', 'orderTicket', 'fundamentals']);
    expect(railButton('fundamentals').getAttribute('aria-label')).toBe('Key figures');
    expect(railButton('fundamentals').querySelector('svg')).not.toBeNull();
    const shownPage = () => visible(element.closest('.tcw-dock-page')) && !panel().hidden;
    expect(shownPage()).toBe(false);

    railButton('fundamentals').click();
    expect(widget.getOpenPanel()).toBe('fundamentals');
    expect(shownPage()).toBe(true);
    expect(railButton('fundamentals').getAttribute('aria-pressed')).toBe('true');
    expect(shown).toEqual(['show']);

    expect(widget.openPanel('watchlist')).toBe(true);
    expect(shown).toEqual(['show', 'hide']);
    expect(widget.openPanel('fundamentals')).toBe(true);
    expect(widget.getOpenPanel()).toBe('fundamentals');
  });

  it('gives it the dock’s header: its label, and a close that shuts the dock', () => {
    make();
    const { spec, element } = page();
    widget.addDockPage(spec);
    widget.openPanel('fundamentals');
    const header = inPanel('.tcw-dock-host-header')!;
    expect(header.textContent).toContain('Key figures');
    expect(header.closest('.tcw-dock-page')!.contains(element)).toBe(true);
    header.querySelector<HTMLButtonElement>('.tcw-dock-host-close')!.click();
    expect(widget.getOpenPanel()).toBeNull();
    expect(panel().hidden).toBe(true);
  });

  it('takes an icon of the host’s own', () => {
    make();
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('data-own', '');
    widget.addDockPage({ ...page().spec, icon });
    expect(railButton('fundamentals').querySelector('svg[data-own]')).toBe(icon);
  });

  it('refuses an id a built-in panel or another page has', () => {
    make();
    expect(widget.addDockPage(page('watchlist').spec)).toBeNull();
    expect(widget.addDockPage(page('alerts').spec)).toBeNull();
    expect(widget.addDockPage(page('mine').spec)).not.toBeNull();
    expect(widget.addDockPage(page('mine').spec)).toBeNull();
    expect(railPages().filter((p) => p === 'mine')).toHaveLength(1);
  });

  it('takes the page away with remove(), shutting it first if it is open', () => {
    make();
    const { spec, element, shown } = page();
    const handle = widget.addDockPage(spec)!;
    widget.openPanel('fundamentals');
    handle.remove();
    expect(shown).toEqual(['show', 'hide']);
    expect(widget.getOpenPanel()).toBeNull();
    expect(panel().hidden).toBe(true);
    expect(railPages()).not.toContain('fundamentals');
    expect(host.contains(element)).toBe(false);
    expect(widget.openPanel('fundamentals')).toBe(false);
    handle.remove();
    // Its id is free again.
    expect(widget.addDockPage(page().spec)).not.toBeNull();
  });

  it('keeps the keyboard in the widget when the page it was on goes', () => {
    make();
    const handle = widget.addDockPage(page().spec)!;
    railButton('fundamentals').focus();
    railButton('fundamentals').click();
    handle.remove();
    expect(document.activeElement).not.toBe(document.body);
    expect(host.contains(document.activeElement)).toBe(true);
  });

  it('is told nothing by a remove() after the widget is gone', () => {
    const changes: (string | null)[] = [];
    make({ onPanelChange: (panel) => changes.push(panel) });
    const { spec, shown } = page();
    const handle = widget.addDockPage(spec)!;
    widget.openPanel('fundamentals');
    widget.destroy();
    handle.remove();
    expect(shown).toEqual(['show']);
    expect(changes).toEqual(['fundamentals']);
  });

  it('tells onPanelChange which panel is open, whoever opened or shut it', () => {
    const changes: (string | null)[] = [];
    make({ watchlist: true, onPanelChange: (panel) => changes.push(panel) });
    widget.addDockPage(page().spec);
    railButton('fundamentals').click();
    widget.openPanel('watchlist');
    railButton('watchlist').click();
    widget.openPanel('fundamentals');
    widget.closePanel();
    expect(changes).toEqual(['fundamentals', 'watchlist', null, 'fundamentals', null]);
  });
});

// The ticket was a dialog over the chart: it hid the price it was filled in for, and a press outside lost it.
describe('ChartWidget: the order ticket in the dock', () => {
  const ticketForm = () => host.querySelector<HTMLElement>('.tcw-order-ticket');
  const backdropShown = () => [...host.querySelectorAll<HTMLElement>('.tcw-modal-backdrop')].some((b) => !b.hidden && b.contains(ticketForm()));

  it('is a page of the dock, its button on the rail, where the widget trades', () => {
    make();
    expect(railPages()).toContain('orderTicket');
    widget.trading.openOrderTicket();
    expect(widget.getOpenPanel()).toBe('orderTicket');
    expect(panel().contains(ticketForm())).toBe(true);
    expect(backdropShown()).toBe(false);
    expect(widget.trading.orderTicket!.isOpen()).toBe(true);
    expect(railButton('orderTicket').getAttribute('aria-pressed')).toBe('true');
  });

  it('opens from its rail button and from openPanel with a ticket at the market, and shuts with its page', () => {
    make();
    railButton('orderTicket').click();
    expect(widget.trading.orderTicket!.isOpen()).toBe(true);
    railButton('orderTicket').click();
    expect(widget.getOpenPanel()).toBeNull();
    expect(widget.trading.orderTicket!.isOpen()).toBe(false);
    expect(widget.openPanel('orderTicket')).toBe(true);
    expect(widget.trading.orderTicket!.isOpen()).toBe(true);
    // Another panel in its place: the ticket goes with its page.
    widget.openPanel('alerts');
    expect(widget.trading.orderTicket!.isOpen()).toBe(false);
  });

  it('shuts its page when it is shut by its own Cancel', () => {
    make();
    widget.trading.openOrderTicket();
    host.querySelector<HTMLButtonElement>('.tcw-order-ticket .tcw-footer-cancel')!.click();
    expect(widget.getOpenPanel()).toBeNull();
    expect(widget.trading.orderTicket!.isOpen()).toBe(false);
  });

  it('is the dialog where the widget asks for it, has no dock, or is a phone', () => {
    make({ ticketPlace: 'dialog' });
    expect(railPages()).not.toContain('orderTicket');
    expect(widget.openPanel('orderTicket')).toBe(false);
    widget.trading.openOrderTicket();
    expect(backdropShown()).toBe(true);
    expect(widget.getOpenPanel()).toBeNull();
    widget.destroy();
    host.replaceChildren();

    make({ features: { dock: false } });
    widget.trading.openOrderTicket();
    expect(backdropShown()).toBe(true);
    widget.destroy();
    host.replaceChildren();

    width = 390;
    make();
    resize(390);
    widget.trading.openOrderTicket();
    expect(backdropShown()).toBe(true);
    expect(widget.getOpenPanel()).toBeNull();
  });

  it('keeps an order half typed when the widget is made too narrow for a dock: the ticket goes on as the dialog', () => {
    make();
    widget.trading.openOrderTicket();
    const quantity = host.querySelector<HTMLInputElement>('.tcw-order-ticket input[type=number]')!;
    quantity.value = '7';
    quantity.dispatchEvent(new Event('input'));
    resize(390);
    expect(widget.getOpenPanel()).toBeNull();
    expect(widget.trading.orderTicket!.isOpen()).toBe(true);
    expect(backdropShown()).toBe(true);
    expect(host.querySelector<HTMLInputElement>('.tcw-order-ticket input[type=number]')!.value).toBe('7');
  });

  it('is no panel to open while the dock does not show: openPanel says so, and opens nothing', () => {
    width = 390;
    const changes: (string | null)[] = [];
    make({ onPanelChange: (panel) => changes.push(panel) });
    resize(390);
    changes.length = 0;
    expect(widget.openPanel('orderTicket')).toBe(false);
    expect(widget.trading.orderTicket!.isOpen()).toBe(false);
    expect(changes).toEqual([]);
  });

  it('has no page where the widget does not trade, or the ticket is switched off', () => {
    make({ trading: false });
    expect(railPages()).not.toContain('orderTicket');
    widget.destroy();
    host.replaceChildren();
    make({ features: { orderTicket: false } });
    expect(visible(railButton('orderTicket'))).toBe(false);
    expect(widget.openPanel('orderTicket')).toBe(false);
  });
});
