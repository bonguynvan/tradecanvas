import type { Point, ViewportState } from './rendering.js';
import type { OHLCBar } from './ohlc.js';

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
  | 'riskReward'
  | 'note' | 'callout' | 'flag' | 'arrowMark' | 'icon'
  | 'brush' | 'highlighter' | 'path' | 'polyline' | 'curve' | 'arc'
  | 'fibCircles' | 'fibSpiral' | 'fibArcs' | 'fibWedge' | 'pitchfan' | 'gannSquare'
  | 'elliottImpulse' | 'elliottCorrection' | 'elliottTriangle' | 'elliottDoubleCombo' | 'elliottTripleCombo'
  | 'threeDrives' | 'cypherPattern'
  | 'timeCycles' | 'sineLine'
  | 'forecast' | 'projection' | 'barsPattern';

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
  /** The tool's own settings (levels, extend left/right…); see `DrawingDescriptor.options`. */
  options?: DrawingOptions;
  /** The group it belongs to: drawings selected, hidden and locked together. */
  group?: { id: string; name: string };
  meta?: Record<string, unknown>;
}

/** One level of a Fibonacci or Gann tool: a ratio, shown or not, in its own colour. */
export interface DrawingLevel {
  value: number;
  visible: boolean;
  /** CSS colour; the drawing's colour when left out. */
  color?: string;
}

export type DrawingOptionValue = boolean | number | string | DrawingLevel[];

/** A drawing's settings beyond the shared style, by key. Missing keys take the tool's defaults. */
export type DrawingOptions = Record<string, DrawingOptionValue>;

/** A setting a drawing tool offers beyond the shared style, with its default. */
export type DrawingOptionDef =
  | { kind: 'boolean'; label: string; default: boolean }
  | { kind: 'number'; label: string; default: number; min?: number; max?: number; step?: number }
  | { kind: 'choice'; label: string; default: string; choices: readonly { value: string; label: string }[] }
  | { kind: 'levels'; label: string; default: readonly DrawingLevel[] }
  | { kind: 'text'; label: string; default: string };

export type DrawingOptionDefs = Readonly<Record<string, DrawingOptionDef>>;

export interface DrawingDescriptor {
  type: DrawingToolType;
  name: string;
  requiredAnchors: number;
  singleClick?: boolean;
  /** Settings the tool offers beyond the shared style; a settings dialog is built from them. */
  options?: DrawingOptionDefs;
  /** It fills an area with `style.fillColor` (a settings dialog offers the fill). */
  fill?: boolean;
  /** It draws `style.text` (a settings dialog offers the text and its size). */
  text?: boolean;
  /**
   * How it is drawn with the pointer. 'clicks' (the default): a click per
   * anchor up to `requiredAnchors`. 'freehand': press and drag, a point every
   * few pixels, release to finish. 'path': a click per point, at least
   * `requiredAnchors` and at most `maxAnchors`; a double-click, Enter or a
   * click on the last point finishes it.
   */
  creation?: 'clicks' | 'freehand' | 'path';
  /** Most points a 'path' takes (100 when left out). */
  maxAnchors?: number;
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
  /**
   * The drawing after handle `index` (from `hitTestAnchor`) is dragged to
   * `anchor`. Without it, the handle is anchor `index` and moves there. A
   * tool with handles that are not anchors (a position's target, say)
   * changes its options instead.
   */
  moveHandle?(state: DrawingState, index: number, anchor: AnchorPoint): DrawingState;
  /**
   * The prices of the drawing's lines at `time` (what an alert on it
   * crosses), or null where it doesn't reach. Tools without it take no alerts.
   * With `viewport` the lines follow the chart as drawn: straight across bars
   * (not clock time, so a weekend gap doesn't bend them) and on a log scale
   * straight in log price.
   */
  priceAt?(state: DrawingState, time: number, viewport?: ViewportState): number[] | null;
  /**
   * For a tool drawn from the chart's bars (an anchored VWAP, a volume
   * profile): the chart hands it a getter for them when it is registered.
   */
  setDataGetter?(getter: () => readonly OHLCBar[]): void;
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#4c8dff',
  lineWidth: 1,
  lineStyle: 'solid',
  fillColor: 'rgba(76, 141, 255, 0.1)',
  fillOpacity: 0.1,
  fontSize: 12,
};
