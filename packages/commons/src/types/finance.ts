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

/**
 * One leg of an options position: an option bought or sold, or the underlying
 * held beside them. An option without its `strike`, or the underlying without
 * its `entry`, counts for nothing.
 */
export interface OptionLeg {
  /** A call, a put, or the underlying itself. */
  type: 'call' | 'put' | 'underlying';
  /** Bought (`'long'`) or sold (`'short'`). */
  side: 'long' | 'short';
  /** An option's strike. */
  strike?: number;
  /** What one unit of the option cost, or brought in when sold. Default `0`. */
  premium?: number;
  /** The price the underlying was bought or sold at, for an `'underlying'` leg. */
  entry?: number;
  /** How many. Default `1`; `0` counts for nothing. */
  quantity?: number;
}

export interface PayoffOptions extends BaseFinanceChartOptions {
  /** The position's legs: what they make or lose together at expiry is the line. */
  legs: OptionLeg[];
  /** The units one contract is for (100 for a US stock option). Default `1`. */
  multiplier?: number;
  /** The underlying's price now: a marked line. */
  spot?: number;
  /** A word before the price now on its mark (`'Spot'`). */
  spotLabel?: string;
  /** The underlying's prices drawn. Default: from under the lowest strike to over the highest. */
  range?: { min: number; max: number };
  /** How a profit or a loss is written. */
  valueFormat?: (value: number) => string;
  /** How the underlying's price is written. */
  priceFormat?: (value: number) => string;
  /** The line and the area above zero. Default: the theme's up colour. */
  profitColor?: string;
  /** The line and the area below zero. Default: the theme's down colour. */
  lossColor?: string;
  /** Show the profit or loss at the price under the pointer. Default `true`. */
  crosshair?: boolean;
}

export interface CurvePoint {
  x: number;
  y: number;
}

/** One line of a curve chart: an expiry's smile, a day's yield curve. */
export interface CurveSeries {
  name: string;
  /** The line's points, in any order: drawn by rising `x`. */
  points: CurvePoint[];
  color?: string;
  /** Drawn dashed: yesterday's curve beside today's. */
  dashed?: boolean;
}

/** A labelled line at an x: the strike at the money. */
export interface CurveMarker {
  x: number;
  label?: string;
  color?: string;
}

export interface CurveChartOptions extends BaseFinanceChartOptions {
  /** The curves: values against a strike, a tenor, a maturity. */
  series: CurveSeries[];
  /** Labels along x in place of the scale's own: a tenor each (`{ x: 30, label: '1M' }`). */
  ticks?: { x: number; label: string }[];
  /** How an x is written, without `ticks`. */
  xFormat?: (value: number) => string;
  valueFormat?: (value: number) => string;
  /** Round the lines through their points, never past a value they do not reach. Default `true`. */
  smooth?: boolean;
  /** A dot at each point. Default `true`. */
  showPoints?: boolean;
  /** Labelled lines at x values. */
  markers?: CurveMarker[];
  /** The curves' names over the plot. Default `true` with more than one. */
  legend?: boolean;
  /** Show each curve's value at the x under the pointer. Default `true`. */
  crosshair?: boolean;
}

/** A box plot's five numbers and what lies outside them. */
export interface BoxPlotStats {
  /** The lower whisker's end: the lowest value that is no outlier. */
  min: number;
  /** The first quartile: a quarter of the values are under it. */
  q1: number;
  median: number;
  /** The third quartile: a quarter of the values are over it. */
  q3: number;
  /** The upper whisker's end: the highest value that is no outlier. */
  max: number;
  /** The values past the whiskers, in order. */
  outliers: number[];
}

/** One box: a group's raw `values`, or its numbers worked out already in `stats`. */
export interface BoxPlotGroup {
  label: string;
  values?: number[];
  /** Used in place of `values` when both are given. */
  stats?: BoxPlotStats;
  color?: string;
}

/** The words a box plot's readout names its numbers with. */
export interface BoxPlotLabels {
  max: string;
  q3: string;
  median: string;
  q1: string;
  min: string;
}

export interface BoxPlotOptions extends BaseFinanceChartOptions {
  /** A box for each group: returns by weekday, by month, by strategy. */
  data: BoxPlotGroup[];
  /**
   * How far a whisker may reach past the box, in box heights (the
   * interquartile range): values further out are outliers. Default `1.5`;
   * `Infinity` takes the whiskers to the lowest and the highest value.
   */
  whiskers?: number;
  /** A box whose median is under zero in the theme's down colour, the rest in its up colour. */
  colorBySign?: boolean;
  valueFormat?: (value: number) => string;
  /** The readout's words, for another language. Default: `Max`, `Q3`, `Median`, `Q1`, `Min`. */
  labels?: Partial<BoxPlotLabels>;
  /** Show the hovered box's numbers. Default `true`. */
  crosshair?: boolean;
}

/** One spoke of a radar chart. */
export interface RadarAxis {
  label: string;
  /** The value at the centre. Default `0`, or the lowest value on the spoke when that is under zero. */
  min?: number;
  /** The value at the rim. Default: the highest value any series has on this spoke. */
  max?: number;
}

export interface RadarChartOptions extends BaseFinanceChartOptions {
  /** The spokes, clockwise from twelve o'clock: at least three. */
  axes: RadarAxis[];
  /** A shape for each series: `values[i]` is its value on `axes[i]`. */
  series: ChartSeries[];
  /** The rings of the grid between the centre and the rim. Default `4`. */
  rings?: number;
  /** Tint each shape with its colour. Default `true`. */
  fill?: boolean;
  /** The series' names. Default `true` with more than one. */
  legend?: boolean;
  valueFormat?: (value: number) => string;
  /** Show every series' value on the spoke nearest the pointer. Default `true`. */
  crosshair?: boolean;
}

/** A part of a whole that may have parts of its own. */
export interface SunburstNode {
  label: string;
  /** Its size, when it has no children; with children it is as large as they are together. */
  value?: number;
  /** Default: the palette's in turn for the first ring, the parent's for the rings outside it. */
  color?: string;
  children?: SunburstNode[];
  meta?: Record<string, unknown>;
}

export interface SunburstOptions extends BaseFinanceChartOptions {
  /** The first ring's parts, clockwise from twelve o'clock; their children are the rings outside. */
  data: SunburstNode[];
  /** How many rings are drawn. Default: as many as the data is deep, four at most. */
  maxDepth?: number;
  /** The hole as a share of the radius. Default `0.3`. */
  innerRadius?: number;
  /** Text in the hole: a caption and a figure (`'Total'`, `'1.2B'`). */
  centerLabel?: string;
  centerValue?: string;
  /** Print a part's name on it when it fits. Default `true`. */
  showLabels?: boolean;
  valueFormat?: (value: number) => string;
  /** Show the hovered part's path, value and share. Default `true`. */
  crosshair?: boolean;
  /** `path` is the labels from the first ring down to the part. */
  onNodeClick?: (node: SunburstNode, path: string[]) => void;
}

export interface StackedAreaOptions extends BaseFinanceChartOptions {
  /** A label for each point along x: dates, periods. */
  categories: string[];
  /** The areas, the first at the bottom: `values[i]` belongs to `categories[i]`. A value under zero counts as none. */
  series: ChartSeries[];
  /** Each point's values as shares of their total, so the areas fill the height: how a mix changes. */
  normalized?: boolean;
  /** The series' names. Default `true` with more than one. */
  legend?: boolean;
  valueFormat?: (value: number) => string;
  /** Show every series' value at the point under the pointer. Default `true`. */
  crosshair?: boolean;
}

/**
 * Where a 3D chart is seen from, in degrees. `yaw` turns it about its
 * upright axis: at 0 the x axis runs across and the y axis straight back; a
 * positive yaw swings the far end of the x axis towards the eye, a negative
 * one away from it. `pitch` is how far above the floor the eye is: 0 level
 * with it, 90 straight down on it. A pitch outside 0 to 90 is held to them.
 */
export interface View3D {
  /** Default `-35`: the corner where both axes start is nearest. */
  yaw?: number;
  /** Default `28`. */
  pitch?: number;
}

/**
 * Colours from the lowest value to the highest, for a surface. Hex and
 * rgb() colours blend; others (names, hsl()) change in steps.
 */
export interface ColorRamp {
  /**
   * Two or more colours, the lowest value's first. Default: one hue, from
   * near the chart's ground up to its strongest, so low values stand back in
   * the dark theme and in the light one.
   */
  colors?: string[];
  /** Where the first colour is reached; values under it keep it. Default: the lowest value. */
  min?: number;
  /** Where the last colour is reached; values over it keep it. Default: the highest value. Given under `min`, the two are taken in order. */
  max?: number;
}

/** A point of a surface chart: what the pointer is on. */
export interface SurfacePoint {
  /** The point's place along x and along y, as the options gave them. */
  x: number | string;
  y: number | string;
  value: number;
  /** Its indexes in the options' `x` and `y`. */
  xIndex: number;
  yIndex: number;
}

/** What every 3D chart's options hold. */
export interface Chart3DOptions extends BaseFinanceChartOptions {
  /** Where the chart is seen from at first, and what a double click goes back to. */
  view?: View3D;
  /**
   * Turn the chart by dragging it: a mouse turns and tilts it, a finger
   * turns it only, so that a page still scrolls under it. Default `true`.
   */
  rotate?: boolean;
  /** Called as the chart is turned, with where it is seen from now. */
  onViewChange?: (view: Required<View3D>) => void;
  /** The axes' titles: across, back and up. */
  xLabel?: string;
  yLabel?: string;
  valueLabel?: string;
  valueFormat?: (value: number) => string;
  /** Show what is under the pointer. Default `true`. */
  crosshair?: boolean;
}

export interface SurfaceChartOptions extends Chart3DOptions {
  /**
   * The points along x: strikes, prices. Numbers are placed by their value
   * (and drawn by rising value, whatever their order); names are spaced
   * evenly, in the order given. A number that is none (`NaN`, `Infinity`)
   * is left out with its values. With fewer than two points along x, or none
   * along y, nothing is drawn. Past 120 points along an axis they are thinned
   * to that many, the first and the last kept, and to 60 for as long as the
   * chart is being turned.
   */
  x: number[] | string[];
  /** The points along y, the axis that runs back: days to expiry, times. Numbers or names, as `x`. */
  y: number[] | string[];
  /** `values[yIndex][xIndex]`; a missing or non-finite value leaves a hole. */
  values: number[][];
  /**
   * `'surface'` (default): a shaded sheet through the values. `'wireframe'`:
   * its lines only. `'slices'`: each y as a filled line of its own, one
   * behind another: an order book's depth over time.
   */
  style?: 'surface' | 'wireframe' | 'slices';
  /** The colours values are drawn in. Default: one hue over the values' range. */
  colorRamp?: ColorRamp;
  /** The lines between a surface's cells. Default `true`; left out anyway where the cells are too small for them. */
  mesh?: boolean;
  /** How an x and a y are written, when they are numbers. */
  xFormat?: (value: number) => string;
  yFormat?: (value: number) => string;
  /** The colours' bar under the chart. Default `true`. */
  legend?: boolean;
  onPointClick?: (point: SurfacePoint) => void;
}

export interface Bar3DChartOptions extends Chart3DOptions {
  /** A label for each column along x. No more than the first 120 are drawn. */
  categories: string[];
  /**
   * A row of columns for each series, the first where the y axis starts (the
   * front, as the chart is first seen): `values[i]` belongs to
   * `categories[i]`. No more than the first 120 are drawn.
   */
  series: ChartSeries[];
  /** The series' names. Default `true` with more than one. */
  legend?: boolean;
  onBarClick?: (hit: BarHit) => void;
}

/** An order book at a time, for `depthSurface`. */
export interface DepthSnapshot extends DepthData {
  /** When the book was read, ms. */
  time: number;
}

/** What `depthSurface` makes of a run of order books: a surface chart's `x`, `y` and `values`. */
export interface DepthSurface {
  /** Prices, evenly spaced. */
  x: number[];
  /** The books' times. */
  y: number[];
  /** `values[time][price]`: the volume waiting from the best price out to that price. */
  values: number[][];
}

/**
 * The options of each finance chart, by the name `renderFinanceChart` knows
 * it by: the chart's class name without `Chart`, its first letter small.
 */
export interface FinanceChartOptionsMap {
  bar: BarChartOptions;
  donut: DonutChartOptions;
  scatter: ScatterChartOptions;
  histogram: HistogramOptions;
  calendar: CalendarChartOptions;
  matrix: MatrixChartOptions;
  heatmap: HeatmapOptions;
  counterClock: CounterClockOptions;
  depth: DepthChartOptions;
  equityCurve: EquityCurveOptions;
  waterfall: WaterfallOptions;
  gauge: GaugeOptions;
  sparkline: SparklineOptions;
  payoff: PayoffOptions;
  curve: CurveChartOptions;
  boxPlot: BoxPlotOptions;
  radar: RadarChartOptions;
  sunburst: SunburstOptions;
  stackedArea: StackedAreaOptions;
  surface: SurfaceChartOptions;
  bar3d: Bar3DChartOptions;
}

/** A finance chart's name, as `renderFinanceChart` takes it. */
export type FinanceChartKind = keyof FinanceChartOptionsMap;

