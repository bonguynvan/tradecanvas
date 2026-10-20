import type { Theme, ThemeName } from './theme.js';
import type { DepthData } from './trading.js';

export interface BaseFinanceChartOptions {
  width?: number;
  height?: number;
  theme?: ThemeName | Theme;
  /** What the chart shows, for screen readers; the newer charts describe themselves without one. */
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
  spreadLabel?: boolean;
  crosshair?: boolean;
  priceFormat?: (price: number) => string;
  volumeFormat?: (vol: number) => string;
}

export interface EquityPoint {
  time: number;
  value: number;
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
}

export interface HeatmapCell {
  id: string;
  label: string;
  value: number;
  weight?: number;
  group?: string;
  meta?: Record<string, unknown>;
}

export interface HeatmapOptions extends BaseFinanceChartOptions {
  data: HeatmapCell[];
  colorScale?: {
    negative: string;
    zero: string;
    positive: string;
    min?: number;
    max?: number;
  };
  weighted?: boolean;
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
