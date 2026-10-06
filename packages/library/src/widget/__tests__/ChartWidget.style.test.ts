// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DARK_THEME, LIGHT_THEME, type ChartOptions, type Theme } from '@tradecanvas/commons';

type Step = { undo: () => void; redo: () => void; subject?: string };

/** Stand-in for the canvas-backed Chart: keeps the user's overrides and records the theme calls. */
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

type Internals = {
  openSettings(): void;
  changeSettings(patch: Record<string, unknown>): void;
  resetSettings(): void;
  handleToggleTheme(): void;
  settingsState: Record<string, unknown>;
};

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

describe('ChartWidget colours in the settings', () => {
  it("puts a colour picked in the settings among the user's overrides, not into the theme", () => {
    make();
    inner().changeSettings({ candleUpColor: '#00ff00', candleDownWick: '#ff0000', gridColor: '#222222', backgroundColor: '#010101' });
    expect(FakeChart.last.overrideCalls).toEqual([[{
      'series.candlestick.upColor': '#00ff00',
      'series.candlestick.wickDownColor': '#ff0000',
      'grid.horizontal.color': '#222222',
      'grid.vertical.color': '#222222',
      'background.color': '#010101',
    }, { layer: 'user' }]]);
    expect(FakeChart.last.themes).toEqual([]);
  });

  it('undoes a colour back to no override at all, not to the colour it resolved to', () => {
    make();
    inner().changeSettings({ candleUpColor: '#00ff00' });
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.user).toEqual({});
    FakeChart.last.steps.at(-1)!.redo();
    expect(FakeChart.last.user).toEqual({ 'series.candlestick.upColor': '#00ff00' });
  });

  it('leaves the colours of another theme alone on an undo', () => {
    make();
    inner().changeSettings({ backgroundColor: '#010101' });
    FakeChart.last.themeName = 'light';
    const calls = FakeChart.last.overrideCalls.length;
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.overrideCalls).toHaveLength(calls);
  });

  it("shows the chart's colours when the settings open", () => {
    make();
    FakeChart.last.user['series.candlestick.upColor'] = '#123456';
    inner().openSettings();
    expect(inner().settingsState.candleUpColor).toBe('#123456');
    expect(inner().settingsState.gridColor).toBe('theme:grid.horizontal.color');
  });

  it("resets the colours to the theme's, whatever theme it is", () => {
    make({ theme: 'light' });
    inner().changeSettings({ backgroundColor: '#010101' });
    inner().resetSettings();
    const [keys, options] = FakeChart.last.resets.at(-1)!;
    expect(keys).toEqual(expect.arrayContaining(['background.color', 'series.candlestick.upColor', 'grid.vertical.color']));
    expect(options).toEqual({ layer: 'user' });
    // No dark colours forced onto a light chart.
    expect(FakeChart.last.user).toEqual({});
    expect(FakeChart.last.themes).toEqual([]);
  });

  it("brings back the host's own theme when toggled back to it", () => {
    const brand: Theme = { ...LIGHT_THEME, name: 'brand', background: '#fdfaf3' };
    make({ theme: brand });
    inner().handleToggleTheme();
    expect(FakeChart.last.themes.at(-1)).toEqual(DARK_THEME);
    inner().handleToggleTheme();
    expect(FakeChart.last.themes.at(-1)).toEqual(brand);
  });

  it('remembers a theme set later for its mode', () => {
    make();
    const night: Theme = { ...DARK_THEME, name: 'night', background: '#000000' };
    widget.setTheme(night);
    inner().handleToggleTheme();
    expect(FakeChart.last.themes.at(-1)).toEqual(LIGHT_THEME);
    inner().handleToggleTheme();
    expect(FakeChart.last.themes.at(-1)).toEqual(night);
  });
});
