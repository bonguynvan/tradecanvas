import { clearSpot, fillTextWithHalo, type LabelBox } from './labels.js';
import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { fibLevelList } from './options.js';
import { drawingLook, readableText, roleFont } from '../drawingLook.js';

/** How strongly the levels between the channel's sides show. */
const INNER_ALPHA = 0.7;
/** How far left of a level's start its label sits, px: clear of a handle there. */
const LABEL_GAP = 10;

export const FIB_CHANNEL_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];

/**
 * Perpendicular offset from line AB to point C. Level L of the channel is AB
 * shifted by L times this, so level 1 passes through C.
 */
function channelOffset(a: Point, b: Point, c: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: c.x - a.x, y: c.y - a.y };
  const t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / lenSq;
  return { x: c.x - (a.x + t * dx), y: c.y - (a.y + t * dy) };
}

/** Segment of channel level `level` (AB shifted toward C). */
export function fibChannelSegment(a: Point, b: Point, c: Point, level: number): [Point, Point] {
  const off = channelOffset(a, b, c);
  return [
    { x: a.x + off.x * level, y: a.y + off.y * level },
    { x: b.x + off.x * level, y: b.y + off.y * level },
  ];
}

/**
 * Fibonacci Channel: AB is the base trend line, C sets the channel width;
 * parallel lines sit at Fibonacci fractions of that width.
 */
export class FibChannelTool extends DrawingBase {
  descriptor = {
    type: 'fibChannel' as const,
    name: 'Fibonacci Channel',
    requiredAnchors: 3,
    options: { levels: { kind: 'levels' as const, label: 'Levels', default: fibLevelList(FIB_CHANNEL_LEVELS, [2.618, 3.618, 4.236]) } },
  };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);

    if (state.anchors.length < 3) {
      this.applyLineStyle(ctx, state.style);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      this.resetLineStyle(ctx);
      return;
    }

    const c = this.anchorToPixel(state.anchors[2], viewport);
    ctx.font = roleFont('label');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const levels = this.visibleLevels(state);
    for (const { value: level, color } of levels) {
      const [p, q] = fibChannelSegment(a, b, c, level);
      this.applyLineStyle(ctx, { ...state.style, color: color ?? state.style.color });
      ctx.globalAlpha = level === 0 || level === 1 ? 1 : INNER_ALPHA;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    // The labels at full strength, left of each level's start: 0 and 1 first, the others left
    // out where they would cover one.
    ctx.globalAlpha = 1;
    const size = drawingLook().sizes.label;
    const placed: LabelBox[] = [];
    const key = (v: number) => v === 0 || v === 1;
    for (const { value: level, color } of [...levels].sort((m, n) => Number(key(n.value)) - Number(key(m.value)))) {
      const [p, q] = fibChannelSegment(a, b, c, level);
      const left = p.x <= q.x ? p : q;
      const text = String(level);
      const width = ctx.measureText(text).width;
      const box = { left: left.x - LABEL_GAP - width, right: left.x - LABEL_GAP, top: left.y - size / 2, bottom: left.y + size / 2 };
      if (!clearSpot([box], placed) && !key(level)) continue;
      placed.push(box);
      ctx.fillStyle = readableText(color ?? state.style.color);
      fillTextWithHalo(ctx, text, box.right, left.y);
    }
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 3) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    const c = this.anchorToPixel(state.anchors[2], viewport);
    for (const { value: level } of this.visibleLevels(state)) {
      const [p, q] = fibChannelSegment(a, b, c, level);
      if (this.distanceToLine(point, p, q) <= tolerance) return true;
    }
    return false;
  }
}
