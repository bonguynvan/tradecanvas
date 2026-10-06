// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

function bars(n: number): OHLCBar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => {
    const p = 100 + Math.sin(i / 5) * 3;
    return { time: t0 + i * 60_000, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 1000 };
  });
}

let hosts: HTMLDivElement[];

function makeChart(): Chart {
  const host = sizedHost();
  hosts.push(host);
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars(150));
  return chart;
}

type Panels = { buildPanelRenderInfos(): { instanceId: string; style?: { background?: string; separator?: string } }[] };
const panels = (chart: Chart) => {
  (chart as unknown as { panelInfoCache: null }).panelInfoCache = null;
  return (chart as unknown as Panels).buildPanelRenderInfos();
};

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

describe('Indicator plot styles', () => {
  it("keeps each plot's dash and visibility, a change at a time", () => {
    const chart = makeChart();
    const macd = chart.addIndicator('macd')!;
    chart.updateIndicatorStyle(macd, { plots: { signal: { visible: false } } });
    chart.updateIndicatorStyle(macd, { plots: { signal: { lineStyle: 'dashed' }, macd: { lineStyle: 'dotted' } } });
    expect(chart.getIndicatorStyle(macd)?.plots).toEqual({
      signal: { visible: false, lineStyle: 'dashed' },
      macd: { lineStyle: 'dotted' },
    });
  });

  it('undoes and redoes a plot style change', () => {
    const chart = makeChart();
    const macd = chart.addIndicator('macd')!;
    chart.updateIndicatorStyle(macd, { plots: { signal: { visible: false } } });
    expect(chart.undo()).toBe(true);
    expect(chart.getIndicatorStyle(macd)?.plots ?? {}).toEqual({});
    expect(chart.redo()).toBe(true);
    expect(chart.getIndicatorStyle(macd)?.plots).toEqual({ signal: { visible: false } });
  });

  it('leaves hidden plots out of the pane scale', () => {
    const chart = makeChart();
    const macd = chart.addIndicator('macd')!;
    const engine = (chart as unknown as { indicatorEngine: { getPaneValueRange(id: string, from: number, to: number): unknown } }).indicatorEngine;
    expect(engine.getPaneValueRange(macd, 0, 149)).not.toBeNull();
    chart.updateIndicatorStyle(macd, { plots: { histogram: { visible: false }, macd: { visible: false }, signal: { visible: false } } });
    expect(engine.getPaneValueRange(macd, 0, 149)).toBeNull();
  });

  it('saves them and loads them back', () => {
    const chart = makeChart();
    const macd = chart.addIndicator('macd')!;
    chart.updateIndicatorStyle(macd, { plots: { signal: { visible: false } } });
    const saved = chart.saveState()!;
    const other = makeChart();
    other.loadState(saved);
    const restored = other.getActiveIndicators().find((i) => i.id === 'macd')!;
    expect(other.getIndicatorStyle(restored.instanceId)?.plots).toEqual({ signal: { visible: false } });
  });
});

describe('Indicator defaults', () => {
  it('styles the indicators of a kind added from then on', () => {
    const chart = makeChart();
    const before = chart.addIndicator('ema', { period: 9 })!;
    chart.setIndicatorDefaults('ema', { colors: ['#123456'], lineWidths: [3], plots: { value: { lineStyle: 'dashed' } } });
    const after = chart.addIndicator('ema', { period: 21 })!;
    expect(chart.getIndicatorStyle(after)).toMatchObject({ colors: ['#123456'], lineWidths: [3], plots: { value: { lineStyle: 'dashed' } } });
    expect(chart.getIndicatorStyle(before)?.colors).not.toEqual(['#123456']);
    chart.setIndicatorDefaults('ema', null);
    expect(chart.getIndicatorStyle(chart.addIndicator('ema', { period: 50 })!)?.colors).not.toEqual(['#123456']);
  });
});

describe('Pane styles', () => {
  it("gives a pane its own background and separator, saved with its indicator", () => {
    const chart = makeChart();
    const rsi = chart.addIndicator('rsi')!;
    chart.setPaneStyle(rsi, { background: '#0a0a0a', separator: '#ff00ff' });
    expect(chart.getPaneStyle(rsi)).toEqual({ background: '#0a0a0a', separator: '#ff00ff' });
    expect(panels(chart).find((p) => p.instanceId === rsi)?.style).toEqual({ background: '#0a0a0a', separator: '#ff00ff' });

    const other = makeChart();
    other.loadState(chart.saveState()!);
    const restored = other.getActiveIndicators().find((i) => i.id === 'rsi')!;
    expect(other.getPaneStyle(restored.instanceId)).toEqual({ background: '#0a0a0a', separator: '#ff00ff' });
  });

  it('styles the pane an indicator is drawn in, whichever of its indicators is named', () => {
    const chart = makeChart();
    const rsi = chart.addIndicator('rsi')!;
    const sma = chart.addIndicator('sma', { period: 9 }, 'bottom', { pane: rsi })!;
    chart.setPaneStyle(sma, { separator: '#123456' });
    expect(chart.getPaneStyle(rsi)).toEqual({ separator: '#123456' });
    expect(chart.getPaneStyle(sma)).toEqual({ separator: '#123456' });
  });

  it('hands a pane style to the indicator that takes the pane over when its owner moves away', () => {
    const chart = makeChart();
    const rsi = chart.addIndicator('rsi')!;
    const macd = chart.addIndicator('macd', {}, 'bottom', { pane: rsi })!;
    const stoch = chart.addIndicator('stochastic')!;
    chart.setPaneStyle(rsi, { background: '#0a0a0a' });
    expect(chart.moveIndicatorToPane(rsi, stoch)).toBe(true);
    expect(chart.getPaneStyle(macd)).toEqual({ background: '#0a0a0a' });
    // RSI now draws in Stochastic's pane, which has no style of its own.
    expect(chart.getPaneStyle(rsi)).toBeNull();
    const saved = JSON.parse(chart.saveState()!) as { indicators: { instanceId: string; paneStyle?: unknown }[] };
    expect(saved.indicators.find((i) => i.instanceId === rsi)?.paneStyle).toBeUndefined();
    expect(saved.indicators.find((i) => i.instanceId === macd)?.paneStyle).toEqual({ background: '#0a0a0a' });
  });

  it('takes no colour it cannot use, and goes with null', () => {
    const chart = makeChart();
    const rsi = chart.addIndicator('rsi')!;
    chart.setPaneStyle(rsi, { background: 'url(x)', separator: '#333333' });
    expect(chart.getPaneStyle(rsi)).toEqual({ separator: '#333333' });
    chart.setPaneStyle(rsi, null);
    expect(chart.getPaneStyle(rsi)).toBeNull();
  });
});
