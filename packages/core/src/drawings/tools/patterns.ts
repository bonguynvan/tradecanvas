import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { legRatio } from './labels.js';
import { drawingFill, drawingLook, readableText, roleFont } from '../drawingLook.js';
import { drawGuideRatio, drawVertexLabels, handleBoxes, type VertexMark } from './patternLabels.js';
import type { LabelBox } from './labels.js';

/** A dashed connector between two pattern points labelled with a leg ratio. */
interface RatioLink {
  from: number;
  to: number;
  num: [number, number];
  den: [number, number];
}

/**
 * Shared renderer for point-to-point chart patterns: a polyline through the
 * pivots, point labels, optional translucent triangles, and dashed ratio
 * links (e.g. XB = |AB| / |XA|) as harmonic-pattern traders read them.
 */
abstract class PatternTool extends DrawingBase {
  protected abstract readonly pointLabels: readonly (string | VertexMark)[];
  protected readonly ratioLinks: RatioLink[] = [];
  /** Triangles (by anchor index) filled with the drawing's fill color. */
  protected readonly triangles: [number, number, number][] = [];

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    const complete = state.anchors.length >= this.descriptor.requiredAnchors;

    if (complete) this.renderTriangles(ctx, state, pts);

    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    this.renderGuides(ctx, state, pts);
    this.renderExtras(ctx, state, pts, viewport);
    // The names first, then the ratios where they leave room: a name says which point is which.
    const names = this.renderPointLabels(ctx, state, pts);
    this.renderRatios(ctx, state, pts, [...handleBoxes(pts, state.style.lineWidth), ...names]);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** Hook for pattern-specific decoration (e.g. a neckline). */
  protected renderExtras(_ctx: CanvasRenderingContext2D, _state: DrawingState, _pts: Point[], _viewport: ViewportState): void {}

  /** The font the point names are set in: the letters' size, in the figures' face. */
  protected pointFont(): { font: string; height: number } {
    return { font: roleFont('letter', { weight: 600 }), height: drawingLook().sizes.letter };
  }

  private renderTriangles(ctx: CanvasRenderingContext2D, state: DrawingState, pts: Point[]): void {
    // fillColor carries its own alpha (as with Rectangle); without one, tint
    // the line color.
    ctx.fillStyle = drawingFill(state.style);
    for (const [i, j, k] of this.triangles) {
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** The ratio links whose points are all drawn so far. */
  private linksIn(pts: Point[]): RatioLink[] {
    return this.ratioLinks.filter((link) => Math.max(link.from, link.to, ...link.num, ...link.den) < pts.length);
  }

  private renderGuides(ctx: CanvasRenderingContext2D, state: DrawingState, pts: Point[]): void {
    ctx.save();
    this.applyGuideStyle(ctx, state.style.color, true);
    for (const link of this.linksIn(pts)) {
      ctx.beginPath();
      ctx.moveTo(pts[link.from].x, pts[link.from].y);
      ctx.lineTo(pts[link.to].x, pts[link.to].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderRatios(ctx: CanvasRenderingContext2D, state: DrawingState, pts: Point[], taken: LabelBox[]): void {
    const placed = [...taken];
    ctx.fillStyle = readableText(state.style.color);
    for (const link of this.linksIn(pts)) {
      const box = drawGuideRatio(ctx, legRatio(state, link.num, link.den), pts[link.from], pts[link.to], placed);
      if (box) placed.push(box);
    }
  }

  private renderPointLabels(ctx: CanvasRenderingContext2D, state: DrawingState, pts: Point[]): LabelBox[] {
    const { font, height } = this.pointFont();
    ctx.font = font;
    const marks = this.pointLabels.map((m) => (typeof m === 'string' ? { text: m } : m));
    return drawVertexLabels(ctx, state, pts, marks, height);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const pts = state.anchors.map((a) => this.anchorToPixel(a, viewport));
    for (let i = 0; i < pts.length - 1; i++) {
      if (this.distanceToLine(point, pts[i], pts[i + 1]) <= tolerance) return true;
    }
    return false;
  }
}

/** Harmonic XABCD pattern (Gartley, Bat, Butterfly, Crab…) with its four Fibonacci ratios. */
export class XABCDPatternTool extends PatternTool {
  descriptor = { type: 'xabcdPattern' as const, name: 'XABCD Pattern', requiredAnchors: 5, fill: true };
  protected readonly pointLabels = ['X', 'A', 'B', 'C', 'D'];
  protected override readonly ratioLinks: RatioLink[] = [
    { from: 0, to: 2, num: [1, 2], den: [0, 1] }, // XB = AB / XA
    { from: 1, to: 3, num: [2, 3], den: [1, 2] }, // AC = BC / AB
    { from: 2, to: 4, num: [3, 4], den: [2, 3] }, // BD = CD / BC
    { from: 0, to: 4, num: [1, 4], den: [0, 1] }, // XD = AD / XA
  ];
  protected override readonly triangles: [number, number, number][] = [[0, 1, 2], [2, 3, 4]];
}

/** ABCD pattern: two equal-ish legs, with the BC retracement and CD projection ratios. */
export class ABCDPatternTool extends PatternTool {
  descriptor = { type: 'abcdPattern' as const, name: 'ABCD Pattern', requiredAnchors: 4, fill: true };
  protected readonly pointLabels = ['A', 'B', 'C', 'D'];
  protected override readonly ratioLinks: RatioLink[] = [
    { from: 0, to: 2, num: [1, 2], den: [0, 1] }, // BC / AB
    { from: 1, to: 3, num: [2, 3], den: [1, 2] }, // CD / BC
  ];
}

/**
 * Head and Shoulders: seven pivots (start, left shoulder, neck, head, neck,
 * right shoulder, end); the neckline runs through the two neck points.
 */
export class HeadAndShouldersTool extends PatternTool {
  descriptor = { type: 'headAndShoulders' as const, name: 'Head and Shoulders', requiredAnchors: 7, fill: true };
  protected readonly pointLabels: readonly VertexMark[] = [
    { text: '' },
    { text: 'Left Shoulder', short: 'LS' },
    { text: '' },
    { text: 'Head', short: 'H', first: true },
    { text: '' },
    { text: 'Right Shoulder', short: 'RS' },
    { text: '' },
  ];

  /** The names are words: set in the prose face, at the labels' size. */
  protected override pointFont(): { font: string; height: number } {
    return { font: roleFont('label', { weight: 600, prose: true }), height: drawingLook().sizes.label };
  }
  protected override readonly triangles: [number, number, number][] = [[0, 1, 2], [2, 3, 4], [4, 5, 6]];

  protected override renderExtras(ctx: CanvasRenderingContext2D, state: DrawingState, pts: Point[]): void {
    if (pts.length < 5) return;
    const n1 = pts[2];
    const n2 = pts[4];
    const first = pts[0];
    const last = pts[pts.length - 1];
    const slope = n2.x !== n1.x ? (n2.y - n1.y) / (n2.x - n1.x) : 0;
    const yAt = (x: number) => n1.y + slope * (x - n1.x);
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = Math.max(1, state.style.lineWidth);
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(first.x, yAt(first.x));
    ctx.lineTo(last.x, yAt(last.x));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/**
 * Three Drives: three pushes in one direction, each a Fibonacci extension of
 * the pullback before it (six points: start, drive 1, pullback A, drive 2,
 * pullback B, drive 3).
 */
export class ThreeDrivesTool extends PatternTool {
  descriptor = { type: 'threeDrives' as const, name: 'Three Drives Pattern', requiredAnchors: 6 };
  protected readonly pointLabels = ['', '1', 'A', '2', 'B', '3'];
  protected override readonly ratioLinks: RatioLink[] = [
    { from: 1, to: 3, num: [2, 3], den: [1, 2] }, // drive 2 / pullback A
    { from: 3, to: 5, num: [4, 5], den: [3, 4] }, // drive 3 / pullback B
  ];
}

/**
 * Cypher: a harmonic pattern (X, A, B, C, D) whose C overshoots A, and whose
 * D retraces X to C.
 */
export class CypherPatternTool extends PatternTool {
  descriptor = { type: 'cypherPattern' as const, name: 'Cypher Pattern', requiredAnchors: 5, fill: true };
  protected readonly pointLabels = ['X', 'A', 'B', 'C', 'D'];
  protected override readonly ratioLinks: RatioLink[] = [
    { from: 0, to: 2, num: [1, 2], den: [0, 1] }, // AB / XA
    { from: 0, to: 3, num: [2, 3], den: [0, 1] }, // BC / XA
    { from: 0, to: 4, num: [3, 4], den: [0, 3] }, // CD / XC
  ];
  protected override readonly triangles: [number, number, number][] = [[0, 1, 2], [2, 3, 4]];
}
