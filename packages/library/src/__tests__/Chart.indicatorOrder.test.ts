// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';
import { scriptBars } from './indicatorScript.js';

/**
 * An undo, a redo and a loaded layout put the indicators back as they were:
 * in the same order (the legend, the drawing order, a pane's stack) and
 * with the same inputs, none left over.
 */
let chart: Chart;
let clock = 0;

beforeEach(() => {
  installChartStubs();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  chart = new Chart(sizedHost(800, 900), { chartType: 'candlestick' });
  chart.setData(scriptBars);
});

afterEach(() => {
  chart.destroy();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Each change a step of its own, not merged with the last. */
const later = () => (clock += 5000);
const order = (c: Chart = chart) => c.getActiveIndicators().map((i) => i.instanceId);
const kinds = (c: Chart) => c.getActiveIndicators().map((i) => i.id);

describe('indicator order after an undo or a redo', () => {
  it('puts a removed indicator back in its place', () => {
    const a = chart.addIndicator('sma')!;
    later();
    const b = chart.addIndicator('ema')!;
    later();
    const c = chart.addIndicator('rsi')!;
    later();
    chart.removeIndicator(b);
    chart.undo();
    expect(order()).toEqual([a, b, c]);
    chart.redo();
    expect(order()).toEqual([a, c]);
  });

  it('keeps the order through a move to another pane and back', () => {
    const sma = chart.addIndicator('sma')!;
    later();
    const rsi = chart.addIndicator('rsi')!;
    later();
    const ema = chart.addIndicator('ema')!;
    later();
    chart.moveIndicatorToPane(sma, rsi);
    const moved = order();
    chart.undo();
    expect(order()).toEqual([sma, rsi, ema]);
    chart.redo();
    expect(order()).toEqual(moved);
  });

  it('keeps the stack of a pane through a removal and its undo', () => {
    const rsi = chart.addIndicator('rsi')!;
    later();
    const a = chart.addIndicator('sma', {}, 'bottom', { pane: rsi })!;
    later();
    const b = chart.addIndicator('ema', {}, 'bottom', { pane: rsi })!;
    later();
    chart.removeIndicator(a);
    chart.undo();
    expect(chart.getIndicatorPanes()[0].instanceIds).toEqual([rsi, a, b]);
  });
});

describe('indicator order in a loaded layout', () => {
  it('is the saved order, though a pane\'s host was added after its member', () => {
    const sma = chart.addIndicator('sma')!;
    const rsi = chart.addIndicator('rsi')!;
    chart.moveIndicatorToPane(sma, rsi);
    const other = new Chart(sizedHost(800, 900), { chartType: 'candlestick' });
    try {
      other.setData(scriptBars);
      other.loadState(chart.saveState()!);
      expect(kinds(other)).toEqual(kinds(chart));
      expect(kinds(other)).toEqual(['sma', 'rsi']);
    } finally {
      other.destroy();
    }
  });
});

describe('inputs after an undo', () => {
  it('takes back an input the indicator did not have', () => {
    const macd = chart.addIndicator('macd')!;
    later();
    const before = chart.getIndicatorConfig(macd)!.params;
    chart.updateIndicator(macd, { period: 6 });
    later();
    chart.undo();
    expect(chart.getIndicatorConfig(macd)!.params).toEqual(before);
    chart.redo();
    expect(chart.getIndicatorConfig(macd)!.params).toEqual({ ...before, period: 6 });
  });

  it('keeps in its pane one drawn in the pane of an indicator taken down with its source', () => {
    const macd = chart.addIndicator('macd')!;
    later();
    // RSI of MACD's line, in a pane of its own, an EMA drawn in it.
    const rsi = chart.addIndicator('rsi', { source: `ind:${macd}:macd` } as never)!;
    later();
    const ema = chart.addIndicator('ema', {}, 'bottom', { pane: rsi })!;
    later();
    const before = chart.getIndicatorSetup();
    // An input MACD lacks: the undo takes MACD down, and RSI, which reads it, with it.
    chart.updateIndicator(macd, { period: 6 });
    later();
    chart.undo();
    expect(chart.getActiveIndicators().find((i) => i.instanceId === ema)?.pane).toBe(rsi);
    expect(chart.getIndicatorSetup()).toEqual(before);
  });

  it('has the indicators in their order by the time the change is announced', () => {
    const a = chart.addIndicator('sma')!;
    later();
    const b = chart.addIndicator('ema')!;
    later();
    const c = chart.addIndicator('rsi')!;
    later();
    chart.removeIndicator(b);
    const seen: string[][] = [];
    chart.on('stateChange', () => seen.push(order()));
    chart.undo();
    expect(seen.at(-1)).toEqual([a, b, c]);
  });

  it('keeps its id and place when it is put back', () => {
    const a = chart.addIndicator('sma')!;
    later();
    const macd = chart.addIndicator('macd')!;
    later();
    const b = chart.addIndicator('ema')!;
    later();
    chart.updateIndicator(macd, { period: 6 });
    later();
    chart.undo();
    expect(order()).toEqual([a, macd, b]);
  });
});
