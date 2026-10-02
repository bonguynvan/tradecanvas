import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { timeToX } from '../../viewport/ScaleMapping.js';
import { levelList } from './options.js';

/**
 * Vertical lines at Fibonacci intervals (1, 2, 3, 5, 8, 13, 21, 34, 55)
 * measured from a two-anchor time span. The first anchor defines time 0,
 * the second defines the unit (1× span). Each level i draws a vertical line
 * at `anchorA.time + (anchorB.time - anchorA.time) * fib[i]`.
 *
 * Useful for projecting future turning points based on prior swing duration.
 */
export const FIB_TIME_LEVELS = [1, 2, 3, 5, 8, 13, 21, 34, 55];

export class FibTimeZonesTool extends DrawingBase {
  descriptor = {
    type: 'fibTimeZones' as const,
    name: 'Fibonacci Time Zones',
    requiredAnchors: 2,
    options: { levels: { kind: 'levels' as const, label: 'Levels', default: levelList(FIB_TIME_LEVELS, [0, 89, 144]) } },
  };

  render(
    ctx: CanvasRenderingContext2D,
    state: DrawingState,
    viewport: ViewportState,
    selected: boolean,
  ): void {
    if (state.anchors.length < 2) return;
    const anchorA = state.anchors[0];
    const anchorB = state.anchors[1];
    const unit = anchorB.time - anchorA.time;
    if (unit === 0) return;

    const { chartRect } = viewport;
    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    for (const { value: mult, color } of this.visibleLevels(state)) {
      this.applyLineStyle(ctx, { ...state.style, color: color ?? state.style.color });
      const t = anchorA.time + unit * mult;
      const x = timeToX(t, viewport);
      if (x < chartRect.x || x > chartRect.x + chartRect.width) continue;

      ctx.globalAlpha = mult === 1 ? 1 : 0.55;
      ctx.beginPath();
      ctx.moveTo(x, chartRect.y);
      ctx.lineTo(x, chartRect.y + chartRect.height);
      ctx.stroke();

      ctx.fillStyle = color ?? state.style.color;
      ctx.fillText(String(mult), x, chartRect.y + 2);
    }
    ctx.globalAlpha = 1;
    this.resetLineStyle(ctx);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(
    point: Point,
    state: DrawingState,
    viewport: ViewportState,
    tolerance: number,
  ): boolean {
    if (state.anchors.length < 2) return false;
    const anchorA = state.anchors[0];
    const anchorB = state.anchors[1];
    const unit = anchorB.time - anchorA.time;
    if (unit === 0) return false;
    const { chartRect } = viewport;
    if (point.y < chartRect.y || point.y > chartRect.y + chartRect.height) {
      return false;
    }
    for (const { value: mult } of this.visibleLevels(state)) {
      const t = anchorA.time + unit * mult;
      const x = timeToX(t, viewport);
      if (Math.abs(point.x - x) <= tolerance) return true;
    }
    return false;
  }
}
