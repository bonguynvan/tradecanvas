import type { DataSeries } from './ohlc.js';
import type { ViewportState } from './rendering.js';

export type IndicatorPlacement = 'overlay' | 'panel';

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
}

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
}

export interface IndicatorStyleConfig {
  colors?: string[];
  lineWidths?: number[];
  opacity?: number;
}

export interface IndicatorOutput {
  values: Map<number, IndicatorValue>;
  /** Array indexed by bar position — fast O(1) lookup, no sorting needed on render. */
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
  render(
    ctx: CanvasRenderingContext2D,
    output: IndicatorOutput,
    viewport: ViewportState,
    style: ResolvedIndicatorStyle,
  ): void;
}
