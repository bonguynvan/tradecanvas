// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, DrawingState } from '@tradecanvas/commons';
import { resolveWidgetUI, typeSize } from '../widgetUI.js';

type Box = { x: number; y: number; width: number; height: number };

/** Stand-in for the canvas-backed Chart: selectable drawings and the calls it gets. */
class FakeChart {
  static last: FakeChart;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  legend: Record<string, unknown>[] = [];
  styled: [Record<string, unknown>, string | undefined][] = [];
  removed: string[][] = [];
  locked: [string[], boolean][] = [];
  rect: Box | null = { x: 200, y: 160, width: 120, height: 60 };
  rects: Record<string, Box> = {};
  drawings: DrawingState[] = [{
    id: 'd1', type: 'trendLine', visible: true, locked: false,
    anchors: [{ time: 1, price: 10 }, { time: 2, price: 12 }],
    style: { color: '#2962ff', lineWidth: 2, lineStyle: 'solid' },
  }];
  selected: string[] = [];
  tool: string | null = null;

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
  select(ids: string[]): void {
    this.selected = ids;
    this.emit('drawingSelect', { ids, primary: ids[0] ?? null });
  }
  setLegend(config: Record<string, unknown>): void { this.legend.push(config); }
  getDrawings(): DrawingState[] { return this.drawings; }
  getSelectedDrawingIds(): string[] { return this.selected; }
  isDrawingShown(id: string): boolean { return this.drawings.some((d) => d.id === id && d.visible); }
  getDrawingRect(id: string): Box | null { return this.rects[id] ?? this.rect; }
  getDrawingTool(): string | null { return this.tool; }
  isEraserMode(): boolean { return false; }
  isZoomAreaMode(): boolean { return false; }
  getPlotRect(): Box { return { x: 0, y: 0, width: 800, height: 500 }; }
  getDrawingToolDescriptor() { return { type: 'trendLine', name: 'Trend Line', options: {} }; }
  getDrawingOptions() { return {}; }
  canAddDrawingAlert(): boolean { return true; }
  setSelectedDrawingStyle(style: Record<string, unknown>, id?: string): boolean { this.styled.push([style, id]); return true; }
  removeDrawings(ids: string[]): number {
    this.removed.push([...ids]);
    const gone = new Set(ids.filter((id) => !this.drawings.find((d) => d.id === id)?.locked));
    this.drawings = this.drawings.filter((d) => !gone.has(d.id));
    this.selected = this.selected.filter((id) => !gone.has(id));
    return gone.size;
  }
  setDrawingsLocked(ids: string[], locked: boolean): void { this.locked.push([[...ids], locked]); }
  updated: [string, Record<string, unknown>][] = [];
  updateDrawing(id: string, patch: Record<string, unknown>): boolean { this.updated.push([id, patch]); return true; }
  getData(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getLegendBottom(): number { return 0; }
  isTimeAligned(): boolean { return true; }
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

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const bar = () => host.querySelector<HTMLElement>('.tcw-sel-toolbar');
const button = (name: string) => bar()!.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('ChartWidget OHLCV legend font', () => {
  it('draws the legend in the look’s figures face, at the size of the indicator rows', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const print = resolveWidgetUI('print').font;
    expect(FakeChart.last.legend.at(-1)).toMatchObject({ fontFamily: print.mono, fontSize: typeSize(print.size, -1) });
  });

  it('follows the look when it changes', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    widget.setUI('terminal');
    const terminal = resolveWidgetUI('terminal').font;
    expect(FakeChart.last.legend.at(-1)).toMatchObject({ fontFamily: terminal.mono, fontSize: typeSize(terminal.size, -1) });
  });
});

describe('ChartWidget selection toolbar', () => {
  it('shows over a drawing as soon as it is selected, and goes when nothing is', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    expect(bar()?.hidden ?? true).toBe(true);
    FakeChart.last.select(['d1']);
    expect(bar()!.hidden).toBe(false);
    // Above the drawing's box, centred on it.
    expect(parseFloat(bar()!.style.top)).toBeLessThan(160);
    FakeChart.last.select([]);
    expect(bar()!.hidden).toBe(true);
  });

  it('changes the colour, width and line style of the selection', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    button('color').click();
    host.querySelector<HTMLButtonElement>('.tcw-sel-swatch[data-color="#e8505b"]')!.click();
    button('width').click();
    host.querySelector<HTMLButtonElement>('.tcw-sel-option[data-width="3"]')!.click();
    button('lineStyle').click();
    host.querySelector<HTMLButtonElement>('.tcw-sel-option[data-style="dashed"]')!.click();
    expect(FakeChart.last.styled).toEqual([
      [{ color: '#e8505b' }, 'd1'],
      [{ lineWidth: 3 }, 'd1'],
      [{ lineStyle: 'dashed' }, 'd1'],
    ]);
  });

  it('locks, opens the settings and deletes', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    button('lock').click();
    expect(FakeChart.last.locked).toEqual([[['d1'], true]]);
    button('settings').click();
    expect(host.querySelector('.tcw-drawing-settings, [role="dialog"]')).not.toBeNull();
    FakeChart.last.select(['d1']);
    button('delete').click();
    expect(FakeChart.last.removed).toEqual([['d1']]);
    expect(bar()!.hidden).toBe(true);
  });

  it('opens the settings on the intervals the drawing keeps to, and changes them', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.drawings[0].intervals = { minutes: false };
    FakeChart.last.select(['d1']);
    button('settings').click();
    [...host.querySelectorAll<HTMLButtonElement>('.tcw-drawing-settings [role="tab"]')].find((b) => b.textContent === 'Visibility')!.click();
    const unit = (name: string) => host.querySelector<HTMLInputElement>(`.tcw-drawing-settings [data-unit="${name}"] input[type=checkbox]`)!;
    expect(unit('minutes').checked).toBe(false);
    unit('minutes').click();
    expect(FakeChart.last.updated).toEqual([['d1', { intervals: null }]]);
  });

  it('saves a drawing’s look as a template of its tool, under the name asked for', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    button('settings').click();
    host.querySelector<HTMLButtonElement>('.tcw-drawing-settings [data-act="template"]')!.click();
    [...host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent === 'Save as template…')!.click();
    const prompt = host.querySelector<HTMLFormElement>('.tcw-modal-backdrop:not([hidden]) .tcw-name-prompt')!;
    expect(prompt.querySelector('h3')!.textContent).toBe('Save drawing template');
    prompt.querySelector('input')!.value = 'Blue line';
    prompt.dispatchEvent(new Event('submit', { cancelable: true }));
    const saved = JSON.parse(localStorage.getItem('tcw:draw-templates')!);
    expect(saved).toEqual([{ name: 'Blue line', style: { color: '#2962ff', lineWidth: 2, lineStyle: 'solid' }, type: 'trendLine', options: {} }]);
  });

  it('follows the drawing when it moves or the price scale changes, once a frame', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    const before = bar()!.style.left;
    FakeChart.last.rect = { x: 400, y: 160, width: 120, height: 60 };
    FakeChart.last.emit('drawingUpdate', { id: 'd1' });
    await nextFrame();
    expect(bar()!.style.left).not.toBe(before);
    const top = bar()!.style.top;
    FakeChart.last.rect = { x: 400, y: 300, width: 120, height: 60 };
    FakeChart.last.emit('priceRangeChange', {});
    await nextFrame();
    expect(bar()!.style.top).not.toBe(top);
  });

  it('waits at the top of the plot while the selection is off screen, and goes when it is undone', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    FakeChart.last.rect = null;
    FakeChart.last.emit('visibleRangeChange', {});
    await nextFrame();
    expect(bar()!.hidden).toBe(false);
    FakeChart.last.drawings = [];
    FakeChart.last.emit('historyChange', {});
    await nextFrame();
    expect(bar()!.hidden).toBe(true);
  });

  it('steps aside while a drawing tool is on', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    FakeChart.last.tool = 'trendLine';
    FakeChart.last.emit('drawingToolChange', { tool: 'trendLine' });
    expect(bar()!.hidden).toBe(true);
    FakeChart.last.tool = null;
    FakeChart.last.emit('drawingToolChange', { tool: null });
    expect(bar()!.hidden).toBe(false);
  });

  it('sits over all the drawings selected, and keeps the locked ones on delete', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const fake = FakeChart.last;
    fake.drawings = [{ ...fake.drawings[0] }, { ...fake.drawings[0], id: 'd2', locked: true }];
    fake.rects = { d1: { x: 100, y: 200, width: 50, height: 50 }, d2: { x: 500, y: 300, width: 50, height: 50 } };
    fake.select(['d1', 'd2']);
    // One settings dialog is for one drawing.
    expect(bar()!.querySelector('[data-action="settings"]')).toBeNull();
    button('delete').click();
    expect(fake.removed).toEqual([['d1', 'd2']]);
    expect(bar()!.hidden).toBe(false);
    expect(bar()!.querySelector('[data-action="delete"]')).toBeNull();
  });

  it('shows a style from a saved layout without running it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const fake = FakeChart.last;
    fake.drawings = [{
      ...fake.drawings[0],
      style: {
        color: 'red;background-image:url(//x)',
        lineWidth: '2px"><img src=x onerror=alert(1)>' as unknown as number,
        lineStyle: '<b>x</b>' as never,
      },
    }];
    fake.select(['d1']);
    expect(bar()!.querySelector('img, b')).toBeNull();
    expect(bar()!.innerHTML).not.toContain('url(');
    expect(button('width').textContent).toContain('1px');
  });

  it('is one tab stop that arrow keys move along, and Escape closes a picker back to it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.select(['d1']);
    const tabbable = [...bar()!.querySelectorAll('button')].filter((b) => b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    tabbable[0].focus();
    key(tabbable[0], 'ArrowRight');
    expect(document.activeElement).toBe(button('width'));
    key(document.activeElement!, 'End');
    expect(document.activeElement).toBe(button('delete'));
    button('color').click();
    const swatch = document.activeElement as HTMLElement;
    expect(swatch.classList.contains('tcw-sel-swatch')).toBe(true);
    key(swatch, 'ArrowRight');
    expect(document.activeElement).not.toBe(swatch);
    let reachedHost = false;
    host.addEventListener('keydown', () => { reachedHost = true; }, { once: true });
    key(document.activeElement!, 'Escape');
    expect(document.activeElement).toBe(button('color'));
    expect(reachedHost).toBe(false);
  });

  it('keeps the focus on the lock after locking, though the buttons change', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    const fake = FakeChart.last;
    fake.select(['d1']);
    button('lock').focus();
    fake.drawings = [{ ...fake.drawings[0], locked: true }];
    button('lock').click();
    expect(document.activeElement).toBe(button('lock'));
    expect(button('lock').getAttribute('aria-pressed')).toBe('true');
  });

  it('can be switched off by the host', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, features: { selectionToolbar: false } });
    FakeChart.last.select(['d1']);
    expect(bar()?.hidden ?? true).toBe(true);
  });
});
