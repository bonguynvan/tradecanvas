import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { levelList } from './options.js';

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
    options: { levels: { kind: 'levels' as const, label: 'Levels', default: levelList(SPEED_FAN_LEVELS, [0.236, 0.786]) } },
  };

  private targets(state: DrawingState, a: Point, b: Point) {
    return speedFanTargets(a, b, this.visibleLevels(state).map((level) => level.value));
  }

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const a = this.anchorToPixel(state.anchors[0], viewport);
    const b = this.anchorToPixel(state.anchors[1], viewport);

    // Faint reference box A..B.
    ctx.strokeStyle = state.style.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    ctx.globalAlpha = 1;

    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'middle';
    for (const target of this.targets(state, a, b)) {
      const end = rayEnd(a, target.point, viewport);
      if (!end) continue;
      this.applyLineStyle(ctx, state.style);
      ctx.globalAlpha = target.kind === 'diagonal' ? 1 : 0.65;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (target.kind === 'price') {
        ctx.fillStyle = state.style.color;
        ctx.textAlign = b.x >= a.x ? 'left' : 'right';
        ctx.fillText(String(target.level), target.point.x + (b.x >= a.x ? 4 : -4), target.point.y);
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
