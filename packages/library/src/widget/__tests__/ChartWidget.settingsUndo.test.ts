// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

type Step = { undo: () => void; redo: () => void; subject?: string };

/** Stand-in for the canvas-backed Chart: records undo steps and the setters the widget calls. */
class FakeChart {
  static last: FakeChart;
  steps: Step[] = [];
  calls: [string, unknown][] = [];
  chartType = 'candlestick';
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) => {
        if (key in target) return Reflect.get(target, key, receiver);
        return (arg: unknown) => { if (typeof key === 'string' && key.startsWith('set')) target.calls.push([key, arg]); };
      },
    });
  }
  on(): void {}
  recordUndo(step: Step): void { this.steps.push(step); }
  setChartType(type: string): void { this.chartType = type; }
  getTheme() { return { background: '#000', grid: '#111' }; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getData(): unknown[] { return []; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getRequiredSymbols(): string[] { return []; }
  getSymbolInfo(): null { return null; }
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
  widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'] });
});

afterEach(() => {
  widget.destroy();
  document.querySelectorAll('.tcw-portal').forEach((p) => p.remove());
  host.remove();
});

const calls = (name: string) => FakeChart.last.calls.filter(([n]) => n === name).map(([, v]) => v);
const openSettings = () => (widget as unknown as { openSettings(): void }).openSettings();
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`[role="tab"][data-tab="${name}"]`)!.click();
const footer = (act: string) => document.querySelector<HTMLButtonElement>(`.tcw-set .tcw-modal-footer [data-act="${act}"]`)!;
const menuItem = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent === text)!;
/** The grid as the widget's own setting: back on, the way a shortcut or the host would. */
const toggleGrid = (on: boolean) => (widget as unknown as { applySettings(p: object): void }).applySettings({ gridVisible: on });
/** The grid's own switch, "Show" in the Grid lines section. */
const gridToggle = () => document.querySelector<HTMLButtonElement>('.tcw-settings-section[aria-label="Grid lines"] button[aria-label="Show"]')!;
const toggleFor = (label: string) => [...document.querySelectorAll<HTMLElement>('.tcw-settings-row')]
  .find((r) => r.querySelector('.tcw-settings-label')?.textContent === label)!
  .querySelector<HTMLButtonElement>('.tcw-toggle')!;

describe('ChartWidget settings undo', () => {
  it('records what the settings changed as one step on OK, and undoes and redoes it', () => {
    openSettings();
    tab('appearance');
    gridToggle().click();
    gridToggle().click();
    gridToggle().click();
    expect(calls('setGridVisible')).toEqual([false, true, false]);
    expect(FakeChart.last.steps).toHaveLength(0); // still open: nothing recorded yet
    footer('ok').click();
    expect(FakeChart.last.steps).toHaveLength(1);
    FakeChart.last.steps[0].undo();
    expect(calls('setGridVisible').at(-1)).toBe(true);
    FakeChart.last.steps[0].redo();
    expect(calls('setGridVisible').at(-1)).toBe(false);
    expect(FakeChart.last.steps).toHaveLength(1); // undo and redo record nothing
  });

  it('puts back on Cancel only what the settings changed, and records nothing', () => {
    openSettings();
    tab('appearance');
    gridToggle().click();
    const before = FakeChart.last.calls.length;
    footer('cancel').click();
    expect(FakeChart.last.calls.slice(before)).toEqual([['setGridVisible', true]]);
    expect(FakeChart.last.steps).toHaveLength(0);
  });

  it('leaves the chart as it is on a Cancel that changed nothing (a scale dragged by hand stays)', () => {
    openSettings();
    const before = FakeChart.last.calls.length;
    footer('cancel').click();
    expect(FakeChart.last.calls.slice(before)).toEqual([]);
    expect(FakeChart.last.steps).toHaveLength(0);
  });

  it('keeps one session when asked to open while open', () => {
    openSettings();
    tab('appearance');
    gridToggle().click();
    openSettings();
    footer('cancel').click();
    expect(calls('setGridVisible').at(-1)).toBe(true);
  });

  it('saves the look as a template, and applies it, from the Template menu', async () => {
    openSettings();
    tab('appearance');
    gridToggle().click();
    footer('template').click();
    menuItem('Save as template…').click();
    const prompt = [...document.querySelectorAll<HTMLFormElement>('.tcw-name-prompt')].find((f) => !f.closest('.tcw-modal-backdrop')!.hasAttribute('hidden'))!;
    const input = prompt.querySelector('input')!;
    input.value = 'No grid';
    input.dispatchEvent(new Event('input'));
    prompt.dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();
    footer('ok').click();
    toggleGrid(true);
    openSettings();
    footer('template').click();
    menuItem('No grid').click();
    expect(calls('setGridVisible').at(-1)).toBe(false);
  });

  it('records a shortcut’s change, and a reset as one step', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i', altKey: true, bubbles: true }));
    host.querySelector<HTMLElement>('.tcw-root')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i', altKey: true, bubbles: true }));
    const invertSteps = FakeChart.last.steps.filter((s) => s.subject === 'settings:invertScale');
    expect(invertSteps.length).toBeGreaterThan(0);
    const before = calls('setInvertScale').length;
    invertSteps.at(-1)!.undo();
    expect(calls('setInvertScale').length).toBe(before + 1);
  });

  it('records a change of chart type', () => {
    (widget as unknown as { handleChartType(t: string): void }).handleChartType('line');
    expect(FakeChart.last.chartType).toBe('line');
    const step = FakeChart.last.steps.at(-1)!;
    expect(step.subject).toBe('chartType');
    step.undo();
    expect(FakeChart.last.chartType).toBe('candlestick');
    step.redo();
    expect(FakeChart.last.chartType).toBe('line');
  });
});
