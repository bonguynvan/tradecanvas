import type { IndicatorInputSpec, IndicatorMarkerShape } from '@tradecanvas/commons';
import type { ScriptArray, ScriptSeries, Var } from './state.js';

export type ScriptInputValue = number | string | boolean;

/** An input of a script: its default, and how the settings dialog shows it. */
export interface ScriptInput extends IndicatorInputSpec {
  default: ScriptInputValue;
}

export type ScriptInputs = Record<string, ScriptInput>;

/** The values of a script's inputs, by name. */
export type InputValues<I extends ScriptInputs> = {
  readonly [K in keyof I]: I[K]['default'] extends number ? number : I[K]['default'] extends boolean ? boolean : string;
};

/** The bar being run. */
export interface ScriptBar {
  /** Its place among the bars, from 0. */
  readonly index: number;
  /** Its time, ms since the epoch. */
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/** A price of the bars, read back from the bar being run. */
export interface PriceSeries {
  /** Its value `back` bars ago (0: this bar's); NaN before the first bar. */
  at(back?: number): number;
}

export interface ScriptPrices {
  readonly time: PriceSeries;
  readonly open: PriceSeries;
  readonly high: PriceSeries;
  readonly low: PriceSeries;
  readonly close: PriceSeries;
  readonly volume: PriceSeries;
}

/** How a plot is drawn. */
export type ScriptPlotKind = 'line' | 'histogram' | 'dots' | 'step';

export interface PlotOptions {
  /** Its colour (`'#rrggbb'`, `'#rrggbbaa'`); unset: the theme's next series colour. */
  color?: string;
  kind?: ScriptPlotKind;
  /** Its line width in px. */
  width?: number;
}

export interface PlotHandle {
  /** This bar's value, and a colour for this bar only; returns the value. */
  set(value: number, color?: string): number;
}

export interface ShapeOptions {
  shape?: IndicatorMarkerShape;
  /** Over or under the bar; default under. */
  position?: 'aboveBar' | 'belowBar';
  color?: string;
}

export interface ShapeHandle {
  /** Whether this bar is marked; returns it. */
  set(on: boolean): boolean;
}

export interface HlineOptions {
  color?: string;
  title?: string;
}

/** What a script's setup is given to declare what it draws and keeps. */
export interface ScriptSetup<V> {
  readonly inputs: V;
  /** The bars' prices, read back from the bar being run (`prices.close.at(1)`). */
  readonly prices: ScriptPrices;
  /** A value a bar drawn as a line, histogram, dots or steps. */
  plot(title: string, options?: PlotOptions): PlotHandle;
  /** A mark over or under the bars it is set on. */
  shape(title: string, options?: ShapeOptions): ShapeHandle;
  /** A level drawn across the pane. */
  hline(price: number, options?: HlineOptions): void;
  readonly state: {
    /** A value kept from bar to bar. */
    var<T extends number | string | boolean>(init: T): Var<T>;
    /** A list of numbers kept from bar to bar. */
    array(): ScriptArray;
    /** A value a bar of the script's own, read back with `at(n)`. */
    series(): ScriptSeries;
  };
}

/** What a script's setup returns: what to do on each bar. */
export type OnBar = (bar: ScriptBar) => void;

export interface ScriptDefinition<I extends ScriptInputs> {
  /** Its id as an indicator: unique among the chart's indicators. */
  id: string;
  name: string;
  /** Its name in the legend; unset: its name. */
  shortName?: string;
  /** Drawn over the prices; unset: in a pane of its own. */
  overlay?: boolean;
  inputs?: I;
  /**
   * Run once, before the first bar: declares the plots, makes the `ta`
   * sums and the kept state, and returns what each bar runs.
   */
  setup(api: ScriptSetup<InputValues<I>>): OnBar;
}

/** A script, ready to run (`new ScriptRun`) or to draw (`scriptIndicator`). */
export interface Script<I extends ScriptInputs = ScriptInputs> extends Readonly<ScriptDefinition<I>> {
  readonly kind: 'script';
}

/** A script written bar by bar. */
export function defineScript<I extends ScriptInputs = Record<string, never>>(definition: ScriptDefinition<I>): Script<I> {
  if (typeof definition.id !== 'string' || definition.id.trim() === '') throw new Error('defineScript: a script needs an id');
  if (typeof definition.setup !== 'function') throw new Error(`defineScript('${definition.id}'): a script needs a setup function`);
  return Object.freeze({ ...definition, kind: 'script' as const });
}

/**
 * An input's value as a bar sees it: what was set when it is of the
 * default's type, else the default; a number within `min` and `max`, whole
 * for an `'int'`; a choice one of the `options`. The rules
 * `defineIndicator` reads its inputs by.
 */
export function inputValue(set: unknown, input: ScriptInput): ScriptInputValue {
  const fallback = input.default;
  if (typeof fallback === 'number') {
    const typed = typeof set === 'string' && set.trim() !== '' ? Number(set) : set;
    if (typeof typed !== 'number' || !Number.isFinite(typed)) return fallback;
    const value = input.kind === 'int' ? Math.floor(typed) : typed;
    return Math.min(input.max ?? Infinity, Math.max(input.min ?? -Infinity, value));
  }
  if (typeof set !== typeof fallback) return fallback;
  if (input.options && !input.options.some((option) => (typeof option === 'object' ? option.value : option) === set)) return fallback;
  return set as ScriptInputValue;
}
