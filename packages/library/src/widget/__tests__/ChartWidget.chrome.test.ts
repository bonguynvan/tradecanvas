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
  setDrawingsLocked(ids: string[], locked: boolean): void {
    this.drawings = this.drawings.map((d) => (ids.includes(d.id) ? { ...d, locked } : d));
  }
  setDrawingsVisible(ids: string[], visible: boolean): void {
    this.drawings = this.drawings.map((d) => (ids.includes(d.id) ? { ...d, visible } : d));
  }
  clearDrawings(): void { this.drawings = []; }
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
    host.querySelector<HTMLButtonElement>('[data-tcw-part~="sidebar.clear"]')!.click();
    expect(pressed('hideAll')).toBe('false');
  });

  it('keep one name and say whether they are on', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false });
    role('lockAll')!.click();
    expect(role('lockAll')!.getAttribute('aria-label')).toBe('Lock all drawings');
    expect(pressed('lockAll')).toBe('true');
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
