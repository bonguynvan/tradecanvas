// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DIALOGS, preloadDialogs } from '../widgetDialogs.js';
import { DARK_THEME, type ChartOptions, type Theme } from '@tradecanvas/commons';

type Step = { undo: () => void; redo: () => void; subject?: string };

/** Stand-in for the canvas-backed Chart (as in the style tests): keeps the user's overrides and records the theme calls. */
class FakeChart {
  static last: FakeChart;
  steps: Step[] = [];
  themes: unknown[] = [];
  user: Record<string, unknown> = {};
  overrideCalls: [Record<string, unknown>, unknown][] = [];
  resets: [unknown, unknown][] = [];
  chartType = 'candlestick';
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) => {
        if (key in target) return Reflect.get(target, key, receiver);
        return () => {};
      },
    });
  }
  on(): void {}
  recordUndo(step: Step): void { this.steps.push(step); }
  setChartType(type: string): void { this.chartType = type; }
  themeName = 'dark';
  setTheme(theme: unknown): void { this.themes.push(theme); }
  watermarks: { color?: string }[] = [];
  setWatermark(_text: string, opts: { color?: string }): void { this.watermarks.push(opts); }
  getTheme(): Theme { return { ...DARK_THEME, name: this.themeName }; }
  applyOverrides(patch: Record<string, unknown>, options: unknown): void {
    this.overrideCalls.push([patch, options]);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete this.user[k];
      else this.user[k] = v;
    }
  }
  getOverrides(): Record<string, unknown> { return { ...this.user }; }
  resetOverrides(keys: string[], options: unknown): void {
    this.resets.push([keys, options]);
    for (const k of keys) delete this.user[k];
  }
  getStyleValue(key: string): unknown { return this.user[key] ?? `theme:${key}`; }
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

type Internals = { openSettings(tab?: string): void; openHotkeySheet(): void };

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;
const inner = () => widget as unknown as Internals;

function make(options: ConstructorParameters<typeof ChartWidget>[1] = {}) {
  widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], ...options });
}

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget.destroy();
  document.querySelectorAll('.tcw-portal').forEach((p) => p.remove());
  host.remove();
});

/** Lets a dialog whose code was asked for load and open, as a page does. */
async function loaded(): Promise<void> {
  await preloadDialogs();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ChartWidget dialogs loaded when first opened', () => {
  it('has no dialog code in until one is opened, then opens it once it is in, as the last ask said', async () => {
    make();
    expect(DIALOGS.settings.get()).toBeNull();
    inner().openSettings();
    inner().openSettings('scales');
    expect(document.querySelector('.tcw-set')).toBeNull();
    await loaded();
    expect(document.querySelectorAll('.tcw-set')).toHaveLength(1);
    expect(document.querySelector<HTMLElement>('.tcw-set [aria-selected="true"]')?.dataset.tab).toBe('scales');
  });

  it('opens at once in another widget once the code is in', async () => {
    await loaded();
    make();
    inner().openSettings();
    expect(document.querySelector('.tcw-set')).not.toBeNull();
  });

  it('opens one sheet however often it is asked for while its code loads', async () => {
    make();
    inner().openHotkeySheet();
    inner().openHotkeySheet();
    await loaded();
    expect(document.querySelectorAll('.tcw-hotkey-sheet')).toHaveLength(1);
  });

  it('opens nothing when its switch went off while its code loaded', async () => {
    make();
    inner().openSettings();
    widget.setFeatures({ settings: false });
    await loaded();
    expect(document.querySelector('.tcw-set')).toBeNull();
  });

  it('opens nothing, and leaves nothing behind, when the widget went while its code loaded', async () => {
    make();
    inner().openSettings();
    widget.destroy();
    await loaded();
    expect(document.querySelector('.tcw-set')).toBeNull();
  });
});
