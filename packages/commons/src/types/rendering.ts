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
}

export enum LayerType {
  Background = 0,
  Main = 1,
  Panel = 2,
  Overlay = 3,
  UI = 4,
}
