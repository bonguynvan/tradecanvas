// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { preloadDialogs } from '../widgetDialogs.js';
import type { ChartOptions, DrawingState } from '@tradecanvas/commons';

type Box = { x: number; y: number; width: number; height: number };

/** Tools that write text in a box: the fake gives them a Text tab and a fill. */
const TEXT_TOOLS = ['text', 'note', 'callout'];

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
  getDrawingToolDescriptor(type = 'trendLine') { return { type, name: type, options: {}, text: TEXT_TOOLS.includes(type), fill: TEXT_TOOLS.includes(type) }; }
  undos = 0;
  undo(): boolean { this.undos += 1; return true; }
  takenBack: string[] = [];
  takeBackDrawing(id: string): void { this.takenBack.push(id); }
  edits: [string, unknown][] = [];
  beginDrawingEdit(id: string): void { this.edits.push(['begin', id]); }
  endDrawingEdit(id: string, how: { cancel: boolean }): void { this.edits.push(['end', [id, how.cancel]]); }
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


describe('ChartWidget text just drawn, the drawing settings still loading', () => {
  const textDrawing = (): DrawingState => ({ id: 't1', type: 'text', visible: true, locked: false, anchors: [{ time: 1, price: 10 }], style: { color: '#2962ff', lineWidth: 1, lineStyle: 'solid', text: 'Text' } });
  const dialogTab = () => host.querySelector<HTMLElement>('.tcw-modal-tab[aria-selected="true"]')?.dataset.tab;

  it('takes the text back on Cancel once the dialog has loaded', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    FakeChart.last.drawings = [textDrawing()];
    FakeChart.last.tool = 'text';
    FakeChart.last.emit('drawingCreate', { id: 't1', type: 'text', drawing: textDrawing(), drawn: true });
    window.dispatchEvent(new MouseEvent('pointerup'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Its code is on its way: nothing open yet.
    expect(dialogTab()).toBeUndefined();
    await preloadDialogs();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dialogTab()).toBe('text');
    host.querySelector<HTMLButtonElement>('.tcw-modal-footer [data-act="cancel"]')!.click();
    expect(FakeChart.last.takenBack).toEqual(['t1']);
  });
});
