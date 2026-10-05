import type { Rect } from '@tradecanvas/commons';
import type { GpuRecorder, GpuRegion } from '../engine/gpu.js';
import { parseColor, premultiplied, readColor, type RGBA } from './glColor.js';
import { polygonSpans, signedArea } from './polygonSpans.js';
import { anyOverlap, boundsOf, intersect, isEmpty, type Box, type GpuCommand, type GpuPaint } from './recordedCommands.js';
import { RecordedGradient, RecordedPath, withRecordedPaths } from './recordedPath.js';
import { hasSharpJoin, hasShortSegment, packStroke, type Polyline } from './strokeGeometry.js';

export type { Box, GpuCommand, GpuPaint } from './recordedCommands.js';
export { anyOverlap } from './recordedCommands.js';

/**
 * Canvas 2D drawing recorded for the GPU. Chart code draws on `ctx` as on a
 * real 2D context; paths, fills and strokes become GPU commands in device
 * pixels (the context starts at the device-pixel-ratio transform, as a chart
 * canvas does). Text is kept to be drawn on the 2D canvas over it. A step
 * that uses anything the GPU can't draw the same (an image, a pattern, a
 * rotated or non-rectangular clip, a sharp mitered corner, shapes of one fill
 * that overlap…) is dropped whole, and the chart draws it with Canvas 2D.
 */

type Style = string | RecordedGradient;
type Matrix = [number, number, number, number, number, number];

interface State {
  fillStyle: Style;
  strokeStyle: Style;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  globalAlpha: number;
  globalCompositeOperation: string;
  lineDash: number[];
  lineDashOffset: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  direction: CanvasDirection;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  filter: string;
  /** Text settings beyond the font, replayed with the text. */
  textExtras: Record<string, unknown>;
  transform: Matrix;
  clip: Box;
}

/** A subpath: points in device pixels; a rectangle or full circle kept as one, for the fast paths. */
interface Subpath extends Polyline {
  rect?: Box;
  circle?: { x: number; y: number; r: number };
}

interface TextOp {
  stroke: boolean;
  text: string;
  x: number;
  y: number;
  maxWidth: number | undefined;
  state: State;
}

const TAU = Math.PI * 2;

/** Points per arc flattened: fine enough to stay within a tenth of a pixel. */
function arcSteps(radius: number, sweep: number): number {
  const step = 2 * Math.sqrt(Math.max(0.2 / Math.max(radius, 0.1), 1e-6));
  return Math.min(512, Math.max(4, Math.ceil(Math.abs(sweep) / Math.min(step, Math.PI / 4))));
}

/** State properties a step may read and set. */
const PROPS = new Set(['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'globalAlpha', 'globalCompositeOperation', 'lineDashOffset', 'font', 'textAlign', 'textBaseline', 'direction', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'filter']);
/** Text settings kept with the text. */
const TEXT_EXTRAS = new Set(['fontKerning', 'fontStretch', 'fontVariantCaps', 'letterSpacing', 'wordSpacing', 'textRendering']);
/** Settings that change nothing drawn here (no images). */
const IGNORED = new Set(['imageSmoothingEnabled', 'imageSmoothingQuality']);

const fillable = (s: Subpath) => !!(s.rect || s.circle) || s.points.length >= 6;

class Recorder implements GpuRecorder {
  readonly commands: GpuCommand[] = [];
  readonly ctx: CanvasRenderingContext2D;
  /** Where text goes: the region being recorded. */
  private texts: TextOp[] = [];
  /** Whether the region being recorded takes text. */
  private takesText = true;
  private state!: State;
  private stack: State[] = [];
  private path: Subpath[] = [];
  private ok = true;
  /** Where the step being recorded starts in `commands`: rectangles merge into a command of this step only. */
  private stepStart = 0;
  /** The last colour style parsed, premultiplied (charts fill many cells in one, at alphas of their own). */
  private solid: { style: string; color: RGBA } | null = null;

  constructor(private readonly dpr: number, private readonly measure: CanvasRenderingContext2D | null) {
    this.reset({ x0: 0, y0: 0, x1: Infinity, y1: Infinity });
    this.ctx = this.proxy();
  }

  region(clip: Rect, options?: { text?: boolean }): GpuRegion {
    const d = this.dpr;
    const box = { x0: clip.x * d, y0: clip.y * d, x1: (clip.x + clip.width) * d, y1: (clip.y + clip.height) * d };
    const texts: TextOp[] = [];
    const takesText = options?.text !== false;
    return {
      step: (draw) => {
        this.reset(box);
        this.texts = texts;
        this.takesText = takesText;
        const marks = { commands: this.commands.length, texts: texts.length };
        this.stepStart = marks.commands;
        this.ok = true;
        try {
          withRecordedPaths(() => draw(this.ctx));
        } catch {
          this.ok = false;
        }
        if (this.ok) return true;
        this.commands.length = marks.commands;
        texts.length = marks.texts;
        return false;
      },
      drawText: (c) => replayText(c, texts),
    };
  }

  private reset(clip: Box): void {
    this.state = {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      lineDash: [],
      lineDashOffset: 0,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'inherit',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      filter: 'none',
      textExtras: {},
      transform: [this.dpr, 0, 0, this.dpr, 0, 0],
      clip,
    };
    this.stack = [];
    this.path = [];
  }

  private unsupported(): void {
    this.ok = false;
  }

  private copyState(): State {
    const s = this.state;
    return { ...s, lineDash: [...s.lineDash], textExtras: { ...s.textExtras } };
  }

  // --- Transform -----------------------------------------------------------

  /** Whether the transform keeps axes axis-aligned (no rotation or skew). */
  private axisAligned(): boolean {
    const t = this.state.transform;
    return t[1] === 0 && t[2] === 0;
  }

  /** Axis-aligned and the same scale both ways: lines keep their width, circles stay round. */
  private uniform(): boolean {
    const t = this.state.transform;
    return this.axisAligned() && Math.abs(t[0]) === Math.abs(t[3]);
  }

  private setMatrix(m: Matrix): void {
    if (m.every(Number.isFinite)) this.state.transform = m;
  }

  private multiply(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const [a0, b0, c0, d0, e0, f0] = this.state.transform;
    this.setMatrix([a0 * a + c0 * b, b0 * a + d0 * b, a0 * c + c0 * d, b0 * c + d0 * d, a0 * e + c0 * f + e0, b0 * e + d0 * f + f0]);
  }

  // --- Path ----------------------------------------------------------------

  private current(): Subpath | undefined {
    return this.path[this.path.length - 1];
  }

  private moveTo(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const t = this.state.transform;
    this.path.push({ points: [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]], closed: false });
  }

  private lineTo(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const sub = this.current();
    if (!sub || sub.closed) return this.moveTo(x, y);
    const t = this.state.transform;
    sub.points.push(t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]);
    sub.rect = undefined;
    sub.circle = undefined;
  }

  private closePath(): void {
    const sub = this.current();
    if (!sub || sub.closed) return;
    sub.closed = true;
    // A new subpath starts where this one did.
    this.path.push({ points: [sub.points[0], sub.points[1]], closed: false });
  }

  private rect(x: number, y: number, w: number, h: number): void {
    if (![x, y, w, h].every(Number.isFinite)) return;
    const t = this.state.transform;
    const x0 = t[0] * x + t[2] * y + t[4], y0 = t[1] * x + t[3] * y + t[5];
    const x1 = t[0] * (x + w) + t[2] * y + t[4], y1 = t[1] * (x + w) + t[3] * y + t[5];
    const x2 = t[0] * (x + w) + t[2] * (y + h) + t[4], y2 = t[1] * (x + w) + t[3] * (y + h) + t[5];
    const x3 = t[0] * x + t[2] * (y + h) + t[4], y3 = t[1] * x + t[3] * (y + h) + t[5];
    const sub: Subpath = { points: [x0, y0, x1, y1, x2, y2, x3, y3], closed: true };
    if (this.axisAligned()) sub.rect = { x0: Math.min(x0, x2), y0: Math.min(y0, y2), x1: Math.max(x0, x2), y1: Math.max(y0, y2) };
    this.path.push(sub);
    // As in Canvas 2D: the next subpath starts at the rectangle's corner.
    this.path.push({ points: [x0, y0], closed: false });
  }

  private arc(x: number, y: number, r: number, start: number, end: number, ccw = false): void {
    if (![x, y, r, start, end].every(Number.isFinite)) return;
    if (r < 0) throw new DOMException('negative radius', 'IndexSizeError');
    let sweep = end - start;
    if (!ccw && sweep >= TAU) sweep = TAU;
    else if (ccw && -sweep >= TAU) sweep = -TAU;
    else if (!ccw) sweep = ((sweep % TAU) + TAU) % TAU;
    else sweep = -((((start - end) % TAU) + TAU) % TAU);
    const sub = this.current();
    const t = this.state.transform;
    const sx = x + r * Math.cos(start), sy = y + r * Math.sin(start);
    // Alone in its subpath (or just after a moveTo to where it starts): a circle the fast path can draw.
    const lonely = !sub || sub.closed
      || (sub.points.length === 2 && Math.abs(sub.points[0] - (t[0] * sx + t[2] * sy + t[4])) < 1e-6 && Math.abs(sub.points[1] - (t[1] * sx + t[3] * sy + t[5])) < 1e-6);
    const steps = arcSteps(r * Math.abs(t[0]), sweep);
    for (let k = 0; k <= steps; k++) {
      const angle = start + (sweep * k) / steps;
      this.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    const made = this.current();
    if (Math.abs(sweep) >= TAU - 1e-9 && lonely && this.uniform() && made) {
      made.circle = { x: t[0] * x + t[4], y: t[3] * y + t[5], r: r * Math.abs(t[0]) };
    }
  }

  /** A curve flattened into lines (the GPU draws only lines), finer as it is longer. */
  private curve(controls: number[], end: [number, number]): void {
    if (!this.current() || this.current()!.closed) this.moveTo(controls[0], controls[1]);
    const start = this.current();
    const t = this.state.transform;
    if (!start || !this.axisAligned() || t[0] === 0 || t[3] === 0) return this.unsupported();
    // Back to user space for the start point: inverse of an axis-aligned transform.
    const pts = [(start.points[start.points.length - 2] - t[4]) / t[0], (start.points[start.points.length - 1] - t[5]) / t[3], ...controls, ...end];
    let length = 0;
    for (let i = 2; i < pts.length; i += 2) length += Math.hypot((pts[i] - pts[i - 2]) * t[0], (pts[i + 1] - pts[i - 1]) * t[3]);
    const steps = Math.max(4, Math.min(64, Math.ceil(length / 3)));
    for (let k = 1; k <= steps; k++) {
      const u = k / steps;
      const w = pts.length === 6
        ? [(1 - u) ** 2, 2 * u * (1 - u), u * u]
        : [(1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3];
      let x = 0, y = 0;
      w.forEach((wk, i) => { x += wk * pts[2 * i]; y += wk * pts[2 * i + 1]; });
      this.lineTo(x, y);
    }
  }

  private withPath(build: () => void, draw: () => void): void {
    const saved = this.path;
    this.path = [];
    build();
    draw();
    this.path = saved;
  }

  /** Run `use` on `path`'s shape instead of the current path. */
  private onPath(path: unknown, use: () => void): void {
    if (!(path instanceof RecordedPath) || path.unsupported) return this.unsupported();
    this.withPath(() => {
      for (const [name, a] of path.calls) {
        if (name === 'moveTo') this.moveTo(a[0], a[1]);
        else if (name === 'lineTo') this.lineTo(a[0], a[1]);
        else if (name === 'closePath') this.closePath();
        else if (name === 'rect') this.rect(a[0], a[1], a[2], a[3]);
        else if (name === 'arc') this.arc(a[0], a[1], a[2], a[3], a[4], !!a[5]);
        else if (name === 'quadraticCurveTo') this.curve([a[0], a[1]], [a[2], a[3]]);
        else if (name === 'bezierCurveTo') this.curve([a[0], a[1], a[2], a[3]], [a[4], a[5]]);
      }
    }, use);
  }

  // --- Paint ---------------------------------------------------------------

  /** A colour style, premultiplied. */
  private baseColor(style: string): RGBA {
    const hit = this.solid;
    if (hit && hit.style === style) return hit.color;
    const color = premultiplied(parseColor(style));
    this.solid = { style, color };
    return color;
  }

  private alpha(): number {
    return Math.max(0, Math.min(1, this.state.globalAlpha));
  }

  /** A colour style, premultiplied, at the global alpha. */
  private solidColor(style: string): RGBA {
    const c = this.baseColor(style);
    const a = this.alpha();
    return [c[0] * a, c[1] * a, c[2] * a, c[3] * a];
  }

  /** The style as the GPU paints it, or null when it can't. */
  private paint(style: Style): GpuPaint | null {
    const alpha = this.alpha();
    if (typeof style === 'string') return { kind: 'solid', color: this.solidColor(style) };
    if (!(style instanceof RecordedGradient)) return null;
    if (style.stops.length === 0) return { kind: 'solid', color: [0, 0, 0, 0] };
    if (style.stops.length > 4) return null;
    // Transformed end points carry the gradient over only while its lines
    // stay square to its axis: no rotation, and a uniform scale or an
    // axis-parallel gradient.
    const t = this.state.transform;
    const parallel = style.x0 === style.x1 || style.y0 === style.y1;
    if (!this.axisAligned() || (!this.uniform() && !parallel)) return null;
    const stops = [...style.stops].sort((a, b) => a.offset - b.offset).map((s) => {
      const c = parseColor(s.color);
      return { offset: s.offset, color: [c[0], c[1], c[2], c[3] * alpha] as RGBA };
    });
    return { kind: 'linear', x0: t[0] * style.x0 + t[4], y0: t[3] * style.y0 + t[5], x1: t[0] * style.x1 + t[4], y1: t[3] * style.y1 + t[5], stops };
  }

  /** Whether the state draws as plain source-over paint (no shadow, filter or other blending). */
  private plain(): boolean {
    const s = this.state;
    if (s.globalCompositeOperation !== 'source-over' || s.filter !== 'none') return false;
    if (s.shadowBlur === 0 && s.shadowOffsetX === 0 && s.shadowOffsetY === 0) return true;
    return !(parseColor(s.shadowColor)[3] > 0);
  }

  // --- Fill ----------------------------------------------------------------

  private fill(rule: CanvasFillRule = 'nonzero'): void {
    if (!this.plain()) return this.unsupported();
    const paint = this.paint(this.state.fillStyle);
    if (!paint) return this.unsupported();
    const subs = this.path.filter(fillable);
    if (subs.length === 0 || (paint.kind === 'solid' && paint.color[3] === 0)) return;
    // Shapes of one fill that overlap: Canvas 2D paints where the winding
    // says, once. Drawn one by one, only opaque paint matches it, and only
    // where every shape winds the same way under the nonzero rule.
    if (subs.length > 1 && anyOverlap(subs.map((s) => boundsOf(s.points)))) {
      const opaque = paint.kind === 'solid' && paint.color[3] >= 1;
      const way = Math.sign(signedArea(subs[0].points));
      if (!opaque || rule !== 'nonzero' || subs.some((s) => Math.sign(signedArea(s.points)) !== way)) return this.unsupported();
    }
    if (paint.kind === 'solid' && subs.every((s) => s.rect)) return this.fillRects(subs, paint.color);
    if (paint.kind === 'solid' && subs.every((s) => s.circle)) {
      const values: number[] = [];
      for (const s of subs) values.push(s.circle!.x, s.circle!.y, s.circle!.r, ...paint.color);
      this.commands.push({ type: 'circles', values, clip: this.state.clip });
      return;
    }
    const spans: number[] = [];
    for (const s of subs) {
      // A shape other than bands, areas and the like: Canvas 2D fills it.
      const these = polygonSpans(s.points);
      if (!these) return this.unsupported();
      for (const v of these) spans.push(v);
    }
    const all = boundsOf(subs.flatMap((s) => s.points));
    const bounds = intersect({ x0: Math.floor(all.x0), y0: Math.floor(all.y0), x1: Math.ceil(all.x1), y1: Math.ceil(all.y1) }, this.state.clip);
    if (spans.length > 0 && !isEmpty(bounds)) this.commands.push({ type: 'fill', spans, bounds, paint, clip: this.state.clip });
  }

  private fillRects(subs: readonly Subpath[], color: RGBA): void {
    for (const s of subs) this.pushRect(s.rect!, color);
  }

  /** A rectangle, clipped, in `color` at `alpha`, added to this step's last command when that holds rectangles too. */
  private pushRect(r: Box, color: RGBA, alpha = 1): void {
    const c = this.state.clip;
    const x0 = Math.max(r.x0, c.x0), y0 = Math.max(r.y0, c.y0), x1 = Math.min(r.x1, c.x1), y1 = Math.min(r.y1, c.y1);
    if (!(x1 > x0 && y1 > y0)) return;
    const last = this.commands[this.commands.length - 1];
    const values = last && last.type === 'rects' && this.commands.length > this.stepStart ? last.values : null;
    const r0 = color[0] * alpha, g0 = color[1] * alpha, b0 = color[2] * alpha, a0 = color[3] * alpha;
    if (values) values.push(x0, y0, x1, y1, r0, g0, b0, a0);
    else this.commands.push({ type: 'rects', values: [x0, y0, x1, y1, r0, g0, b0, a0] });
  }

  /** fillRect in a plain colour on an axis-aligned transform, straight to a rectangle; anything else through a path. */
  private fillRect(x: number, y: number, w: number, h: number): void {
    const style = this.state.fillStyle;
    if (typeof style !== 'string' || !this.axisAligned() || !this.plain()) return this.withPath(() => this.rect(x, y, w, h), () => this.fill());
    if (!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h))) return;
    const color = this.baseColor(style);
    const alpha = this.alpha();
    if (color[3] * alpha === 0) return;
    const t = this.state.transform;
    const ax = t[0] * x + t[4], bx = t[0] * (x + w) + t[4];
    const ay = t[3] * y + t[5], by = t[3] * (y + h) + t[5];
    this.pushRect({ x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) }, color, alpha);
  }

  // --- Stroke --------------------------------------------------------------

  private stroke(): void {
    if (!this.plain()) return this.unsupported();
    const paint = this.paint(this.state.strokeStyle);
    // Line widths scale with the transform: only a uniform one keeps them round.
    if (!paint || paint.kind !== 'solid' || !this.uniform()) return this.unsupported();
    if (paint.color[3] === 0) return;
    const s = this.state;
    const scale = Math.abs(s.transform[0]);
    const width = s.lineWidth * scale;
    // A zero-length piece draws a dot with round or square caps, nothing with butt ones.
    const lines = this.path.filter((l) => l.points.length >= 4 && (s.lineCap !== 'butt' || l.points.some((v, i) => v !== l.points[i % 2])));
    if (lines.length === 0) return;
    const dash = this.dash(lines, scale);
    if (dash === undefined || !this.drawsAlike(lines, width, paint.color[3])) return this.unsupported();
    const cap = s.lineCap === 'round' ? 1 : s.lineCap === 'square' ? 2 : 0;
    this.commands.push({ type: 'stroke', points: packStroke(lines), color: paint.color, width, cap, dash, clip: s.clip });
  }

  /** The dash pattern in device pixels as two on-off pairs, null for solid; undefined when the GPU can't dash these lines (it dashes single segments, butt-capped). */
  private dash(lines: readonly Subpath[], scale: number): number[] | null | undefined {
    const s = this.state;
    if (s.lineDash.length === 0) return null;
    if (s.lineDash.length > 4 || s.lineDashOffset !== 0 || s.lineCap !== 'butt') return undefined;
    if (lines.some((l) => l.closed || l.points.length !== 4)) return undefined;
    const dash = s.lineDash.map((v) => v * scale);
    while (dash.length < 4) dash.push(...dash.slice(0, 4 - dash.length));
    return dash;
  }

  /**
   * Whether the GPU's stroke looks as Canvas 2D's would: joins round enough
   * to pass for the `lineJoin` asked for, pieces that don't overlap (Canvas
   * 2D paints their union once), and, see-through, no segment so short that
   * a pixel might be painted by more than the nearest few.
   */
  private drawsAlike(lines: readonly Subpath[], width: number, alpha: number): boolean {
    const s = this.state;
    const hw = width / 2;
    if (width > 1 && lines.some((l) => hasSharpJoin(l, hw, s.lineJoin, s.miterLimit))) return false;
    const reach = hw + (s.lineCap === 'butt' ? 0 : hw);
    if (lines.length > 1 && anyOverlap(lines.map((l) => boundsOf(l.points, reach)))) return false;
    if (alpha < 1 && lines.some((l) => hasShortSegment(l, width))) return false;
    return true;
  }

  // --- Clip and text -------------------------------------------------------

  /** Clip to the path: one axis-aligned rectangle (the winding rule makes no difference to it). */
  private clip(): void {
    const subs = this.path.filter(fillable);
    if (subs.length !== 1 || !subs[0].rect) return this.unsupported();
    this.state.clip = intersect(this.state.clip, subs[0].rect);
  }

  private text(stroke: boolean, text: string, x: number, y: number, maxWidth?: number): void {
    const style = stroke ? this.state.strokeStyle : this.state.fillStyle;
    if (!this.takesText || typeof style !== 'string' || !this.plain()) return this.unsupported();
    this.texts.push({ stroke, text: String(text), x, y, maxWidth, state: this.copyState() });
  }

  private measureText(text: string): TextMetrics {
    const m = this.measure;
    if (!m) return { width: String(text).length * 6 } as TextMetrics;
    const font = m.font;
    m.font = this.state.font;
    const metrics = m.measureText(text);
    m.font = font;
    return metrics;
  }

  // --- The context ---------------------------------------------------------

  private methods(): Record<string, (...args: never[]) => unknown> {
    const st = () => this.state;
    const table: Record<string, (...args: never[]) => unknown> = Object.create(null);
    Object.assign(table, {
      save: () => { this.stack.push(this.copyState()); },
      restore: () => { const s = this.stack.pop(); if (s) this.state = s; },
      beginPath: () => { this.path = []; },
      moveTo: (x: number, y: number) => this.moveTo(x, y),
      lineTo: (x: number, y: number) => this.lineTo(x, y),
      closePath: () => this.closePath(),
      rect: (x: number, y: number, w: number, h: number) => this.rect(x, y, w, h),
      arc: (x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean) => this.arc(x, y, r, a0, a1, ccw),
      quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => this.curve([cx, cy], [x, y]),
      bezierCurveTo: (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) => this.curve([c1x, c1y, c2x, c2y], [x, y]),
      fill: (a?: CanvasFillRule | Path2D, b?: CanvasFillRule) => (typeof a === 'object' ? this.onPath(a, () => this.fill(b)) : this.fill(a)),
      stroke: (path?: Path2D) => (path ? this.onPath(path, () => this.stroke()) : this.stroke()),
      clip: (a?: CanvasFillRule | Path2D) => (typeof a === 'object' ? this.onPath(a, () => this.clip()) : this.clip()),
      fillRect: (x: number, y: number, w: number, h: number) => this.fillRect(x, y, w, h),
      strokeRect: (x: number, y: number, w: number, h: number) => this.withPath(() => this.rect(x, y, w, h), () => this.stroke()),
      fillText: (text: string, x: number, y: number, maxWidth?: number) => this.text(false, text, x, y, maxWidth),
      strokeText: (text: string, x: number, y: number, maxWidth?: number) => this.text(true, text, x, y, maxWidth),
      measureText: (text: string) => this.measureText(text),
      setLineDash: (segments: number[]) => {
        if (segments.every((v) => Number.isFinite(v) && v >= 0)) st().lineDash = segments.length % 2 ? [...segments, ...segments] : [...segments];
      },
      getLineDash: () => [...st().lineDash],
      translate: (x: number, y: number) => this.multiply(1, 0, 0, 1, x, y),
      scale: (x: number, y: number) => this.multiply(x, 0, 0, y, 0, 0),
      rotate: (angle: number) => this.multiply(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0),
      transform: (a: number, b: number, c: number, d: number, e: number, f: number) => this.multiply(a, b, c, d, e, f),
      setTransform: (a?: number | DOMMatrix2DInit, b?: number, c?: number, d?: number, e?: number, f?: number) =>
        typeof a === 'number' ? this.setMatrix([a, b ?? 0, c ?? 0, d ?? 1, e ?? 0, f ?? 0]) : this.unsupported(),
      resetTransform: () => this.setMatrix([1, 0, 0, 1, 0, 0]),
      getTransform: () => {
        const [a, b, c, d, e, f] = st().transform;
        return { a, b, c, d, e, f, m11: a, m12: b, m21: c, m22: d, m41: e, m42: f, is2D: true, isIdentity: a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0 };
      },
      createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => new RecordedGradient(x0, y0, x1, y1),
    });
    return table;
  }

  private proxy(): CanvasRenderingContext2D {
    const methods = this.methods();
    return new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, prop) => {
        if (typeof prop !== 'string') return undefined;
        if (prop in methods) return methods[prop];
        if (PROPS.has(prop)) return (this.state as unknown as Record<string, unknown>)[prop];
        if (TEXT_EXTRAS.has(prop)) return this.state.textExtras[prop];
        if (prop === 'canvas') return this.measure?.canvas;
        if (IGNORED.has(prop)) return undefined;
        // Anything else (images, patterns, pixels…): Canvas 2D draws this step.
        this.unsupported();
        return () => undefined;
      },
      set: (_target, prop, value) => {
        if (typeof prop === 'string') this.setProp(prop, value);
        return true;
      },
    });
  }

  /** A state property set as Canvas 2D sets it: invalid values are ignored. */
  private setProp(prop: string, value: unknown): void {
    const s = this.state as unknown as Record<string, unknown>;
    if (prop === 'lineWidth' || prop === 'miterLimit') {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) s[prop] = value;
    } else if (prop === 'globalAlpha') {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) s.globalAlpha = value;
    } else if (prop === 'fillStyle' || prop === 'strokeStyle') {
      if (value instanceof RecordedGradient) s[prop] = value;
      else if (typeof value === 'string') {
        if (readColor(value)) s[prop] = value;
      } else this.unsupported();
    } else if (PROPS.has(prop)) {
      s[prop] = value;
    } else if (TEXT_EXTRAS.has(prop)) {
      this.state.textExtras[prop] = value;
    } else if (!IGNORED.has(prop)) {
      this.unsupported();
    }
  }
}

/** Draw recorded text on a real 2D context (at its device-pixel-ratio transform), each as it was set. */
function replayText(c: CanvasRenderingContext2D, texts: readonly TextOp[]): void {
  for (const op of texts) {
    const s = op.state;
    // Clipped away entirely: nothing to draw.
    if (isEmpty(s.clip)) continue;
    c.save();
    // Device pixels: the recorded clip and transform are in them.
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (Number.isFinite(s.clip.x1) && Number.isFinite(s.clip.y1)) {
      c.beginPath();
      c.rect(s.clip.x0, s.clip.y0, s.clip.x1 - s.clip.x0, s.clip.y1 - s.clip.y0);
      c.clip();
    }
    const [a, b, cc, d, e, f] = s.transform;
    c.setTransform(a, b, cc, d, e, f);
    c.font = s.font;
    c.textAlign = s.textAlign;
    c.textBaseline = s.textBaseline;
    c.direction = s.direction;
    c.globalAlpha = s.globalAlpha;
    Object.assign(c, s.textExtras);
    if (op.stroke) {
      c.strokeStyle = s.strokeStyle as string;
      c.lineWidth = s.lineWidth;
      c.strokeText(op.text, op.x, op.y, op.maxWidth);
    } else {
      c.fillStyle = s.fillStyle as string;
      c.fillText(op.text, op.x, op.y, op.maxWidth);
    }
    c.restore();
  }
}

/** A recorder for one frame at `dpr`; `measure` measures text (and lends its canvas). */
export function createRecorder(dpr: number, measure: CanvasRenderingContext2D | null): Recorder {
  return new Recorder(dpr, measure);
}

export type { Recorder };
