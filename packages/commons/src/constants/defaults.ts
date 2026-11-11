import type { ChartDensity, ChartOptions, ChartSpacing } from '../types/chart.js';
import { PHI } from './golden.js';

/**
 * The room each density leaves around the bars. Comfortable is compact a step
 * up its own ladder: the bars from the 2 px gap to golden, the room past the
 * newest bar from 5 slots to 8 (the next Fibonacci number), the price margins
 * a half step of φ wider (φ⁻⁵ to φ⁻⁴·⁵), the gap over the volume band a whole
 * step (φ⁻⁷ to φ⁻⁶), and the legend's insets from 8, 6 and 3 px to 12, 8 and 4
 * (the widget's even spacing ladder, so its text sits on whole pixels).
 */
export const CHART_SPACING: Readonly<Record<ChartDensity, Readonly<ChartSpacing>>> = Object.freeze({
  comfortable: Object.freeze({
    barLayout: 'golden',
    rightMargin: 8,
    priceMargin: PHI ** -4.5,
    volumeGap: PHI ** -6,
    legendInset: 12,
    legendTop: 8,
    legendLineGap: 4,
  }),
  compact: Object.freeze({
    barLayout: 'classic',
    rightMargin: 5,
    priceMargin: PHI ** -5,
    volumeGap: PHI ** -7,
    legendInset: 8,
    legendTop: 6,
    legendLineGap: 3,
  }),
});

export const DEFAULT_CHART_DENSITY: ChartDensity = 'comfortable';

export const DEFAULT_CHART_OPTIONS: Required<Pick<ChartOptions, 'autoScale' | 'rightMargin' | 'minBarSpacing' | 'maxBarSpacing'>> & Pick<ChartOptions, 'grid' | 'crosshair'> = {
  autoScale: true,
  rightMargin: CHART_SPACING[DEFAULT_CHART_DENSITY].rightMargin,
  minBarSpacing: 2,
  maxBarSpacing: 30,
  grid: {
    visible: true,
    hLineStyle: 'solid',
    vLineStyle: 'solid',
  },
  crosshair: {
    mode: 'magnet',
  },
};

// Standard timeframe presets for different market types
import type { TimeFrame } from '../types/ohlc.js';

/** Crypto: all timeframes including seconds */
export const TIMEFRAMES_CRYPTO: TimeFrame[] = [
  '1s', '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '6h', '8h', '12h',
  '1d', '3d', '1w', '1M',
];

/** Stocks: minute-level and above (no seconds) */
export const TIMEFRAMES_STOCK: TimeFrame[] = [
  '1m', '5m', '15m', '30m',
  '1h', '2h', '4h',
  '1d', '1w', '1M', '3M', '6M', '12M',
];

/** Forex: common forex timeframes */
export const TIMEFRAMES_FOREX: TimeFrame[] = [
  '1m', '5m', '15m', '30m',
  '1h', '4h',
  '1d', '1w', '1M',
];

/** Default favorites shown in quick-access bar */
export const DEFAULT_TIMEFRAME_FAVORITES: TimeFrame[] = [
  '1m', '5m', '15m', '1h', '4h', '1d', '1w',
];

export const DEFAULT_BAR_WIDTH = 8;
export const DEFAULT_BAR_SPACING = 2;
export const PRICE_AXIS_WIDTH = 70;
export const TIME_AXIS_HEIGHT = 30;
export const MIN_PANEL_HEIGHT = 60;
export const DEFAULT_PANEL_HEIGHT = 120;
