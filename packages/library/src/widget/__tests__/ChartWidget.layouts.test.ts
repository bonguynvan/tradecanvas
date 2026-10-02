// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';
import { memoryLayouts, type LayoutStorage } from '../../state/layoutStorage.js';

/** Stand-in for the canvas-backed Chart: keeps drawings and a chart type, saves and loads them. */
class FakeChart {
  static last: FakeChart;
  drawings: string[] = [];
  chartType = 'candlestick';
  loaded: string[] = [];
  scaleModes: string[] = [];
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();

  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) =>
        key in target ? Reflect.get(target, key, receiver) : () => undefined,
    });
  }

  on(event: string, cb: (e: { payload: unknown }) => void): () => void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
    return () => {};
  }
  emit(event: string, payload: unknown = {}): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  saveState(): string {
    return JSON.stringify({ version: 2, timestamp: Math.random(), theme: 'dark', chartType: this.chartType, drawings: this.drawings });
  }
  loadState(json: string): void {
    this.loaded.push(json);
    const state = JSON.parse(json) as { drawings: string[]; chartType: string };
    this.drawings = state.drawings;
    this.chartType = state.chartType;
  }
  setScaleMode(mode: string): void { this.scaleModes.push(mode); }
  getData(): unknown[] { return []; }
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
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;
let storage: LayoutStorage;

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, layouts: { storage, debounceMs: 10 }, ...options });
  return widget;
};
const layoutsButton = () => host.querySelector<HTMLButtonElement>('[data-role="layouts"]');
const menuLabels = () => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu [role^=menuitem]')].map((b) => b.textContent);
const pick = (label: string) => [...host.querySelectorAll<HTMLElement>('.tcw-context-menu [role^=menuitem]')].find((b) => b.textContent === label)!.click();
const prompt = () => host.querySelector<HTMLFormElement>('.tcw-name-prompt')!;
const typeName = (name: string) => {
  const input = prompt().querySelector('input')!;
  input.value = name;
  input.dispatchEvent(new Event('input'));
};
const submitName = () => prompt().dispatchEvent(new Event('submit', { cancelable: true }));
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  localStorage.clear();
  storage = memoryLayouts();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget.destroy();
  host.remove();
});

describe('ChartWidget named layouts', () => {
  it('shows an unnamed layout, and a menu to save and open', async () => {
    make();
    expect(layoutsButton()!.textContent).toContain('Unnamed');
    layoutsButton()!.click();
    await flush();
    expect(menuLabels()).toEqual(['Save layout', 'Save as…', 'Auto-save', 'Open layout…']);
  });

  it('asks for a name on the first save, then saves the chart under it', async () => {
    make();
    FakeChart.last.drawings = ['line'];
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }));
    expect(prompt().closest('.tcw-modal-backdrop')!.hasAttribute('hidden')).toBe(false);
    typeName('Swing');
    submitName();
    await flush();
    const [saved] = await storage.list();
    expect(saved).toMatchObject({ name: 'Swing', symbol: 'AAA', timeframe: '5m' });
    const content = JSON.parse((await storage.load(saved.id))!.content);
    expect(content).toMatchObject({ v: 1, symbol: 'AAA', scaleMode: 'regular', chart: { drawings: ['line'] } });
    // The theme stays the viewer's, and the save time is not part of it.
    expect(content.chart.theme).toBeUndefined();
    expect(content.chart.timestamp).toBeUndefined();
    expect(layoutsButton()!.textContent).toContain('Swing');
  });

  it('auto-saves the open layout as the chart changes', async () => {
    make();
    const saved = await widget.getLayoutSession()!.saveAs('A');
    FakeChart.last.drawings = ['line', 'ray'];
    FakeChart.last.emit('stateChange');
    await settle();
    expect(JSON.parse((await storage.load(saved.id))!.content).chart.drawings).toEqual(['line', 'ray']);
  });

  it('opens a layout: its symbol, interval, scale and chart', async () => {
    make();
    const content = JSON.stringify({
      v: 1, symbol: 'BBB', timeframe: '1h', scaleMode: 'logarithmic', invertScale: false,
      chart: { version: 2, chartType: 'line', drawings: ['fib'] },
    });
    await storage.save({ id: 'x', name: 'Saved', updatedAt: 1, content });
    expect(await widget.openLayout('x')).toBe(true);
    expect(host.querySelector('[data-role="symbol"]')!.textContent).toBe('BBB');
    expect(FakeChart.last.drawings).toEqual(['fib']);
    expect(FakeChart.last.scaleModes).toContain('logarithmic');
    expect(layoutsButton()!.textContent).toContain('Saved');
    expect(await widget.openLayout('missing')).toBe(false);
  });

  it('turns down content that is not a layout', async () => {
    make();
    expect(await widget.applyLayoutContent('{"v":2}')).toBe(false);
    expect(await widget.applyLayoutContent('not json')).toBe(false);
  });

  it('lists layouts in a dialog, renames and deletes after asking', async () => {
    make();
    await storage.save({ id: 'a', name: 'Alpha', symbol: 'AAA', timeframe: '1h', updatedAt: 1, content: '{}' });
    layoutsButton()!.click();
    await flush();
    pick('Open layout…');
    await flush();
    const row = () => host.querySelector<HTMLElement>('.tcw-layouts-row')!;
    expect(row().querySelector('.tcw-layouts-name')!.textContent).toBe('Alpha');

    row().querySelector<HTMLButtonElement>('[aria-label="Rename Alpha"]')!.click();
    typeName('Beta');
    submitName();
    await flush();
    expect((await storage.load('a'))!.name).toBe('Beta');

    await flush();
    row().querySelector<HTMLButtonElement>('[aria-label="Delete Beta"]')!.click();
    expect(await storage.list()).toHaveLength(1); // asked first
    row().querySelector<HTMLButtonElement>('.tcw-layouts-confirm')!.click();
    await flush();
    expect(await storage.list()).toEqual([]);
    expect(host.querySelector('.tcw-layouts-list')!.textContent).toBe('No saved layouts yet');
  });

  it('can be switched off', () => {
    make({ layouts: false });
    expect(layoutsButton()).toBeNull();
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
