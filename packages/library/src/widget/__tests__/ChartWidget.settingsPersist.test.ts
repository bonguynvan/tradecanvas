// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';
import { decodeWidgetState, encodeWidgetState } from '../widgetShareState.js';
import type { ChartSettingsState } from '../types.js';

/** Stand-in for the canvas-backed Chart: records the setters the widget calls, keeps the scale and the zone. */
class FakeChart {
  static last: FakeChart;
  calls: [string, unknown][] = [];
  steps: unknown[] = [];
  scaleMode = 'regular';
  zone: unknown;
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    this.zone = options.timeZone ?? null;
    return new Proxy(this, {
      get: (target, key, receiver) => {
        if (key in target) return Reflect.get(target, key, receiver);
        return (arg: unknown) => { if (typeof key === 'string' && key.startsWith('set')) target.calls.push([key, arg]); };
      },
    });
  }
  on(): () => void { return () => {}; }
  recordUndo(step: unknown): void { this.steps.push(step); }
  setScaleMode(mode: string): void { this.calls.push(['setScaleMode', mode]); this.scaleMode = mode; }
  getScaleMode(): string { return this.scaleMode; }
  setTimeZone(zone: unknown): void { this.calls.push(['setTimeZone', zone]); this.zone = zone; }
  getTimeZone(): unknown { return this.zone; }
  saveState(): string { return JSON.stringify({ version: 3, chartType: 'candlestick', drawings: [], indicators: [] }); }
  loadState(): void {}
  getTheme() { return { name: 'dark', background: '#000', grid: '#111' }; }
  isAutoScale(): boolean { return true; }
  getChartTypeOptions() { return {}; }
  getDrawings(): unknown[] { return []; }
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
  getRequiredSymbols(): string[] { return []; }
  getSymbolInfo(): null { return null; }
  getIndicatorOutput(): null { return null; }
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

const KEY = 'tcw:chart-settings';
let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

const make = (options: ConstructorParameters<typeof ChartWidget>[1] = {}) => {
  widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], layouts: false, ...options });
  return widget;
};
const calls = (name: string) => FakeChart.last.calls.filter(([n]) => n === name).map(([, v]) => v);
const openSettings = () => (widget as unknown as { openSettings(): void }).openSettings();
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`[role="tab"][data-tab="${name}"]`)!.click();
const footer = (act: string) => document.querySelector<HTMLButtonElement>(`.tcw-set .tcw-modal-footer [data-act="${act}"]`)!.click();
const menuItem = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent === text)!.click();
const toggle = (label: string) => [...document.querySelectorAll<HTMLElement>('.tcw-settings-row')]
  .find((r) => r.querySelector('.tcw-settings-label')?.textContent === label)!.querySelector<HTMLButtonElement>('.tcw-toggle')!;
const LAYERS = ['Volume profile', 'Market profile (TPO)', 'Swing markers', 'Session shading', 'Prior-period levels'];
/** The real dialog: the five Layers switches and the New York zone, then OK. */
const turnOnLayersAndZone = () => {
  openSettings();
  tab('layers');
  for (const label of LAYERS) toggle(label).click();
  tab('scales');
  const tz = document.querySelector<HTMLSelectElement>('select[aria-label="Timezone"]')!;
  tz.value = 'America/New_York';
  tz.dispatchEvent(new Event('change'));
  footer('ok');
};
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null') as { v: number; settings: Partial<ChartSettingsState> } | null;

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

describe('ChartWidget settings API', () => {
  it('getSettings returns what the settings dialog set, as a copy', () => {
    make();
    turnOnLayersAndZone();
    const settings = widget.getSettings();
    expect(settings).toMatchObject({
      volumeProfileVisible: true,
      marketProfileVisible: true,
      pivotMarkersVisible: true,
      sessionShadingVisible: true,
      periodLevelsVisible: true,
      timezone: 'America/New_York',
    });
    settings.volumeProfileVisible = false;
    settings.chartTypeOptions.renko = { boxSize: 9 };
    expect(widget.getSettings().volumeProfileVisible).toBe(true);
    expect(widget.getSettings().chartTypeOptions).toEqual({});
  });

  it('getSettings reads back what was set on the chart itself', () => {
    make();
    widget.getChart().setTimeZone('Asia/Tokyo');
    widget.getChart().setScaleMode('logarithmic');
    expect(widget.getSettings()).toMatchObject({ timezone: 'Asia/Tokyo', scaleMode: 'logarithmic', logScale: true });
  });

  it('setSettings applies a patch and leaves out what it cannot read', () => {
    make();
    widget.setSettings({ sessionShadingVisible: true, timezone: 'UTC' });
    expect(calls('setSessionShadingVisible')).toEqual([true]);
    expect(calls('setTimeZone')).toEqual(['UTC']);
    widget.setSettings({ pivotStrength: 999 });
    expect(calls('setPivotMarkersConfig')).toEqual([{ left: 20, right: 20 }]);
    widget.setSettings({ timezone: 'Not/AZone' });
    widget.setSettings({ numberLocale: '!!' });
    widget.setSettings({ bogus: true } as never);
    expect(calls('setTimeZone')).toEqual(['UTC']);
    expect(calls('setNumberLocale')).toEqual([]);
    expect(widget.getSettings()).not.toHaveProperty('bogus');
    expect(FakeChart.last.steps).toHaveLength(0);
  });

  it('onSettingsChange is called once after OK, not while the dialog is open, and not after Cancel', () => {
    make();
    const seen: ChartSettingsState[] = [];
    const stop = widget.onSettingsChange((s) => seen.push(s));
    openSettings();
    tab('layers');
    toggle('Volume profile').click();
    toggle('Swing markers').click();
    expect(seen).toEqual([]);
    footer('ok');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ volumeProfileVisible: true, pivotMarkersVisible: true });

    openSettings();
    tab('layers');
    toggle('Session shading').click();
    footer('cancel');
    expect(seen).toHaveLength(1);

    // A call that changes nothing says nothing.
    widget.setSettings({ volumeProfileVisible: true });
    expect(seen).toHaveLength(1);
    widget.setSettings({ gridVisible: false });
    expect(seen).toHaveLength(2);
    stop();
    widget.setSettings({ gridVisible: true });
    expect(seen).toHaveLength(2);
  });

  it('a shared link’s scale is the one a layout keeps', async () => {
    make();
    const token = encodeWidgetState({ v: 1, symbol: 'AAA', timeframe: '5m', chartType: 'candlestick', scaleMode: 'logarithmic', indicators: [], drawings: [] });
    expect(await widget.importState(token)).toBe(true);
    expect(JSON.parse(widget.getLayoutContent()).scaleMode).toBe('logarithmic');
    expect(widget.getSettings().scaleMode).toBe('logarithmic');
  });

  it('importState applies the shared overlays, not the sender’s time zone', async () => {
    make();
    const token = encodeWidgetState({
      v: 1, symbol: 'AAA', timeframe: '5m', chartType: 'candlestick', scaleMode: 'regular', indicators: [], drawings: [],
      settings: { volumeProfileVisible: true, timezone: 'Asia/Tokyo', numberLocale: 'de-DE' },
    });
    expect(await widget.importState(token)).toBe(true);
    expect(calls('setVolumeProfileVisible')).toEqual([true]);
    expect(calls('setTimeZone')).toEqual([]);
    expect(calls('setNumberLocale')).toEqual([]);
  });

  it('a shared link carries only the settings changed from the defaults, and not the viewer’s own', () => {
    make();
    widget.setSettings({ volumeProfileVisible: true, timezone: 'UTC', numberLocale: 'de-DE' });
    expect(decodeWidgetState(widget.exportState())!.settings).toEqual({ volumeProfileVisible: true });
  });
});

describe('ChartWidget persistSettings', () => {
  it('keeps the overlays and the time zone for the next widget', () => {
    make({ persistSettings: true });
    turnOnLayersAndZone();
    widget.destroy();
    make({ persistSettings: true });
    expect(calls('setVolumeProfileVisible')).toEqual([true]);
    expect(calls('setMarketProfileVisible')).toEqual([true]);
    expect(calls('setPivotMarkersVisible')).toEqual([true]);
    expect(calls('setSessionShadingVisible')).toEqual([true]);
    expect(calls('setPeriodLevelsVisible')).toEqual([true]);
    expect(calls('setTimeZone')).toEqual(['America/New_York']);
    // Nothing to undo: the user did not just change them.
    expect(FakeChart.last.steps).toHaveLength(0);
  });

  it('keeps only what differs from the host’s values, under its own key when given one', () => {
    make({ persistSettings: { key: 'mine' }, chartOptions: { timeZone: 'UTC' } });
    widget.setSettings({ gridVisible: false, timezone: 'UTC' });
    expect(JSON.parse(localStorage.getItem('mine')!)).toEqual({ v: 1, settings: { gridVisible: false } });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('without persistSettings nothing is written to localStorage', () => {
    make();
    turnOnLayersAndZone();
    widget.setSettings({ gridVisible: false });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does not keep chartTypeOptions, the log flag or auto-scale', () => {
    make({ persistSettings: true });
    widget.setSettings({ chartTypeOptions: { renko: { boxSize: 5 } }, autoScale: false, logScale: true, gridVisible: false });
    const kept = stored()!.settings;
    expect(kept).not.toHaveProperty('chartTypeOptions');
    expect(kept).not.toHaveProperty('autoScale');
    expect(kept).not.toHaveProperty('logScale');
    expect(kept).toMatchObject({ gridVisible: false, scaleMode: 'logarithmic' });
  });

  it('a persisted time zone wins over chartOptions.timeZone and Reset returns to it', () => {
    make({ persistSettings: true });
    widget.setSettings({ timezone: 'America/New_York' });
    widget.destroy();
    make({ persistSettings: true, chartOptions: { timeZone: 'UTC' } });
    expect(calls('setTimeZone')).toEqual(['America/New_York']);
    expect(widget.getSettings().timezone).toBe('America/New_York');
    openSettings();
    footer('template');
    menuItem('Reset to defaults');
    footer('ok');
    expect(calls('setTimeZone').at(-1)).toBe('UTC');
    expect(stored()!.settings).not.toHaveProperty('timezone');
  });

  it('stored values it cannot read are left out', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, settings: { volumeProfileVisible: 'yes', timezone: 'Mars/Base', pivotStrength: -4, bogus: 1 } }));
    make({ persistSettings: true });
    expect(calls('setVolumeProfileVisible')).toEqual([]);
    expect(calls('setTimeZone')).toEqual([]);
    expect(calls('setPivotMarkersConfig')).toEqual([{ left: 2, right: 2 }]);
    expect(widget.getSettings()).not.toHaveProperty('bogus');
  });

  it('corrupt stored settings are ignored', () => {
    make();
    const fresh = FakeChart.last.calls;
    widget.destroy();
    for (const junk of ['{oops', '[1,2]', '"text"', JSON.stringify({ v: 2, settings: { gridVisible: false } }), JSON.stringify({ v: 1, settings: 'x' })]) {
      localStorage.setItem(KEY, junk);
      make({ persistSettings: true });
      // The chart is set up as a widget without anything kept is.
      expect(FakeChart.last.calls).toEqual(fresh);
      expect(widget.getSettings().gridVisible).toBe(true);
      widget.destroy();
    }
    make();
  });

  it('a kept switch stays off where the host switched its feature off', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, settings: { barCountdown: true, scaleMode: 'logarithmic' } }));
    make({ persistSettings: true, chartOptions: { features: { barCountdown: false, logScale: false } } });
    expect(calls('setBarCountdownVisible')).toEqual([]);
    expect(calls('setScaleMode')).toEqual([]);
    expect(widget.getSettings()).toMatchObject({ barCountdown: false, scaleMode: 'regular' });
  });
});
