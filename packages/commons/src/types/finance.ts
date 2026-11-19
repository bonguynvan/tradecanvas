import type { FontConfig, Theme, ThemeName } from './theme.js';
import type { DepthData } from './trading.js';
import type { OHLCBar } from './ohlc.js';

export interface BaseFinanceChartOptions {
  /** The chart's colours: `'dark'` (the default), `'light'`, or a theme of your own. */
  theme?: ThemeName | Theme;
  /**
   * The face and sizes of the chart's text, over the theme's. Left out, the
   * text is in the theme's face: a sans one whose digits are one width
   * (`FIGURES_FONT_FAMILY`) in the dark and the light theme.
   * `{ family: MONO_FONT_FAMILY }` gives a monospaced one.
   */
  font?: Partial<FontConfig>;
  /**
   * The language numbers and dates are written in, as a BCP 47 tag (`'vi'`,
   * `'de-DE'`): the grouping and decimal marks, the short forms past ten
   * thousand, the names of months and days. The browser's own when left out.
   * A format function of yours (`valueFormat`…) is used as it is.
   */
  locale?: string;
  /** What the chart shows, for screen readers; every chart describes itself (in English) without one. */
  ariaLabel?: string;
}

export interface SparklineOptions extends BaseFinanceChartOptions {
  data: number[];
  mode?: 'line' | 'area';
  color?: string;
  fillColor?: string;
  lineWidth?: number;
  showLastPoint?: boolean;
  showMinMax?: boolean;
  lastPointColor?: string;
  minPointColor?: string;
  maxPointColor?: string;
}

export interface DepthChartOptions extends BaseFinanceChartOptions {
  data: DepthData;
  bidColor?: string;
  askColor?: string;
  bidFillColor?: string;
  askFillColor?: string;
  midPriceLine?: boolean;
  /** The spread written over the middle price: `false` for none, a word of your own in place of "Spread". */
  spreadLabel?: boolean | string;
  crosshair?: boolean;
  priceFormat?: (price: number) => string;
  volumeFormat?: (vol: number) => string;
}

export interface EquityPoint {
  time: number;
  value: number;
}

/** A line across an equity curve's plot at a value: a level price is measured against. */
export interface EquityLevel {
  /** Where the line is, on the curve's value scale. */
  value: number;
  /** Its name, written in the plot at one end of the line (`labelAt`), over it, or under it where another name is over it. The value itself is written in a tag at the value axis, in full (not shortened as the axis's ticks are) unless `valueFormat` says how; a value too long for a quarter of the chart's width is written as the ticks are. Tags of levels too close for both move apart, each as little as it can; when there is no room for them all, the lowest levels' are left out. */
  label?: string;
  /** Which end of the line its name is written at: `'end'` (the default), the right, or `'start'`, the left, away from the curve's latest point. */
  labelAt?: 'start' | 'end';
  /** The line's and its tag's colour; the theme's secondary text colour when left out. The tag's text is dark or light, whichever reads on it. */
  color?: string;
  /** The line's dash, in px as `setLineDash` takes it; `[]` draws it solid. Dashed when left out. */
  dash?: number[];
}

/** A tinted stretch of an equity curve's values, drawn under the curve: a range, a zone. */
export interface EquityBand {
  /** One edge's value; `from` and `to` may come either way round. */
  from: number;
  /** The other edge's value. */
  to: number;
  /** The tint, used as given, so give one with transparency; the theme's secondary text colour, faint, when left out. */
  color?: string;
  /** Its name, written in the plot at its top left corner when the band is tall enough for it. */
  label?: string;
}

export interface EquityCurveOptions extends BaseFinanceChartOptions {
  data: EquityPoint[];
  drawdown?: boolean;
  drawdownColor?: string;
  lineColor?: string;
  lineWidth?: number;
  benchmark?: EquityPoint[];
  benchmarkColor?: string;
  benchmarkLabel?: string;
  crosshair?: boolean;
  timeFormat?: (ts: number) => string;
  valueFormat?: (val: number) => string;
  fillArea?: boolean;
  /** Lines across the plot at fixed values (a break's level, a range's middle), with their values at the axis. */
  levels?: EquityLevel[];
  /** Tinted stretches of values under the curve (a range's upper and lower half). */
  bands?: EquityBand[];
  /** Whether the value scale widens to show every level and band: on unless `false`. Off, the scale is the curve's: a level outside it is left out, and a band is drawn only where it overlaps it. */
  fitLevels?: boolean;
}

export interface HeatmapCell {
  id: string;
  label: string;
  value: number;
  weight?: number;
  group?: string;
  meta?: Record<string, unknown>;
}

/**
 * Colours from low values through zero to high ones. `min` and `max` are
 * where the end colours are reached; values past them keep the end colour.
 * A colour left out is the chart's default. Hex and rgb() colours blend;
 * others (names, hsl()) switch half-way instead.
 */
export interface ColorScale {
  negative?: string;
  zero?: string;
  positive?: string;
  min?: number;
  max?: number;
}

export interface HeatmapOptions extends BaseFinanceChartOptions {
  data: HeatmapCell[];
  colorScale?: ColorScale;
  weighted?: boolean;
  /**
   * Cells with the same `group` sit together under its name (a sector map):
   * each group takes the room of its cells' weights, as `weighted` does.
   */
  grouped?: boolean;
  cellPadding?: number;
  cellRadius?: number;
  labelFormat?: (cell: HeatmapCell) => string;
  valueFormat?: (value: number) => string;
  showLabels?: boolean;
  showValues?: boolean;
  onCellClick?: (cell: HeatmapCell) => void;
  crosshair?: boolean;
}

export interface WaterfallBar {
  label: string;
  value: number;
  type?: 'positive' | 'negative' | 'total' | 'subtotal';
}

export interface WaterfallOptions extends BaseFinanceChartOptions {
  data: WaterfallBar[];
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  subtotalColor?: string;
  connectorColor?: string;
  connectorStyle?: 'dashed' | 'solid' | 'none';
  barWidth?: number;
  showValues?: boolean;
  showDelta?: boolean;
  valueFormat?: (v: number) => string;
  labelFormat?: (label: string) => string;
  crosshair?: boolean;
}

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface GaugeOptions extends BaseFinanceChartOptions {
  value: number;
  min?: number;
  max?: number;
  /** Coloured bands; the part below the value is drawn bright, the rest dimmed. */
  zones?: GaugeZone[];
  /** Ring width as a share of the radius. Default `0.14`. */
  thickness?: number;
  /** Arc start in degrees, clockwise from 3 o'clock. Default `150` (a 240° sweep open at the bottom). */
  startAngle?: number;
  /** Arc end in degrees. Default `390`. */
  endAngle?: number;
  showValue?: boolean;
  showZoneLabels?: boolean;
  label?: string;
  valueFormat?: (v: number) => string;
  /**
   * How the value is pointed at: `'marker'` (default) rides a knob on the
   * ring and keeps the centre free for the number; `'needle'` draws a classic
   * needle from a hub, with the number moved below it.
   */
  pointer?: 'marker' | 'needle';
  /** Needle colour (`pointer: 'needle'`); without zones, also the progress colour. */
  needleColor?: string;
  trackColor?: string;
  animate?: boolean;
  animationDuration?: number;
}

/** One named row of values: one value per category (bar chart). */
export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;
}

/** What the pointer is on in a bar chart. */
export interface BarHit {
  category: string;
  series: string;
  value: number;
  /** The category's index. */
  index: number;
}

export interface BarChartOptions extends BaseFinanceChartOptions {
  /** One label per bar group, along the category axis. */
  categories: string[];
  series: ChartSeries[];
  /** `'grouped'` (default): series side by side; `'stacked'`: positives up and negatives down from zero. */
  mode?: 'grouped' | 'stacked';
  /** `'vertical'` (default) bars rise from the category axis; `'horizontal'` bars run to the right. */
  orientation?: 'vertical' | 'horizontal';
  /** Colour each bar by its sign (net flows): `true` takes the theme's up and down colours. */
  colorBySign?: boolean | { positive: string; negative: string };
  /** Print each bar's value at its end. */
  showValues?: boolean;
  /** Show the series' names; default: when there is more than one. */
  legend?: boolean;
  /** How values read on the axis, the bars and the tooltip. */
  valueFormat?: (value: number) => string;
  /** Show the hovered bar's values. Default `true`. */
  crosshair?: boolean;
  onBarClick?: (hit: BarHit) => void;
}

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartOptions extends BaseFinanceChartOptions {
  /** Slices in order, clockwise from twelve o'clock; values of 0 or less are left out. */
  data: DonutSlice[];
  /** The hole as a share of the radius: `0.6` (default), `0` for a pie. */
  innerRadius?: number;
  /** Text in the hole: a caption and a figure (`'Total'`, `'1.2B'`). */
  centerLabel?: string;
  centerValue?: string;
  /** Print each slice's share on it when it fits. Default `true`. */
  showLabels?: boolean;
  /** The slices' names and shares beside the ring. Default `true`. */
  legend?: boolean;
  valueFormat?: (value: number) => string;
  /** Show the hovered slice's value and share. Default `true`. */
  crosshair?: boolean;
  onSliceClick?: (slice: DonutSlice) => void;
}

export interface ScatterPoint {
  x: number;
  y: number;
  /** A bubble's size: its area grows with it. */
  size?: number;
  label?: string;
  meta?: Record<string, unknown>;
}

export interface ScatterSeries {
  name: string;
  points: ScatterPoint[];
  color?: string;
}

export interface ScatterChartOptions extends BaseFinanceChartOptions {
  series: ScatterSeries[];
  /** Axis titles. */
  xLabel?: string;
  yLabel?: string;
  xFormat?: (value: number) => string;
  yFormat?: (value: number) => string;
  /** The largest bubble's radius, px. Default `24`. */
  maxRadius?: number;
  /** Print each point's label beside it. */
  showLabels?: boolean;
  /** Lines at x = 0 and y = 0 when the axes cross them. Default `true`. */
  zeroLines?: boolean;
  legend?: boolean;
  crosshair?: boolean;
  onPointClick?: (point: ScatterPoint, series: string) => void;
}

export interface HistogramMarker {
  value: number;
  label?: string;
  color?: string;
}

export interface HistogramBin {
  from: number;
  /** The bin ends before `to`; the last one includes it. */
  to: number;
  count: number;
}

export interface HistogramOptions extends BaseFinanceChartOptions {
  /** The raw values: daily returns, trade P&Ls… */
  values: number[];
  /** A count of bins, or `'auto'` (default: Sturges' rule). */
  bins?: number | 'auto';
  /** A bin width instead, on a grid from 0 (bins at -0.01, 0, 0.01…). */
  binWidth?: number;
  color?: string;
  /** Bins below zero in the theme's down colour, the rest in its up colour. */
  colorBySign?: boolean;
  /** Labelled lines at values: the mean, a VaR… */
  markers?: HistogramMarker[];
  valueFormat?: (value: number) => string;
  crosshair?: boolean;
}

/** One day's value; `date` is the calendar day, `YYYY-MM-DD`. */
export interface CalendarDay {
  date: string;
  value: number;
  meta?: Record<string, unknown>;
}

export interface CalendarChartOptions extends BaseFinanceChartOptions {
  data: CalendarDay[];
  /** The first and last days shown, `YYYY-MM-DD`; default: the data's. */
  from?: string;
  to?: string;
  /** `7` (default) every day; `5` Monday to Friday, for trading days. */
  weekdays?: 5 | 7;
  /** The day a week starts on with `weekdays: 7`: `1` Monday (default), `0` Sunday. */
  weekStart?: 0 | 1;
  /** Default: the theme's down and up colours either side of zero, over the data's range. */
  colorScale?: ColorScale;
  /** Month and day names, `'vi-VN'`; default: the browser's. */
  locale?: string;
  valueFormat?: (value: number) => string;
  /** How a day reads in the tooltip; default: the locale's long date. */
  dateFormat?: (date: string) => string;
  /** The colour scale's bar under the calendar. Default `true`. */
  legend?: boolean;
  crosshair?: boolean;
  onDayClick?: (day: CalendarDay) => void;
}

/** A cell of a matrix chart. */
export interface MatrixCell {
  row: string;
  column: string;
  value: number;
  rowIndex: number;
  columnIndex: number;
}

export interface MatrixChartOptions extends BaseFinanceChartOptions {
  /** The rows' names, top to bottom. */
  rows: string[];
  /** The columns' names, left to right; default: the rows' (a square matrix). */
  columns?: string[];
  /** `values[row][column]`; a missing or non-finite value leaves its cell empty. */
  values: number[][];
  /**
   * Default: the theme's down and up colours either side of zero, over the
   * values' range. For correlations give `{ min: -1, max: 1 }`.
   */
  colorScale?: ColorScale;
  /** Only half of a square matrix, the diagonal included: a correlation matrix needs no more. */
  triangle?: 'lower' | 'upper';
  /**
   * How wide a column is. `'square'` (default): square cells, the matrix
   * centred in a wider chart. `'fill'`: the columns share the width beside
   * the row names, so a matrix of a few columns (a statement's periods) uses
   * the chart. A number: that many pixels a column, no wider than the room.
   * Rows keep their height either way.
   */
  cellWidth?: 'square' | 'fill' | number;
  /** Print each value in its cell when it fits. Default `true`. */
  showValues?: boolean;
  /** Default: two decimals. */
  valueFormat?: (value: number) => string;
  /** The colour scale's bar under the matrix. Default `true`. */
  legend?: boolean;
  crosshair?: boolean;
  onCellClick?: (cell: MatrixCell) => void;
}

/** A point of a counter-clock chart: the averages of the `period` bars ending at `time`. */
export interface CounterClockPoint {
  time: number;
  /** Average volume. */
  volume: number;
  /** Average close. */
  price: number;
}

export interface CounterClockOptions extends BaseFinanceChartOptions {
  /** The bars, oldest first. */
  data: OHLCBar[];
  /** Bars in each average. Default `25`. */
  period?: number;
  /** The newest points drawn. Default `60`. */
  points?: number;
  /** Axis titles. */
  xLabel?: string;
  yLabel?: string;
  /** The line's colour; default the palette's first. */
  color?: string;
  timeFormat?: (time: number) => string;
  priceFormat?: (value: number) => string;
  volumeFormat?: (value: number) => string;
  crosshair?: boolean;
  onPointClick?: (point: CounterClockPoint) => void;
}
