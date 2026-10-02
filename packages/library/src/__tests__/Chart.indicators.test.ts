// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { indicatorSource } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => {
    const close = 100 + Math.sin(i / 5) * 5;
    return { time: T0 + i * HOUR, open: close - 0.5, high: close + 1, low: close - 1, close, volume: 10 };
  });

type PaneProbe = { buildPanelRenderInfos(): { instanceId: string; viewport: { priceRange: { min: number; max: number } } }[] };

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars(300));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('indicator levels', () => {
  it('starts from the indicator’s defaults and can be changed or reset', () => {
    const rsi = chart.addIndicator('rsi')!;
    expect(chart.getIndicatorLevels(rsi)).toEqual([30, 70]);
    chart.setIndicatorLevels(rsi, [20, 50, 80, Number.NaN]);
    expect(chart.getIndicatorLevels(rsi)).toEqual([20, 50, 80]);
    chart.setIndicatorLevels(rsi, null);
    expect(chart.getIndicatorLevels(rsi)).toEqual([30, 70]);
  });

  it('keeps an instance’s own levels in a saved layout', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.setIndicatorLevels(rsi, [25, 75]);
    chart.addIndicator('cci');
    const json = chart.saveState()!;
    chart.loadState(json);
    const [restoredRsi, restoredCci] = chart.getActiveIndicators().map((i) => i.instanceId);
    expect(chart.getIndicatorLevels(restoredRsi)).toEqual([25, 75]);
    expect(chart.getIndicatorLevels(restoredCci)).toEqual([-100, 0, 100]); // defaults, not saved
  });
});

describe('indicator panes', () => {
  it('scale a bounded indicator to its bounds and keep levels in view', () => {
    const rsi = chart.addIndicator('rsi')!;
    const cci = chart.addIndicator('cci')!;
    chart.setIndicatorLevels(cci, [-400, 400]);
    const panes = (chart as unknown as PaneProbe).buildPanelRenderInfos();
    const range = (id: string) => panes.find((p) => p.instanceId === id)!.viewport.priceRange;
    expect(range(rsi)).toEqual({ min: 0, max: 100 });
    expect(range(cci).min).toBeLessThanOrEqual(-400);
    expect(range(cci).max).toBeGreaterThanOrEqual(400);
  });
});

describe('indicatorChange', () => {
  it('says which indicator changed and how', () => {
    const changes: string[] = [];
    chart.on('indicatorChange', (e) => {
      const p = e.payload as { instanceId: string; change: string };
      changes.push(`${p.instanceId === rsi ? 'rsi' : '?'}:${p.change}`);
    });
    const rsi = chart.addIndicator('rsi')!;
    chart.setIndicatorVisible(rsi, false);
    chart.updateIndicatorStyle(rsi, { colors: ['#123456'] });
    chart.setIndicatorLevels(rsi, [50]);
    chart.updateIndicator(rsi, { period: 21 });
    chart.setPanelPosition(rsi, 'top');
    expect(changes).toEqual(['rsi:visible', 'rsi:style', 'rsi:levels', 'rsi:params', 'rsi:pane']);
  });
});

describe('indicators on indicators', () => {
  const panes = () => chart.getIndicatorPanes().map((p) => p.instanceIds);

  it('draws a moving average of RSI in RSI’s pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    const sma = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })!;
    expect(panes()).toEqual([[rsi, sma]]);
    const series = chart.getIndicatorOutput(sma)!.series!;
    expect(series[series.length - 1]!.value).toBeGreaterThan(0);
    expect(series[series.length - 1]!.value).toBeLessThan(100);
  });

  it('moves with its source into a pane and back to the price pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    const sma = chart.addIndicator('sma', { period: 9 })!;
    expect(panes()).toEqual([[rsi]]);
    chart.updateIndicator(sma, { source: indicatorSource(rsi, 'value') });
    expect(panes()).toEqual([[rsi, sma]]);
    chart.updateIndicator(sma, { source: 'hl2' });
    expect(panes()).toEqual([[rsi]]);
  });

  it('removes the indicators computed from one with it', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') });
    const ema = chart.addIndicator('ema', { period: 20 })!;
    const removed: string[] = [];
    chart.on('indicatorRemove', (e) => removed.push((e.payload as { instanceId: string }).instanceId));
    chart.removeIndicator(rsi);
    expect(chart.getActiveIndicators().map((i) => i.instanceId)).toEqual([ema]);
    expect(removed).toHaveLength(2);
    expect(panes()).toEqual([]);
  });

  it('hands a shared pane to the next pane indicator in it', () => {
    const rsi = chart.addIndicator('rsi')!;
    const stoch = chart.addIndicator('stochastic', {}, 'bottom', { pane: rsi })!;
    expect(panes()).toEqual([[rsi, stoch]]);
    chart.removeIndicator(rsi);
    expect(panes()).toEqual([[stoch]]);
  });

  it('keeps sources and shared panes in a saved layout', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') });
    chart.loadState(chart.saveState()!);
    const [newRsi, newSma] = chart.getActiveIndicators();
    expect(newSma.params.source).toBe(indicatorSource(newRsi.instanceId, 'value'));
    expect(panes()).toEqual([[newRsi.instanceId, newSma.instanceId]]);
  });
});

describe('chart options', () => {
  it('draws candlesticks when no chart type is given', () => {
    const plain = new Chart(sizedHost(), {});
    plain.setData(bars(50));
    expect(plain.isTimeAligned()).toBe(true);
    expect(() => plain.updateLastBar({ ...bars(50)[49], close: 101 })).not.toThrow();
    plain.destroy();
  });
});
