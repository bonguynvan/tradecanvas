import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { resolveBarIndex } from '../../viewport/ScaleMapping.js';
import { formatPriceChange, drawingFont, belowKeepOut, overlapsKeepOut } from './labels.js';

export class MeasureTool extends DrawingBase {
  descriptor = { type: 'measure' as const, name: 'Measure', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);

    // Dotted line from p1 to p2
    this.applyLineStyle(ctx, state.style);
    ctx.setLineDash([4, 4]); // Always dashed for measure
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    this.resetLineStyle(ctx);

    // Info label — resolve bar indices so the bar count is correct even when
    // anchor.time is a real timestamp (timestamp mode is the new default).
    const idx0 = resolveBarIndex(state.anchors[0].time, viewport);
    const idx1 = resolveBarIndex(state.anchors[1].time, viewport);
    const barsDiff = Math.max(0, Math.round(Math.abs(idx1 - idx0)));

    const lines = [
      `Price: ${formatPriceChange(state.anchors[0].price, state.anchors[1].price, viewport)}`,
      `Bars: ${barsDiff}`,
    ];

    ctx.font = drawingFont(11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // The box centred over the middle of the measure, its foot there, moved
    // onto the plot where that would run off it (a measure by its edge).
    const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const box = labelBox((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, textWidth, lines.length, viewport);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(box.x, box.y, box.width, box.height);

    ctx.fillStyle = '#FFFFFF';
    const centerX = box.x + box.width / 2;
    const lastBaseline = box.y + box.height - LABEL_PAD_Y;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], centerX, lastBaseline - (lines.length - 1 - i) * LINE_HEIGHT);
    }

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    return this.distanceToLine(point, p1, p2) <= tolerance;
  }
}

/** A label line's height, and the room around the lines in their box (px). */
const LINE_HEIGHT = 14;
const LABEL_PAD_X = 6;
const LABEL_PAD_Y = 4;

/**
 * The label's box for `lineCount` lines `textWidth` wide: centred on
 * `centerX` with its foot at `footY`, then moved onto the plot by as
 * much as it would run off it, and under the legend where it covers it.
 */
function labelBox(centerX: number, footY: number, textWidth: number, lineCount: number, viewport: ViewportState) {
  const { chartRect } = viewport;
  const width = textWidth + 2 * LABEL_PAD_X;
  const height = lineCount * LINE_HEIGHT + 2 * LABEL_PAD_Y;
  const x = clamp(centerX - width / 2, chartRect.x, chartRect.x + chartRect.width - width);
  const y = clamp(footY - height + LABEL_PAD_Y, chartRect.y, chartRect.y + chartRect.height - height);
  // Over the legend's rows (a measure at the plot's top): under them, where the plot has room.
  if (!overlapsKeepOut(x, y, x + width, y + height)) return { x, y, width, height };
  const under = belowKeepOut(x, x + width, y);
  return { x, y: under + height <= chartRect.y + chartRect.height ? under : y, width, height };
}

/** `value` within `min` and `max`; at `min` when they cross (a box wider than the plot). */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
