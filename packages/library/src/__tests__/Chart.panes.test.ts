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

let host: HTMLDivElement;
let chart: Chart;
const panes = () => chart.getIndicatorPanes().map((p) => p.instanceIds);
const heights = () => Object.fromEntries(chart.getIndicatorPanes().map((p) => [p.instanceId, p.rect.height]));

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

describe('moving indicators between panes', () => {
  it('puts one pane indicator in another’s pane, and back in a pane of its own', () => {
    const rsi = chart.addIndicator('rsi')!;
    const cci = chart.addIndicator('cci')!;
    expect(chart.moveIndicatorToPane(cci, rsi)).toBe(true);
    expect(panes()).toEqual([[rsi, cci]]);
    expect(chart.moveIndicatorToPane(cci, rsi)).toBe(false); // already there
    expect(chart.moveIndicatorToPane(cci, 'new')).toBe(true);
    expect(panes()).toEqual([[rsi], [cci]]);
  });

  it('hands a pane to the next pane indicator in it when its owner leaves', () => {
    const rsi = chart.addIndicator('rsi')!;
    const cci = chart.addIndicator('cci')!;
    const macd = chart.addIndicator('macd')!;
    chart.moveIndicatorToPane(cci, rsi);
    expect(chart.moveIndicatorToPane(rsi, macd)).toBe(true);
    expect(panes()).toEqual([[cci], [macd, rsi]]);
  });

  it('takes the indicators reading its lines along', () => {
    const rsi = chart.addIndicator('rsi')!;
    const macd = chart.addIndicator('macd')!;
    const sma = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })!;
    expect(chart.moveIndicatorToPane(rsi, macd)).toBe(true);
    expect(panes()).toEqual([[macd, rsi, sma]]);
    // Such a reader can't be moved away from its source by itself.
    expect(chart.moveIndicatorToPane(sma, 'price')).toBe(false);
  });

  it('sends an overlay to a pane and back to the price pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    const ema = chart.addIndicator('ema', { period: 20 })!;
    expect(chart.moveIndicatorToPane(ema, 'new')).toBe(false); // an overlay has no pane of its own
    expect(chart.moveIndicatorToPane(ema, rsi)).toBe(true);
    expect(panes()).toEqual([[rsi, ema]]);
    expect(chart.moveIndicatorToPane(ema, 'price')).toBe(true);
    expect(panes()).toEqual([[rsi]]);
  });
});

describe('pane fold, maximise and order', () => {
  it('folds, maximises and moves panes, and says so', () => {
    const changes: string[] = [];
    chart.on('paneChange', (e) => changes.push(`${e.payload.change}`));
    const rsi = chart.addIndicator('rsi')!;
    const cci = chart.addIndicator('cci')!;
    const open = heights()[rsi];
    expect(chart.setPaneCollapsed(rsi, true)).toBe(true);
    expect(chart.isPaneCollapsed(rsi)).toBe(true);
    expect(heights()[rsi]).toBeLessThan(open);
    expect(chart.setMaximizedPane(cci)).toBe(true);
    expect(chart.getMaximizedPane()).toBe(cci);
    expect(heights()[cci]).toBeGreaterThan(open);
    expect(chart.movePane(cci, -1)).toBe(true);
    expect(chart.getIndicatorPanes().map((p) => p.instanceId)).toEqual([cci, rsi]);
    expect(changes).toEqual(['collapsed', 'maximized', 'order']);
  });

  it('keeps the panes’ sizes, order, folds and maximise in a saved layout', () => {
    const rsi = chart.addIndicator('rsi')!;
    const cci = chart.addIndicator('cci')!;
    const macd = chart.addIndicator('macd')!;
    chart.setPanelSize(rsi, 140);
    chart.setPaneCollapsed(macd, true);
    chart.movePane(cci, -1);
    chart.setMaximizedPane(rsi);
    const json = chart.saveState()!;
    chart.loadState(json);
    const ids = chart.getActiveIndicators().map((a) => a.id);
    expect(ids.sort()).toEqual(['cci', 'macd', 'rsi']);
    const byId = (id: string) => chart.getActiveIndicators().find((a) => a.id === id)!.instanceId;
    expect(chart.getIndicatorPanes().map((p) => p.instanceId)).toEqual([byId('cci'), byId('rsi'), byId('macd')]);
    expect(chart.getMaximizedPane()).toBe(byId('rsi'));
    chart.setMaximizedPane(null);
    expect(chart.isPaneCollapsed(byId('macd'))).toBe(true);
    expect(heights()[byId('rsi')]).toBe(140);
  });
});

describe('indicator undo', () => {
  it('undoes and redoes adding, editing, moving and removing an indicator, under the same ids', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.updateIndicator(rsi, { period: 21 });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10_000); // a later, separate edit
    chart.setIndicatorLevels(rsi, [20, 80]);
    chart.removeIndicator(rsi);
    expect(chart.getActiveIndicators()).toEqual([]);

    chart.undo(); // the removal
    expect(chart.getActiveIndicators().map((a) => a.instanceId)).toEqual([rsi]);
    expect(chart.getIndicatorLevels(rsi)).toEqual([20, 80]);
    chart.undo(); // the levels
    expect(chart.getIndicatorLevels(rsi)).toEqual([30, 70]);
    chart.undo(); // the period
    expect(chart.getIndicatorConfig(rsi)?.params.period).toBe(14);
    chart.undo(); // the add
    expect(chart.getActiveIndicators()).toEqual([]);
    chart.redo();
    chart.redo();
    expect(chart.getIndicatorConfig(rsi)?.params.period).toBe(21);
  });

  it('makes a burst of edits to one indicator one step', () => {
    const rsi = chart.addIndicator('rsi')!;
    for (const period of [15, 16, 17]) chart.updateIndicator(rsi, { period });
    chart.undo();
    expect(chart.getIndicatorConfig(rsi)?.params.period).toBe(14);
  });

  it('keeps drawing and indicator steps in one history', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: T0, price: 100 }] });
    chart.undo();
    expect(chart.getDrawings()).toEqual([]);
    expect(chart.getActiveIndicators().map((a) => a.instanceId)).toEqual([rsi]);
    chart.undo();
    expect(chart.getActiveIndicators()).toEqual([]);
  });

  it('starts a fresh history with a loaded layout', () => {
    chart.addIndicator('rsi');
    chart.loadState(chart.saveState()!);
    expect(chart.getUndoRedoState().canUndo).toBe(false);
  });
});

describe('indicator setups', () => {
  it('puts a set of indicators in place of the chart’s, as one undo step', () => {
    const rsi = chart.addIndicator('rsi')!;
    const setup = chart.getIndicatorSetup();
    chart.removeIndicator(rsi);
    chart.addIndicator('ema', { period: 50 });
    chart.applyIndicatorSetup(setup);
    expect(chart.getActiveIndicators().map((a) => a.id)).toEqual(['rsi']);
    chart.undo();
    expect(chart.getActiveIndicators().map((a) => a.id)).toEqual(['ema']);
  });
});
