import type { DataSeries } from './ohlc.js';
import type { ViewportState } from './rendering.js';

export type IndicatorPlacement = 'overlay' | 'panel';

export interface IndicatorDescriptor {
  id: string;
  name: string;
  placement: IndicatorPlacement;
  defaultConfig: Record<string, unknown>;
}

export interface IndicatorConfig {
  id: string;
  instanceId: string;
  params: Record<string, number | string | boolean>;
  style?: IndicatorStyleConfig;
  visible?: boolean;
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
