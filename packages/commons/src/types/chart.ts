import type { Theme, ThemeName } from './theme.js';
import type { DrawingToolType } from './drawing.js';
import type { TimeFrame } from './ohlc.js';

export type ChartType =
  | 'candlestick' | 'line' | 'area' | 'bar'
  | 'heikinAshi' | 'hollowCandle' | 'baseline'
  | 'renko' | 'lineBreak' | 'kagi' | 'pointAndFigure';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Controls which features are available to the end user.
 * Developers can selectively enable/disable tools, UI elements, and interactions.
 * All features default to `true` (enabled) when not specified.
 */
export interface FeaturesConfig {
  // --- Drawing tools ---
  /** Enable drawing tools entirely. When false, no drawing tool can be activated. */
  drawings?: boolean;
  /** Whitelist of allowed drawing tool types. When set, only these tools are available. */
  drawingTools?: DrawingToolType[];
  /** Enable magnet/snap for drawing anchors */
  drawingMagnet?: boolean;
  /** Enable undo/redo for drawings (Ctrl+Z / Ctrl+Y) */
  drawingUndoRedo?: boolean;

  // --- Trading ---
  /** Enable trading features (orders, positions, context menu) */
  trading?: boolean;
  /** Enable right-click context menu for placing orders */
  tradingContextMenu?: boolean;

  // --- Indicators ---
  /** Enable indicator overlays and panels */
  indicators?: boolean;
  /** Whitelist of allowed indicator IDs. When set, only these are available. */
  indicatorIds?: string[];

  // --- Interactions ---
  /** Enable mouse/touch pan */
  panning?: boolean;
  /** Enable mouse wheel / pinch zoom */
  zooming?: boolean;
  /** Enable crosshair */
  crosshair?: boolean;
  /** Enable keyboard shortcuts (arrows, +/-, Home/End, Space) */
  keyboard?: boolean;

  // --- UI elements ---
  /** Show price axis */
  priceAxis?: boolean;
  /** Show time axis */
  timeAxis?: boolean;
  /** Show grid lines */
  grid?: boolean;
  /** Show OHLCV legend overlay */
  legend?: boolean;
  /** Show volume bars below candles */
  volume?: boolean;
  /** Show watermark text */
  watermark?: boolean;

  // --- Features ---
  /** Enable chart state save/load */
  saveLoad?: boolean;
  /** Enable screenshot capture */
  screenshot?: boolean;
  /** Enable price alerts */
  alerts?: boolean;
  /** Enable bar replay */
  replay?: boolean;
  /** Show session break lines (day separators) */
  sessionBreaks?: boolean;
  /** Show bar countdown timer (time until current candle closes) */
  barCountdown?: boolean;
  /** Enable compare/overlay symbols */
  compareSymbols?: boolean;
  /** Enable data export (CSV/JSON) */
  dataExport?: boolean;
  /** Enable logarithmic price scale toggle */
  logScale?: boolean;

  // --- Timeframes ---
  /** Whitelist of available timeframes. When set, only these are selectable. */
  timeframes?: TimeFrame[];
  /** Default favorite timeframes shown in the quick-access bar */
  defaultTimeframeFavorites?: TimeFrame[];
}

export interface ChartOptions {
  width?: number;
  height?: number;
  chartType: ChartType;
  theme?: ThemeName | Theme;
  autoScale?: boolean;
  rightMargin?: number;
  minBarSpacing?: number;
  maxBarSpacing?: number;
  grid?: GridOptions;
  crosshair?: CrosshairOptions;
  priceAxis?: PriceAxisOptions;
  timeAxis?: TimeAxisOptions;
  watermark?: WatermarkConfig;
  /** Start with logarithmic price scale */
  logScale?: boolean;
  /** Session break line configuration */
  sessionBreaks?: SessionBreakOptions;
  /** Feature toggles — control what users can access */
  features?: FeaturesConfig;
}

export interface SessionBreakOptions {
  visible?: boolean;
  color?: string;
  lineStyle?: LineStyle;
  lineWidth?: number;
}

export interface GridOptions {
  visible: boolean;
  hLineColor?: string;
  vLineColor?: string;
  hLineStyle?: LineStyle;
  vLineStyle?: LineStyle;
}

export interface CrosshairOptions {
  mode: 'normal' | 'magnet' | 'hidden';
  hLine?: CrosshairLineOptions;
  vLine?: CrosshairLineOptions;
}

export interface CrosshairLineOptions {
  visible?: boolean;
  color?: string;
  style?: LineStyle;
  width?: number;
  labelVisible?: boolean;
  labelBackground?: string;
}

export interface PriceAxisOptions {
  visible?: boolean;
  width?: number;
  position?: 'left' | 'right';
  scaleType?: 'linear' | 'log' | 'percentage';
}

export interface TimeAxisOptions {
  visible?: boolean;
  height?: number;
}

export interface WatermarkConfig {
  text: string;
  color?: string;
  fontSize?: number;
}

export interface PriceFormat {
  type: 'price' | 'percent' | 'volume';
  precision?: number;
  minMove?: number;
}
