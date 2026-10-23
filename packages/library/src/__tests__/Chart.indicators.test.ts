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

describe('indicator review fixes', () => {
  const panes = () => chart.getIndicatorPanes().map((p) => p.instanceIds);

  it('ignores a source that would read from itself, and removes such chains cleanly', () => {
    const a = chart.addIndicator('sma', { period: 5 })!;
    const b = chart.addIndicator('sma', { period: 5, source: indicatorSource(a, 'value') })!;
    chart.updateIndicator(a, { source: indicatorSource(b, 'value'), period: 7 });
    const params = chart.getActiveIndicators().find((i) => i.instanceId === a)!.params;
    expect(params.source).toBe('close'); // the loop was refused…
    expect(params.period).toBe(7);       // …the rest applied
    expect(() => chart.removeIndicator(a)).not.toThrow();
    expect(chart.getActiveIndicators()).toEqual([]);
  });

  it('keeps an indicator placed in a pane there when its inputs change', () => {
    const rsi = chart.addIndicator('rsi')!;
    const ema = chart.addIndicator('ema', { period: 9 }, 'bottom', { pane: rsi })!;
    chart.updateIndicator(ema, { period: 14 });
    expect(panes()).toEqual([[rsi, ema]]);
  });

  it('hands a pane to its first pane indicator, keeping the others in it', () => {
    const rsi = chart.addIndicator('rsi')!;
    const ema = chart.addIndicator('ema', { period: 9 }, 'bottom', { pane: rsi })!;
    const stoch = chart.addIndicator('stochastic', {}, 'bottom', { pane: rsi })!;
    chart.removeIndicator(rsi);
    expect(panes()).toEqual([[stoch, ema]]);
  });

  it('only lets a pane indicator own a pane', () => {
    const ema = chart.addIndicator('ema', { period: 9 })!;
    const sma = chart.addIndicator('sma', { period: 9 }, 'bottom', { pane: ema })!;
    expect(chart.getActiveIndicators().find((i) => i.instanceId === sma)!.pane).toBeUndefined();
  });

  it('refits a pane’s scale to a live tick', async () => {
    const data = bars(300);
    chart.setData(data);
    const macd = chart.addIndicator('macd')!;
    const range = () => (chart as unknown as PaneProbe).buildPanelRenderInfos().find((p) => p.instanceId === macd)!.viewport.priceRange;
    const before = range();
    chart.updateLastBar({ ...data[299], close: data[299].close + 40, high: data[299].close + 40 });
    await new Promise((r) => setTimeout(r, 40));
    expect(range().max).toBeGreaterThan(before.max);
  });
});

describe('indicators shown on some intervals only', () => {
  const adapter = {
    name: 'fake',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected' as const,
    fetchHistory: async () => bars(300),
    on: () => {},
    off: () => {},
    dispose: () => {},
  };

  it('follow the stream’s interval, and come back on one they allow', async () => {
    await chart.connect({ adapter, symbol: 'AAA', timeframe: '1h', historyLimit: 300 });
    const sma = chart.addIndicator('sma')!;
    chart.setIndicatorIntervals(sma, { hours: [4, 24] });
    expect(chart.getActiveIndicators()[0]).toMatchObject({ visible: true, shown: false });
    await chart.switchStream('AAA', '4h');
    expect(chart.getActiveIndicators()[0].shown).toBe(true);
    expect(chart.getIndicatorIntervals(sma)).toEqual({ hours: [4, 24] });
  });

  it('follow the interval given with the data when there is no stream', () => {
    const sma = chart.addIndicator('sma')!;
    chart.setIndicatorIntervals(sma, { hours: false });
    expect(chart.getActiveIndicators()[0].shown).toBe(true); // no interval known yet
    const changes: string[] = [];
    chart.on('timeframeChange', (e) => changes.push((e.payload as { timeframe: string }).timeframe));
    chart.setDataTimeframe('1h');
    expect(chart.getActiveIndicators()[0].shown).toBe(false);
    chart.setDataTimeframe('1d');
    expect(chart.getActiveIndicators()[0].shown).toBe(true);
    expect(changes).toEqual(['1h', '1d']);
  });

  it('keep their intervals in a saved layout, and are one undo step', () => {
    const sma = chart.addIndicator('sma')!;
    const changes: string[] = [];
    chart.on('indicatorChange', (e) => changes.push((e.payload as { change: string }).change));
    chart.setIndicatorIntervals(sma, { minutes: false });
    expect(changes).toEqual(['intervals']);
    chart.loadState(chart.saveState()!);
    const restored = chart.getActiveIndicators()[0].instanceId;
    expect(chart.getIndicatorIntervals(restored)).toEqual({ minutes: false });
    chart.setIndicatorIntervals(restored, null);
    expect(chart.getIndicatorIntervals(restored)).toBeNull();
    chart.undo();
    expect(chart.getIndicatorIntervals(chart.getActiveIndicators()[0].instanceId)).toEqual({ minutes: false });
  });
});

describe('an indicator edit (its settings dialog open)', () => {
  const period = (id: string) => chart.getActiveIndicators().find((i) => i.instanceId === id)?.params.period;

  it('is one undo step, however many changes it made', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.beginIndicatorEdit(rsi);
    chart.updateIndicator(rsi, { period: 21 });
    chart.setIndicatorLevels(rsi, [20, 80]);
    chart.setIndicatorIntervals(rsi, { minutes: false });
    chart.endIndicatorEdit();
    chart.undo();
    const back = chart.getActiveIndicators()[0].instanceId;
    expect(period(back)).toBe(14);
    expect(chart.getIndicatorLevels(back)).toEqual([30, 70]);
    expect(chart.getIndicatorIntervals(back)).toBeNull();
    chart.undo();
    expect(chart.getActiveIndicators()).toHaveLength(0);
  });

  it('leaves no step when it ends where it began, as a cancel does', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.beginIndicatorEdit(rsi);
    chart.updateIndicator(rsi, { period: 21 });
    chart.updateIndicator(rsi, { period: 14 });
    chart.endIndicatorEdit();
    chart.undo();
    expect(chart.getActiveIndicators()).toHaveLength(0);
  });
});
