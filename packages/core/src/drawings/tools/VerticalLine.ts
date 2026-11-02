import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawPill, drawingFont, PILL_HEIGHT } from './labels.js';
import { drawLineText } from './lineText.js';

/** How far the time label sits above the plot's foot (px). */
const TIME_LABEL_GAP = 4;

export class VerticalLineTool extends DrawingBase {
  descriptor = {
    type: 'verticalLine' as const,
    name: 'Vertical Line',
    requiredAnchors: 1,
    text: true,
    options: { showTime: { kind: 'boolean' as const, label: 'Show time', default: false } },
  };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;
    const bottom = chartRect.y + chartRect.height;
    this.applyLineStyle(ctx, state.style);
    this.strokeVertical(ctx, p.x, chartRect.y, bottom);
    this.resetLineStyle(ctx);
    drawLineText(ctx, state.style, { x: p.x, y: bottom }, { x: p.x, y: chartRect.y });
    // The bar's time on a tag at the line's foot, as the chart writes it under the crosshair.
    if (this.option<boolean>(state, 'showTime') && viewport.formatTime) {
      const text = viewport.formatTime(state.anchors[0].time);
      ctx.font = drawingFont(11);
      const width = ctx.measureText(text).width + 12;
      drawPill(ctx, text, p.x - width / 2, bottom - TIME_LABEL_GAP - PILL_HEIGHT / 2, state.style.color);
    }
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;
    return Math.abs(point.x - p.x) <= tolerance &&
      point.y >= chartRect.y && point.y <= chartRect.y + chartRect.height;
  }
}
