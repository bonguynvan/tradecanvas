// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 102, low: 98, close: 100, volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(hourly(200));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fib = () => chart.addDrawing({ type: 'fibRetracement', anchors: [{ time: T0 + 50 * HOUR, price: 101 }, { time: T0 + 90 * HOUR, price: 99 }] })!;

describe('Chart drawing options', () => {
  it('lists what a tool offers', () => {
    const defs = chart.getDrawingOptionDefs('fibRetracement');
    expect(Object.keys(defs)).toEqual(expect.arrayContaining(['levels', 'extendLeft', 'extendRight', 'reverse', 'showPrices']));
    expect(chart.getDrawingOptionDefs('rectangle')).toEqual({});
  });

  it('reads and changes a drawing’s options, announcing the change', () => {
    const id = fib();
    const updates: unknown[] = [];
    chart.on('drawingUpdate', (e) => updates.push(e.payload));
    expect(chart.getDrawingOptions(id).reverse).toBe(false);
    expect(chart.setDrawingOptions(id, { reverse: true })).toBe(true);
    expect(chart.getDrawingOptions(id).reverse).toBe(true);
    expect(updates).toEqual([{ id }]);
  });

  it('starts new drawings of a tool from its defaults', () => {
    chart.setDrawingToolDefaults('fibRetracement', { showPrices: false });
    expect(chart.getDrawingToolDefaults('fibRetracement')).toEqual({ showPrices: false });
    expect(chart.getDrawingOptions(fib()).showPrices).toBe(false);
    chart.setDrawingToolDefaults('fibRetracement', null);
    expect(chart.getDrawingOptions(fib()).showPrices).toBe(true);
  });

  it('edits in a session that is one undo step, or cancelled', () => {
    const id = fib();
    chart.beginDrawingEdit(id);
    chart.updateDrawing(id, { options: { reverse: true }, style: { color: '#ff0000' } });
    chart.endDrawingEdit(id);
    chart.undo();
    expect(chart.getDrawingOptions(id).reverse).toBe(false);

    chart.beginDrawingEdit(id);
    chart.updateDrawing(id, { anchors: [{ time: T0, price: 1 }, { time: T0 + HOUR, price: 2 }] });
    chart.endDrawingEdit(id, { cancel: true });
    expect(chart.getDrawings()[0].anchors[0].price).toBe(101);
  });

  it('keeps options in a saved layout', () => {
    const id = fib();
    chart.setDrawingOptions(id, { reverse: true, levels: [{ value: 0.5, visible: true }] });
    const saved = chart.saveState()!;
    chart.clearDrawings();
    chart.loadState(saved);
    const [restored] = chart.getDrawings();
    expect(chart.getDrawingOptions(restored.id)).toMatchObject({ reverse: true, levels: [{ value: 0.5, visible: true }] });
  });
});

describe('Chart alerts on drawings', () => {
  const line = () => chart.addDrawing({
    type: 'horizontalLine', anchors: [{ time: T0, price: 101 }],
  })!;

  it('fires when the price crosses the drawing', () => {
    const id = line();
    const alertId = chart.addDrawingAlert(id, { condition: 'crossingUp', label: 'Resistance' });
    expect(alertId).not.toBeNull();
    const fired: unknown[] = [];
    chart.on('alertTriggered', (e) => fired.push(e.payload));
    chart.setCurrentPrice(100);
    chart.setCurrentPrice(102);
    expect(fired).toHaveLength(1);
    expect(chart.getAlerts()[0]).toMatchObject({ drawingId: id, label: 'Resistance', price: 101 });
  });

  it('refuses a drawing that has no line to cross', () => {
    const box = chart.addDrawing({ type: 'rectangle', anchors: [{ time: T0, price: 99 }, { time: T0 + HOUR, price: 101 }] })!;
    expect(chart.canAddDrawingAlert(box)).toBe(false);
    expect(chart.addDrawingAlert(box)).toBeNull();
    expect(chart.addDrawingAlert('nope')).toBeNull();
  });

  it('removes the alert with its drawing', () => {
    const id = line();
    chart.addDrawingAlert(id);
    chart.removeDrawing(id);
    expect(chart.getAlerts()).toEqual([]);
  });

  it('keeps alerts on drawings in a saved layout', () => {
    const id = line();
    chart.addDrawingAlert(id, { condition: 'crossingDown' });
    const saved = chart.saveState()!;
    chart.loadState(saved);
    expect(chart.getAlerts()).toEqual([expect.objectContaining({ drawingId: id, condition: 'crossingDown' })]);
  });
});

describe('Chart drawing order and groups', () => {
  const line = (price: number) => chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: T0, price }] })!;

  it('reorders drawings', () => {
    const a = line(99);
    const b = line(100);
    expect(chart.moveDrawing(a, 'front')).toBe(true);
    expect(chart.getDrawings().map((d) => d.id)).toEqual([b, a]);
  });

  it('groups drawings and keeps the group in a saved layout', () => {
    const a = line(99);
    const b = line(100);
    const group = chart.groupDrawings([a, b], 'Range')!;
    chart.setDrawingGroupLocked(group, true);
    expect(chart.getDrawingGroups()).toEqual([{ id: group, name: 'Range', ids: [a, b] }]);
    const saved = chart.saveState()!;
    chart.ungroupDrawings(group);
    expect(chart.getDrawingGroups()).toEqual([]);
    chart.loadState(saved);
    expect(chart.getDrawingGroups()).toEqual([{ id: group, name: 'Range', ids: [a, b] }]);
    expect(chart.getDrawings().every((d) => d.locked)).toBe(true);
  });
});

