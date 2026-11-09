import type { DrawingState, Point, ViewportState } from '@tradecanvas/commons';
import { DEFAULT_DRAWING_STYLE, withAlpha } from '@tradecanvas/commons';
import { DrawingBase } from '../DrawingBase.js';
import { drawPill, formatPriceChange, pillHeight, pillWidth } from './labels.js';
import { FILL_ALPHA, drawingLook, keepOnPlot, roleFont } from '../drawingLook.js';
import { fillMeasureHead } from './lineDecor.js';

/** How strongly the measured box's edge shows. */
const EDGE_ALPHA = 0.6;
/** How far the change's tag sits off the box, px. */
const TAG_GAP = 6;

/**
 * Price Range: a box from one price to another, tinted and edged in the
 * rise or fall colour, an arrow up or down its middle, and the change on a
 * tag just past the end it went to.
 */
export class PriceRangeTool extends DrawingBase {
  descriptor = { type: 'priceRange' as const, name: 'Price Range', requiredAnchors: 2 };

  render(ctx: CanvasRenderingContext2D, state: DrawingState, viewport: ViewportState, selected: boolean): void {
    if (state.anchors.length < 2) return;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x = Math.min(p1.x, p2.x), w = Math.abs(p2.x - p1.x);
    const top = Math.min(p1.y, p2.y), h = Math.abs(p2.y - p1.y);
    const look = drawingLook();
    const isUp = state.anchors[1].price >= state.anchors[0].price;
    // A colour picked for it wins; the default line colour means "say rise or fall".
    const own = state.style.color.toLowerCase() !== DEFAULT_DRAWING_STYLE.color;
    const color = own ? state.style.color : isUp ? look.rise : look.fall;

    ctx.fillStyle = withAlpha(color, FILL_ALPHA);
    ctx.fillRect(x, top, w, h);
    // Its edge 1 px and sharp, lighter than the arrow that is the measure.
    ctx.save();
    this.applyGuideStyle(ctx, color);
    ctx.globalAlpha = EDGE_ALPHA;
    this.strokeCrispRect(ctx, x, top, w, h);
    ctx.restore();

    // The arrow up or down the box's middle, from the first price to the second.
    const midX = x + w / 2;
    this.applyLineStyle(ctx, { ...state.style, color });
    ctx.beginPath();
    ctx.moveTo(midX, p1.y);
    ctx.lineTo(midX, p2.y);
    ctx.stroke();
    this.resetLineStyle(ctx);
    fillMeasureHead(ctx, { x: midX, y: p1.y }, { x: midX, y: p2.y }, color, state.style.lineWidth);

    // The change on a tag past the end it went to: over the box for a rise, under it for a fall.
    ctx.font = roleFont('label');
    const text = formatPriceChange(state.anchors[0].price, state.anchors[1].price, viewport);
    const tagW = pillWidth(ctx, text);
    const tagH = pillHeight();
    const tagTop = isUp ? top - TAG_GAP - tagH : top + h + TAG_GAP;
    const at = keepOnPlot(midX - tagW / 2, tagTop, tagW, tagH);
    drawPill(ctx, text, at.left, at.top + tagH / 2, color);

    if (selected) this.renderAnchorHandles(ctx, state, viewport);
  }

  hitTest(point: Point, state: DrawingState, viewport: ViewportState, tolerance: number): boolean {
    if (state.anchors.length < 2) return false;
    const p1 = this.anchorToPixel(state.anchors[0], viewport);
    const p2 = this.anchorToPixel(state.anchors[1], viewport);
    const x1 = Math.min(p1.x, p2.x), x2 = Math.max(p1.x, p2.x);
    const y1 = Math.min(p1.y, p2.y), y2 = Math.max(p1.y, p2.y);
    return point.x >= x1 - tolerance && point.x <= x2 + tolerance && point.y >= y1 - tolerance && point.y <= y2 + tolerance;
  }
}
