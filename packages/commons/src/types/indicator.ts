import type { DataSeries } from './ohlc.js';
import type { ViewportState } from './rendering.js';
import type { LineStyle } from './chart.js';
import type { BuiltInIndicators } from './builtInIndicators.js';
import type { Theme } from './theme.js';

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

/**
 * How a plot is drawn. `'markers'` marks the bars that have a value (a turn,
 * a signal): a shape at the value, or above or below the bar (`position`).
 * It is not a line: it gets no value in the legend, no tag on the axis and
 * no column in an export.
 */
export type IndicatorPlotKind = 'line' | 'histogram' | 'dots' | 'step' | 'markers';

/** The shape of a markers plot's marks. */
export type IndicatorMarkerShape = 'dot' | 'triangleUp' | 'triangleDown' | 'arrowUp' | 'arrowDown' | 'square' | 'diamond';

/**
 * Where a markers plot puts its mark on a bar: at its value, above the
 * bar's high or below its low. Above and below are read on the price pane;
 * in a pane of its own a mark is at its value.
 */
export type IndicatorMarkerPosition = 'value' | 'aboveBar' | 'belowBar';

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
  /** For `kind: 'markers'`: the shape of its marks; default `'dot'`. */
  shape?: IndicatorMarkerShape;
  /** For `kind: 'markers'`: where a mark goes on its bar; default `'value'`. */
  position?: IndicatorMarkerPosition;
  /**
   * Two-tone: drawn bar by bar in `color` or `downColor`, by the value's
   * sign (`'sign'`, zero counts as up) or by another output field that is
   * 1 for up (`{ field }`).
   */
  tone?: 'sign' | { field: string };
  /** Index into `style.colors` of the down colour of a two-tone plot. */
  downColor?: number;
  /**
   * Its own line width, whatever the indicator's (`lineWidths[0]`): a thin
   * guide such as a channel's middle line. A width the style gives for its
   * own place in `lineWidths`, after the first, still wins.
   */
  width?: number;
  /** How it is dashed until its style (`style.plots[key].lineStyle`) says otherwise; default `'solid'`. */
  lineStyle?: LineStyle;
  /** Its strength, 0 to 1, for a line that should sit back (bands around a line); default 1. */
  opacity?: number;
  /**
   * An output field that numbers periods (`'session'`): the line breaks
   * between two bars of different periods, except where each is a period of
   * its own (daily bars of a daily average, joined into one line).
   */
  breakOn?: string;
}

/** A shaded area between two of an indicator's plots (a channel's band). */
export interface IndicatorFill {
  /** The keys of the two plots it fills between; only where both have a value. */
  between: readonly [string, string];
  /** Index into `style.colors` it is shaded in. */
  color: number;
  /** Its strength, 0 to 1; default 0.1. */
  opacity?: number;
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

/**
 * What kind of value an input takes, which decides how it is edited:
 * - `'int'`: a whole number, stepped by 1 (a period);
 * - `'number'`: any number (a multiplier);
 * - `'boolean'`: on or off;
 * - `'choice'`: one of `options`;
 * - `'source'`: a price or another indicator's line;
 * - `'color'`: a `#rrggbb` colour;
 * - `'text'`: free text.
 */
export type IndicatorInputKind = 'int' | 'number' | 'boolean' | 'choice' | 'source' | 'color' | 'text';

/** One of a choice input's values, with the label shown for it. */
export interface IndicatorInputOption {
  value: string | number;
  label: string;
}

/** How a parameter is edited. Types not described here are inferred from the default value. */
export interface IndicatorInputSpec {
  /**
   * What kind of value it takes. Unset, it is read from the rest of the spec
   * and the default: `source`, `options`, then the default's type (a number
   * is `'number'`, stepped by 1 when whole; a `#rrggbb` text `'color'`).
   * Only a declared `'int'` is rounded as it is typed.
   */
  kind?: IndicatorInputKind;
  /** Label in settings; defaults to the parameter name in words. */
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  /**
   * A choice among these values: each a value, or a value with the label
   * the settings dialog shows for it (`{ value: 'ema', label: 'EMA' }`), in
   * your app's language. A plain value shows as the widget names it, else
   * as it is.
   */
  options?: readonly (string | number | IndicatorInputOption)[];
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
  /** Areas shaded between two of its plots, drawn under the plots. */
  fills?: readonly IndicatorFill[];
  /** Its pane's value scale (panel indicators). */
  scale?: IndicatorScale;
  /** Default horizontal reference levels (RSI 30 / 70), drawn by the chart and editable per instance. */
  levels?: readonly number[];
  /** How its parameters are edited, by parameter name. */
  inputs?: Readonly<Record<string, IndicatorInputSpec>>;
  /**
   * The group it is listed under in the widget's indicator picker: one of
   * the built-in kinds, or a group of your own (`{ id, label }`), listed
   * before them in the order their first indicators were registered.
   * Unset: "other" (built-ins have theirs). Code that needs only the kind
   * reads `indicatorCategory(descriptor)`.
   */
  category?: IndicatorCategory | IndicatorGroup;
  /**
   * Whether it counts days, weeks or months in the exchange's zone
   * (`config.exchangeTimeZone`): a change of the zone computes again only
   * the indicators that do and those that read their lines. Unset, a plugin
   * of your own is taken to, and a built-in that doesn't say so is not.
   */
  readsExchangeTimeZone?: boolean;
  /**
   * The look it starts with: a style, or one for each theme the chart draws
   * with (`(theme) => style`, the theme with the chart's style overrides on
   * it), which an instance follows when the theme changes. Under the
   * viewer's saved default (`chart.setIndicatorDefaults`) and an instance's
   * own; a part it doesn't give comes from the chart (the series palette, a
   * 1.5 px line). Its colours, line widths and opacity are read; a part of
   * an instance still equal to what the theme gave counts as the theme's.
   * What the theme gives is left out of a saved layout, so a layout opened
   * in another theme takes that theme's look.
   */
  defaultStyle?: IndicatorStyleConfig | ((theme: Theme) => IndicatorStyleConfig);
}

/**
 * A group of your own in the widget's indicator picker, listed before the
 * built-in kinds: your app's indicators together, under its name.
 */
export interface IndicatorGroup {
  /** Tells groups apart: the indicators with the same id are listed together. */
  id: string;
  /** Its name in the picker, in the language your app shows; search finds its indicators by it too. */
  label: string;
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
 * width stay in `colors` and `lineWidths`; this adds its dash, whether it
 * shows, and a markers plot's shape and size. Plots drawn from the
 * descriptor's `plots` follow it; an indicator that draws itself keeps to
 * its own look.
 */
export interface IndicatorPlotStyle {
  lineStyle?: LineStyle;
  /** False: not drawn, and no value tag or legend value. */
  visible?: boolean;
  /** A markers plot's shape, over the one its descriptor declares. */
  shape?: IndicatorMarkerShape;
  /**
   * A markers plot's marks, in CSS pixels across (2 to 40). `'auto'` or
   * unset: as wide as the bars allow, 4 to 8 px.
   */
  size?: number | 'auto';
}

export interface IndicatorStyleConfig {
  colors?: string[];
  lineWidths?: number[];
  opacity?: number;
  /** Each plot's own dash, visibility, and a mark's shape and size, by its key. */
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
  /**
   * Draws the instance. `context.theme` is the theme the chart draws with:
   * colours and a font for what the style doesn't give (a mark where a line
   * turns, a label).
   */
  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
    context: IndicatorRenderContext,
  ): void;
}

/** What an indicator's `render` is given besides its values: the chart's theme. */
export interface IndicatorRenderContext {
  theme: Theme;
}
