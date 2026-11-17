// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IndicatorPlugin, IndicatorValue, OHLCBar, Theme } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

function bars(n: number): OHLCBar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => ({ time: t0 + i * 60_000, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }));
}

const DARK_COLORS = ['#eeeeee'];
const LIGHT_COLORS = ['#111111'];

/** A host's indicator in its own colours for each theme. */
const turnPlugin: IndicatorPlugin = {
  descriptor: {
    id: 'tdk-turn',
    name: 'Turn',
    placement: 'overlay',
    defaultConfig: {},
    plots: [{ key: 'value', title: 'Value', color: 0 }],
    defaultStyle: (theme: Theme) => ({ colors: theme.name === 'light' ? LIGHT_COLORS : DARK_COLORS }),
  },
  calculate(data) {
    const values = new Map<number, IndicatorValue>();
    const series = data.map((bar) => {
      const v = { value: bar.close };
      values.set(bar.time, v);
      return v;
    });
    return { values, series };
  },
  render() {},
};

let hosts: HTMLDivElement[];

function makeChart(theme: 'dark' | 'light'): Chart {
  const host = sizedHost();
  hosts.push(host);
  const chart = new Chart(host, { chartType: 'candlestick', theme, plugins: [{ kind: 'indicator', plugin: turnPlugin }] });
  chart.setData(bars(50));
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

describe("a custom indicator's colours by theme", () => {
  it('changes colour with the theme', () => {
    const chart = makeChart('dark');
    const id = chart.addIndicator('tdk-turn')!;
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(DARK_COLORS);
    chart.setTheme('light');
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(LIGHT_COLORS);
  });

  it("leaves the viewer's saved default alone", () => {
    const chart = makeChart('dark');
    chart.setIndicatorDefaults('tdk-turn', { colors: ['#ff8800'] });
    const id = chart.addIndicator('tdk-turn')!;
    chart.setTheme('light');
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(['#ff8800']);
  });

  it("opens a layout saved in one theme in the colours of the theme it is shown in", () => {
    const dark = makeChart('dark');
    dark.addIndicator('tdk-turn');
    const saved = dark.saveState()!;
    expect(dark.getIndicatorSetup()[0].style?.colors).toBeUndefined();

    const light = makeChart('light');
    light.loadState(saved);
    // A state carries its theme; the app then puts its own back.
    light.setTheme('light');
    const restored = light.getActiveIndicators().find((ind) => ind.id === 'tdk-turn')!;
    expect(light.getIndicatorStyle(restored.instanceId)?.colors).toEqual(LIGHT_COLORS);
  });

  it("puts the theme's colours back on an undo, and they follow the theme again", () => {
    const chart = makeChart('dark');
    const id = chart.addIndicator('tdk-turn')!;
    chart.updateIndicatorStyle(id, { colors: ['#00ff00'] });
    chart.undo();
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(DARK_COLORS);
    chart.setTheme('light');
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(LIGHT_COLORS);
    chart.redo();
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(['#00ff00']);
  });

  it('takes the light look from the start on a light chart', () => {
    const chart = makeChart('light');
    const id = chart.addIndicator('tdk-turn')!;
    expect(chart.getIndicatorStyle(id)?.colors).toEqual(LIGHT_COLORS);
  });

  it('draws in its own look when its defaultStyle throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = sizedHost();
    hosts.push(host);
    const broken: IndicatorPlugin = { ...turnPlugin, descriptor: { ...turnPlugin.descriptor, id: 'broken', defaultStyle: () => { throw new Error('no'); } } };
    const chart = new Chart(host, { chartType: 'candlestick', plugins: [{ kind: 'indicator', plugin: broken }] });
    chart.setData(bars(50));
    const id = chart.addIndicator('broken')!;
    expect(chart.getIndicatorStyle(id)?.colors.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalled();
  });

  it('keeps colours someone picked in a saved layout', () => {
    const dark = makeChart('dark');
    const id = dark.addIndicator('tdk-turn')!;
    dark.updateIndicatorStyle(id, { colors: ['#00ff00'] });
    const light = makeChart('light');
    light.loadState(dark.saveState()!);
    light.setTheme('light');
    const restored = light.getActiveIndicators().find((ind) => ind.id === 'tdk-turn')!;
    expect(light.getIndicatorStyle(restored.instanceId)?.colors).toEqual(['#00ff00']);
  });
});
