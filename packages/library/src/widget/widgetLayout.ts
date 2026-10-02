import type { PriceScaleMode, TimeFrame } from '@tradecanvas/commons';
import { isTimeFrame } from '@tradecanvas/commons';

/** What a widget's named layout holds. */
export interface WidgetLayoutContent {
  v: 1;
  symbol: string;
  timeframe: TimeFrame;
  scaleMode: PriceScaleMode;
  invertScale: boolean;
  /** The chart's own state, as `Chart.saveState()` writes it: chart type, indicators, drawings, alerts. */
  chart: Record<string, unknown> | null;
}

const SCALE_MODES: readonly PriceScaleMode[] = ['regular', 'logarithmic', 'percentage', 'indexedTo100'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The chart's state without what a layout leaves to the viewer (the theme) or never compares (when it was taken). */
export function layoutChartState(state: Record<string, unknown>): Record<string, unknown> {
  const { theme: _theme, timestamp: _timestamp, ...rest } = state;
  return rest;
}

/**
 * A widget layout read back from storage (or a host's server), or `null` when
 * it is not one. Whatever comes in is checked: an interval it can't read
 * refuses the layout, and a theme in the chart's state is dropped.
 */
export function readWidgetLayout(value: unknown): WidgetLayoutContent | null {
  if (!isRecord(value) || value.v !== 1) return null;
  if (typeof value.symbol !== 'string' || !value.symbol || typeof value.timeframe !== 'string' || !isTimeFrame(value.timeframe)) return null;
  return {
    v: 1,
    symbol: value.symbol,
    timeframe: value.timeframe,
    scaleMode: SCALE_MODES.find((m) => m === value.scaleMode) ?? 'regular',
    invertScale: value.invertScale === true,
    chart: isRecord(value.chart) ? layoutChartState(value.chart) : null,
  };
}

/** Parse a layout's JSON; `null` for anything that does not parse. */
export function parseLayoutJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
