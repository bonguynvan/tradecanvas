import type { OHLCBar } from './ohlc.js';
import type { Point } from './rendering.js';
import type { IndicatorValue } from './indicator.js';

export type ChartEventType =
  | 'crosshairMove'
  | 'click'
  | 'barClick'
  | 'visibleRangeChange'
  | 'priceRangeChange'
  | 'zoomChange'
  | 'dataUpdate'
  | 'indicatorAdd'
  | 'indicatorRemove'
  | 'themeChange'
  | 'resize'
  | 'orderPlace'
  | 'orderModify'
  | 'orderCancel'
  | 'positionClose'
  | 'positionModify'
  | 'drawingCreate'
  | 'drawingRemove';

export interface ChartEvent<T = unknown> {
  type: ChartEventType;
  timestamp: number;
  payload: T;
}

export interface CrosshairMovePayload {
  point: Point;
  bar?: OHLCBar;
  barIndex?: number;
  indicatorValues?: Record<string, IndicatorValue>;
}

export interface VisibleRangeChangePayload {
  from: number;
  to: number;
}

export interface BarClickPayload {
  bar: OHLCBar;
  barIndex: number;
  point: Point;
}

export interface TauriBridgeOptions {
  enabled: boolean;
  eventPrefix?: string;
}

export type ChartEventHandler<T = unknown> = (event: ChartEvent<T>) => void;
