// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: emits the menus' events on demand. */
class FakeChart {
  static last: FakeChart;
  alerts: number[] = [];
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();

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
  addAlert(price: number): void { this.alerts.push(price); }
  tools: (string | null)[] = [];
  setDrawingTool(tool: string | null): void { this.tools.push(tool); }
  setups: unknown[][] = [];
  applyIndicatorSetup(list: unknown[]): void { this.setups.push(list); }
  getIndicatorSetup(): unknown[] { return [{ id: 'rsi', instanceId: 'tc_rsi_1', params: { period: 14 } }]; }
  getActiveIndicators(): unknown[] { return this.indicatorsShown; }
  indicatorsShown: unknown[] = [];
  roundPrice(p: number): number { return Math.round(p); }
  added: [string, Record<string, unknown>, string?, Record<string, unknown>?][] = [];
  addIndicator(id: string, params: Record<string, unknown>, position?: string, options?: Record<string, unknown>): string {
    this.added.push([id, params, position, options]);
    return `tc_${id}_${this.added.length}`;
  }
  moved: [string, string][] = [];
  moveIndicatorToPane(id: string, target: string): boolean { this.moved.push([id, target]); return true; }
  series = new Map<string, unknown>();
  setSymbolSeries(symbol: string, bars: unknown): void { this.series.set(symbol, bars); }
  getSymbolSeries(symbol: string): unknown { return this.series.get(symbol) ?? null; }
  shapes: unknown[] = [];
  setShapes(shapes: unknown): void { this.shapes.push(shapes); }
  chartTypeOptions: unknown = {};
  getChartTypeOptions(): unknown { return this.chartTypeOptions; }
  required: string[] = [];
  getRequiredSymbols(): string[] { return this.required; }
  replays: Record<string, unknown>[] = [];
  replayStart(config: Record<string, unknown>): void { this.replays.push(config); this.replaying = true; }
  replaying = false;
  isReplayActive(): boolean { return this.replaying; }
  getReplayProgress() { return { current: 0, total: 10, percent: 0 }; }
  replayState = 'paused';
  getReplayState(): string { return this.replayState; }
  replayBarIndex = 0;
  getReplayBarIndex(): number { return this.replayBarIndex; }
  resumed = 0;
  replayResume(): void { this.resumed++; this.replayState = 'playing'; }
  barsLoaded: { time: number; close: number }[] = [];
  setData(bars: { time: number; close: number }[]): void { this.barsLoaded = bars; }
  timeframes: string[] = [];
  getData(): { close: number; time: number }[] { return this.barsLoaded.length ? this.barsLoaded : [{ close: 100, time: 0 }]; }
  getDrawings(): unknown[] { return []; }
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
  widget.destroy();
  host.remove();
});

const menuItems = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu [role^=menuitem]')];

describe('ChartWidget toolbar buttons of the host', () => {
  it('adds a button that calls back, switches and goes away', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const clicks: HTMLButtonElement[] = [];
    const handle = widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick: (b) => clicks.push(b) })!;
    const btn = host.querySelector<HTMLButtonElement>('[data-host-button="news"]')!;
    expect(btn).toBe(handle.element);
    expect(btn.getAttribute('aria-label')).toBe('News');
    expect(btn.querySelector('svg')).not.toBeNull();
    btn.click();
    expect(clicks).toEqual([btn]);
    handle.setActive(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    handle.setText('3');
    expect(btn.textContent).toBe('3');
    expect(btn.getAttribute('aria-label')).toBe('News: 3');
    handle.remove();
    expect(host.querySelector('[data-host-button="news"]')).toBeNull();
  });

  it('puts a text button on the left with the chart controls', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    widget.addToolbarButton({ id: 'scan', label: 'Scanner', side: 'left', onClick: () => {} });
    const btn = host.querySelector<HTMLButtonElement>('[data-host-button="scan"]')!;
    expect(btn.textContent).toBe('Scanner');
    expect(btn.hasAttribute('aria-label')).toBe(false); // its text names it
    // Before the spacer that pushes the panel buttons right.
    const spacer = host.querySelector('.tcw-toolbar-spacer')!;
    expect(btn.compareDocumentPosition(spacer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has nowhere to put a button without a toolbar', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, toolbar: false });
    expect(widget.addToolbarButton({ id: 'x', label: 'X', onClick: () => {} })).toBeNull();
  });
});

describe('ChartWidget menu entries of the host', () => {
  it('adds the host’s entries after the widget’s, with where the menu opened', () => {
    const seen: unknown[] = [];
    const picked: string[] = [];
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      watchlist: false,
      chartMenuItems: (context) => {
        seen.push(context);
        return [{ label: 'Copy price', icon: 'check', onSelect: () => picked.push('copy') }];
      },
    });
    FakeChart.last.emit('chartContextMenu', { area: 'plot', x: 10, y: 10, price: 95, time: 1000 });
    expect(seen).toEqual([{ area: 'plot', price: 95, time: 1000 }]);
    const labels = menuItems().map((b) => b.textContent);
    expect(labels[labels.length - 1]).toBe('Copy price');
    expect(labels.length).toBeGreaterThan(1);
    menuItems()[labels.length - 1].click();
    expect(picked).toEqual(['copy']);

    // The widget's own entries still work.
    FakeChart.last.emit('priceAxisAdd', { price: 90, x: 0, y: 0 });
    expect(seen[1]).toEqual({ area: 'priceAxisAdd', price: 90 });
    menuItems().find((b) => b.textContent?.startsWith('Add alert'))!.click();
    expect(FakeChart.last.alerts).toEqual([90]);
  });

  it('opens a menu of only the host’s entries where the widget has none', () => {
    widget = new ChartWidget(host, {
      symbol: 'AAA',
      watchlist: false,
      alerts: false,
      trading: false,
      drawingTools: false,
      chartMenuItems: () => [{ label: 'Mine', onSelect: () => {} }],
    });
    FakeChart.last.emit('priceAxisAdd', { price: 90, x: 0, y: 0 });
    expect(menuItems().map((b) => b.textContent)).toEqual(['Mine']);
  });
});

describe('ChartWidget keys for tools and intervals', () => {
  const press = () => host.querySelector('.tcw-root')!.dispatchEvent(new Event('pointerdown'));

  it('picks a drawing tool with Alt and a letter', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    press();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', altKey: true, cancelable: true }));
    expect(FakeChart.last.tools).toEqual(['trendLine']);
  });

  it('leaves the keys to a dialog that has focus', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    press();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    host.querySelector('.tcw-root')!.appendChild(dialog);
    button.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', altKey: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '5', cancelable: true }));
    expect(FakeChart.last.tools).toEqual([]);
    expect(host.querySelector<HTMLElement>('.tcw-interval-input')!.hidden).toBe(true);
  });

  it('opens the interval field on a digit once the chart was used, and switches on Enter', () => {
    const changes: string[] = [];
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, onTimeframeChange: (tf) => changes.push(tf) });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', cancelable: true }));
    expect(host.querySelector<HTMLElement>('.tcw-interval-input')!.hidden).toBe(true); // not used yet
    press();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', cancelable: true }));
    const field = host.querySelector<HTMLInputElement>('.tcw-interval-field')!;
    expect(field.value).toBe('4');
    field.value = '4h';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(changes).toEqual(['4h']);
  });
});

describe('ChartWidget indicator templates', () => {
  beforeEach(() => localStorage.clear());

  it('saves the chart’s indicators under a name and applies them', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.indicatorsShown = [{ id: 'rsi', instanceId: 'tc_rsi_1', params: {}, visible: true, descriptor: { defaultConfig: {} } }];
    host.querySelector<HTMLButtonElement>('[data-tpl-save]')!.click();
    // The open prompt (the layouts have one of their own).
    const prompt = [...host.querySelectorAll<HTMLFormElement>('.tcw-name-prompt')].find((f) => !f.closest('.tcw-modal-backdrop')!.hasAttribute('hidden'))!;
    const input = prompt.querySelector('input')!;
    input.value = 'Momentum';
    input.dispatchEvent(new Event('input'));
    prompt.dispatchEvent(new Event('submit', { cancelable: true }));
    return Promise.resolve().then(() => {
      const apply = host.querySelector<HTMLButtonElement>('[data-tpl-apply="Momentum"]')!;
      expect(apply).not.toBeNull();
      apply.click();
      expect(FakeChart.last.setups).toEqual([[{ id: 'rsi', instanceId: 'tc_rsi_1', params: { period: 14 } }]]);
    });
  });

  it('says there is nothing to save without indicators', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    host.querySelector<HTMLButtonElement>('[data-tpl-save]')!.click();
    const open = [...host.querySelectorAll('.tcw-name-prompt')].filter((f) => !f.closest('.tcw-modal-backdrop')!.hasAttribute('hidden'));
    expect(open).toEqual([]);
  });
});

describe('ChartWidget prices on the market grid', () => {
  it('rounds the price a menu offers', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.emit('priceAxisAdd', { price: 90.4, x: 0, y: 0 });
    menuItems().find((b) => b.textContent?.startsWith('Add alert'))!.click();
    expect(FakeChart.last.alerts).toEqual([90]);
  });
});

describe('ChartWidget replay in finer steps', () => {
  it('offers the finer intervals the loaded bars have, and replays through them', async () => {
    const MIN15 = 15 * 60_000;
    const bars = Array.from({ length: 64 }, (_, i) => ({ time: i * MIN15, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h' });
    widget.setData(bars as never);
    await new Promise((r) => setTimeout(r, 0));
    widget.toggleReplay();
    const select = host.querySelector<HTMLSelectElement>('.tcw-replay-step')!;
    expect([...select.options].map((o) => o.value)).toEqual(['bar', '15m', '30m']);
    select.value = '15m';
    select.dispatchEvent(new Event('change'));
    host.querySelector<HTMLButtonElement>('[data-act="random"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
    const config = FakeChart.last.replays.at(-1)!;
    expect((config.steps as unknown[]).length).toBe(64);
  });

  it('switches steps mid-replay from the bar before the forming one, still playing', async () => {
    const MIN15 = 15 * 60_000;
    const bars = Array.from({ length: 64 }, (_, i) => ({ time: i * MIN15, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h' });
    widget.setData(bars as never);
    await new Promise((r) => setTimeout(r, 0));
    widget.replayFrom(8, true);
    const fake = FakeChart.last;
    fake.replayBarIndex = 10;
    const resumed = fake.resumed;
    const select = host.querySelector<HTMLSelectElement>('.tcw-replay-step')!;
    select.value = '15m';
    select.dispatchEvent(new Event('change'));
    select.value = '30m'; // a second choice before the first one's steps are in
    select.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    const restarts = fake.replays.slice(1);
    expect(restarts).toHaveLength(1);
    expect(restarts[0]).toMatchObject({ startIndex: 9 });
    expect((restarts[0].steps as unknown[]).length).toBe(32);
    expect(fake.resumed).toBe(resumed + 1);
  });
});

describe('ChartWidget signal marker note', () => {
  it('shows what a marker is while the pointer is on it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const marker = { id: 'm1', time: Date.UTC(2026, 0, 1), price: 101, direction: 'long', confidence: 0.82, source: 'momentum', label: 'EMA cross' };
    FakeChart.last.emit('signalMarkerHover', { marker, x: 40, y: 80 });
    const tip = host.querySelector<HTMLElement>('.tcw-marker-tip')!;
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toContain('EMA cross · momentum');
    expect(tip.textContent).toContain('Long · 101.00 · confidence 82%');
    FakeChart.last.emit('signalMarkerHover', { marker: null, x: 0, y: 0 });
    expect(tip.hidden).toBe(true);
  });
});

describe('ChartWidget comparing with another symbol', () => {
  const HOUR = 3_600_000;
  const bars = Array.from({ length: 5 }, (_, i) => ({ time: i * HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  const adapter = {
    name: 'fake',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: vi.fn(async () => bars),
    on: () => {},
    off: () => {},
    dispose: () => {},
  };

  it('puts the other symbol on its own scale, in its own pane, or as a spread or ratio', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, adapter: adapter as never });
    const fake = FakeChart.last;
    await widget.addCompareSymbol('BBB', 'scale');
    await widget.addCompareSymbol('BBB', 'pane');
    await widget.addCompareSymbol('BBB', 'ratio');
    expect(fake.added).toEqual([
      ['compareSymbol', { symbol: 'BBB' }, 'bottom', { scale: 'left' }],
      ['compareSymbol', { symbol: 'BBB' }, undefined, undefined],
      ['spread', { symbol: 'BBB', mode: 'ratio' }, undefined, undefined],
    ]);
    expect(fake.moved).toEqual([['tc_compareSymbol_2', 'new']]);
  });

  it('fetches the bars a chart’s indicator asks for, and again on a new interval', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, adapter: adapter as never, timeframe: '1h' });
    const fake = FakeChart.last;
    fake.emit('symbolSeriesRequest', { symbol: 'BBB' });
    await new Promise((r) => setTimeout(r, 0));
    expect(fake.series.get('BBB')).toBe(bars);
    expect(adapter.fetchHistory).toHaveBeenLastCalledWith('BBB', '1h', expect.any(Number));
  });
});

describe('ChartWidget round 8 review', () => {
  it('lets the chart ask again after a failed fetch', async () => {
    const failing = {
      name: 'fake', connect: () => {}, disconnect: () => {}, getConnectionState: () => 'connected',
      fetchHistory: vi.fn(async () => { throw new Error('451'); }), on: () => {}, off: () => {}, dispose: () => {},
    };
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, adapter: failing as never });
    FakeChart.last.emit('symbolSeriesRequest', { symbol: 'BBB' });
    await new Promise((r) => setTimeout(r, 0));
    expect(FakeChart.last.series.get('BBB')).toBeNull(); // what it had: nothing
  });

  it('starts its settings where the chart options put them', () => {
    widget = new ChartWidget(host, {
      symbol: 'AAA', watchlist: false,
      chartOptions: { highLowLines: true, extendedHours: false, chartTypeOptions: { renko: { boxSize: 5 } } },
    });
    const settings = (widget as unknown as { settingsState: Record<string, unknown> }).settingsState;
    expect(settings).toMatchObject({ highLowLines: true, extendedHours: false, chartTypeOptions: { renko: { boxSize: 5 } } });
  });
});

describe('ChartWidget symbol fetches out of order', () => {
  it('lets only the latest fetch of a symbol answer', async () => {
    const bars = [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
    let failFirst: (e: Error) => void = () => {};
    const fetchHistory = vi.fn()
      .mockImplementationOnce(() => new Promise((_, reject) => { failFirst = reject; }))
      .mockImplementationOnce(async () => bars);
    const adapter = { name: 'fake', connect: () => {}, disconnect: () => {}, getConnectionState: () => 'connected', fetchHistory, on: () => {}, off: () => {}, dispose: () => {} };
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, adapter: adapter as never });
    const fake = FakeChart.last;
    fake.emit('symbolSeriesRequest', { symbol: 'BBB' });
    fake.emit('symbolSeriesRequest', { symbol: 'BBB' });
    await new Promise((r) => setTimeout(r, 0));
    failFirst(new Error('late'));
    await new Promise((r) => setTimeout(r, 0));
    expect(fake.series.get('BBB')).toBe(bars);
  });
});

describe('ChartWidget look', () => {
  it('starts in the Studio look, takes a preset or a theme, and gives the chart its tag shape', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const root = host.querySelector<HTMLElement>('.tcw-root')!;
    expect(root.dataset.tcwUi).toBe('studio');
    // Without `ui` the tokens stay the stylesheet's (Studio's), yours to override in CSS.
    expect(root.style.getPropertyValue('--tcw-control-radius')).toBe('');
    expect(FakeChart.last.shapes.at(-1)).toEqual({ tagRadius: 4 });

    widget.setUI({ preset: 'capsule', radius: { lg: 14 } });
    expect(root.dataset.tcwToolbar).toBe('floating');
    expect(root.style.getPropertyValue('--tcw-menu-radius')).toBe('14px');
    expect(FakeChart.last.shapes.at(-1)).toEqual({ tagRadius: 999 });
    expect(widget.getUI().preset).toBe('capsule');
    // The modal portal carries the same look.
    const portal = (widget as unknown as { portal: HTMLElement }).portal;
    expect(portal.dataset.tcwToolbar).toBe('floating');
  });

  it('takes the look from its options', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, ui: 'terminal' });
    const root = host.querySelector<HTMLElement>('.tcw-root')!;
    expect(root.dataset.tcwSeparators).toBe('on');
    expect(root.style.getPropertyValue('--tcw-control-h')).toBe('26px');
  });
});
