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
    const later = performance.now() + 10_000;
    vi.spyOn(performance, 'now').mockReturnValue(later); // a later, separate edit
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

describe('review fixes', () => {
  it('undo keeps a reader on its source and in its pane when the source was added after it', () => {
    const ema = chart.addIndicator('ema', { period: 9 })!;
    const rsi = chart.addIndicator('rsi')!;
    chart.updateIndicator(ema, { source: indicatorSource(rsi, 'value') });
    expect(panes()).toEqual([[rsi, ema]]);
    chart.addIndicator('cci');
    chart.undo();
    expect(panes()).toEqual([[rsi, ema]]);
    expect(chart.getIndicatorOutput(ema)?.series.some((p) => p !== null && p !== undefined)).toBe(true);
  });

  it('undo keeps an older indicator in the pane it was moved into', () => {
    const rsi = chart.addIndicator('rsi')!;
    const macd = chart.addIndicator('macd')!;
    chart.moveIndicatorToPane(rsi, macd);
    chart.addIndicator('ema', { period: 20 });
    chart.undo();
    expect(panes()).toEqual([[macd, rsi]]);
  });

  it('takes a member’s readers along into its new pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    const macd = chart.addIndicator('macd')!;
    chart.moveIndicatorToPane(macd, rsi);
    const sma = chart.addIndicator('sma', { period: 9, source: indicatorSource(macd, 'macd') })!;
    expect(chart.moveIndicatorToPane(macd, 'new')).toBe(true);
    expect(panes()).toEqual([[rsi], [macd, sma]]);
  });

  it('undoes a restyle in place, without taking indicators down', () => {
    const rsi = chart.addIndicator('rsi')!;
    chart.addIndicator('cci');
    chart.updateIndicatorStyle(rsi, { colors: ['#ff0000'] });
    const removed: unknown[] = [];
    chart.on('indicatorRemove', (e) => removed.push(e.payload));
    chart.undo();
    expect(removed).toEqual([]);
    expect(chart.getIndicatorStyle(rsi)?.colors[0]).not.toBe('#ff0000');
  });

  it('leaves no step for a quick hide and show', () => {
    const rsi = chart.addIndicator('rsi')!;
    const steps = chart.getUndoRedoState().undoCount;
    chart.setIndicatorVisible(rsi, false);
    chart.setIndicatorVisible(rsi, true);
    expect(chart.getUndoRedoState().undoCount).toBe(steps);
  });

  it('moves alerts on a replaced indicator to the template’s one of the same kind', () => {
    const rsi = chart.addIndicator('rsi')!;
    const setup = chart.getIndicatorSetup();
    chart.addAlert(70, 'crossingUp', 'overbought', `${rsi}:value`);
    chart.applyIndicatorSetup(setup);
    const now = chart.getActiveIndicators()[0].instanceId;
    expect(now).not.toBe(rsi);
    expect(chart.getAlerts().map((a) => a.channel)).toEqual([`${now}:value`]);
  });

  it('shows the panes folded while another is maximised, and puts them back on fold or a new pane', () => {
    const rsi = chart.addIndicator('rsi')!;
    const cci = chart.addIndicator('cci')!;
    chart.setMaximizedPane(rsi);
    expect(chart.isPaneCollapsed(cci)).toBe(true);
    expect(chart.setPaneCollapsed(cci, false)).toBe(true); // "expand": back to normal
    expect(chart.getMaximizedPane()).toBeNull();
    expect(chart.isPaneCollapsed(cci)).toBe(false);
    chart.setMaximizedPane(rsi);
    chart.addIndicator('macd');
    expect(chart.getMaximizedPane()).toBeNull();
  });
});

describe('pane scales', () => {
  type Probe = { buildPanelRenderInfos(): { instanceId: string; viewport: { logScale?: boolean; invertScale?: boolean } }[] };
  const vp = (id: string) => (chart as unknown as Probe).buildPanelRenderInfos().find((p) => p.instanceId === id)!.viewport;

  it('puts a pane on a log scale while its values are above 0, and upside down', () => {
    const atr = chart.addIndicator('atr')!;
    const macd = chart.addIndicator('macd')!;
    expect(chart.setPaneScale(atr, { log: true, invert: true })).toBe(true);
    expect(vp(atr)).toMatchObject({ logScale: true, invertScale: true });
    chart.setPaneScale(macd, { log: true }); // MACD goes below 0: stays linear
    expect(vp(macd).logScale).toBe(false);
    // A line drawn in the pane with no value yet (a long average) doesn't turn it off.
    chart.addIndicator('sma', { period: 1000, source: indicatorSource(atr, 'value') });
    expect(vp(atr).logScale).toBe(true);
    expect(chart.getPaneScale(atr)).toEqual({ log: true, invert: true });
  });

  it('keeps a pane’s scale in a saved layout', () => {
    const atr = chart.addIndicator('atr')!;
    chart.setPaneScale(atr, { invert: true });
    chart.loadState(chart.saveState()!);
    const now = chart.getActiveIndicators()[0].instanceId;
    expect(chart.getPaneScale(now)).toEqual({ log: false, invert: true });
  });

  it('says which pane a right-click was on', () => {
    const rsi = chart.addIndicator('rsi')!;
    const pane = chart.getIndicatorPanes()[0].rect;
    const payload = (chart as unknown as { contextAt(a: string, p: { x: number; y: number }): { pane?: string } }).contextAt('pane', { x: pane.x + 10, y: pane.y + 30 });
    expect(payload.pane).toBe(rsi);
  });
});
