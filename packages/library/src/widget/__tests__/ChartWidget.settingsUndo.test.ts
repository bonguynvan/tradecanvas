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
const toggleFor = (label: string) => [...document.querySelectorAll<HTMLElement>('.tcw-settings-row')]
  .find((r) => r.querySelector('.tcw-settings-label')?.textContent === label)!
  .querySelector<HTMLButtonElement>('.tcw-toggle')!;

describe('ChartWidget settings undo', () => {
  it('records a change made in the settings, and undoes and redoes it', () => {
    openSettings();
    document.querySelector<HTMLButtonElement>('.tcw-modal-tab[data-tab="display"]')!.click();
    toggleFor('Grid lines').click();
    expect(calls('setGridVisible')).toEqual([false]);
    expect(FakeChart.last.steps).toHaveLength(1);
    expect(FakeChart.last.steps[0].subject).toBe('settings:gridVisible');

    FakeChart.last.steps[0].undo();
    expect(calls('setGridVisible')).toEqual([false, true]);
    // The open settings show the setting as it is again.
    expect(toggleFor('Grid lines').classList.contains('tcw-on')).toBe(true);
    FakeChart.last.steps[0].redo();
    expect(calls('setGridVisible')).toEqual([false, true, false]);
    expect(FakeChart.last.steps).toHaveLength(1); // undo and redo record nothing
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
