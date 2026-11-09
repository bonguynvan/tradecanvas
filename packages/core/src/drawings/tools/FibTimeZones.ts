import { belowKeepOut, clearSpot, fillTextWithHalo, type LabelBox } from './labels.js';
import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { timeToX } from '../../viewport/ScaleMapping.js';
import { levelList } from './options.js';
import { drawingLook, readableText, roleFont } from '../drawingLook.js';

/**
 * Vertical lines at Fibonacci intervals (1, 2, 3, 5, 8, 13, 21, 34, 55)
 * measured from a two-anchor time span. The first anchor defines time 0,
 * the second defines the unit (1× span). Each level i draws a vertical line
 * at `anchorA.time + (anchorB.time - anchorA.time) * fib[i]`.
 *
 * Useful for projecting future turning points based on prior swing duration.
 */
export const FIB_TIME_LEVELS = [1, 2, 3, 5, 8, 13, 21, 34, 55];

/** How strongly the zones past the unit show. */
const ZONE_ALPHA = 0.6;
/** How far under the plot's top the zones' numbers sit, px. */
const LABEL_TOP = 4;

export class FibTimeZonesTool extends DrawingBase {
  descriptor = {
    type: 'fibTimeZones' as const,
    name: 'Fibonacci Time Zones',
    requiredAnchors: 2,
    // The zone's start (0) is drawn: without it the zones hang from nothing.
    options: { levels: { kind: 'levels' as const, label: 'Levels', default: levelList([0, ...FIB_TIME_LEVELS], [89, 144]) } },
  };

  /** Its handles on the zone's start and its unit, by the plot's foot: the anchors' prices mean nothing to it. */
  protected override handlePoints(state: DrawingState, viewport: ViewportState): Point[] {
    return this.footHandles(state, viewport);
  }

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
    ctx.font = roleFont('label');
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    const size = drawingLook().sizes.label;
    const placed: LabelBox[] = [];
    for (const { value: mult, color } of this.visibleLevels(state)) {
      this.applyLineStyle(ctx, { ...state.style, color: color ?? state.style.color });
      const t = anchorA.time + unit * mult;
      const x = timeToX(t, viewport);
      if (x < chartRect.x || x > chartRect.x + chartRect.width) continue;

      // The start and the unit at full strength, the zones after them lighter; each on whole pixels.
      ctx.globalAlpha = mult === 0 || mult === 1 ? 1 : ZONE_ALPHA;
      this.strokeVertical(ctx, x, chartRect.y, chartRect.y + chartRect.height);

      // Its number by the plot's top, under the legend where that covers it; left out where it
      // would cover another's (zones a bar apart).
      ctx.globalAlpha = 1;
      const text = String(mult);
      const half = ctx.measureText(text).width / 2;
      const top = belowKeepOut(x - half, x + half, chartRect.y) + LABEL_TOP;
      const box = { left: x - half, right: x + half, top, bottom: top + size };
      if (!clearSpot([box], placed)) continue;
      placed.push(box);
      ctx.fillStyle = readableText(color ?? state.style.color);
      fillTextWithHalo(ctx, text, x, top);
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
