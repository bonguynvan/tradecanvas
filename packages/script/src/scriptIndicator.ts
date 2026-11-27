import type {
  DataSeries,
  IndicatorConfig,
  IndicatorDescriptor,
  IndicatorFill,
  IndicatorMarkerPosition,
  IndicatorOutput,
  IndicatorPlot,
  IndicatorPlugin,
  IndicatorValue,
} from '@tradecanvas/commons';
import { fadeBy } from '@tradecanvas/commons';
import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/core';
import type { Script, ScriptInputs, ShapePosition } from './defineScript.js';
import type { BarColors, ScriptDeclarations, ScriptOutput } from './outputs.js';
import { ScriptRun } from './ScriptRun.js';

/** The colours of plots that name none, in order. */
const FALLBACK_COLORS = ['#2962ff', '#ff6d00', '#00bfa5', '#d500f9', '#ffd600', '#ef5350', '#26a69a', '#8d6e63'];

/** How faint a fill that names no colour is: its first plot's colour at this strength. */
const FILL_STRENGTH = 0.15;

/** What a mark, a background, is stored as on its bars: any number marks it. */
const MARKED = 1;

const plotKey = (i: number) => `p${i}`;
const shapeKey = (i: number) => `s${i}`;
const backgroundKey = (i: number) => `bg${i}`;
/** The field that holds a bar's colour, by its place in the output's palette. */
const colorKey = (key: string) => `${key}c`;
const fillColorKey = (i: number) => `f${i}c`;

/**
 * Where a script's mark goes on the chart: over and under a bar on the
 * prices; in a pane of its own, where a bar has no high or low on the
 * scale, the top and the bottom of the pane.
 */
function markPosition(position: ShapePosition, overlay: boolean): IndicatorMarkerPosition {
  if (overlay || position === 'top' || position === 'bottom') return position;
  return position === 'aboveBar' ? 'top' : 'bottom';
}

/** The inputs a run was made with, to tell whether a config asks for others. */
function paramsKey(params: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(Object.keys(params).sort().map((name) => [name, params[name]]));
}

/** Set `key` on `point` to bar `i`'s palette place, when the bar was given a colour. */
function withColor(point: IndicatorValue, key: string, colors: BarColors, i: number): void {
  const color = colors[i];
  if (color > 0) point[key] = color - 1;
}

/** Bar `i`'s values under their keys, or null when it has none. */
function pointAt(output: ScriptOutput, i: number): IndicatorValue | null {
  const point: IndicatorValue = {};
  output.plots.forEach((plot, k) => {
    const value = plot.values[i];
    if (!Number.isFinite(value)) return;
    point[plotKey(k)] = value;
    withColor(point, colorKey(plotKey(k)), plot.colors, i);
  });
  output.shapes.forEach((shape, k) => {
    if (shape.on[i] === 1) point[shapeKey(k)] = MARKED;
  });
  output.backgrounds.forEach((background, k) => {
    if (background.colors[i] === 0) return;
    point[backgroundKey(k)] = MARKED;
    withColor(point, colorKey(backgroundKey(k)), background.colors, i);
  });
  output.fills.forEach((fill, k) => withColor(point, fillColorKey(k), fill.colors, i));
  for (const _ in point) return point;
  return null;
}

/** What the chart draws of a script: its plots, marks, backgrounds and fills, and the colours they start in. */
function drawingOf(declared: ScriptDeclarations): Pick<IndicatorDescriptor, 'plots' | 'fills'> & { colors: string[] } {
  const colors: string[] = [];
  let fallback = 0;
  const colorIndex = (color: string | undefined) => {
    colors.push(color ?? FALLBACK_COLORS[fallback++ % FALLBACK_COLORS.length]);
    return colors.length - 1;
  };
  const lines: IndicatorPlot[] = declared.plots.map((plot, i) => ({
    key: plotKey(i),
    title: plot.title,
    color: colorIndex(plot.color),
    paletteBy: colorKey(plotKey(i)),
    ...(plot.kind !== 'line' ? { kind: plot.kind } : {}),
    ...(plot.width !== undefined ? { width: plot.width } : {}),
  }));
  const marks: IndicatorPlot[] = declared.shapes.map((shape, i) => ({
    key: shapeKey(i),
    title: shape.title,
    color: colorIndex(shape.color),
    kind: 'markers',
    shape: shape.shape,
    position: markPosition(shape.position, declared.overlay),
  }));
  // Drawn behind everything in a pass of their own, so last in the list: the lines keep their places for widths. A bar without a colour has no background.
  const backgrounds: IndicatorPlot[] = declared.backgrounds.map((background, i) => ({
    key: backgroundKey(i),
    title: background.title,
    color: colorIndex(undefined),
    kind: 'background',
    paletteBy: colorKey(backgroundKey(i)),
    // Its colours carry their own strength, as a script gives them.
    opacity: 1,
  }));
  const fills: IndicatorFill[] = declared.fills.map((fill, i) => {
    const first = colors[lines[fill.between[0]].color];
    return {
      between: [plotKey(fill.between[0]), plotKey(fill.between[1])],
      color: colorIndex(fill.color ?? fadeBy(first, FILL_STRENGTH)),
      paletteBy: fillColorKey(i),
      // Its colours carry their own strength.
      opacity: 1,
    };
  });
  return { plots: [...lines, ...marks, ...backgrounds], fills, colors };
}

class ScriptIndicator extends IndicatorBase {
  readonly descriptor: IndicatorDescriptor;
  private readonly runs = new WeakMap<IndicatorOutput, { run: ScriptRun; params: string }>();

  constructor(private readonly script: Script<ScriptInputs>) {
    super();
    const declared = new ScriptRun(script).declarations;
    const { plots, fills, colors } = drawingOf(declared);
    const inputs = script.inputs ?? {};
    const names = Object.keys(inputs);
    this.descriptor = {
      id: script.id,
      name: script.name,
      placement: declared.overlay ? 'overlay' : 'panel',
      defaultConfig: Object.fromEntries(names.map((name) => [name, inputs[name].default])),
      plots,
      ...(fills && fills.length > 0 ? { fills } : {}),
      ...(script.shortName !== undefined ? { shortName: script.shortName } : {}),
      ...(declared.levels.length > 0 ? { levels: declared.levels.map((level) => level.price) } : {}),
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
    // The colours its bars named, which no style lists; they only grow.
    out.palette = output.palette;
    // Where it stopped and why: its lines end there, and an app can show it.
    out.meta = { ...out.meta, errors: output.errors };
    for (let i = from; i < data.length; i++) this.writePoint(out, data, i, pointAt(output, i));
  }
}

/**
 * A script as an indicator the chart draws: register it
 * (`chart.registerIndicator(scriptIndicator(script))`) and add it by its id.
 * Its plots are its lines under the keys `p0`, `p1`…, its marks `s0`, `s1`…,
 * its backgrounds `bg0`…, its levels the pane's. A colour a bar is an index
 * into the output's `palette` (`p0c`, `bg0c`, `f0c` for a fill). A tick
 * runs only the live bar again.
 */
export function scriptIndicator(script: Script<ScriptInputs>): IndicatorPlugin {
  return new ScriptIndicator(script);
}
