import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawPill, drawingFont, PILL_HEIGHT } from './labels.js';
import { drawLineText, TextHitCache } from './lineText.js';

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
    // Words not drawn this time (no text, the line off the plot or its points together) are not there to click.
    this.texts.set(state.id, null);
    if (state.anchors.length < 1) return;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;
    const bottom = chartRect.y + chartRect.height;
    this.applyLineStyle(ctx, state.style);
    this.strokeVertical(ctx, p.x, chartRect.y, bottom);
    this.resetLineStyle(ctx);
    const time = this.option<boolean>(state, 'showTime') ? this.timeText(state, viewport) : null;
    // The text starts above the time's tag, when there is one.
    const foot = time ? bottom - TIME_LABEL_GAP * 2 - PILL_HEIGHT : bottom;
    this.texts.set(state.id, drawLineText(ctx, state.style, { x: p.x, y: foot }, { x: p.x, y: chartRect.y }));
    // The bar's time on a tag at the line's foot, as the chart writes it under the crosshair.
    if (time) {
      ctx.font = drawingFont(11);
      const width = ctx.measureText(time).width + 12;
      drawPill(ctx, time, p.x - width / 2, bottom - TIME_LABEL_GAP - PILL_HEIGHT / 2, state.style.color);
    }
    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  /** The bar's time as the chart writes it; null without a format, or when a host's formatter fails. */
  private timeText(state: DrawingState, viewport: ViewportState): string | null {
    if (!viewport.formatTime) return null;
    try {
      return viewport.formatTime(state.anchors[0].time);
    } catch {
      // A host's time formatter that throws costs the label, not the whole drawing pass.
      return null;
    }
  }

  /** Its text's box as last drawn: a click on the words picks it. */
  private texts = new TextHitCache();

  /** Where its words were drawn: the toolbar over a selection keeps clear of them. */
  textBox(state: DrawingState): { x: number; y: number; width: number; height: number } | null {
    return this.texts.bounds(state.id);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    return this.texts.hit(state.id, point, tolerance) || this.hitShape(point, state, viewport, tolerance);
  }

  private hitShape(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 1) return false;
    const p = this.anchorToPixel(state.anchors[0], viewport);
    const { chartRect } = viewport;
    return Math.abs(point.x - p.x) <= tolerance &&
      point.y >= chartRect.y && point.y <= chartRect.y + chartRect.height;
  }
}
