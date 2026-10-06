// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';
import { memoryLayouts, type LayoutStorage } from '../../state/layoutStorage.js';

/** Stand-in for the canvas-backed Chart: records what the grid asks of it. */
class FakeChart {
  static all: FakeChart[] = [];
  drawings: unknown[] = [];
  crosshair: (number | null)[] = [];
  ranges: [number, number][] = [];
  data = [{ time: 100 }, { time: 200 }, { time: 300 }];
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.all.push(this);
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
  setCrosshairTime(time: number | null): void { this.crosshair.push(time); }
  setVisibleRange(from: number, to: number): void { this.ranges.push([from, to]); }
  getDrawings(): unknown[] { return this.drawings; }
  setDrawings(d: unknown[]): void { this.drawings = d; }
  saveState(): string { return JSON.stringify({ version: 2, chartType: 'candlestick', drawings: this.drawings }); }
  loadState(json: string): void { this.drawings = (JSON.parse(json) as { drawings: unknown[] }).drawings; }
  getData(): { time: number }[] { return this.data; }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getIndicatorOutput(): null { return null; }
  overrides: unknown[] = [];
  applyOverrides(patch: unknown): void { this.overrides.push(patch); }
  formatPrice(v: number): string { return v.toFixed(2); }
  replay: (string | number)[] = [];
  replaying = false;
  isReplayActive(): boolean { return this.replaying; }
  replayStart(config: { startIndex: number }): void { this.replaying = true; this.replay.push(`start ${config.startIndex}`); }
  replaySeekToTime(time: number): void { this.replay.push(`seek ${time}`); }
  replayStop(): void { this.replaying = false; this.replay.push('stop'); }
  destroy(): void { this.emit('replayState', { state: 'stopped' }); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidgetGrid } = await import('../ChartWidgetGrid.js');

let host: HTMLDivElement;
let grid: InstanceType<typeof ChartWidgetGrid>;
let storage: LayoutStorage;

const make = (options: ConstructorParameters<typeof ChartWidgetGrid>[1] = {}) => {
  grid = new ChartWidgetGrid(host, {
    widget: { watchlist: false },
    cells: [{ symbol: 'AAA' }, { symbol: 'BBB' }, { symbol: 'CCC' }, { symbol: 'DDD' }],
    layouts: { storage, debounceMs: 10 },
    ...options,
  });
  return grid;
};
const symbols = () => [...host.querySelectorAll('.tcw-grid-cell [data-role="symbol"]')].map((b) => b.textContent);
const charts = () => grid.getWidgets().map((w) => w.getChart() as unknown as FakeChart);
const syncButton = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('.tcw-grid-sync')].find((b) => b.textContent === label)!;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

beforeEach(() => {
  localStorage.clear();
  FakeChart.all = [];
  storage = memoryLayouts();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  grid.destroy();
  host.remove();
});

describe('ChartWidgetGrid', () => {
  it('opens two charts side by side, each with its own symbol, the first one active', () => {
    make();
    expect(symbols()).toEqual(['AAA', 'BBB']);
    expect(grid.getActiveIndex()).toBe(0);
    expect(host.querySelector('.tcw-grid-cell-active')).toBe(host.querySelector('.tcw-grid-cell'));
    // The grid keeps the layouts: no layouts button on the charts themselves.
    expect(host.querySelectorAll('.tcw-grid-cell [data-role="layouts"]')).toHaveLength(0);
    expect(host.querySelectorAll('.tcw-grid-bar .tcw-layouts-btn')).toHaveLength(1);
  });

  it('grows and shrinks with the arrangement picked on its bar', () => {
    const changes: number[] = [];
    make({ onActiveChange: (i) => changes.push(i) });
    host.querySelector<HTMLButtonElement>('[aria-label="4 charts, 2 across and 2 down"]')!.click();
    expect(symbols()).toEqual(['AAA', 'BBB', 'CCC', 'DDD']);
    expect(grid.getLayout()).toBe('2x2');
    grid.setActive(3);
    host.querySelector<HTMLButtonElement>('[aria-label="One chart"]')!.click();
    expect(symbols()).toEqual(['AAA']);
    expect(grid.getActiveIndex()).toBe(0);
    expect(changes).toEqual([3, 0]);
  });

  it('gives every chart the style overrides, and the charts it adds later too', () => {
    make();
    grid.applyOverrides({ 'grid.vertical.visible': false, 'legend.textColor': '#fff' });
    grid.applyOverrides({ 'legend.textColor': null });
    expect(charts().map((c) => c.overrides.length)).toEqual([2, 2]);
    grid.setLayout('2x2');
    expect(charts()[3].overrides).toEqual([{ 'grid.vertical.visible': false }]);
  });

  it('puts away the charts it shrinks from, and brings them back as they were', async () => {
    make({ layout: '1x3', cells: [{ symbol: 'AAA' }, { symbol: 'BBB' }, { symbol: 'CCC' }] });
    charts()[2].drawings = ['kept'];
    grid.setLayout('1x1');
    expect(symbols()).toEqual(['AAA']);
    // Saved with the grid, too.
    expect(grid.captureLayout().cells.map((c) => c.symbol)).toEqual(['AAA', 'BBB', 'CCC']);
    grid.setLayout('1x3');
    await nextFrame();
    expect(symbols()).toEqual(['AAA', 'BBB', 'CCC']);
    expect(charts()[2].drawings).toEqual(['kept']);
  });

  it('puts the drawings of the same symbol together when drawings sync is switched on', () => {
    make({ cells: [{ symbol: 'AAA' }, { symbol: 'AAA' }] });
    const [a, b] = charts();
    a.drawings = [{ id: 'd1' }];
    b.drawings = [{ id: 'd2' }];
    grid.setSync({ drawings: true });
    expect(a.drawings).toEqual([{ id: 'd1' }, { id: 'd2' }]);
    expect(b.drawings).toEqual([{ id: 'd1' }, { id: 'd2' }]);
    expect(a.drawings[0]).not.toBe(b.drawings[0]); // copies, not shared objects
  });

  it('refuses a stored arrangement that is only a property name', async () => {
    make();
    await expect(grid.applyLayoutContent(JSON.stringify({ v: 1, kind: 'grid', layout: 'constructor', cells: [] }))).resolves.toBe(false);
  });

  it('makes the chart pressed the active one', () => {
    make();
    host.querySelectorAll('.tcw-grid-cell')[1].dispatchEvent(new Event('pointerdown'));
    expect(grid.getActiveIndex()).toBe(1);
  });

  it('passes a symbol on only when symbols are synced', async () => {
    make();
    await grid.getWidget(0)!.setSymbol('XXX');
    expect(symbols()).toEqual(['XXX', 'BBB']);
    syncButton('Symbol').click();
    expect(syncButton('Symbol').getAttribute('aria-pressed')).toBe('true');
    expect(symbols()).toEqual(['XXX', 'XXX']); // lined up when switched on
    await grid.getWidget(1)!.setSymbol('YYY');
    expect(symbols()).toEqual(['YYY', 'YYY']);
  });

  it('passes an interval on when intervals are synced', async () => {
    make({ sync: { interval: true } });
    await grid.getWidget(1)!.setTimeframe('1h');
    expect(grid.getWidgets().map((w) => w.captureLayout().timeframe)).toEqual(['1h', '1h']);
  });

  it('shows the crosshair’s time on the other charts', () => {
    make();
    const [a, b] = charts();
    a.emit('crosshairMove', { bar: { time: 200 } });
    a.emit('crosshairLeave');
    expect(b.crosshair).toEqual([200, null]);
    syncButton('Crosshair').click();
    a.emit('crosshairMove', { bar: { time: 300 } });
    expect(b.crosshair).toEqual([200, null, null]); // cleared when switched off, then left alone
  });

  it('moves the others to the times the chart in use shows', () => {
    make({ sync: { time: true } });
    const [a, b] = charts();
    a.emit('visibleRangeChange', { from: 0, to: 2 });
    expect(b.ranges).toEqual([[100, 300]]);
    b.emit('visibleRangeChange', { from: 1, to: 2 }); // not the chart in use
    expect(a.ranges).toEqual([]);
  });

  it('copies drawings to the charts of the same symbol, once a frame', async () => {
    make({ layout: '1x3', cells: [{ symbol: 'AAA' }, { symbol: 'AAA' }, { symbol: 'BBB' }], sync: { drawings: true } });
    const [a, b, c] = charts();
    a.drawings = [{ id: 'd1' }];
    a.emit('drawingCreate');
    a.emit('drawingUpdate');
    await nextFrame();
    expect(b.drawings).toEqual([{ id: 'd1' }]);
    expect(c.drawings).toEqual([]);
  });

  it('saves the whole grid as a layout and opens it again', async () => {
    make({ sync: { symbol: false } });
    charts()[1].drawings = ['line'];
    const saved = await grid.getLayoutSession()!.saveAs('Pair');
    const content = JSON.parse((await storage.load(saved.id))!.content);
    expect(content).toMatchObject({ v: 1, kind: 'grid', layout: '1x2', active: 0 });
    expect(content.cells.map((c: { symbol: string }) => c.symbol)).toEqual(['AAA', 'BBB']);

    grid.setLayout('2x2');
    syncButton('Time').click();
    await grid.getWidget(0)!.setSymbol('ZZZ');
    expect(await grid.getLayoutSession()!.open(saved.id)).toBe(true);
    expect(grid.getLayout()).toBe('1x2');
    expect(grid.getSync().time).toBe(false);
    expect(symbols()).toEqual(['AAA', 'BBB']);
    expect(charts()[1].drawings).toEqual(['line']);
  });

  it('turns down content that is not a grid layout', async () => {
    make();
    expect(await grid.applyLayoutContent(JSON.stringify({ v: 1, kind: 'grid', layout: '9x9', cells: [] }))).toBe(false);
    expect(await grid.applyLayoutContent('nope')).toBe(false);
  });

  it('says when it makes a chart, at the start and as it grows', () => {
    const added: string[] = [];
    make({ onChartAdd: (w, i) => added.push(`${i}:${w.captureLayout().symbol}`) });
    grid.setLayout('1x3');
    expect(added).toEqual(['0:AAA', '1:BBB', '2:CCC']);
  });

  it('makes each chart its own data adapter', () => {
    const made: number[] = [];
    make({ adapter: (i) => { made.push(i); return { name: `feed${i}` } as never; } });
    expect(made).toEqual([0, 1]);
  });

  it('saves with Ctrl+S once used, asking for a name first', () => {
    make();
    host.querySelector('.tcw-grid-cell')!.dispatchEvent(new Event('pointerdown'));
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(host.querySelector('.tcw-name-prompt')!.closest('.tcw-modal-backdrop')!.hasAttribute('hidden')).toBe(false);
  });
});

describe('ChartWidgetGrid replay', () => {
  it('replays the other charts to the same time, when asked to', () => {
    make({ layout: '1x2', sync: { replay: true } });
    const [a, b] = charts();
    a.emit('replayStep', { barIndex: 1, time: 200, until: 300 });
    expect(b.replay).toEqual(['start 1']);
    a.emit('replayStep', { barIndex: 2, time: 300, until: 400 });
    expect(b.replay).toEqual(['start 1', 'seek 400']);
    a.emit('replayState', { state: 'stopped' });
    expect(b.replay.at(-1)).toBe('stop');
    expect(a.replay).toEqual([]);
  });

  it('leaves the others alone without replay in sync', () => {
    make({ layout: '1x2' });
    const [a, b] = charts();
    a.emit('replayStep', { barIndex: 1, time: 200, until: 300 });
    expect(b.replay).toEqual([]);
    expect(syncButton('Replay')).toBeTruthy();
  });
});

describe('ChartWidgetGrid replay, a chart going away', () => {
  it('doesn’t end the others’ replay', () => {
    make({ layout: '1x2', sync: { replay: true } });
    const [a, b] = charts();
    a.replaying = true; // the one replaying stays
    a.emit('replayStep', { barIndex: 1, time: 200, until: 300 });
    expect(b.replay).toEqual(['start 1']);
    grid.setLayout('1x1'); // the second goes, saying its replay stopped
    expect(a.replay).toEqual([]);
  });
});

describe('ChartWidgetGrid look', () => {
  it('puts a look on every chart and on its bar, and on charts it adds later', () => {
    make({ layout: '1x2' });
    grid.setUI('terminal');
    const roots = () => [...host.querySelectorAll<HTMLElement>('.tcw-grid-cell .tcw-root')];
    expect(roots().map((r) => r.dataset.tcwUi)).toEqual(['terminal', 'terminal']);
    expect(host.querySelector<HTMLElement>('.tcw-grid')!.dataset.tcwUi).toBe('terminal');
    grid.setLayout('2x2');
    expect(roots().map((r) => r.dataset.tcwUi)).toEqual(['terminal', 'terminal', 'terminal', 'terminal']);
  });

  it('takes the look from its widget options, and keeps its own copy of a look', () => {
    make({ layout: '1x2', widget: { watchlist: false, ui: 'capsule' } });
    const roots = () => [...host.querySelectorAll<HTMLElement>('.tcw-grid-cell .tcw-root')];
    expect(host.querySelector<HTMLElement>('.tcw-grid')!.dataset.tcwUi).toBe('capsule');
    expect(roots().map((r) => r.dataset.tcwUi)).toEqual(['capsule', 'capsule']);
    expect(grid.getUI().preset).toBe('capsule');

    const theme: { preset: 'terminal' | 'studio' } = { preset: 'terminal' };
    grid.setUI(theme);
    theme.preset = 'studio';
    grid.setLayout('2x2');
    expect(roots().map((r) => r.dataset.tcwUi)).toEqual(['terminal', 'terminal', 'terminal', 'terminal']);
    expect(grid.getUI().preset).toBe('terminal');
  });
});
