import { fillTextWithHalo } from './labels.js';
import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { fibLevelList } from './options.js';
import { readableText, roleFont } from '../drawingLook.js';

/** How strongly the reference box from A to B shows. */
const BOX_ALPHA = 0.4;
/** How strongly the rays other than the 1/1 show. */
const RAY_ALPHA = 0.8;
/** How far a ray's label sits past the box, px. */
const LABEL_GAP = 4;

export const SPEED_FAN_LEVELS = [0.25, 0.382, 0.5, 0.618, 0.75];

/** Far end of a ray from `from` through `through`, well past the chart. */
function rayEnd(from: Point, through: Point, viewport: ViewportState): Point | null {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const ext = (viewport.chartRect.width + viewport.chartRect.height) * 2;
  return { x: from.x + (dx / len) * ext, y: from.y + (dy / len) * ext };
}

/**
 * Points the fan's rays pass through: price levels along B's vertical,
 * time levels along B's horizontal, and B itself (the 1/1 line).
 */
export function speedFanTargets(
  a: Point,
  b: Point,
  levels: readonly number[] = SPEED_FAN_LEVELS,
): { level: number; kind: 'price' | 'time' | 'diagonal'; point: Point }[] {
  const targets: { level: number; kind: 'price' | 'time' | 'diagonal'; point: Point }[] = [
    { level: 1, kind: 'diagonal', point: b },
  ];
  for (const level of levels) {
    targets.push({ level, kind: 'price', point: { x: b.x, y: a.y + (b.y - a.y) * level } });
    targets.push({ level, kind: 'time', point: { x: a.x + (b.x - a.x) * level, y: b.y } });
  }
  return targets;
}

/**
 * Fibonacci Speed Resistance Fan: rays from A through Fibonacci fractions of
 * the A→B move, measured both in price and in time.
 */
export class FibSpeedResistanceFanTool extends DrawingBase {
  descriptor = {
    type: 'fibSpeedResistanceFan' as const,
    name: 'Fib Speed Resistance Fan',
    requiredAnchors: 2,
    options: { levels: { kind: 'levels' as const, label: 'Levels', default: fibLevelList(SPEED_FAN_LEVELS, [0.236, 0.786]) } },
  };

  private targets(state: DrawingState, a: Point, b: Point) {
    return speedFanTargets(a, b, this.visibleLevels(state).map((level) => level.value));
  }

  /** A level's colour, the drawing's when it has none. */
  private colorOf(state: DrawingState, level: number): string {
    return this.visibleLevels(state).find((l) => l.value === level)?.color ?? state.style.color;
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);

    // The reference box A..B, a sharp 1 px guide.
    ctx.save();
    this.applyGuideStyle(ctx, state.style.color);
    ctx.globalAlpha = BOX_ALPHA;
    this.strokeCrispRect(ctx, Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    ctx.restore();

    ctx.font = roleFont('label');
    const right = b.x >= a.x;
    const down = b.y >= a.y;
    for (const target of this.targets(state, a, b)) {
      const end = rayEnd(a, target.point, viewport);
      if (!end) continue;
      // Each ray in its level's colour; the time rays dashed, so they read apart from the price rays.
      const color = target.kind === 'diagonal' ? state.style.color : this.colorOf(state, target.level);
      this.applyLineStyle(ctx, { ...state.style, color, lineStyle: target.kind === 'time' ? 'dashed' : state.style.lineStyle });
      ctx.globalAlpha = target.kind === 'diagonal' ? 1 : RAY_ALPHA;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (target.kind === 'diagonal') continue;
      // Its ratio past the box: price rays beside B's side, time rays under (or over) B's edge.
      ctx.globalAlpha = 1;
      ctx.fillStyle = readableText(color);
      if (target.kind === 'price') {
        ctx.textAlign = right ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        fillTextWithHalo(ctx, String(target.level), target.point.x + (right ? LABEL_GAP : -LABEL_GAP), target.point.y);
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = down ? 'top' : 'bottom';
        fillTextWithHalo(ctx, String(target.level), target.point.x, target.point.y + (down ? LABEL_GAP : -LABEL_GAP));
      }
    }
    ctx.globalAlpha = 1;
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);
    for (const target of this.targets(state, a, b)) {
      const end = rayEnd(a, target.point, viewport);
      if (end && this.distanceToLine(point, a, end) <= tolerance) return true;
    }
    return false;
  }
}
