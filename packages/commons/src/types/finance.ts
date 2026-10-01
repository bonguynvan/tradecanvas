import type { Theme, ThemeName } from './theme.js';
import type { DepthData } from './trading.js';

export interface BaseFinanceChartOptions {
  width?: number;
  height?: number;
  theme?: ThemeName | Theme;
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
