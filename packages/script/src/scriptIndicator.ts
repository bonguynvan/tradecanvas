import type { DataSeries, IndicatorConfig, IndicatorDescriptor, IndicatorOutput, IndicatorPlot, IndicatorPlugin, IndicatorValue } from '@tradecanvas/commons';
import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/core';
import type { Script, ScriptInputs } from './defineScript.js';
import type { ScriptOutput } from './outputs.js';
import { ScriptRun } from './ScriptRun.js';

/** The colours of plots that name none, in order. */
const FALLBACK_COLORS = ['#2962ff', '#ff6d00', '#00bfa5', '#d500f9', '#ffd600', '#ef5350', '#26a69a', '#8d6e63'];

/** What a mark over or under its bar is stored as: any number marks it. */
const MARKED = 1;

const plotKey = (i: number) => `p${i}`;
const shapeKey = (i: number) => `s${i}`;

/** The inputs a run was made with, to tell whether a config asks for others. */
function paramsKey(params: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(Object.keys(params).sort().map((name) => [name, params[name]]));
}

/** Bar `i`'s values under their keys, or null when it has none. */
function pointAt(output: ScriptOutput, i: number, overlay: boolean): IndicatorValue | null {
  let point: IndicatorValue | null = null;
  output.plots.forEach((plot, k) => {
    const value = plot.values[i];
    if (Number.isFinite(value)) (point ??= {})[plotKey(k)] = value;
  });
  if (overlay) {
    output.shapes.forEach((shape, k) => {
      if (shape.on[i] === 1) (point ??= {})[shapeKey(k)] = MARKED;
    });
  }
  return point;
}

class ScriptIndicator extends IndicatorBase {
  readonly descriptor: IndicatorDescriptor;
  private readonly runs = new WeakMap<IndicatorOutput, { run: ScriptRun; params: string }>();
  private readonly overlay: boolean;

  constructor(private readonly script: Script<ScriptInputs>) {
    super();
    const { overlay, plots, shapes, levels } = new ScriptRun(script).declarations;
    this.overlay = overlay;
    const lines: IndicatorPlot[] = plots.map((plot, i) => ({
      key: plotKey(i),
      title: plot.title,
      color: i,
      ...(plot.kind !== 'line' ? { kind: plot.kind } : {}),
      ...(plot.width !== undefined ? { width: plot.width } : {}),
    }));
    // A mark over or under a bar has no place in a pane of its own: there it needs the value it is drawn at.
    const marks: IndicatorPlot[] = overlay
      ? shapes.map((shape, i) => ({ key: shapeKey(i), title: shape.title, color: plots.length + i, kind: 'markers', shape: shape.shape, position: shape.position }))
      : [];
    const declared = [...plots.map((p) => p.color), ...(overlay ? shapes.map((s) => s.color) : [])];
    let fallback = 0;
    const colors = declared.map((color) => color ?? FALLBACK_COLORS[fallback++ % FALLBACK_COLORS.length]);
    const inputs = script.inputs ?? {};
    const names = Object.keys(inputs);
    this.descriptor = {
      id: script.id,
      name: script.name,
      placement: overlay ? 'overlay' : 'panel',
      defaultConfig: Object.fromEntries(names.map((name) => [name, inputs[name].default])),
      plots: [...lines, ...marks],
      ...(script.shortName !== undefined ? { shortName: script.shortName } : {}),
      ...(levels.length > 0 ? { levels: levels.map((level) => level.price) } : {}),
      ...(names.length > 0 ? { inputs: Object.fromEntries(names.map((name) => { const { default: _start, ...spec } = inputs[name]; return [name, spec]; })) } : {}),
      ...(colors.length > 0 ? { defaultStyle: { colors } } : {}),
      readsExchangeTimeZone: false,
    };
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const run = new ScriptRun(this.script, config.params);
    run.load(data);
    const output: IndicatorOutput = { values: new IndicatorValueMap(), series: new Array(data.length).fill(null), meta: {} };
    this.writeFrom(output, data, run, 0);
    this.runs.set(output, { run, params: paramsKey(config.params) });
    return output;
  }

  /** Runs the live bar again on a tick, and new bars as they come; older bars changed, or other inputs, ask for a full calculate. */
  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    const entry = this.runs.get(prev);
    if (!entry || entry.params !== paramsKey(config.params) || !this.canResume(data, prev, from)) return null;
    const { run } = entry;
    if (from < run.length - 1 || data.length < run.length) return null;
    for (let i = from; i < data.length; i++) {
      if (i === run.length - 1) run.tick(data[i]);
      else run.next(data[i]);
    }
    prev.series!.length = data.length;
    this.writeFrom(prev, data, run, from);
    return prev;
  }

  private writeFrom(out: IndicatorOutput, data: DataSeries, run: ScriptRun, from: number): void {
    const output = run.output;
    // Where it stopped and why: its lines end there, and an app can show it.
    out.meta = { ...out.meta, errors: output.errors };
    for (let i = from; i < data.length; i++) this.writePoint(out, data, i, pointAt(output, i, this.overlay));
  }
}

/**
 * A script as an indicator the chart draws: register it
 * (`chart.registerIndicator(scriptIndicator(script))`) and add it by its id.
 * Its plots are its lines under the keys `p0`, `p1`…, its marks `s0`, `s1`…
 * (over the prices only), its levels the pane's. A tick runs only the live
 * bar again.
 */
export function scriptIndicator(script: Script<ScriptInputs>): IndicatorPlugin {
  return new ScriptIndicator(script);
}
