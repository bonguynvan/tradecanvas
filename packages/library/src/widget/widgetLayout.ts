import type { PriceScaleMode, TimeFrame } from '@tradecanvas/commons';

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

/** A widget layout read back from storage, or `null` when it is not one. */
export function readWidgetLayout(value: unknown): WidgetLayoutContent | null {
  if (!isRecord(value) || value.v !== 1) return null;
  if (typeof value.symbol !== 'string' || !value.symbol || typeof value.timeframe !== 'string' || !value.timeframe) return null;
  return {
    v: 1,
    symbol: value.symbol,
    timeframe: value.timeframe as TimeFrame,
    scaleMode: SCALE_MODES.find((m) => m === value.scaleMode) ?? 'regular',
    invertScale: value.invertScale === true,
    chart: isRecord(value.chart) ? value.chart : null,
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
