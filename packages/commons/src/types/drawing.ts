import type { Point, ViewportState } from './rendering.js';

export type DrawingToolType =
  | 'trendLine' | 'horizontalLine' | 'horizontalRay' | 'verticalLine' | 'ray' | 'extendedLine'
  | 'crossLine' | 'trendAngle' | 'infoLine'
  | 'parallelChannel' | 'regressionChannel'
  | 'fibRetracement' | 'fibExtension' | 'fibTimeZones' | 'fibChannel' | 'fibSpeedResistanceFan'
  | 'rectangle' | 'ellipse' | 'triangle' | 'circle'
  | 'pitchfork' | 'schiffPitchfork' | 'modifiedSchiffPitchfork' | 'elliottWave'
  | 'xabcdPattern' | 'abcdPattern' | 'headAndShoulders'
  | 'priceRange' | 'dateRange' | 'dateAndPriceRange' | 'measure'
  | 'text' | 'arrow' | 'priceLabel'
  | 'gannFan' | 'gannBox' | 'cyclicLines'
  | 'anchoredVWAP'
  | 'volumeProfileRange'
  | 'riskReward';

export interface AnchorPoint {
  time: number;
  price: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  fillOpacity?: number;
  fontSize?: number;
  text?: string;
}

export interface DrawingState {
  id: string;
  type: DrawingToolType;
  anchors: AnchorPoint[];
  style: DrawingStyle;
  visible: boolean;
  locked: boolean;
  meta?: Record<string, unknown>;
}

export interface DrawingDescriptor {
  type: DrawingToolType;
  name: string;
  requiredAnchors: number;
  singleClick?: boolean;
}

export interface DrawingPlugin {
  descriptor: DrawingDescriptor;
  render(
    ctx: CanvasRenderingContext2D,
    state: DrawingState,
    viewport: ViewportState,
    selected: boolean,
  ): void;
  hitTest(
    point: Point,
    state: DrawingState,
    viewport: ViewportState,
    tolerance: number,
  ): boolean;
  hitTestAnchor(
    point: Point,
    state: DrawingState,
    viewport: ViewportState,
    tolerance: number,
  ): number;
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#4c8dff',
  lineWidth: 1,
  lineStyle: 'solid',
  fillColor: 'rgba(76, 141, 255, 0.1)',
  fillOpacity: 0.1,
  fontSize: 12,
};
