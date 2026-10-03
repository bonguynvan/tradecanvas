import { DEFAULT_FONT_FAMILY } from '@tradecanvas/commons';
import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { resolveAnnotationText } from './TextAnnotation.js';
import { BoxCache, drawTextBox, inRect, type Rect } from './textBox.js';

/** Widest a note's or a callout's text runs before it wraps (px). */
const NOTE_WIDTH = 240;
const DEFAULT_FONT_SIZE = 13;

function fontSize(state: DrawingState): number {
  return state.style.fontSize || DEFAULT_FONT_SIZE;
}

function boxLook(state: DrawingState) {
  return {
    fontSize: fontSize(state),
    color: state.style.color,
    fill: state.style.fillColor ?? 'rgba(76, 141, 255, 0.1)',
    stroke: state.style.color,
    maxWidth: NOTE_WIDTH,
  };
}

/** A box `text` would roughly take before it is drawn (for a hit test). */
function estimateBox(state: DrawingState, text: string, x: number, y: number): Rect {
  const size = fontSize(state);
  const longest = Math.max(...text.split('\n').map((line) => line.length));
  return { x, y, width: Math.min(NOTE_WIDTH, longest * size * 0.6) + 16, height: size * 1.3 + 12 };
}

/** The pin of a note: a round head above its point, pointing at it. */
const PIN_RADIUS = 7;
const PIN_HEIGHT = 16;

/** A note pinned to a bar and price: a pin, and its text in a box beside it. */
export class NoteTool extends DrawingBase {
  descriptor = {
    type: 'note' as const,
    name: 'Note',
    requiredAnchors: 1,
    text: true,
    fill: true,
    options: {
      showText: { kind: 'boolean' as const, label: 'Show text', default: true },
    },
  };

  private boxes = new BoxCache();

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    this.renderPin(ctx, state, p);
    if (this.option<boolean>(state, 'showText')) {
      const box = drawTextBox(ctx, resolveAnnotationText(state, 'Note'), p.x + PIN_RADIUS + 6, p.y - PIN_HEIGHT - PIN_RADIUS, boxLook(state));
      this.boxes.set(state.id, box);
    }
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  private renderPin(ctx: CanvasRenderingContext2D, state: DrawingState, p: Point): void {
    const cy = p.y - PIN_HEIGHT;
    ctx.fillStyle = state.style.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - PIN_RADIUS * 0.7, cy + PIN_RADIUS * 0.5);
    ctx.arc(p.x, cy, PIN_RADIUS, Math.PI * 0.8, Math.PI * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, cy, PIN_RADIUS * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const pin: Rect = { x: p.x - PIN_RADIUS, y: p.y - PIN_HEIGHT - PIN_RADIUS, width: PIN_RADIUS * 2, height: PIN_HEIGHT + PIN_RADIUS };
    if (inRect(point, pin, tolerance)) return true;
    if (!this.option<boolean>(state, 'showText')) return false;
    const box = this.boxes.get(state.id)
      ?? estimateBox(state, resolveAnnotationText(state, 'Note'), p.x + PIN_RADIUS + 6, p.y - PIN_HEIGHT - PIN_RADIUS);
    return inRect(point, box, tolerance);
  }
}

/** Text in a box, with a line pointing at a bar and price: click the point, then where the box goes. */
export class CalloutTool extends DrawingBase {
  descriptor = { type: 'callout' as const, name: 'Callout', requiredAnchors: 2, text: true, fill: true };

  private boxes = new BoxCache();

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const target = this.anchorToPixel(state.anchors[0], viewport);
    ctx.fillStyle = state.style.color;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (state.anchors.length < 2) return;
    const at = this.anchorToPixel(state.anchors[1], viewport);
    const box = drawTextBox(ctx, resolveAnnotationText(state, 'Callout'), at.x, at.y, boxLook(state));
    this.boxes.set(state.id, box);
    // The pointer leaves the box from the middle of its nearest side.
    const from = nearestEdgePoint(box, target);
    this.applyLineStyle(ctx, state.style);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    this.resetLineStyle(ctx);
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const target = this.anchorToPixel(state.anchors[0], viewport);
    const at = this.anchorToPixel(state.anchors[1], viewport);
    const box = this.boxes.get(state.id) ?? estimateBox(state, resolveAnnotationText(state, 'Callout'), at.x, at.y);
    return inRect(point, box, tolerance) || this.distanceToLine(point, nearestEdgePoint(box, target), target) <= tolerance;
  }
}

/** The middle of the side of `box` facing `p`. */
function nearestEdgePoint(box: Rect, p: Point): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  // Compare against the box's own proportions so a wide box points sideways.
  if (Math.abs(dx) * box.height > Math.abs(dy) * box.width) {
    return { x: dx > 0 ? box.x + box.width : box.x, y: cy };
  }
  return { x: cx, y: dy > 0 ? box.y + box.height : box.y };
}

const FLAG_POLE = 24;
const FLAG_WIDTH = 18;
const FLAG_HEIGHT = 10;

/** A flag planted at a bar and price. */
export class FlagTool extends DrawingBase {
  descriptor = { type: 'flag' as const, name: 'Flag Mark', requiredAnchors: 1 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const top = p.y - FLAG_POLE;
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, top);
    ctx.stroke();
    ctx.fillStyle = state.style.color;
    ctx.beginPath();
    ctx.moveTo(p.x, top);
    ctx.lineTo(p.x + FLAG_WIDTH, top);
    ctx.lineTo(p.x + FLAG_WIDTH - 5, top + FLAG_HEIGHT / 2);
    ctx.lineTo(p.x + FLAG_WIDTH, top + FLAG_HEIGHT);
    ctx.lineTo(p.x, top + FLAG_HEIGHT);
    ctx.closePath();
    ctx.fill();
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    return inRect(point, { x: p.x, y: p.y - FLAG_POLE, width: FLAG_WIDTH, height: FLAG_POLE }, tolerance);
  }
}

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTIONS: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** The outline of an arrow `size` long whose tip is at `tip`, pointing `dir`. */
export function arrowOutline(tip: Point, dir: Point, size: number): Point[] {
  const head = size * 0.5;
  const halfHead = size * 0.4;
  const halfShaft = size * 0.17;
  // Along the arrow (back from the tip) and across it.
  const at = (along: number, across: number): Point => ({
    x: tip.x - dir.x * along - dir.y * across,
    y: tip.y - dir.y * along + dir.x * across,
  });
  return [at(0, 0), at(head, halfHead), at(head, halfShaft), at(size, halfShaft), at(size, -halfShaft), at(head, -halfShaft), at(head, -halfHead)];
}

/** A thick arrow pointing at a bar and price (up under a low, down over a high), with an optional label. */
export class ArrowMarkTool extends DrawingBase {
  descriptor = {
    type: 'arrowMark' as const,
    name: 'Arrow Mark',
    requiredAnchors: 1,
    text: true,
    options: {
      direction: {
        kind: 'choice' as const,
        label: 'Direction',
        default: 'up',
        choices: [
          { value: 'up', label: 'Up' },
          { value: 'down', label: 'Down' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ],
      },
      size: { kind: 'number' as const, label: 'Size', default: 22, min: 10, max: 80, step: 2 },
    },
  };

  private outline(state: DrawingState, viewport: ViewportState): { points: Point[]; dir: Point; tail: Point } {
    const tip = this.anchorToPixel(state.anchors[0], viewport);
    const dir = DIRECTIONS[this.option<Direction>(state, 'direction')] ?? DIRECTIONS.up;
    const size = this.option<number>(state, 'size');
    return { points: arrowOutline(tip, dir, size), dir, tail: { x: tip.x - dir.x * size, y: tip.y - dir.y * size } };
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const { points, dir, tail } = this.outline(state, viewport);
    ctx.fillStyle = state.style.color;
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    const text = state.style.text;
    if (text) {
      // The label sits past the tail, on the arrow's line.
      ctx.font = `${state.style.fontSize || 12}px ${DEFAULT_FONT_FAMILY}`;
      ctx.textAlign = dir.x === 0 ? 'center' : dir.x > 0 ? 'right' : 'left';
      ctx.textBaseline = dir.y === 0 ? 'middle' : dir.y < 0 ? 'top' : 'bottom';
      ctx.fillText(text, tail.x - dir.x * 4, tail.y - dir.y * 4);
    }
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const { points } = this.outline(state, viewport);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    return inRect(point, box, tolerance);
  }
}

export const ICON_GLYPHS = ['star', 'heart', 'check', 'cross', 'circle', 'triangleUp', 'triangleDown', 'bolt'] as const;
export type IconGlyph = (typeof ICON_GLYPHS)[number];

/** Trace `glyph` `size` across, centred on `c`: true when it is drawn with a stroke, not a fill. */
export function traceGlyph(ctx: CanvasRenderingContext2D, glyph: IconGlyph, c: Point, size: number): boolean {
  const r = size / 2;
  ctx.beginPath();
  switch (glyph) {
    case 'star':
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r * 0.42;
        const x = c.x + Math.cos(angle) * radius;
        const y = c.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      return false;
    case 'heart':
      ctx.moveTo(c.x, c.y + r * 0.85);
      ctx.bezierCurveTo(c.x - r * 1.3, c.y - r * 0.1, c.x - r * 0.6, c.y - r * 1.1, c.x, c.y - r * 0.35);
      ctx.bezierCurveTo(c.x + r * 0.6, c.y - r * 1.1, c.x + r * 1.3, c.y - r * 0.1, c.x, c.y + r * 0.85);
      ctx.closePath();
      return false;
    case 'check':
      ctx.moveTo(c.x - r * 0.8, c.y);
      ctx.lineTo(c.x - r * 0.2, c.y + r * 0.6);
      ctx.lineTo(c.x + r * 0.85, c.y - r * 0.65);
      return true;
    case 'cross':
      ctx.moveTo(c.x - r * 0.7, c.y - r * 0.7);
      ctx.lineTo(c.x + r * 0.7, c.y + r * 0.7);
      ctx.moveTo(c.x + r * 0.7, c.y - r * 0.7);
      ctx.lineTo(c.x - r * 0.7, c.y + r * 0.7);
      return true;
    case 'circle':
      ctx.arc(c.x, c.y, r * 0.8, 0, Math.PI * 2);
      return false;
    case 'triangleUp':
      ctx.moveTo(c.x, c.y - r * 0.85);
      ctx.lineTo(c.x + r * 0.9, c.y + r * 0.7);
      ctx.lineTo(c.x - r * 0.9, c.y + r * 0.7);
      ctx.closePath();
      return false;
    case 'triangleDown':
      ctx.moveTo(c.x, c.y + r * 0.85);
      ctx.lineTo(c.x + r * 0.9, c.y - r * 0.7);
      ctx.lineTo(c.x - r * 0.9, c.y - r * 0.7);
      ctx.closePath();
      return false;
    case 'bolt':
      ctx.moveTo(c.x + r * 0.15, c.y - r);
      ctx.lineTo(c.x - r * 0.6, c.y + r * 0.1);
      ctx.lineTo(c.x - r * 0.05, c.y + r * 0.1);
      ctx.lineTo(c.x - r * 0.15, c.y + r);
      ctx.lineTo(c.x + r * 0.6, c.y - r * 0.1);
      ctx.lineTo(c.x + r * 0.05, c.y - r * 0.1);
      ctx.closePath();
      return false;
  }
}

/** A small symbol (star, heart, tick, cross…) marking a bar and price. */
export class IconTool extends DrawingBase {
  descriptor = {
    type: 'icon' as const,
    name: 'Icon',
    requiredAnchors: 1,
    options: {
      glyph: {
        kind: 'choice' as const,
        label: 'Icon',
        default: 'star',
        choices: [
          { value: 'star', label: 'Star' },
          { value: 'heart', label: 'Heart' },
          { value: 'check', label: 'Check' },
          { value: 'cross', label: 'Cross' },
          { value: 'circle', label: 'Circle' },
          { value: 'triangleUp', label: 'Triangle up' },
          { value: 'triangleDown', label: 'Triangle down' },
          { value: 'bolt', label: 'Bolt' },
        ],
      },
      size: { kind: 'number' as const, label: 'Size', default: 22, min: 10, max: 80, step: 2 },
    },
  };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const c = this.anchorToPixel(state.anchors[0], viewport);
    const size = this.option<number>(state, 'size');
    const glyph = this.option<string>(state, 'glyph') as IconGlyph;
    const stroked = traceGlyph(ctx, ICON_GLYPHS.includes(glyph) ? glyph : 'star', c, size);
    if (stroked) {
      ctx.strokeStyle = state.style.color;
      ctx.lineWidth = Math.max(2, size / 8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    } else {
      ctx.fillStyle = state.style.color;
      ctx.fill();
    }
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const c = this.anchorToPixel(state.anchors[0], viewport);
    const half = this.option<number>(state, 'size') / 2;
    return Math.abs(point.x - c.x) <= half + tolerance && Math.abs(point.y - c.y) <= half + tolerance;
  }
}
