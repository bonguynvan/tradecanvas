import type { PriceScaleMode, TimeFrame } from '@tradecanvas/commons';
import { isTimeFrame, tickBarCount } from '@tradecanvas/commons';
import type { ChartSettingsState } from './types.js';
import { LAYOUT_LEAVES, readChartSettings } from './chartSettingsStore.js';

/** What a widget's named layout holds. */
export interface WidgetLayoutContent {
  v: 1;
  symbol: string;
  timeframe: TimeFrame;
  scaleMode: PriceScaleMode;
  invertScale: boolean;
  /** The chart's own state, as `Chart.saveState()` writes it: chart type, indicators, drawings, alerts. */
  chart: Record<string, unknown> | null;
  /**
   * The Chart Settings it was saved with (overlays, crosshair, legend,
   * grid…), but the viewer's own time zone and number format, auto-scale,
   * and those with a place of their own here: the scale and its flip, and
   * a chart type's own settings (in `chart`). A layout saved before they
   * were kept has none, and opening it leaves them as they are.
   */
  settings?: Partial<ChartSettingsState>;
}

/** The price scales a layout or a link may name. */
export const SCALE_MODES: readonly PriceScaleMode[] = ['regular', 'logarithmic', 'percentage', 'indexedTo100'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The chart's state without what a layout leaves to the viewer (the theme) or never compares (when it was taken). */
export function layoutChartState(state: Record<string, unknown>): Record<string, unknown> {
  const { theme: _theme, timestamp: _timestamp, ...rest } = state;
  return rest;
}

/**
 * A widget layout read back from storage (or a host's server), or `null` when
 * it is not one. Whatever comes in is checked: an interval it can't read
 * refuses the layout, a theme in the chart's state is dropped, and so is a
 * setting it can't read (or the viewer's own).
 */
export function readWidgetLayout(value: unknown): WidgetLayoutContent | null {
  if (!isRecord(value) || value.v !== 1) return null;
  if (typeof value.symbol !== 'string' || !value.symbol || typeof value.timeframe !== 'string' || !(isTimeFrame(value.timeframe) || tickBarCount(value.timeframe) !== null)) return null;
  return {
    v: 1,
    symbol: value.symbol,
    timeframe: value.timeframe as TimeFrame,
    scaleMode: SCALE_MODES.find((m) => m === value.scaleMode) ?? 'regular',
    invertScale: value.invertScale === true,
    chart: isRecord(value.chart) ? layoutChartState(value.chart) : null,
    ...(isRecord(value.settings) ? { settings: readChartSettings(value.settings, LAYOUT_LEAVES) } : {}),
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
