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
  | 'executionError'
  | 'bracketPlace'
  | 'drawingCreate'
  | 'drawingRemove'
  | 'signalMarkerAdd'
  | 'signalMarkerRemove'
  | 'tradeZoneAdd'
  | 'tradeZoneRemove'
  | 'alertAdd'
  | 'alertRemove'
  | 'alertTriggered'
  | 'alertUpdate';

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

/**
 * Payload for `visibleRangeChange`. Fired whenever the horizontal viewport
 * moves — panning, zooming, resizing, `setVisibleRange`, `scrollToEnd`,
 * `fitContent`, or a data update that shifts the range.
 *
 * `from` / `to` are **bar indices** into the current data series (integers,
 * clamped to `[0, data.length - 1]`), not timestamps. Resolve to time with
 * `chart.getData()[from].time`.
 */
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

export interface ExecutionErrorPayload {
  message: string;
  cause?: unknown;
}

export interface BracketPlacePayload {
  side: 'buy' | 'sell';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  quantity?: number;
  /** Reward-to-risk ratio = |TP − entry| / |entry − SL|. */
  riskReward: number;
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

/**
 * Payload for `zoomChange`. Fired when the horizontal zoom level changes
 * (wheel zoom, keyboard zoom, time-axis drag).
 *
 * `barWidth` is the rendered width of a single bar in **CSS pixels** — the
 * value `Viewport.zoom()` mutates. Larger means zoomed in.
 */
export interface ZoomChangePayload {
  barWidth: number;
}

/**
 * Payload for `priceRangeChange`. Fired when the vertical (price) range
 * changes — auto-scale after a pan/zoom/data update, or a manual price-axis
 * drag-scale.
 *
 * `min` / `max` are prices in the data's own units, bounding the visible
 * area of the main pane.
 */
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

export interface SignalMarkerAddPayload {
  id: string;
  source: string;
  direction: string;
}

export interface SignalMarkerRemovePayload {
  id: string;
}

export interface TradeZoneAddPayload {
  id: string;
  direction: string;
}

export interface TradeZoneRemovePayload {
  id: string;
}

export interface AlertPayload {
  id: string;
  price: number;
  condition: string;
  message?: string;
  triggered: boolean;
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
  bracketPlace: BracketPlacePayload;
  orderModify: OrderModifyPayload;
  orderCancel: OrderCancelPayload;
  positionClose: PositionClosePayload;
  positionModify: PositionModifyPayload;
  executionError: ExecutionErrorPayload;
  drawingCreate: DrawingCreatePayload;
  drawingRemove: DrawingRemovePayload;
  signalMarkerAdd: SignalMarkerAddPayload;
  signalMarkerRemove: SignalMarkerRemovePayload;
  tradeZoneAdd: TradeZoneAddPayload;
  tradeZoneRemove: TradeZoneRemovePayload;
  alertAdd: AlertPayload;
  alertRemove: AlertRemovePayload;
  alertTriggered: AlertPayload;
  alertUpdate: AlertPayload;
}

export interface AlertRemovePayload {
  id: string;
}

export interface TauriBridgeOptions {
  enabled: boolean;
  eventPrefix?: string;
}

export type ChartEventHandler<T = unknown> = (event: ChartEvent<T>) => void;
