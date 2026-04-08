import type { ChartOptions } from '../types/chart.js';

export const DEFAULT_CHART_OPTIONS: Required<Pick<ChartOptions, 'autoScale' | 'rightMargin' | 'minBarSpacing' | 'maxBarSpacing'>> & Pick<ChartOptions, 'grid' | 'crosshair'> = {
  autoScale: true,
  rightMargin: 5,
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
