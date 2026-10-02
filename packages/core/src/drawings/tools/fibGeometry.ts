import type { DrawingLevel, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, distanceToSegment, nearPolyline } from '../DrawingBase.js';
import { levelList } from './options.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const ARC_STEPS = 64;
const LABEL_FONT = '11px sans-serif';
/** How close two level labels may be before the second is left out (px). */
const LABEL_GAP_X = 34;
const LABEL_GAP_Y = 12;

function levelOptions(shown: readonly number[], hidden: readonly number[] = []) {
  return {
    levels: { kind: 'levels' as const, label: 'Levels', default: levelList(shown, hidden) },
    showLevels: { kind: 'boolean' as const, label: 'Show levels', default: true },
  };
}

const FIB_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1];

function levelText(value: number): string {
  return String(Number(value.toFixed(3)));
}

/** Points on the ellipse around `c` (radii `rx`, `ry`) from angle `a0` over `sweep`. */
function ellipsePoints(c: Point, rx: number, ry: number, a0: number, sweep: number, steps = ARC_STEPS): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (sweep * i) / steps;
    pts.push({ x: c.x + rx * Math.cos(a), y: c.y + ry * Math.sin(a) });
  }
  return pts;
}

function strokePoints(ctx: CanvasRenderingContext2D, pts: readonly Point[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

/**
 * Tools drawn as one shape per level (circles, arcs, rays): each level in
 * its colour, labelled with its ratio when asked.
 */
abstract class LevelShapesTool extends DrawingBase {
  /** One shape per visible level, as points, with where its label goes. */
  protected abstract shapes(
    pts: Point[],
    levels: DrawingLevel[],
    viewport: ViewportState,
    state: DrawingState,
  ): { level: DrawingLevel; points: Point[]; label: Point }[];

  /** Lines drawn besides the levels (the trend line the levels measure). */
  protected guides(pts: Point[]): [Point, Point][] {
    return pts.length >= 2 ? [[pts[0], pts[1]]] : [];
  }

  protected pixels(state: DrawingState, viewport: ViewportState): Point[] {
    return state.anchors.map((a) => this.anchorToPixel(a, viewport));
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const pts = this.pixels(state, viewport);
    this.applyLineStyle(ctx, state.style);
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([4, 4]);
    for (const [a, b] of this.guides(pts)) strokePoints(ctx, [a, b]);
    ctx.globalAlpha = 1;
    this.applyLineStyle(ctx, state.style);
    const showLevels = this.option<boolean>(state, 'showLevels');
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const shapes = this.shapes(pts, this.visibleLevels(state), viewport, state);
    for (const shape of shapes) {
      ctx.strokeStyle = shape.level.color ?? state.style.color;
      strokePoints(ctx, shape.points);
    }
    if (showLevels) this.renderLabels(ctx, state, shapes);
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /**
   * The levels' ratios. Labels of levels close together (small circles) would
   * pile up: going from the outermost in, one that would cover a label
   * already drawn is left out.
   */
  private renderLabels(ctx: CanvasRenderingContext2D, state: DrawingState, shapes: readonly { level: DrawingLevel; label: Point }[]): void {
    const placed: Point[] = [];
    for (const { level, label } of [...shapes].reverse()) {
      if (placed.some((p) => Math.abs(p.x - label.x) < LABEL_GAP_X && Math.abs(p.y - label.y) < LABEL_GAP_Y)) continue;
      placed.push(label);
      ctx.fillStyle = level.color ?? state.style.color;
      ctx.fillText(levelText(level.value), label.x + 3, label.y - 2);
    }
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const pts = this.pixels(state, viewport);
    if (this.guides(pts).some(([a, b]) => distanceToSegment(point, a, b) <= tolerance)) return true;
    return this.shapes(pts, this.visibleLevels(state), viewport, state).some((shape) => nearPolyline(point, shape.points, tolerance));
  }
}

/** Circles around a centre at Fibonacci multiples of a radius: click the centre, then the 1.0 circle. */
export class FibCirclesTool extends LevelShapesTool {
  descriptor = {
    type: 'fibCircles' as const,
    name: 'Fib Circles',
    requiredAnchors: 2,
    options: levelOptions([...FIB_RATIOS, 1.618, 2.618], [3.618, 4.236]),
  };

  protected shapes(pts: Point[], levels: DrawingLevel[]) {
    const [c, edge] = pts;
    const radius = Math.hypot(edge.x - c.x, edge.y - c.y);
    return levels.map((level) => {
      const r = radius * level.value;
      return { level, points: ellipsePoints(c, r, r, 0, Math.PI * 2), label: { x: c.x + r, y: c.y } };
    });
  }
}

/**
 * Arcs around the start of a move at Fibonacci shares of its length, opening
 * towards where it went: click the start, then the end.
 */
export class FibArcsTool extends LevelShapesTool {
  descriptor = {
    type: 'fibArcs' as const,
    name: 'Fib Speed Resistance Arcs',
    requiredAnchors: 2,
    options: {
      ...levelOptions(FIB_RATIOS),
      fullCircles: { kind: 'boolean' as const, label: 'Full circles', default: false },
    },
  };

  protected shapes(pts: Point[], levels: DrawingLevel[], _viewport: ViewportState, state: DrawingState) {
    const [a, b] = pts;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const toward = Math.atan2(b.y - a.y, b.x - a.x);
    const full = this.option<boolean>(state, 'fullCircles');
    return levels.map((level) => {
      const r = length * level.value;
      const points = full
        ? ellipsePoints(a, r, r, 0, Math.PI * 2)
        : ellipsePoints(a, r, r, toward - Math.PI / 2, Math.PI);
      return { level, points, label: { x: a.x + r * Math.cos(toward), y: a.y + r * Math.sin(toward) } };
    });
  }
}

/** Arcs at Fibonacci shares of a move, between two lines from its start: click the apex, then the two ends. */
export class FibWedgeTool extends LevelShapesTool {
  descriptor = { type: 'fibWedge' as const, name: 'Fib Wedge', requiredAnchors: 3, options: levelOptions(FIB_RATIOS) };

  protected override guides(pts: Point[]): [Point, Point][] {
    return pts.slice(1).map((p) => [pts[0], p] as [Point, Point]);
  }

  protected shapes(pts: Point[], levels: DrawingLevel[]) {
    if (pts.length < 3) return [];
    const [apex, b, c] = pts;
    const length = Math.hypot(b.x - apex.x, b.y - apex.y);
    const from = Math.atan2(b.y - apex.y, b.x - apex.x);
    let sweep = Math.atan2(c.y - apex.y, c.x - apex.x) - from;
    // The short way round, between the two lines.
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (sweep < -Math.PI) sweep += 2 * Math.PI;
    return levels.map((level) => {
      const r = length * level.value;
      return { level, points: ellipsePoints(apex, r, r, from, sweep, 32), label: { x: apex.x + r * Math.cos(from), y: apex.y + r * Math.sin(from) } };
    });
  }
}

/**
 * Rays from a pivot through points between two others, at Fibonacci shares
 * of the way from one to the other: click the pivot, then the two points.
 */
export class PitchfanTool extends LevelShapesTool {
  descriptor = {
    type: 'pitchfan' as const,
    name: 'Pitchfan',
    requiredAnchors: 3,
    options: levelOptions([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1]),
  };

  protected override guides(pts: Point[]): [Point, Point][] {
    return pts.length >= 3 ? [[pts[1], pts[2]]] : [[pts[0], pts[1]]];
  }

  protected shapes(pts: Point[], levels: DrawingLevel[], viewport: ViewportState) {
    if (pts.length < 3) return [];
    const [pivot, b, c] = pts;
    const reach = Math.hypot(viewport.chartRect.width, viewport.chartRect.height) * 2;
    return levels.map((level) => {
      const through = { x: b.x + (c.x - b.x) * level.value, y: b.y + (c.y - b.y) * level.value };
      const len = Math.hypot(through.x - pivot.x, through.y - pivot.y) || 1;
      const end = { x: pivot.x + ((through.x - pivot.x) / len) * reach, y: pivot.y + ((through.y - pivot.y) / len) * reach };
      return { level, points: [pivot, end], label: through };
    });
  }
}

/** A golden spiral: click its centre, then where it starts; it turns out from there in quarter turns of φ. */
export class FibSpiralTool extends DrawingBase {
  descriptor = {
    type: 'fibSpiral' as const,
    name: 'Fib Spiral',
    requiredAnchors: 2,
    options: {
      clockwise: { kind: 'boolean' as const, label: 'Clockwise', default: false },
    },
  };

  /** The spiral's points, out to past the chart's corners and in to a few pixels. */
  private points(state: DrawingState, viewport: ViewportState): Point[] {
    const c = this.anchorToPixel(state.anchors[0], viewport);
    const s = this.anchorToPixel(state.anchors[1], viewport);
    const r0 = Math.hypot(s.x - c.x, s.y - c.y);
    if (r0 === 0) return [];
    const start = Math.atan2(s.y - c.y, s.x - c.x);
    const turn = this.option<boolean>(state, 'clockwise') ? 1 : -1;
    const reach = Math.hypot(viewport.chartRect.width, viewport.chartRect.height) * 1.5;
    // Growing by φ every quarter turn: r = r0 · φ^(2θ/π).
    const quarter = Math.PI / 2;
    const outward = Math.log(reach / r0) / Math.log(PHI); // quarter turns to reach
    const inward = Math.log(r0 / 2) / Math.log(PHI);
    const from = -Math.max(0, inward) * quarter;
    const to = Math.max(1, outward) * quarter;
    const pts: Point[] = [];
    const steps = Math.min(720, Math.ceil(((to - from) / quarter) * 24));
    for (let i = 0; i <= steps; i++) {
      const theta = from + ((to - from) * i) / steps;
      const r = r0 * Math.pow(PHI, theta / quarter);
      pts.push({ x: c.x + r * Math.cos(start + turn * theta), y: c.y + r * Math.sin(start + turn * theta) });
    }
    return pts;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    this.applyLineStyle(ctx, state.style);
    strokePoints(ctx, this.points(state, viewport));
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    return nearPolyline(point, this.points(state, viewport), tolerance);
  }
}

/**
 * A Gann square: a box between two corners with its grid at the levels, both
 * diagonals, and arcs from the first corner.
 */
export class GannSquareTool extends DrawingBase {
  descriptor = {
    type: 'gannSquare' as const,
    name: 'Gann Square',
    requiredAnchors: 2,
    options: {
      ...levelOptions([0.25, 0.382, 0.5, 0.618, 0.75]),
      arcs: { kind: 'boolean' as const, label: 'Arcs', default: true },
    },
  };

  private lines(state: DrawingState, viewport: ViewportState): { grid: [Point, Point][]; arcs: Point[][] } {
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const w = b.x - a.x;
    const h = b.y - a.y;
    const grid: [Point, Point][] = [
      [a, { x: b.x, y: a.y }], [{ x: b.x, y: a.y }, b], [b, { x: a.x, y: b.y }], [{ x: a.x, y: b.y }, a],
      [a, b], [{ x: b.x, y: a.y }, { x: a.x, y: b.y }],
    ];
    const levels = this.visibleLevels(state);
    for (const { value } of levels) {
      grid.push([{ x: a.x + w * value, y: a.y }, { x: a.x + w * value, y: b.y }]);
      grid.push([{ x: a.x, y: a.y + h * value }, { x: b.x, y: a.y + h * value }]);
    }
    // A quarter of an ellipse from the first corner, into the box.
    const arcs = this.option<boolean>(state, 'arcs')
      ? [...levels.map((l) => l.value), 1].map((v) => {
        const start = Math.atan2(0, Math.sign(w) || 1);
        const sweep = (Math.sign(w) || 1) * (Math.sign(h) || 1) * (Math.PI / 2);
        return ellipsePoints(a, Math.abs(w) * v, Math.abs(h) * v, start, sweep, 24);
      })
      : [];
    return { grid, arcs };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const { grid, arcs } = this.lines(state, viewport);
    this.applyLineStyle(ctx, state.style);
    grid.forEach(([p, q], i) => {
      ctx.globalAlpha = i < 6 ? 1 : 0.55; // the box and its diagonals stand out
      strokePoints(ctx, [p, q]);
    });
    ctx.globalAlpha = 0.8;
    for (const arc of arcs) strokePoints(ctx, arc);
    ctx.globalAlpha = 1;
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { grid } = this.lines(state, viewport);
    return grid.slice(0, 6).some(([p, q]) => distanceToSegment(point, p, q) <= tolerance);
  }
}
