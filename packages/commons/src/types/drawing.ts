import type { Point, ViewportState } from './rendering.js';

export type DrawingToolType =
  | 'trendLine' | 'horizontalLine' | 'verticalLine' | 'ray' | 'extendedLine'
  | 'parallelChannel' | 'regressionChannel'
  | 'fibRetracement' | 'fibExtension'
  | 'rectangle' | 'ellipse' | 'triangle'
  | 'pitchfork' | 'elliottWave'
  | 'priceRange' | 'dateRange' | 'measure'
  | 'text' | 'arrow'
  | 'gannFan' | 'gannBox'
  | 'anchoredVWAP'
  | 'volumeProfileRange';

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
  color: '#2196F3',
  lineWidth: 1,
  lineStyle: 'solid',
  fillColor: 'rgba(33, 150, 243, 0.1)',
  fillOpacity: 0.1,
  fontSize: 12,
};
