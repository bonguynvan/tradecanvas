// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartOptions, DrawingState, PriceScaleMode } from '@tradecanvas/commons';

type Box = { x: number; y: number; width: number; height: number };

/** A chart that keeps what the widget's bars read: drawings and their flags, the scale. */
class FakeChart {
  static last: FakeChart;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  drawings: DrawingState[] = [
    { id: 'd1', type: 'trendLine', visible: true, locked: false, anchors: [], style: { color: '#2348c4', lineWidth: 1, lineStyle: 'solid' } },
    { id: 'd2', type: 'horizontalLine', visible: true, locked: false, anchors: [], style: { color: '#2348c4', lineWidth: 1, lineStyle: 'solid' } },
  ];
  selected: string[] = [];
  scaleMode: PriceScaleMode = 'regular';
  auto = true;

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }

  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown = {}): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  select(ids: string[]): void {
    this.selected = ids;
    this.emit('drawingSelect', { ids, primary: ids[0] ?? null });
  }
  getDrawings(): DrawingState[] { return this.drawings; }
  getSelectedDrawingIds(): string[] { return this.selected; }
  isDrawingShown(id: string): boolean { return this.drawings.some((d) => d.id === id && d.visible); }
  setDrawingsLocked(ids: string[], locked: boolean): void {
    this.drawings = this.drawings.map((d) => (ids.includes(d.id) ? { ...d, locked } : d));
  }
  setDrawingsVisible(ids: string[], visible: boolean): void {
    this.drawings = this.drawings.map((d) => (ids.includes(d.id) ? { ...d, visible } : d));
  }
  clearDrawings(): void { this.drawings = []; }
  activeIndicators: { instanceId: string; visible?: boolean; [key: string]: unknown }[] = [];
  setIndicatorsVisible(ids: string[], visible: boolean): void {
    this.activeIndicators = this.activeIndicators.map((i) => (ids.includes(i.instanceId) ? { ...i, visible } : i));
  }
  tradingVisible = true;
  tradingLocked = false;
  setTradingVisible(on: boolean): void { this.tradingVisible = on; }
  isTradingVisible(): boolean { return this.tradingVisible; }
  setTradingLocked(on: boolean): void { this.tradingLocked = on; }
  isTradingLocked(): boolean { return this.tradingLocked; }
  getFeatures(): Record<string, boolean> { return { trading: this.options.features?.trading !== false }; }
  magnetModes: string[] = [];
  setDrawingMagnetMode(mode: string): void { this.magnetModes.push(mode); }
  removed: string[] = [];
  removeAll(what: string): { drawings: number; indicators: number } {
    this.removed.push(what);
    const drawings = what === 'indicators' ? 0 : this.drawings.filter((d) => !d.locked).length;
    const indicators = what === 'drawings' ? 0 : this.activeIndicators.length;
    if (what !== 'indicators') this.drawings = this.drawings.filter((d) => d.locked);
    if (what !== 'drawings') this.activeIndicators = [];
    return { drawings, indicators };
  }
  getDrawingRect(): Box { return { x: 200, y: 160, width: 120, height: 60 }; }
  getDrawingTool(): string | null { return null; }
  isEraserMode(): boolean { return false; }
  isZoomAreaMode(): boolean { return false; }
  getPlotRect(): Box { return { x: 0, y: 0, width: 800, height: 500 }; }
  canAddDrawingAlert(): boolean { return false; }
  getScaleMode(): PriceScaleMode { return this.scaleMode; }
  setScaleMode(mode: PriceScaleMode): void { this.scaleMode = mode; }
  isAutoScale(): boolean { return this.auto; }
  setAutoScale(on: boolean): void { this.auto = on; }
  getData(): unknown[] { return []; }
  getActiveIndicators(): { instanceId: string; visible?: boolean; [key: string]: unknown }[] { return this.activeIndicators; }
  getIndicatorPanes(): unknown[] { return []; }
  getLegendBottom(): number { return 0; }
  isTimeAligned(): boolean { return true; }
  dataTimeframes: (string | null)[] = [];
  isTimeframeAllowed(): boolean { return true; }
  setDataTimeframe(tf: string | null): void { this.dataTimeframes.push(tf); }
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
  widget.destroy();
  host.remove();
});

const role = (name: string) => host.querySelector<HTMLButtonElement>(`[data-role="${name}"]`);
const pressed = (name: string) => role(name)?.getAttribute('aria-pressed');

describe('lock all and hide all', () => {
  it('follow a lock made on the selected drawing’s toolbar', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    expect(pressed('lockAll')).toBe('false');
    FakeChart.last.select(['d1', 'd2']);
    host.querySelector<HTMLButtonElement>('.tcw-sel-toolbar [data-action="lock"]')!.click();
    expect(pressed('lockAll')).toBe('true');
  });

  it('let go once there are no drawings left', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    role('hideAll')!.click();
    expect(pressed('hideAll')).toBe('true');
    trash().click();
    menuItem('drawings')!.click();
    expect(pressed('hideAll')).toBe('false');
  });

  it('keep one name and say whether they are on', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    role('lockAll')!.click();
    expect(role('lockAll')!.getAttribute('aria-label')).toBe('Lock all drawings');
    expect(pressed('lockAll')).toBe('true');
  });
});

const trash = () => host.querySelector<HTMLButtonElement>('[data-tcw-part~="sidebar.clear"]')!;
const openItems = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^=menuitem]')];
const menuItem = (id: string) => openItems().find((item) => item.dataset.id === id);

describe('the trash button', () => {
  it('offers to remove the drawings when there are only drawings', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    trash().click();
    expect(trash().getAttribute('aria-haspopup')).toBe('menu');
    expect(trash().getAttribute('aria-expanded')).toBe('true');
    expect(openItems().map((item) => item.dataset.id)).toEqual(['drawings']);
  });

  it('offers drawings, indicators or both, each with how many there are', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.activeIndicators = [{ instanceId: 'rsi' }];
    trash().click();
    expect(openItems().map((item) => item.dataset.id)).toEqual(['drawings', 'indicators', 'all']);
    expect(menuItem('drawings')!.textContent).toContain('2');
    expect(menuItem('indicators')!.textContent).toContain('1');
    menuItem('all')!.click();
    expect(FakeChart.last.removed).toEqual(['all']);
    expect(openItems()).toEqual([]);
  });

  it('removes only what was picked', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.activeIndicators = [{ instanceId: 'rsi' }];
    trash().click();
    menuItem('indicators')!.click();
    expect(FakeChart.last.removed).toEqual(['indicators']);
    expect(FakeChart.last.drawings).toHaveLength(2);
  });

  it('counts locked drawings out, as they stay', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.drawings = FakeChart.last.drawings.map((d) => (d.id === 'd1' ? { ...d, locked: true } : d));
    trash().click();
    expect(menuItem('drawings')!.textContent).toContain('1');
  });

  it('opens nothing when there is nothing to remove, and closes on a second press', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    trash().click();
    expect(openItems()).toHaveLength(1);
    trash().click();
    expect(openItems()).toEqual([]);
    FakeChart.last.drawings = [];
    trash().click();
    expect(openItems()).toEqual([]);
  });
});

describe('the status bar’s scale switches', () => {
  it('show the chart’s own mode, however it was set', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.scaleMode = 'logarithmic';
    FakeChart.last.emit('priceRangeChange');
    expect(host.querySelector('[data-scale="log"]')!.getAttribute('aria-pressed')).toBe('true');
    host.querySelector<HTMLButtonElement>('[data-scale="log"]')!.click();
    expect(FakeChart.last.scaleMode).toBe('regular');
  });

  it('offer no log switch where the log scale is off', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, chartOptions: { features: { logScale: false } } });
    expect(host.querySelector('[data-scale="log"]')).toBeNull();
    expect(host.querySelector('[data-scale="percent"]')).not.toBeNull();
  });
});

describe('the toolbar’s Compare', () => {
  it('shows only with a data adapter to ask for the other symbol', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    expect(role('compare')).toBeNull();
  });
});

describe('the interval of static data', () => {
  it('goes to the chart, which has no stream to say it', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', timeframe: '1h', watchlist: false });
    expect(FakeChart.last.dataTimeframes).toEqual(['1h']);
    await widget.setTimeframe('1d');
    expect(FakeChart.last.dataTimeframes).toEqual(['1h', '1d']);
  });
});

describe('the hide, lock and magnet buttons’ menus', () => {
  /** An indicator as the objects list reads it. */
  const indicator = (instanceId: string, visible: boolean) => ({ instanceId, visible, id: 'sma', params: {}, descriptor: { name: 'SMA' } });
  const shown = (fake: FakeChart) => fake.activeIndicators.map((i) => i.visible);
  const menuOf = (name: string) => host.querySelector<HTMLButtonElement>(`[data-role="${name}"] ~ .tcw-sidebar-menu-btn, [data-menu-for="${name}"]`)!;
  const label = (name: string) => role(name)!.getAttribute('aria-label') ?? role(name)!.title;

  it('hides the indicators, or the positions and orders, from the hide menu, and the button then toggles that', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, trading: true });
    const fake = FakeChart.last;
    fake.activeIndicators = [indicator('i1', true), indicator('i2', false)];
    menuOf('hideAll').click();
    expect(openItems().map((i) => i.dataset.id)).toEqual(['drawings', 'indicators', 'trading', 'all']);
    menuItem('indicators')!.click();
    // Only the one that showed is hidden, and only it comes back.
    expect(shown(fake)).toEqual([false, false]);
    expect(pressed('hideAll')).toBe('true');
    expect(label('hideAll')).toBe('Hide indicators');
    role('hideAll')!.click();
    expect(shown(fake)).toEqual([true, false]);
    expect(pressed('hideAll')).toBe('false');
    menuOf('hideAll').click();
    menuItem('trading')!.click();
    expect(fake.tradingVisible).toBe(false);
    expect(fake.drawings.every((d) => d.visible)).toBe(true);
  });

  it('remembers every indicator it hid, through one added meanwhile, and shows them all again', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, trading: true });
    const fake = FakeChart.last;
    fake.activeIndicators = [indicator('i1', true), indicator('i2', true)];
    menuOf('hideAll').click();
    menuItem('indicators')!.click();
    fake.activeIndicators = [...fake.activeIndicators, indicator('i3', true)];
    role('hideAll')!.click();
    expect(shown(fake)).toEqual([false, false, false]);
    role('hideAll')!.click();
    expect(shown(fake)).toEqual([true, true, true]);
  });

  it('follows an indicator shown again from elsewhere', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, trading: true });
    const fake = FakeChart.last;
    fake.activeIndicators = [indicator('i1', true)];
    menuOf('hideAll').click();
    menuItem('indicators')!.click();
    expect(pressed('hideAll')).toBe('true');
    fake.activeIndicators = [indicator('i1', true)];
    fake.emit('indicatorChange', { instanceId: 'i1', change: 'visible' });
    expect(pressed('hideAll')).toBe('false');
  });

  it('hides everything with Hide all, and ticks what is hidden', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, trading: true });
    const fake = FakeChart.last;
    fake.activeIndicators = [indicator('i1', true)];
    menuOf('hideAll').click();
    menuItem('all')!.click();
    expect(fake.drawings.every((d) => !d.visible)).toBe(true);
    expect(fake.activeIndicators[0].visible).toBe(false);
    expect(fake.tradingVisible).toBe(false);
    menuOf('hideAll').click();
    expect(openItems().map((i) => i.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true', 'true']);
  });

  it('locks the positions and orders from the lock menu', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, trading: true });
    const fake = FakeChart.last;
    menuOf('lockAll').click();
    expect(openItems().map((i) => i.dataset.id)).toEqual(['drawings', 'trading', 'all']);
    menuItem('trading')!.click();
    expect(fake.tradingLocked).toBe(true);
    expect(fake.drawings.some((d) => d.locked)).toBe(false);
    expect(pressed('lockAll')).toBe('true');
    role('lockAll')!.click();
    expect(fake.tradingLocked).toBe(false);
  });

  it('offers no positions and orders without trading', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, trading: false });
    menuOf('hideAll').click();
    expect(openItems().map((i) => i.dataset.id)).toEqual(['drawings', 'indicators', 'all']);
  });

  it('turns the magnet on and off with a click, in the strength the menu chose', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const fake = FakeChart.last;
    // What the widget set as it started.
    const from = fake.magnetModes.length;
    role('magnet')!.click();
    role('magnet')!.click();
    menuOf('magnet').click();
    expect(openItems().map((i) => i.dataset.id)).toEqual(['weak', 'strong']);
    menuItem('strong')!.click();
    role('magnet')!.click();
    role('magnet')!.click();
    expect(fake.magnetModes.slice(from)).toEqual(['weak', 'off', 'strong', 'off', 'strong']);
  });
});
