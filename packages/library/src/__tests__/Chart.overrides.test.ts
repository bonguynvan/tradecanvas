// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DARK_THEME, LIGHT_THEME, type OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

function bars(n: number): OHLCBar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => ({ time: t0 + i * 60_000, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }));
}

let hosts: HTMLDivElement[];

function makeChart(options: ConstructorParameters<typeof Chart>[1] = {}): Chart {
  const host = sizedHost();
  hosts.push(host);
  const chart = new Chart(host, { chartType: 'candlestick', ...options });
  chart.setData(bars(100));
  return chart;
}

beforeEach(() => {
  hosts = [];
  vi.useFakeTimers();
  installChartStubs();
  localStorage.clear();
});

afterEach(() => {
  for (const h of hosts) h.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart style overrides', () => {
  it('draws with the overrides on the theme, and reports what each key resolves to', () => {
    const chart = makeChart();
    chart.applyOverrides({ 'series.candlestick.upColor': '#00ff00', 'grid.vertical.visible': false });
    expect(chart.getStyleValue('series.candlestick.upColor')).toBe('#00ff00');
    expect(chart.getTheme().candleUp).toBe(DARK_THEME.candleUp);
    expect(chart.getStyle().grid.vertical.visible).toBe(false);
    expect(chart.getStyleValue('series.candlestick.wickUpColor')).toBe('#00ff00');
    expect(chart.getStyleValue('grid.horizontal.color')).toBe(DARK_THEME.grid);
    expect(chart.getOverrides()).toEqual({ 'series.candlestick.upColor': '#00ff00', 'grid.vertical.visible': false });
  });

  it('says when the style changed, once per change', () => {
    const chart = makeChart();
    const changes: unknown[] = [];
    chart.on('styleChange', (e) => changes.push(e.payload));
    chart.applyOverrides({ 'legend.textColor': '#fff' });
    chart.applyOverrides({ 'legend.textColor': '#fff' });
    chart.applyOverrides({ 'legend.textColor': '#eee' }, { layer: 'user' });
    expect(changes).toEqual([{ layer: 'host' }, { layer: 'user' }]);
  });

  it('leaves out keys and values it does not know, with a warning', () => {
    const chart = makeChart();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    chart.applyOverrides({ 'grid.horizontal.width': 2, 'grid.horizontal.style': 'zigzag', 'nope.key': 1 } as never);
    expect(chart.getOverrides()).toEqual({ 'grid.horizontal.width': 2 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('grid.horizontal.style');
  });

  it('takes overrides away by key, by value null, or all of a layer', () => {
    const chart = makeChart();
    chart.applyOverrides({ 'axis.price.textColor': '#111', 'axis.time.textColor': '#222', 'legend.labelColor': '#333' });
    chart.applyOverrides({ 'legend.labelColor': null });
    chart.resetOverrides(['axis.price.textColor']);
    expect(chart.getOverrides()).toEqual({ 'axis.time.textColor': '#222' });
    chart.applyOverrides({ 'axis.time.textColor': '#999' }, { layer: 'user' });
    chart.resetOverrides(undefined, { layer: 'host' });
    expect(chart.getOverrides()).toEqual({});
    expect(chart.getOverrides({ layer: 'user' })).toEqual({ 'axis.time.textColor': '#999' });
  });

  it('puts a whole layer in place of what it had', () => {
    const chart = makeChart();
    const changes: unknown[] = [];
    chart.on('styleChange', (e) => changes.push(e.payload));
    chart.applyOverrides({ 'axis.price.textColor': '#111', 'legend.textColor': '#222' });
    chart.setOverrides({ 'legend.textColor': '#333', 'grid.vertical.visible': false });
    expect(chart.getOverrides()).toEqual({ 'legend.textColor': '#333', 'grid.vertical.visible': false });
    chart.setOverrides({ 'legend.textColor': '#333', 'grid.vertical.visible': false });
    expect(changes).toHaveLength(2);
  });

  it("keeps the user's overrides with the theme they were made on, and the host's on every theme", () => {
    const chart = makeChart();
    chart.applyOverrides({ 'background.color': '#101010' }, { layer: 'user' });
    chart.applyOverrides({ 'legend.textColor': '#abcdef' });
    chart.setTheme('light');
    expect(chart.getStyleValue('background.color')).toBe(LIGHT_THEME.background);
    expect(chart.getOverrides({ layer: 'user' })).toEqual({});
    expect(chart.getStyle().legend.text).toBe('#abcdef');
    chart.setTheme('dark');
    expect(chart.getStyleValue('background.color')).toBe('#101010');
  });

  it("applies the chart type's own series keys", () => {
    const chart = makeChart();
    chart.applyOverrides({ 'series.candlestick.upColor': '#0f0', 'series.bar.upColor': '#00f', 'series.line.lineWidth': 3 });
    // The last price takes the colours of the series as drawn.
    expect(chart.getStyle().lastPrice.up).toBe('#0f0');
    chart.setChartType('bar');
    expect(chart.getStyle().lastPrice.up).toBe('#00f');
    chart.setChartType('line');
    expect(chart.getStyle().series.lineWidth).toBe(3);
  });

  it('starts with the overrides in its options, and reads the grid and crosshair options as keys', () => {
    const chart = makeChart({
      overrides: { 'watermark.color': 'rgba(0, 0, 0, 0.2)' },
      grid: { visible: true, hLineColor: '#121212', vLineStyle: 'dotted' },
      crosshair: { mode: 'normal', hLine: { color: '#343434', style: 'solid', width: 2 }, vLine: { visible: false, labelBackground: '#565656' } },
    });
    const s = chart.getStyle();
    expect(s.watermark.color).toBe('rgba(0, 0, 0, 0.2)');
    expect(s.grid.horizontal.color).toBe('#121212');
    expect(s.grid.vertical.style).toBe('dotted');
    expect(s.crosshair.horizontal).toEqual({ visible: true, color: '#343434', style: 'solid', width: 2 });
    expect(s.crosshair.vertical.visible).toBe(false);
    expect(s.crosshair.labelBackground).toBe('#565656');
  });

  it("doesn't bake the overrides into the theme when it is set back", () => {
    const chart = makeChart();
    chart.applyOverrides({ 'background.color': '#050505' });
    chart.setTheme(chart.getTheme());
    chart.resetOverrides();
    expect(chart.getStyleValue('background.color')).toBe(DARK_THEME.background);
  });

  it('paints the container in the background colour', () => {
    const chart = makeChart();
    chart.applyOverrides({ 'background.color': 'rgb(1, 2, 3)' });
    expect(hosts[0].style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it("saves the user's overrides by theme and not the host's, and loads them back", () => {
    const chart = makeChart();
    chart.applyOverrides({ 'series.candlestick.downColor': '#ff0000' }, { layer: 'user' });
    chart.applyOverrides({ 'legend.textColor': '#ffffff' });
    const saved = JSON.parse(chart.saveState()!);
    expect(saved.version).toBe(3);
    expect(saved.overrides).toEqual({ dark: { 'series.candlestick.downColor': '#ff0000' } });
    expect(saved.theme).toBe('dark');

    const other = makeChart();
    other.loadState(JSON.stringify(saved));
    expect(other.getStyleValue('series.candlestick.downColor')).toBe('#ff0000');
    expect(other.getOverrides({ layer: 'host' })).toEqual({});
  });

  it("leaves the user's overrides alone on loading a save from before them, and takes no bad ones from a save", () => {
    const chart = makeChart();
    chart.applyOverrides({ 'background.color': '#111111' }, { layer: 'user' });
    const v2 = { ...JSON.parse(chart.saveState()!), version: 2 };
    delete v2.overrides;
    const changes: unknown[] = [];
    chart.on('styleChange', (e) => changes.push(e.payload));
    chart.loadState(JSON.stringify(v2));
    expect(chart.getOverrides({ layer: 'user' })).toEqual({ 'background.color': '#111111' });
    expect(changes).toEqual([]);

    const v3 = { ...JSON.parse(chart.saveState()!), overrides: { dark: { 'background.color': 'url(x)', 'legend.textColor': '#123' } } };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    chart.loadState(JSON.stringify(v3));
    expect(chart.getOverrides({ layer: 'user' })).toEqual({ 'legend.textColor': '#123' });
  });
});
