import { fillTextWithHalo } from './labels.js';
import type { DrawingLevel, DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase, distanceToSegment, nearPolyline } from '../DrawingBase.js';
import { fibLevelList } from './options.js';
import { drawingLook, readableText, roleFont } from '../drawingLook.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const ARC_STEPS = 64;
/** The least room between two level labels, px: one that would come closer is left out. */
const LABEL_ROOM = 2;
/** How far a level's label sits off its shape, px. */
const LABEL_OFFSET = 6;
/** Where on a circle its label goes: up and to the right, so labels of circles one inside another step apart. */
const CIRCLE_LABEL_ANGLE = -Math.PI / 4;
/** How strongly a tool's guide (the line its levels measure) shows. */
const GUIDE_ALPHA = 0.7;
/** The grid of a Gann square, lighter than its box and diagonals. */
const SQUARE_GRID_ALPHA = 0.3;
/** How strongly a Gann square's arcs show. */
const SQUARE_ARC_ALPHA = 0.7;
/** The tightest a spiral winds in to, px: tighter, it is a dot under its centre handle. */
const SPIRAL_MIN_RADIUS = 8;

function levelOptions(shown: readonly number[], hidden: readonly number[] = []) {
  return {
    levels: { kind: 'levels' as const, label: 'Levels', default: fibLevelList(shown, hidden) },
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

/** One level's shape: its points, and where its label goes, `away` the way it leans off the shape. */
interface LevelShape {
  level: DrawingLevel;
  points: Point[];
  label: Point;
  away?: Point;
}

/** The unit vector a quarter turn from `a`→`b`: off a line, to one side. */
function normal(a: Point, b: Point): Point {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
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
  ): LevelShape[];

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
    // The guides as dashed 1 px lines under the levels.
    this.applyGuideStyle(ctx, state.style.color, true);
    ctx.globalAlpha = GUIDE_ALPHA;
    for (const [a, b] of this.guides(pts)) strokePoints(ctx, [a, b]);
    ctx.globalAlpha = 1;
    this.applyLineStyle(ctx, state.style);
    const showLevels = this.option<boolean>(state, 'showLevels');
    ctx.font = roleFont('label');
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
   * The levels' ratios, each beside its shape, off its guide. Labels of
   * levels close together (small circles) would pile up: the 1 level is
   * labelled first, then from the outermost in, and one that would cover a
   * label already drawn is left out.
   */
  private renderLabels(ctx: CanvasRenderingContext2D, state: DrawingState, shapes: readonly LevelShape[]): void {
    const size = drawingLook().sizes.label;
    const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const order = [...shapes].reverse().sort((a, b) => Number(b.level.value === 1) - Number(a.level.value === 1));
    for (const { level, label, away } of order) {
      const text = levelText(level.value);
      const width = ctx.measureText(text).width;
      const lean = away ?? { x: 0, y: -1 };
      const x = label.x + lean.x * LABEL_OFFSET;
      const y = label.y + lean.y * LABEL_OFFSET;
      // The text leans the way it is pushed: left of the point when pushed left, above when up.
      const x0 = lean.x < -0.3 ? x - width : lean.x > 0.3 ? x : x - width / 2;
      const y0 = lean.y < -0.3 ? y - size : lean.y > 0.3 ? y : y - size / 2;
      const box = { x0, x1: x0 + width, y0, y1: y0 + size };
      if (taken.some((t) => box.x1 + LABEL_ROOM > t.x0 && t.x1 + LABEL_ROOM > box.x0 && box.y1 + LABEL_ROOM > t.y0 && t.y1 + LABEL_ROOM > box.y0)) continue;
      taken.push(box);
      ctx.fillStyle = readableText(level.color ?? state.style.color);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      fillTextWithHalo(ctx, text, box.x0, box.y0);
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
      const label = { x: c.x + r * Math.cos(CIRCLE_LABEL_ANGLE), y: c.y + r * Math.sin(CIRCLE_LABEL_ANGLE) };
      return { level, points: ellipsePoints(c, r, r, 0, Math.PI * 2), label, away: { x: Math.SQRT1_2, y: -Math.SQRT1_2 } };
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
      return { level, points, label: { x: a.x + r * Math.cos(toward), y: a.y + r * Math.sin(toward) }, away: normal(a, b) };
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
      // Off its first line, on the side away from the arcs.
      const off = normal(apex, b);
      const side = sweep > 0 ? -1 : 1;
      return { level, points: ellipsePoints(apex, r, r, from, sweep, 32), label: { x: apex.x + r * Math.cos(from), y: apex.y + r * Math.sin(from) }, away: { x: off.x * side, y: off.y * side } };
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
      return { level, points: [pivot, end], label: through, away: normal(pivot, through) };
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
    const inward = Math.log(r0 / SPIRAL_MIN_RADIUS) / Math.log(PHI);
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
    // The box and its diagonals in the drawing's line; its sides on whole pixels.
    this.applyLineStyle(ctx, state.style);
    grid.slice(0, 6).forEach(([p, q]) => this.strokeSegment(ctx, p, q, state.style.lineWidth));
    // The grid as sharp 1 px guides, lighter.
    this.applyGuideStyle(ctx, state.style.color);
    ctx.globalAlpha = SQUARE_GRID_ALPHA;
    grid.slice(6).forEach(([p, q]) => this.strokeSegment(ctx, p, q, 1));
    // The arcs in their levels' colours (the last, at 1, in the drawing's).
    const levels = this.visibleLevels(state);
    arcs.forEach((arc, i) => {
      this.applyLineStyle(ctx, { ...state.style, color: levels[i]?.color ?? state.style.color });
      ctx.globalAlpha = SQUARE_ARC_ALPHA;
      strokePoints(ctx, arc);
    });
    ctx.globalAlpha = 1;
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** A segment: on whole pixels when it is level or upright, as it is otherwise. */
  private strokeSegment(ctx: CanvasRenderingContext2D, p: Point, q: Point, width: number): void {
    ctx.lineWidth = width;
    if (Math.abs(p.y - q.y) < 0.5) this.strokeHorizontal(ctx, p.x, q.x, p.y);
    else if (Math.abs(p.x - q.x) < 0.5) this.strokeVertical(ctx, p.x, p.y, q.y);
    else strokePoints(ctx, [p, q]);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const { grid } = this.lines(state, viewport);
    return grid.slice(0, 6).some(([p, q]) => distanceToSegment(point, p, q) <= tolerance);
  }
}
