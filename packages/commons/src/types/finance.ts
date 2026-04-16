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
