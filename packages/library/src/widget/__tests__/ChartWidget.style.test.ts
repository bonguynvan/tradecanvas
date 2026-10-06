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
  changeStyle(patch: Record<string, unknown>): void;
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
  it("puts the look picked in the settings among the user's overrides, not into the theme", () => {
    make();
    inner().changeStyle({ 'series.heikinAshi.upColor': '#00ff00', 'grid.horizontal.width': 2, 'trading.buyColor': '#0000ff' });
    expect(FakeChart.last.overrideCalls).toEqual([[{
      'series.heikinAshi.upColor': '#00ff00',
      'grid.horizontal.width': 2,
      'trading.buyColor': '#0000ff',
    }, { layer: 'user' }]]);
    expect(FakeChart.last.themes).toEqual([]);
  });

  it('undoes a colour back to no override at all, not to the colour it resolved to', () => {
    make();
    inner().changeStyle({ 'series.candlestick.upColor': '#00ff00' });
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.user).toEqual({});
    FakeChart.last.steps.at(-1)!.redo();
    expect(FakeChart.last.user).toEqual({ 'series.candlestick.upColor': '#00ff00' });
  });

  it('undoes only the keys it changed, leaving what the host set on the user’s layer since', () => {
    make();
    inner().changeStyle({ 'background.color': '#010101' });
    widget.getChart().applyOverrides({ 'grid.horizontal.color': '#222222' }, { layer: 'user' });
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.user).toEqual({ 'grid.horizontal.color': '#222222' });
  });

  it('takes a key back to the part’s own with null, as one more step', () => {
    make();
    inner().changeStyle({ 'markers.longColor': '#00ff00' });
    inner().changeStyle({ 'markers.longColor': null });
    expect(FakeChart.last.user).toEqual({});
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.user).toEqual({ 'markers.longColor': '#00ff00' });
  });

  it('makes a colour dragged across the picker one step', () => {
    make();
    inner().changeStyle({ 'background.color': '#010101' });
    inner().changeStyle({ 'background.color': '#020202' });
    const [a, b] = FakeChart.last.steps.slice(-2);
    expect(a.subject).toBeDefined();
    expect(a.subject).toBe(b.subject);
  });

  it('leaves the colours of another theme alone on an undo', () => {
    make();
    inner().changeStyle({ 'background.color': '#010101' });
    FakeChart.last.themeName = 'light';
    const calls = FakeChart.last.overrideCalls.length;
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.overrideCalls).toHaveLength(calls);
  });

  it("shows the chart's look when the settings open", () => {
    make();
    FakeChart.last.user['series.candlestick.upColor'] = '#123456';
    inner().openSettings();
    const up = document.querySelector<HTMLInputElement>('.tcw-modal input[aria-label="Up body"]')!;
    expect(up.closest('.tcw-settings-row')!.querySelector('.tcw-color-hex')!.textContent).toBe('#123456');
  });

  it("resets the look to the theme's, whatever theme it is, every chart type's too", () => {
    make({ theme: 'light' });
    inner().changeStyle({ 'background.color': '#010101', 'series.kagi.upColor': '#00ff00', 'tradeZones.activeColor': '#0000ff' });
    inner().resetSettings();
    const [keys, options] = FakeChart.last.resets.at(-1)!;
    expect(keys).toEqual(expect.arrayContaining([
      'background.color', 'series.candlestick.upColor', 'series.kagi.upColor', 'grid.vertical.width',
      'trading.buyColor', 'markers.neutralColor', 'tradeZones.activeColor', 'drawings.handleColor', 'sessionBreaks.style',
    ]));
    expect(options).toEqual({ layer: 'user' });
    // No dark colours forced onto a light chart.
    expect(FakeChart.last.user).toEqual({});
    expect(FakeChart.last.themes).toEqual([]);
    FakeChart.last.steps.at(-1)!.undo();
    expect(FakeChart.last.user).toEqual({ 'background.color': '#010101', 'series.kagi.upColor': '#00ff00', 'tradeZones.activeColor': '#0000ff' });
  });

  it('takes the look that is not a colour to the other theme, and leaves the colours with theirs', () => {
    make();
    const chart = FakeChart.last;
    const buckets = new Map<string, Record<string, unknown>>([['dark', chart.user]]);
    chart.setTheme = (theme: unknown) => {
      chart.themes.push(theme);
      const name = (theme as Theme).name;
      chart.themeName = name;
      if (!buckets.has(name)) buckets.set(name, {});
      chart.user = buckets.get(name)!;
    };
    inner().changeStyle({
      'grid.vertical.visible': false,
      'crosshair.horizontal.style': 'dotted',
      'series.line.lineWidth': 3,
      'crosshair.horizontal.color': '#123456',
    });
    inner().handleToggleTheme();
    expect(chart.user).toEqual({ 'grid.vertical.visible': false, 'crosshair.horizontal.style': 'dotted', 'series.line.lineWidth': 3 });
    expect(buckets.get('dark')!['crosshair.horizontal.color']).toBe('#123456');
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
