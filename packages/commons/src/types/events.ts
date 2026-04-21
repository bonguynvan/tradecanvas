import type { OHLCBar, DataSeries } from './ohlc.js';
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

export interface OrderModifyPayload {
  orderId: string;
  newPrice: number;
}

export interface OrderCancelPayload {
  orderId: string;
}

export interface PositionModifyPayload {
  positionId: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PositionClosePayload {
  positionId: string;
}

export interface OrderPlacePayload {
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stopLimit';
  price: number;
  stopPrice?: number;
  quantity?: number;
}

export interface IndicatorChangePayload {
  instanceId: string;
  id: string;
}

export interface ThemeChangePayload {
  theme: string;
}

export interface ResizePayload {
  width: number;
  height: number;
}

export interface ZoomChangePayload {
  barWidth: number;
}

export interface PriceRangeChangePayload {
  min: number;
  max: number;
}

export interface DrawingCreatePayload {
  id: string;
  type: string;
}

export interface DrawingRemovePayload {
  id: string;
}

export interface ChartEventMap {
  crosshairMove: CrosshairMovePayload;
  click: { x: number; y: number };
  barClick: BarClickPayload;
  visibleRangeChange: VisibleRangeChangePayload;
  priceRangeChange: PriceRangeChangePayload;
  zoomChange: ZoomChangePayload;
  dataUpdate: DataSeries;
  indicatorAdd: IndicatorChangePayload;
  indicatorRemove: IndicatorChangePayload;
  themeChange: ThemeChangePayload;
  resize: ResizePayload;
  orderPlace: OrderPlacePayload;
  orderModify: OrderModifyPayload;
  orderCancel: OrderCancelPayload;
  positionClose: PositionClosePayload;
  positionModify: PositionModifyPayload;
  drawingCreate: DrawingCreatePayload;
  drawingRemove: DrawingRemovePayload;
}

export interface TauriBridgeOptions {
  enabled: boolean;
  eventPrefix?: string;
}

export type ChartEventHandler<T = unknown> = (event: ChartEvent<T>) => void;
