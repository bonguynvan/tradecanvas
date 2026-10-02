import type { OHLCBar, DataSeries } from './ohlc.js';
import type { Point } from './rendering.js';
import type { IndicatorValue } from './indicator.js';
import type { DrawingToolType } from './drawing.js';
import type { SymbolInfo } from './symbol.js';

export type ChartEventType =
  | 'crosshairMove'
  | 'crosshairLeave'
  | 'click'
  | 'barClick'
  | 'visibleRangeChange'
  | 'priceRangeChange'
  | 'zoomChange'
  | 'dataUpdate'
  | 'historyLoad'
  | 'symbolInfoChange'
  | 'indicatorAdd'
  | 'indicatorRemove'
  | 'paneResize'
  | 'indicatorUpdate'
  | 'indicatorChange'
  | 'themeChange'
  | 'resize'
  | 'orderPlace'
  | 'orderModify'
  | 'orderCancel'
  | 'positionClose'
  | 'positionReverse'
  | 'positionModify'
  | 'executionFill'
  | 'ordersChange'
  | 'positionsChange'
  | 'executionError'
  | 'bracketPlace'
  | 'drawingCreate'
  | 'drawingUpdate'
  | 'drawingDoubleClick'
  | 'drawingContextMenu'
  | 'toolModeChange'
  | 'chartContextMenu'
  | 'priceAxisAdd'
  | 'drawingRemove'
  | 'drawingToolChange'
  | 'signalMarkerAdd'
  | 'signalMarkerRemove'
  | 'tradeZoneAdd'
  | 'tradeZoneRemove'
  | 'alertAdd'
  | 'alertRemove'
  | 'alertTriggered'
  | 'alertUpdate'
  /**
   * Something a saved layout holds may have changed: drawings, indicators,
   * alerts, the chart type or the theme. Fires often; debounce it.
   */
  | 'stateChange';

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

/** Where a right-click landed: the price pane, another pane, or an axis. */
export type ChartContextArea = 'plot' | 'pane' | 'priceAxis' | 'timeAxis';

/**
 * Payload for `chartContextMenu`: a right-click off any drawing, where it was
 * (`x`, `y` in the chart's pixels), and the price and bar time there when the
 * area has them (the price pane: both; the price axis: price; the time axis: time).
 */
export interface ChartContextMenuPayload {
  area: ChartContextArea;
  x: number;
  y: number;
  price?: number;
  time?: number;
}

/** Payload for `priceAxisAdd`: the "+" by the price axis was clicked at `price`. */
export interface PriceAxisAddPayload {
  price: number;
  x: number;
  y: number;
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

/**
 * Payload for `historyLoad`: paging older bars in. `loading` when a request
 * starts, then `loaded` (`count` bars added), `end` (no older bars) or
 * `error`.
 */
export interface HistoryLoadPayload {
  state: 'loading' | 'loaded' | 'end' | 'error';
  count: number;
  error?: string;
}

/** What changed on an indicator (`indicatorChange`). */
export interface IndicatorSettingsChangePayload {
  instanceId: string;
  change: 'visible' | 'style' | 'levels' | 'params' | 'pane' | 'scale';
}

export interface ChartEventMap {
  crosshairMove: CrosshairMovePayload;
  /** The pointer left the plot; the crosshair is gone. */
  crosshairLeave: Record<string, never>;
  click: { x: number; y: number };
  barClick: BarClickPayload;
  visibleRangeChange: VisibleRangeChangePayload;
  priceRangeChange: PriceRangeChangePayload;
  zoomChange: ZoomChangePayload;
  dataUpdate: DataSeries;
  /** Older bars are being paged in, or finished loading. */
  historyLoad: HistoryLoadPayload;
  /** What is known about the symbol on the chart changed (`setSymbolInfo`, or the stream's adapter). */
  symbolInfoChange: { info: SymbolInfo | null };
  indicatorAdd: IndicatorChangePayload;
  indicatorRemove: IndicatorChangePayload;
  /** An indicator pane was resized (by dragging its divider or `setPanelSize`). */
  paneResize: { instanceId: string; size: number };
  /** Indicator values were recomputed from bar index `from` on: new bars, a live tick, a replay step. */
  indicatorUpdate: { from: number };
  /** One indicator's settings changed: shown or hidden, restyled, new levels or inputs, moved to another pane. */
  indicatorChange: IndicatorSettingsChangePayload;
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
  /** The active drawing tool changed — picked, finished, or cancelled (`tool: null`). */
  drawingToolChange: { tool: DrawingToolType | null };
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
