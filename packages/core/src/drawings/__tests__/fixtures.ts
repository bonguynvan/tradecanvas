import type {
  AnchorPoint,
  DrawingState,
  DrawingStyle,
  DrawingToolType,
  ViewportState,
} from '@tradecanvas/commons';

/**
 * A "unit" viewport: barWidth=10, barSpacing=0, no offset, chart starts at (0,0).
 * → barIndex N maps to pixel x = N*10 + 5 (centered on bar).
 * → priceRange [0, 100] over height 100 means priceToY(p) = 100 - p, so p=50 → y=50.
 */
export const unitViewport: ViewportState = {
  visibleRange: { from: 0, to: 100 },
  priceRange: { min: 0, max: 100 },
  barWidth: 10,
  barSpacing: 0,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 1000, height: 100 },
};

export const defaultStyle: DrawingStyle = {
  color: '#2196F3',
  lineWidth: 1,
  lineStyle: 'solid',
};

export function drawing(
  type: DrawingToolType,
  anchors: AnchorPoint[],
  overrides: Partial<DrawingState> = {},
): DrawingState {
  return {
    id: overrides.id ?? `${type}-test`,
    type,
    anchors,
    style: { ...defaultStyle, ...overrides.style },
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    meta: overrides.meta,
  };
}
