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
const { WIDGET_FEATURES } = await import('../widgetFeatures.js');
const { WidgetSettings } = await import('../WidgetSettings.js');

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

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, ...options });
  return widget;
};
const root = () => host.querySelector<HTMLElement>('.tcw-root')!;
const off = () => (root().dataset.tcwOff ?? '').split(' ').filter(Boolean);
const menuItems = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^=menuitem]')];
const menuLabels = () => menuItems().map((b) => b.querySelector('.tcw-context-label')?.textContent);
const menuItem = (label: string) => menuItems().find((b) => b.querySelector('.tcw-context-label')?.textContent === label)!;
const press = () => root().dispatchEvent(new Event('pointerdown'));
const key = (init: KeyboardEventInit) => document.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));

describe('ChartWidget feature switches', () => {
  it('marks the parts of the bars and their buttons with their switches', () => {
    make({ trading: true, depthLadder: true });
    const parts = new Set([...document.querySelectorAll<HTMLElement>('[data-tcw-part]')].flatMap((el) => el.dataset.tcwPart!.split(' ')));
    const expected = [
      'toolbar', 'sidebar', 'statusBar',
      'toolbar.symbol', 'toolbar.symbolInfo', 'symbolInfo', 'toolbar.timeframes', 'toolbar.timeframeMenu',
      'toolbar.chartType', 'toolbar.indicators', 'toolbar.layouts', 'layouts', 'toolbar.replay', 'replay',
      // The trading tools are one menu: its button, and each entry under its own switches.
      // (Compare shows with a data adapter: ChartWidget.chrome.test.)
      'toolbar.trade', 'toolbar.undo', 'toolbar.redo',
      'toolbar.objectTree', 'objectTree', 'toolbar.alerts', 'alerts', 'toolbar.screenshot',
      'screenshot', 'toolbar.settings', 'settings', 'toolbar.themeToggle', 'themeToggle',
      'sidebar.cursor', 'sidebar.favorites', 'sidebar.lines', 'sidebar.fibonacci', 'sidebar.patterns',
      'sidebar.forecasting', 'sidebar.annotation', 'sidebar.style', 'sidebar.magnet', 'sidebar.eraser',
      'sidebar.zoomArea', 'sidebar.stayInDrawing', 'sidebar.undo', 'sidebar.redo', 'sidebar.clear',
      'sidebar.lockAll', 'sidebar.hideAll',
      // The legend names the symbol now: statusBar.symbol stays a name, with nothing left to switch.
      'statusBar.range', 'statusBar.goToDate', 'goToDate', 'statusBar.market', 'statusBar.connection',
      'statusBar.clock', 'statusBar.scale',
      'navigation', 'navigation.zoom', 'navigation.scroll', 'navigation.reset', 'indicatorLegend', 'customTimeframes',
      // The dock's rail and its buttons.
      'dock', 'dock.alerts', 'dock.objectTree', 'dock.dataWindow', 'dock.symbolInfo', 'dataWindow',
      // (indicatorTemplates marks a tab of the indicators dialog: WidgetIndicatorPicker.test.)
    ];
    for (const name of expected) expect(parts, name).toContain(name);
    for (const name of parts) expect(WIDGET_FEATURES, name).toContain(name);
  });

  it('switches a part off and on again while running, on the widget and its dialogs alike', () => {
    make();
    const button = host.querySelector<HTMLElement>('[data-tcw-part~="toolbar.screenshot"]')!;
    expect(getComputedStyle(button).display).not.toBe('none');
    widget.setFeatures({ 'toolbar.screenshot': false });
    expect(off()).toEqual(['toolbar.screenshot']);
    expect(document.querySelector<HTMLElement>('.tcw-portal')?.dataset.tcwOff ?? 'toolbar.screenshot').toBe('toolbar.screenshot');
    expect(getComputedStyle(button).display).toBe('none');
    expect(widget.isFeatureOn('toolbar.screenshot')).toBe(false);
    widget.setFeatures({ 'toolbar.screenshot': true });
    expect(off()).toEqual([]);
    expect(getComputedStyle(button).display).not.toBe('none');
  });

  it('sizes the chart again when a bar comes or goes', () => {
    make();
    FakeChart.last.resizes = 0;
    widget.setFeatures({ 'toolbar.screenshot': false });
    expect(FakeChart.last.resizes).toBe(0);
    widget.setFeatures({ toolbar: false });
    widget.setFeatures({ statusBar: false, sidebar: false });
    expect(FakeChart.last.resizes).toBe(2);
  });

  it('reports every switch', () => {
    make({ features: { 'statusBar.market': false } });
    const all = widget.getFeatures();
    expect(Object.keys(all)).toHaveLength(WIDGET_FEATURES.length);
    expect(all['statusBar.market']).toBe(false);
    expect(all.toolbar).toBe(true);
  });

  it('builds a bar an old option left out, so it can be switched on later', () => {
    make({ toolbar: false, statusBar: false });
    expect(off()).toEqual(expect.arrayContaining(['toolbar', 'statusBar', 'goToDate']));
    expect(host.querySelector('.tcw-toolbar')).not.toBeNull();
    widget.setFeatures({ toolbar: true });
    expect(off()).not.toContain('toolbar');
    expect(widget.addToolbarButton({ id: 'x', label: 'X', onClick: () => {} })).not.toBeNull();
  });
});

describe('ChartWidget menus by switch', () => {
  it('leaves switched-off entries out of the chart menu, and the whole menu when it is off', () => {
    make();
    FakeChart.last.emit('chartContextMenu', { area: 'plot', x: 10, y: 10, price: 95 });
    const all = menuLabels();
    expect(all.some((l) => l?.startsWith('Add alert'))).toBe(true);
    expect(all).toContain('Reset chart view');
    widget.setFeatures({ 'menu.chart.resetView': false, alerts: false });
    FakeChart.last.emit('chartContextMenu', { area: 'plot', x: 10, y: 10, price: 95 });
    expect(menuLabels()).not.toContain('Reset chart view');
    expect(menuLabels().some((l) => l?.startsWith('Add alert'))).toBe(false);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    widget.setFeatures({ 'menu.chart': false });
    FakeChart.last.emit('chartContextMenu', { area: 'plot', x: 10, y: 10, price: 95 });
    expect(menuLabels()).toEqual([]);
  });

  it('leaves switched-off entries out of a drawing menu', () => {
    make({ features: { 'menu.drawing.delete': false } });
    FakeChart.last.emit('drawingContextMenu', { id: 'd1', x: 10, y: 10 });
    expect(menuLabels().length).toBeGreaterThan(0);
    expect(menuLabels()).not.toContain('Delete');
  });

  it('takes the "+" by the price axis off the chart, and puts back what it was', () => {
    make();
    expect(FakeChart.last.features.priceAxisAddButton).toBe(true);
    widget.setFeatures({ 'menu.priceAxisAdd': false });
    expect(FakeChart.last.features.priceAxisAddButton).toBe(false);
    widget.setFeatures({ 'menu.priceAxisAdd': true });
    expect(FakeChart.last.features.priceAxisAddButton).toBe(true);
  });
});

describe('ChartWidget chart menus', () => {
  const plot = () => FakeChart.last.emit('chartContextMenu', { area: 'plot', x: 10, y: 10, price: 95 });
  const calls = (name: string) => FakeChart.last.calls.filter(([n]) => n === name).map(([, v]) => v);

  it('pastes copied drawings from the plot’s menu, offered only when some are copied', () => {
    make();
    plot();
    expect(menuLabels()).not.toContain('Paste');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    FakeChart.last.copied = true;
    plot();
    menuItem('Paste').click();
    expect(FakeChart.last.pasted).toBe(1);
  });

  it('removes the indicators, and leaves a comparison with another symbol', () => {
    make();
    FakeChart.last.indicators = [{ id: 'compareSymbol', instanceId: 'c1' }];
    plot();
    expect(menuLabels()).not.toContain('Remove indicators');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    FakeChart.last.indicators = [{ id: 'rsi', instanceId: 'r1' }, { id: 'compareSymbol', instanceId: 'c1' }, { id: 'sma', instanceId: 's1' }];
    plot();
    menuItem('Remove indicators').click();
    expect(FakeChart.last.removed).toEqual([['r1', 's1']]);
  });

  it('offers no removal of indicators where the chart takes none', () => {
    make({ chartOptions: { features: { indicators: false } } });
    FakeChart.last.indicators = [{ id: 'rsi', instanceId: 'r1' }];
    plot();
    expect(menuLabels()).not.toContain('Remove indicators');
  });

  it('sets the scale’s mode, side and labels from the price axis’s menu', () => {
    make();
    const axis = () => FakeChart.last.emit('chartContextMenu', { area: 'priceAxis', x: 10, y: 10, price: 95 });
    axis();
    expect(menuItem('Regular').getAttribute('aria-checked')).toBe('true');
    menuItem('Indexed to 100').click();
    expect(calls('setScaleMode')).toEqual(['indexedTo100']);
    axis();
    menuItem('Left price scale').click();
    expect(calls('setLeftPriceScaleVisible')).toEqual([true]);
    axis();
    menuItem('Labels').click();
    menuItem('Bar countdown').click();
    expect(calls('setBarCountdownVisible')).toEqual([false]);
    axis();
    menuItem('Lines').click();
    menuItem('Last price line').click();
    expect(calls('applyOverrides')).toEqual([{ 'lastPrice.visible': false }]);
  });

  it('opens the settings on the Scales tab from the price axis', () => {
    make();
    FakeChart.last.emit('chartContextMenu', { area: 'priceAxis', x: 10, y: 10, price: 95 });
    menuItem('Settings…').click();
    expect(document.querySelector('[role="tab"][data-tab="scales"]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('sets the time zone from the time axis’s menu', () => {
    make();
    FakeChart.last.emit('chartContextMenu', { area: 'timeAxis', x: 10, y: 10 });
    menuItem('Timezone').click();
    menuItem('UTC').click();
    expect(calls('setTimezone')).toEqual(['UTC']);
  });

  it('resets the view with Alt+R, and writes the key in the menu while it is on', () => {
    make();
    press();
    key({ code: 'KeyR', key: 'r', altKey: true });
    expect(calls('fitContent')).toHaveLength(1);
    plot();
    expect(menuItem('Reset chart view').getAttribute('aria-keyshortcuts')).toBe('Alt+R');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    widget.setFeatures({ 'hotkeys.resetView': false });
    key({ code: 'KeyR', key: 'r', altKey: true });
    expect(calls('fitContent')).toHaveLength(1);
    plot();
    expect(menuItem('Reset chart view').hasAttribute('aria-keyshortcuts')).toBe(false);
  });
});

describe('ChartWidget keys and behaviours by switch', () => {
  it('turns the widget’s keys off all together or one by one', () => {
    make();
    press();
    key({ code: 'KeyT', key: 't', altKey: true });
    expect(FakeChart.last.tools).toEqual(['trendLine']);
    widget.setFeatures({ 'hotkeys.tools': false });
    key({ code: 'KeyT', key: 't', altKey: true });
    expect(FakeChart.last.tools).toEqual(['trendLine']);
    widget.setFeatures({ 'hotkeys.tools': true, hotkeys: false });
    key({ code: 'KeyT', key: 't', altKey: true });
    key({ key: '?' });
    expect(FakeChart.last.tools).toEqual(['trendLine']);
    expect(document.querySelector('.tcw-hotkey-sheet, [aria-label="Keyboard shortcuts"]')).toBeNull();
  });

  it('stops typing an interval on the chart', () => {
    make({ features: { intervalTyping: false } });
    press();
    key({ key: '5' });
    expect(host.querySelector<HTMLElement>('.tcw-interval-input')!.hidden).toBe(true);
  });

  it('opens the symbol search on a letter typed on the chart, the letter in it', () => {
    make();
    key({ key: 'e' });
    expect(document.querySelector('.tcw-ss')).toBeNull(); // the chart not used yet
    press();
    key({ key: 'e', ctrlKey: true });
    key({ key: 'e', altKey: true });
    expect(document.querySelector('.tcw-ss')).toBeNull();
    key({ key: 'e' });
    expect(document.querySelector<HTMLInputElement>('.tcw-ss-input')?.value).toBe('e');
    // The dialog says so at its foot.
    expect(document.querySelector('.tcw-ss-foot')?.textContent).toMatch(/Type a letter on the chart/);
  });

  it('leaves letters to the page once it was pressed elsewhere, to Alt Gr and to an input method', () => {
    make();
    press();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    key({ key: 'e' });
    expect(document.querySelector('.tcw-ss')).toBeNull();
    press();
    key({ key: 'e', isComposing: true });
    key({ key: 'e', modifierAltGraph: true } as KeyboardEventInit);
    expect(document.querySelector('.tcw-ss')).toBeNull();
  });

  it('reads the letter by its key on another script’s keyboard', () => {
    make();
    press();
    key({ key: 'ش', code: 'KeyA' });
    expect(document.querySelector<HTMLInputElement>('.tcw-ss-input')?.value).toBe('a');
  });

  it('offers the panels, the dialogs and the view in the command palette, each with its keys', () => {
    make();
    press();
    key({ key: 'k', ctrlKey: true });
    const row = (id: string) => document.querySelector<HTMLElement>(`.tcw-cp-row[data-id="${id}"]`);
    expect(row('goToDate')?.querySelector('kbd')?.textContent).toBe('Alt+G');
    expect(row('resetView')?.querySelector('kbd')?.textContent).toBe('Alt+R');
    expect(row('invertScale')?.querySelector('kbd')?.textContent).toBe('Alt+I');
    expect(row('symbolSearch')?.querySelector('kbd')?.textContent).toMatch(/^(Ctrl|⌘)\+P$/);
    expect(row('hotkeys')?.querySelector('kbd')?.textContent).toBe('?');
    expect(row('trendLine')?.querySelector('kbd')?.textContent).toBe('Alt+T');
    expect(row('objectTree')).not.toBeNull();
    row('alerts')!.click();
    expect(widget.getOpenPanel()).toBe('alerts');
  });

  it('writes in the palette only the keys that work: none with the keys off, none a host took', () => {
    make({ features: { 'hotkeys.tools': false } });
    widget.addHotkey({ keys: 'Alt+G', label: 'Mine', onPress: () => {} });
    press();
    key({ key: 'k', ctrlKey: true });
    const row = (id: string) => document.querySelector<HTMLElement>(`.tcw-cp-row[data-id="${id}"]`);
    expect(row('trendLine')?.querySelector('kbd')).toBeNull();
    expect(row('goToDate')?.querySelector('kbd')).toBeNull();
    expect(row('resetView')?.querySelector('kbd')?.textContent).toBe('Alt+R');
    key({ key: 'k', ctrlKey: true });
    widget.setFeatures({ hotkeys: false });
    (widget as unknown as { toggleCommandPalette(): void }).toggleCommandPalette();
    expect(document.querySelectorAll('.tcw-cp-row kbd')).toHaveLength(0);
  });

  it('leaves out of the palette the commands switched off', () => {
    make({ features: { goToDate: false, alerts: false, hotkeySheet: false } });
    press();
    key({ key: 'k', ctrlKey: true });
    const ids = [...document.querySelectorAll<HTMLElement>('.tcw-cp-row')].map((r) => r.dataset.id);
    expect(ids).not.toContain('goToDate');
    expect(ids).not.toContain('alerts');
    expect(ids).not.toContain('hotkeys');
    expect(ids).toContain('resetView');
  });

  it('stops typing a symbol on the chart', () => {
    make({ features: { symbolTyping: false } });
    press();
    key({ key: 'e' });
    expect(document.querySelector('.tcw-ss')).toBeNull();
    key({ key: 'p', ctrlKey: true });
    expect(document.querySelector('.tcw-ss-foot')).toBeNull();
  });

  it('gives the panes their titles back without the indicators’ rows', () => {
    make();
    expect(FakeChart.last.paneTitles.at(-1)).toBe(false);
    widget.setFeatures({ indicatorLegend: false });
    expect(FakeChart.last.paneTitles.at(-1)).toBe(true);
    widget.setFeatures({ indicatorLegend: true });
    expect(FakeChart.last.paneTitles.at(-1)).toBe(false);
  });

  it('tells a fired alert with the bell of the icon set, not an emoji', () => {
    make();
    FakeChart.last.emit('alertTriggered', { price: 100, condition: 'crossing', message: 'hi' });
    const toast = host.querySelector<HTMLElement>('.tcw-toast')!;
    expect(toast.querySelector('.tcw-toast-icon svg')).not.toBeNull();
    expect(toast.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(toast.textContent).toContain('hi');
  });

  it('keeps quiet with the toasts off', () => {
    make({ features: { toasts: false } });
    FakeChart.last.emit('alertTriggered', { price: 100, condition: 'crossing', message: 'hi' });
    expect(host.querySelector('.tcw-toast')).toBeNull();
  });

  it('leaves switched-off commands out of the command palette', () => {
    make({ features: { settings: false, autoFib: false } });
    const items = (widget as unknown as { buildCommandItems(): { id: string; category: string }[] }).buildCommandItems();
    const actions = items.filter((i) => i.category === 'action').map((i) => i.id);
    expect(actions).not.toContain('settings');
    expect(actions).not.toContain('autoFib');
    expect(actions).toContain('screenshot');
  });

  it('opens no settings with them switched off', () => {
    const open = vi.spyOn(WidgetSettings.prototype, 'open');
    make({ features: { settings: false } });
    (widget as unknown as { openSettings(): void }).openSettings();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});

describe('ChartWidget switches after review', () => {
  type Inner = {
    openLegendMenu(id: string, anchor: HTMLElement): void;
    toggleAlerts(): void;
    alertsPanel: { isOpen(): boolean };
    selectTypedTimeframe(tf: string): boolean;
    say(message: string, kind?: 'info' | 'error'): void;
  };
  const inner = () => widget as unknown as Inner;

  it('leaves remove and settings out of an indicator’s menu with the row’s buttons off', () => {
    make({ features: { 'indicatorLegend.remove': false, 'indicatorLegend.settings': false } });
    const anchor = document.createElement('button');
    host.appendChild(anchor);
    FakeChart.last.getActiveIndicators = () => [{ instanceId: 'tc_rsi_1', id: 'rsi' }];
    inner().openLegendMenu('tc_rsi_1', anchor);
    expect(menuLabels()).toEqual([]);
  });

  it('closes what a switch turns off, and opens nothing switched off', () => {
    make();
    inner().toggleAlerts();
    expect(inner().alertsPanel.isOpen()).toBe(true);
    widget.setFeatures({ alerts: false });
    expect(inner().alertsPanel.isOpen()).toBe(false);
    inner().toggleAlerts();
    expect(inner().alertsPanel.isOpen()).toBe(false);
    widget.setFeatures({ symbolInfo: false });
    widget.toggleSymbolInfo(true);
    expect(getComputedStyle(host.querySelector('.tcw-syminfo')!).display).toBe('none');
  });

  it('fills a new alert with the price on the chart’s grid, not every digit of the last close', () => {
    make();
    FakeChart.last.getData = () => [{ close: 35217.052956, time: 0 }];
    inner().toggleAlerts();
    expect(host.querySelector<HTMLInputElement>('.tcw-alerts-form input[type="number"]')!.value).toBe('35217');
  });

  it('leaves Ctrl+K to the page without a command palette', () => {
    make({ features: { commandPalette: false } });
    press();
    const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('keeps the older options as they were', () => {
    make({ drawingTools: false, accountPanel: false });
    expect(widget.isFeatureOn('drawingSettings')).toBe(false);
    expect(widget.isFeatureOn('orderTicket')).toBe(false);
  });

  it('adds no interval typed on the chart without custom intervals', () => {
    make({ features: { customTimeframes: false } });
    expect(inner().selectTypedTimeframe('7m')).toBe(false);
  });

  it('still shows the widget’s errors with the notices off', () => {
    make({ features: { toasts: false } });
    inner().say('quiet');
    expect(host.querySelector('.tcw-toast')).toBeNull();
    inner().say('broken', 'error');
    expect(host.querySelector('.tcw-toast')?.textContent).toBe('broken');
  });

  it('hides the navigation pill once all its buttons are off', () => {
    make({ features: { 'navigation.zoom': false, 'navigation.scroll': false } });
    const nav = host.querySelector<HTMLElement>('.tcw-nav')!;
    expect(getComputedStyle(nav).display).not.toBe('none');
    widget.setFeatures({ 'navigation.reset': false });
    expect(getComputedStyle(nav).display).toBe('none');
  });

  it('marks the symbol button as not opening a search with the search off', () => {
    make({ features: { symbolSearch: false } });
    expect(host.querySelector('[data-role="symbol"]')!.getAttribute('aria-disabled')).toBe('true');
    widget.setFeatures({ symbolSearch: true });
    expect(host.querySelector('[data-role="symbol"]')!.hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('ChartWidget bracket bar', () => {
  it('sits in the chart, over its foot, clear of the tags along its top', () => {
    make({ trading: true });
    expect(host.querySelector('.tcw-chart-container > .tcw-bracket-bar')).not.toBeNull();
  });

  it('reads right to left in a right-to-left widget, though the chart under it does not', () => {
    make({ trading: true, dir: 'rtl' });
    (widget as unknown as { bracketBar: { show(side: 'buy' | 'sell'): void } }).bracketBar.show('buy');
    expect(host.querySelector<HTMLElement>('.tcw-chart-container')!.dir).toBe('ltr');
    expect(host.querySelector<HTMLElement>('.tcw-bracket-bar')!.dir).toBe('rtl');
  });
});
