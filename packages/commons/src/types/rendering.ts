export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  visibleRange: { from: number; to: number };
  priceRange: { min: number; max: number };
  barWidth: number;
  barSpacing: number;
  offset: number;
  chartRect: Rect;
  logScale?: boolean;
  /**
   * Optional reference to the current bar series. When set, drawings/indicators
   * treat `anchor.time` as a real timestamp and convert to bar index via
   * `timestampToBarIndex(time, data)` at render/hit-test time. This lets
   * anchors survive timeframe / symbol switches like TradingView. When unset,
   * `anchor.time` is treated as a raw bar index (legacy behavior).
   */
  data?: ReadonlyArray<{ time: number }>;
}

export enum LayerType {
  Background = 0,
  Main = 1,
  Panel = 2,
  Overlay = 3,
  UI = 4,
}
