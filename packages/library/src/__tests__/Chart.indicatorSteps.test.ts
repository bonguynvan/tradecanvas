// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';
import { chartState, runIndicatorScript, scriptBars } from './indicatorScript.js';

/**
 * Any run of indicator, pane and pane-drawing changes leaves the chart
 * whole: each pane has its indicator, each shared pane its host, no drawing
 * shows on a pane that is gone; an undo and a redo come back to the same
 * chart; and a saved layout loads into another chart as it was.
 */
const charts: Chart[] = [];
afterEach(() => {
  for (const chart of charts.splice(0)) chart.destroy();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Of a run's 160 steps, how many at least leave a step an undo can take back. */
const UNDONE_AT_LEAST = 80;

function make(options: ConstructorParameters<typeof Chart>[1] = {}): { chart: Chart; clock: { now: number } } {
  installChartStubs();
  const clock = { now: 0 };
  vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
  const chart = new Chart(sizedHost(800, 900), { chartType: 'candlestick', ...options });
  charts.push(chart);
  chart.setData(scriptBars);
  return { chart, clock };
}

/** Whatever is broken in how the indicators sit in their panes. */
function broken(chart: Chart): string[] {
  const out: string[] = [];
  const active = new Map(chart.getActiveIndicators().map((i) => [i.instanceId, i]));
  const owners = new Set(chart.getIndicatorPanes().map((p) => p.instanceId));
  for (const owner of owners) if (!active.has(owner)) out.push(`pane ${owner} has no indicator`);
  for (const ind of active.values()) {
    if (ind.pane && !owners.has(ind.pane)) out.push(`${ind.instanceId} is drawn in ${ind.pane}, which is no pane`);
    if (ind.pane && owners.has(ind.instanceId)) out.push(`${ind.instanceId} owns a pane and shares ${ind.pane}`);
  }
  // A drawing whose pane went is kept (an undo brings the pane back), not shown.
  for (const d of chart.getDrawings()) {
    if (d.paneId !== undefined && !owners.has(d.paneId) && chart.isDrawingShown(d.id)) out.push(`drawing ${d.id} shown on ${d.paneId}, which is no pane`);
  }
  return out;
}

/**
 * The indicators in their order with no ids: each by its kind, the kinds
 * whose lines it reads and the kind owning the pane it shares. To compare
 * charts whose ids differ.
 */
function canonical(chart: Chart): string[] {
  const setup = chart.getIndicatorSetup();
  const kind = new Map(setup.map((ind) => [ind.instanceId, ind.id]));
  const rename = (v: unknown) => (typeof v === 'string' ? v.replace(/ind:([^:]+):/, (_m, id: string) => `ind:${kind.get(id) ?? id}:`) : v);
  return setup.map((ind) => JSON.stringify({
    ...ind,
    instanceId: undefined,
    pane: ind.pane === undefined ? undefined : kind.get(ind.pane) ?? ind.pane,
    params: Object.fromEntries(Object.entries(ind.params).map(([k, v]) => [k, rename(v)])),
  }));
}

describe('Chart: indicator and pane changes keep the chart whole', () => {
  it.each([1, 7, 42, 1234, 99991])('seed %i: panes stay whole, and an undo and a redo come back', (seed) => {
    const { chart, clock } = make();
    let checked = 0;
    runIndicatorScript(chart, seed, 160, clock, (step, i) => {
      expect(broken(chart), `step ${i} (${step.what})`).toEqual([]);
      const state = chartState(chart);
      if (!chart.getUndoRedoState().canUndo) return;
      chart.undo();
      expect(broken(chart), `step ${i} (${step.what}), undone`).toEqual([]);
      chart.redo();
      expect(chartState(chart), `step ${i} (${step.what}), undone and redone`).toEqual(state);
      checked++;
    });
    // Most steps leave something to undo (the rest: nothing done yet, or all undone).
    expect(checked).toBeGreaterThan(UNDONE_AT_LEAST);
  });

  it('keeps panes whole with undo off', () => {
    const { chart, clock } = make({ features: { drawingUndoRedo: false } });
    runIndicatorScript(chart, 8, 160, clock, (step, i) => {
      expect(broken(chart), `step ${i} (${step.what})`).toEqual([]);
    });
    expect(chart.getActiveIndicators().length).toBeGreaterThan(0);
  });

  it.each([3, 77, 2024])('seed %i: a saved layout loads into another chart as it was', (seed) => {
    const { chart, clock } = make();
    runIndicatorScript(chart, seed, 120, clock, () => undefined);
    expect(chart.getActiveIndicators().length).toBeGreaterThan(0);
    const json = chart.saveState()!;
    const other = new Chart(sizedHost(800, 900), { chartType: 'candlestick' });
    charts.push(other);
    other.setData(scriptBars);
    other.loadState(json);
    expect(canonical(other)).toEqual(canonical(chart));
    // A drawing on a pane that is gone is not saved.
    const panes = new Set(chart.getIndicatorPanes().map((p) => p.instanceId));
    const saved = chart.getDrawings().filter((d) => d.paneId === undefined || panes.has(d.paneId));
    expect(other.getDrawings().length).toBe(saved.length);
    expect(broken(other)).toEqual([]);
  });
});
