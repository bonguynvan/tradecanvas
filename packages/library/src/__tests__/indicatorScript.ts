import type { OHLCBar } from '@tradecanvas/commons';
import type { Chart } from '../Chart.js';

/** The ids `run` picks among: price-pane ones, pane ones. */
const OVERLAYS = ['sma', 'ema'] as const;
const PANELS = ['rsi', 'macd', 'stochastic'] as const;

export const SCRIPT_T0 = Date.UTC(2025, 0, 1);
export const scriptBars: OHLCBar[] = Array.from({ length: 120 }, (_, i) => ({
  time: SCRIPT_T0 + i * 3_600_000, open: 100, high: 102, low: 98, close: 100 + (i % 7) - 3, volume: 10,
}));

/** What the chart holds of indicators, panes and drawings, to compare. */
export function chartState(chart: Chart): unknown {
  return {
    setup: chart.getIndicatorSetup(),
    panes: chart.getIndicatorPanes().map((p) => p.instanceIds),
    drawings: chart.getDrawings().map((d) => ({ id: d.id, paneId: d.paneId ?? null })),
  };
}

export interface ScriptStep {
  what: string;
  /** What the call returned, for the trace. */
  result: unknown;
}

/**
 * A seeded run of indicator, pane and pane-drawing changes on `chart`, with
 * undos and redos among them. `clock` is the time the chart reads: a step
 * sometimes comes soon after the last one (it may merge with it), mostly
 * not. `after` is called after every step.
 */
export function runIndicatorScript(chart: Chart, seed: number, steps: number, clock: { now: number }, after: (step: ScriptStep, index: number) => void): void {
  let s = seed;
  const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pick = <T>(list: readonly T[]): T | undefined => list[Math.floor(random() * list.length)];
  const ids = () => chart.getActiveIndicators().map((i) => i.instanceId);
  const panes = () => chart.getIndicatorPanes().map((p) => p.instanceId);

  for (let i = 0; i < steps; i++) {
    clock.now += random() < 0.3 ? 50 : 2000;
    const roll = random();
    let what: string;
    let result: unknown;
    const target = pick(ids());
    if (roll < 0.16 || !target) {
      const panel = random() < 0.6;
      const id = panel ? pick(PANELS)! : pick(OVERLAYS)!;
      const host = random() < 0.35 ? pick(panes()) : undefined;
      const lineOf = !panel && random() < 0.3 ? pick(ids().filter((x) => chart.getIndicatorConfig(x)?.id === 'rsi')) : undefined;
      const params = lineOf ? { source: `ind:${lineOf}:value` } : {};
      what = `add ${id}${host ? ` in ${host}` : ''}${lineOf ? ` reading ${lineOf}` : ''}`;
      result = chart.addIndicator(id as 'rsi', params as never, 'bottom', host ? { pane: host } : {});
    } else if (roll < 0.26) {
      what = `remove ${target}`;
      chart.removeIndicator(target);
    } else if (roll < 0.36) {
      // A number input it has (period, fast…), or now and then one it lacks.
      const params = chart.getIndicatorConfig(target)?.params ?? {};
      const name = random() < 0.2 ? 'period' : Object.keys(params).find((k) => typeof params[k] === 'number')!;
      const value = 3 + Math.floor(random() * 20);
      what = `${name} ${target} ${value}`;
      chart.updateIndicator(target, { [name]: value });
    } else if (roll < 0.40) {
      const rsi = pick(ids().filter((x) => chart.getIndicatorConfig(x)?.id === 'rsi'));
      const source = rsi && random() < 0.6 ? `ind:${rsi}:value` : 'close';
      what = `source ${target} ${source}`;
      chart.updateIndicator(target, { source });
    } else if (roll < 0.52) {
      const to = pick(['new', 'price', ...ids()])!;
      what = `move ${target} to ${to}`;
      result = chart.moveIndicatorToPane(target, to);
    } else if (roll < 0.57) {
      what = `collapse ${target}`;
      result = chart.setPaneCollapsed(target, random() < 0.6);
    } else if (roll < 0.60) {
      const delta = random() < 0.5 ? -1 : 1;
      what = `movePane ${target} ${delta}`;
      result = chart.movePane(target, delta);
    } else if (roll < 0.63) {
      what = `scale ${target}`;
      result = chart.setPaneScale(target, { log: random() < 0.5, invert: random() < 0.3 });
    } else if (roll < 0.66) {
      what = `maximize ${target}`;
      result = chart.setMaximizedPane(random() < 0.7 ? target : null);
    } else if (roll < 0.70) {
      what = `visible ${target}`;
      chart.setIndicatorVisible(target, random() < 0.5);
    } else if (roll < 0.73) {
      what = `levels ${target}`;
      chart.setIndicatorLevels(target, random() < 0.5 ? [25, 75] : null);
    } else if (roll < 0.76) {
      what = `style ${target}`;
      chart.updateIndicatorStyle(target, { opacity: Math.round(random() * 10) / 10 });
    } else if (roll < 0.79) {
      what = `paneStyle ${target}`;
      chart.setPaneStyle(target, random() < 0.7 ? { background: '#102030' } : null);
    } else if (roll < 0.85) {
      const pane = pick(panes());
      what = `draw on ${pane}`;
      result = pane ? chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: SCRIPT_T0 + 40 * 3_600_000, price: 50 }], paneId: pane }) : null;
    } else if (roll < 0.94) {
      what = 'undo';
      result = chart.undo();
    } else {
      what = 'redo';
      result = chart.redo();
    }
    after({ what, result }, i);
  }
}
