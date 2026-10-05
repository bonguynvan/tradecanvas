import type { Theme, ThemeName } from './theme.js';
import type { ChartStyleOverridesPatch } from './style.js';
import type { DrawingToolType } from './drawing.js';
import type { TimeFrame } from './ohlc.js';

export type ChartType =
  | 'candlestick' | 'line' | 'area' | 'bar'
  | 'heikinAshi' | 'hollowCandle' | 'baseline'
  | 'renko' | 'lineBreak' | 'kagi' | 'pointAndFigure'
  | 'rangeBars'
  | 'volumeCandles' | 'hlcArea' | 'stepLine' | 'lineWithMarkers'
  | 'equivolume' | 'hiLo';

/**
 * Settings of the chart types that build bars of their own. What isn't set
 * is worked out from the data.
 */
export interface ChartTypeOptions {
  /** Box size in price, or 'atr' (default): the average true range of the last `atrPeriod` bars (14). */
  renko?: { boxSize?: number | 'atr'; atrPeriod?: number };
  /** How many lines a reversal has to break (3). */
  lineBreak?: { lines?: number };
  /** The reversal: percent of the line's start (4), or an amount of price with `reversalType` 'price'. */
  kagi?: { reversal?: number; reversalType?: 'percent' | 'price' };
  /** Box size in price ('auto': 1% of the average close) and boxes to reverse (3). */
  pointAndFigure?: { boxSize?: number | 'auto'; reversal?: number };
  /** Each bar's range in price ('auto': 0.5% of the average close). */
  rangeBars?: { range?: number | 'auto' };
}

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
  /** Allow magnet/snap for drawing anchors. When false, `setDrawingMagnet(true)` is ignored. */
  drawingMagnet?: boolean;
  /** Enable undo/redo for drawings (Ctrl+Z / Ctrl+Y) */
  drawingUndoRedo?: boolean;

  // --- Trading ---
  /** Enable trading features (orders, positions, context menu) */
  trading?: boolean;
  /** Right-click menu for placing orders. Default `false` — opt in explicitly. */
  tradingContextMenu?: boolean;
  /**
   * A "+" by the price axis, level with the crosshair; a click on it emits
   * `priceAxisAdd` with the price. Default `false` (ChartWidget turns it on).
   */
  priceAxisAddButton?: boolean;

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
  /**
   * Show the floating OHLCV tooltip that follows the cursor on hover.
   * Pro trading charts usually rely on the top-left legend (`legend`) instead
   * of a cursor-following popup — set this to `false` to match that and
   * keep only the legend updating on hover.
   */
  crosshairTooltip?: boolean;
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
  /** Tag each indicator line's latest value on its value axis. Default true. */
  indicatorValueLabels?: boolean;
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
  /** Show bar countdown timer (time until current candle closes). When false it stays hidden. */
  barCountdown?: boolean;
  /** Enable compare/overlay symbols. When false, `addCompareSymbol` does nothing. */
  compareSymbols?: boolean;
  /** Enable data export (CSV/JSON). When false, `exportVisibleData` / `exportAllData` do nothing. */
  dataExport?: boolean;
  /** Allow the logarithmic price scale. When false, switching to it is ignored. */
  logScale?: boolean;

  // --- Timeframes ---
  /**
   * Whitelist of timeframes. When set, `setTimeframe` ignores any other, and
   * ChartWidget offers only these.
   */
  timeframes?: TimeFrame[];
  /** ChartWidget: timeframes on the quick-access bar until the user changes them. */
  defaultTimeframeFavorites?: TimeFrame[];
}

export interface ChartOptions {
  width?: number;
  height?: number;
  /** Default `'candlestick'`. */
  chartType?: ChartType;
  theme?: ThemeName | Theme;
  autoScale?: boolean;
  rightMargin?: number;
  minBarSpacing?: number;
  maxBarSpacing?: number;
  /** The grid's lines: shorthand for the `grid.*` overrides. */
  grid?: GridOptions;
  /** The crosshair's mode, and its lines: shorthand for the `crosshair.*` overrides. */
  crosshair?: CrosshairOptions;
  /**
   * Style overrides to start with, on the host's layer: any part of the
   * chart's look, by key (`'grid.vertical.visible': false`,
   * `'series.candlestick.upColor': '#26a69a'`). See `chart.applyOverrides`.
   */
  overrides?: ChartStyleOverridesPatch;
  priceAxis?: PriceAxisOptions;
  timeAxis?: TimeAxisOptions;
  watermark?: WatermarkConfig;
  /** Start with logarithmic price scale */
  logScale?: boolean;
  /** Session break line configuration */
  sessionBreaks?: SessionBreakOptions;
  /** Feature toggles — control what users can access */
  features?: FeaturesConfig;
  /** BCP 47 locale for number formatting (e.g. 'en-US', 'de-DE', 'vi-VN'). Defaults to 'en-US'. */
  numberLocale?: string;
  /**
   * Free panning (default `true`): drag past the newest bar
   * into empty future space, or past the oldest bar, until `panLimits.minVisibleBars`
   * bars remain. `false` restores the pre-1.3 clamp (newest bar stops at its
   * resting position).
   */
  freePan?: boolean;
  /**
   * Timezone for the time axis, crosshair, tooltip, day breaks and range
   * presets: an IANA zone (`'America/New_York'`, daylight saving included), a
   * fixed offset in minutes east of UTC, or null (default) for the browser's.
   */
  timeZone?: string | number | null;
  /**
   * Show a price scale on the left too. It carries the overlays put on it
   * (`addIndicator(…, { scale: 'left' })`), else it mirrors the price scale.
   * It shows by itself once an overlay is on it.
   */
  leftPriceScale?: boolean;
  /** Bounds for free panning. */
  panLimits?: { minVisibleBars?: number };
  /**
   * How prices read on the price scale and everything that prints one (axis,
   * crosshair, last-price tag, legend, tooltip, orders, alerts, drawings): a
   * function of yours, or fractions of a point (a bond in 32nds: `101'16`).
   * Indicator panes keep their own numbers. Default: decimals.
   */
  priceFormat?: PriceFormatter | PriceFraction;
  /** How times read on the time axis, the crosshair and the tooltip. Default: the chart's own. */
  timeFormatter?: TimeFormatter;
  /** Settings of Renko, Line Break, Kagi, Point & Figure and range bars. */
  chartTypeOptions?: ChartTypeOptions;
  /** Mark the highest high and lowest low on screen with a line and a price tag. */
  highLowLines?: boolean;
  /** The shapes the chart draws: price tags, axis pills and order badges square (default), rounded or pills. */
  shapes?: import('./theme.js').ShapeConfig;
  /**
   * The chart for screen readers: a summary, what is on screen after the keys
   * move it, comma and period to read the bars. On by default; labels in your
   * language here; `false` leaves it out.
   */
  a11y?: false | { labels?: Partial<import('./a11y.js').ChartA11yLabels> };
  /**
   * What draws the plot and panes: `'canvas'` (Canvas 2D, the default),
   * `'webgl'` (WebGL 2 on the GPU, Canvas 2D where it can't be had) or
   * `'auto'` (WebGL 2 where the GPU is a real one). On the GPU go the grid,
   * sessions, series, compare lines, indicators and panes; text, drawings,
   * orders, axes and the crosshair stay Canvas 2D, as does anything the GPU
   * can't draw the same. The WebGL code loads only when asked for. At most 8
   * charts on a page draw with WebGL at once (`setMaxWebGLCharts`), the rest
   * with Canvas 2D until one lets go; a chart whose WebGL context is lost
   * draws with it again if the browser hands it back. See `rendererChange`.
   */
  renderer?: 'canvas' | 'webgl' | 'auto';
  /**
   * Show the bars outside the symbol's regular hours (`SymbolInfo.sessions`):
   * pre- and post-market. Default true; bars a day or longer are never left out.
   */
  extendedHours?: boolean;
}

/** A price in your words, e.g. `(p) => '$' + p.toFixed(2)`. */
export type PriceFormatter = (price: number) => string;

/**
 * Prices in fractions of a point: `denominator` 32 prints 101.5 as `101'16`.
 * `subDenominator` 2 or 4 splits each fraction in halves or quarters, printed
 * as a last digit the way futures quote them (`101'165` is 101 and 16½ 32nds).
 */
export interface PriceFraction {
  denominator: number;
  subDenominator?: number;
}

/** Where a time is printed, for a `TimeFormatter`. */
export interface TimeFormatContext {
  /**
   * `'date'`: an axis label of a bar a day or longer; `'day'`: an axis label
   * where a new day starts; `'time'`: an axis label within a day;
   * `'crosshair'`: the crosshair's label and the tooltip.
   */
  kind: 'date' | 'day' | 'time' | 'crosshair';
  /** The chart's time zone: an IANA name, minutes east of UTC, or null for the browser's. */
  timeZone: string | number | null;
}

/** A time (ms since the epoch) in your words. */
export type TimeFormatter = (time: number, context: TimeFormatContext) => string;

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
