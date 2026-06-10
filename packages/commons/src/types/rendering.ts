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

export type PriceScaleMode = 'regular' | 'logarithmic' | 'percentage' | 'indexedTo100';

export interface ViewportState {
  visibleRange: { from: number; to: number };
  priceRange: { min: number; max: number };
  barWidth: number;
  barSpacing: number;
  offset: number;
  chartRect: Rect;
  /**
   * Logarithmic price geometry. Kept for back-compat; mirrors
   * `scaleMode === 'logarithmic'`. Prefer reading `scaleMode`.
   */
  logScale?: boolean;
  /**
   * Price-scale presentation. `regular`, `percentage`, and `indexedTo100` share
   * the same linear geometry — only the axis labels differ (rebased to
   * `scaleBaseline`). `logarithmic` changes the geometry. Defaults to
   * `regular` when unset.
   */
  scaleMode?: PriceScaleMode;
  /**
   * Reference price for `percentage` / `indexedTo100` axis labels — usually the
   * close of the first visible bar. Set by the chart each frame.
   */
  scaleBaseline?: number;
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
