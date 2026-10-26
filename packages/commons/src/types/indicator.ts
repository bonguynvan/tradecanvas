import type { DataSeries } from './ohlc.js';
import type { ViewportState } from './rendering.js';
import type { LineStyle } from './chart.js';
import type { BuiltInIndicators } from './builtInIndicators.js';

export type IndicatorPlacement = 'overlay' | 'panel';

/** An indicator's inputs, by name. */
export type IndicatorParamValues = Record<string, number | string | boolean>;

/** A number; text is read as one (`'14'`, a form field's value). */
export type NumberParam = number | string;

/** The id of a built-in indicator (`'rsi'`, `'bb'` …): the keys of `BuiltInIndicators`. */
export type BuiltInIndicatorId = keyof BuiltInIndicators;

/** A built-in indicator's id, or the id of one a plugin registered. */
export type IndicatorId = BuiltInIndicatorId | (string & {});

/**
 * The inputs `chart.addIndicator(id, params)` takes for an id: a built-in's
 * own (`BuiltInIndicators['rsi']['params']`), so a misspelt one fails the
 * type check, or any for another id.
 */
export type IndicatorParamsFor<Id extends string> = Id extends BuiltInIndicatorId
  ? BuiltInIndicators[Id]['params']
  : IndicatorParamValues;

/** How a plot is drawn. */
export type IndicatorPlotKind = 'line' | 'histogram' | 'dots' | 'step';

/**
 * One series an indicator draws from a field of its output: a line, a
 * histogram, dots. Fields of the output that no plot names are not drawn
 * (flags, running state) and are left out of scales, legends and labels.
 */
export interface IndicatorPlot {
  /** The output field (`IndicatorValue` key) it is drawn from. */
  key: string;
  /** Short name: "Signal", "%K", "Upper". */
  title: string;
  /** Index into `style.colors` it is drawn in (its up colour when two-tone). */
  color: number;
  /** Default `'line'`. */
  kind?: IndicatorPlotKind;
  /**
   * Two-tone: drawn bar by bar in `color` or `downColor`, by the value's
   * sign (`'sign'`, zero counts as up) or by another output field that is
   * 1 for up (`{ field }`).
   */
  tone?: 'sign' | { field: string };
  /** Index into `style.colors` of the down colour of a two-tone plot. */
  downColor?: number;
}

/** The value scale of an indicator's pane. */
export interface IndicatorScale {
  /** Fixed lower bound (RSI: 0); unset follows the visible values. */
  min?: number;
  /** Fixed upper bound (RSI: 100); unset follows the visible values. */
  max?: number;
  /** Keep zero in view (oscillators around zero, histograms). */
  zero?: boolean;
}

/** How a parameter is edited. Types not described here are inferred from the default value. */
export interface IndicatorInputSpec {
  /** Label in settings; defaults to the parameter name in words. */
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  /** A choice among these values. */
  options?: readonly (string | number)[];
  /**
   * A price source: `'close'`, `'hl2'`… or another indicator's line
   * (`'ind:<instanceId>:<key>'`). The indicator then reads it as `close`.
   */
  source?: boolean;
}

export interface IndicatorDescriptor {
  id: string;
  name: string;
  placement: IndicatorPlacement;
  defaultConfig: Record<string, unknown>;
  /** Short name for legends ("RSI"); defaults to the id in capitals. */
  shortName?: string;
  /** What it draws, in drawing order. Without it every output field counts as drawn. */
  plots?: readonly IndicatorPlot[];
  /** Its pane's value scale (panel indicators). */
  scale?: IndicatorScale;
  /** Default horizontal reference levels (RSI 30 / 70), drawn by the chart and editable per instance. */
  levels?: readonly number[];
  /** How its parameters are edited, by parameter name. */
  inputs?: Readonly<Record<string, IndicatorInputSpec>>;
  /** The group it is listed under in the widget's indicator picker; unset: "other" (built-ins have theirs). */
  category?: IndicatorCategory;
}

/** The groups of the widget's indicator picker. */
export type IndicatorCategory =
  | 'movingAverages'
  | 'trend'
  | 'oscillators'
  | 'volatility'
  | 'volume'
  | 'bands'
  | 'patterns'
  | 'other';

export interface IndicatorConfig {
  id: string;
  instanceId: string;
  params: Record<string, number | string | boolean>;
  style?: IndicatorStyleConfig;
  visible?: boolean;
  /** Reference levels for this instance; unset uses the descriptor's `levels`. */
  levels?: number[];
  /**
   * Draw in another instance's pane, on its scale (a moving average applied
   * to RSI). Unset: the price pane for overlays, a pane of its own for panels.
   */
  pane?: string;
  /**
   * `'left'`: an overlay drawn on a price scale of its own on the left, fit
   * to its values (volume-like lines over price). Unset: the price scale.
   */
  scale?: 'left';
  /** The intervals it shows on; unset: all of them. */
  intervals?: IndicatorIntervals;
  /**
   * The exchange's IANA zone (`'Asia/Ho_Chi_Minh'`), which indicators that
   * start again each day, week or month count their days in: VWAP's
   * `anchor`, Session VWAP, the MTF moving average. Set by the chart, from
   * the symbol's `timeZone`, else the market's (`setSymbolInfo`,
   * `setMarket`), and never saved with a layout. Unset for UTC, and when
   * neither names a zone: UTC's days.
   */
  exchangeTimeZone?: string;
}

/** The kinds of interval an indicator's visibility is set for. */
export type IntervalUnit = 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

/**
 * The intervals an indicator shows on, by unit: `false` hides it on every
 * interval of that unit, `[from, to]` shows it on those counts only
 * (`hours: [1, 4]`: 1h to 4h). A unit left out shows it on all.
 */
export type IndicatorIntervals = Partial<Record<IntervalUnit, false | readonly [number, number]>>;

/** Which price scale an overlay is drawn on. */
export type OverlayScale = 'right' | 'left';

/**
 * One plot's own look, by its key (`'signal'`, `'upper'`). Its colour and
 * width stay in `colors` and `lineWidths`; this adds its dash and whether it
 * shows. Plots drawn from the descriptor's `plots` follow it; an indicator
 * that draws itself keeps to its own look.
 */
export interface IndicatorPlotStyle {
  lineStyle?: LineStyle;
  /** False: not drawn, and no value tag or legend value. */
  visible?: boolean;
}

export interface IndicatorStyleConfig {
  colors?: string[];
  lineWidths?: number[];
  opacity?: number;
  /** Each plot's own dash and visibility, by its key. */
  plots?: Record<string, IndicatorPlotStyle>;
}

/** An indicator's values: by bar (`series`) and by bar time (`values`). */
export interface IndicatorOutput {
  /** Its value at each bar it has one for, by the bar's time. */
  values: Map<number, IndicatorValue>;
  /** Its value at bar `i` of the chart's bars, null before it has one. */
  series?: (IndicatorValue | null)[];
  meta?: Record<string, unknown>;
}

export interface IndicatorValue {
  [key: string]: number | undefined;
}

export interface ResolvedIndicatorStyle {
  colors: string[];
  lineWidths: number[];
  opacity: number;
  plots?: Record<string, IndicatorPlotStyle>;
}

export interface IndicatorPlugin {
  descriptor: IndicatorDescriptor;
  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput;
  /**
   * Optional incremental recompute, used on live ticks and new bars instead
   * of re-running `calculate` over the whole history.
   *
   * `prev` is this plugin's own earlier output for a series whose bars
   * `[0, from)` are unchanged; bars at `from` and later changed or were
   * appended. Must yield the same values `calculate(data, config)` would
   * (up to floating-point rounding). May update and return `prev` in place.
   * Return `null` to fall back to a full `calculate`.
   */
  update?(
    data: DataSeries,
    config: IndicatorConfig,
    prev: IndicatorOutput,
    from: number,
  ): IndicatorOutput | null;
  /**
   * How many bars before `from` an `update` may rewrite (a fractal is decided
   * by the bars after it). Default 0: only bars from `from` on change.
   * Indicators read from this one recompute from that far back.
   */
  revisesBefore?(config: IndicatorConfig): number;
  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void;
}
