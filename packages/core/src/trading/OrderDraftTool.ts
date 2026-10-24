import type {
  OrderSide,
  OrderType,
  OrderPlaceIntent,
  Point,
  ViewportState,
  Theme,
} from '@tradecanvas/commons';
import { priceTagText } from '@tradecanvas/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import { inPlot, levelLine } from './plot.js';
import { orderKindText } from './OrderRenderer.js';
import { drawAxisBadge, drawTags, type AxisBadge, type TradingTag } from './tradingTags.js';

export interface OrderDraft {
  side: OrderSide;
  price: number;
  quantity: number;
}

/**
 * Infer an order type from the draft price relative to the market: a buy below
 * (or sell above) the market is a resting limit; a buy above (or sell below) is
 * a stop. With no market price known, defaults to limit. Pure and testable.
 */
export function inferOrderType(
  side: OrderSide,
  price: number,
  marketPrice: number | null,
): OrderType {
  if (marketPrice == null) return 'limit';
  if (side === 'buy') return price <= marketPrice ? 'limit' : 'stop';
  return price >= marketPrice ? 'limit' : 'stop';
}

const HANDLE_TOLERANCE = 6;
/** The draft's line: dashed, as an order's. */
const DRAFT_DASH = [6, 3];

/**
 * In-progress single-order placement: one draggable price line whose order type
 * (limit/stop) is derived from where it sits relative to the market. Geometry
 * and state only — the `TradingManager` owns lifecycle and emits `orderPlace`
 * on confirm. Mirrors `BracketTool`.
 */
export class OrderDraftTool {
  private draft: OrderDraft | null = null;
  /** The draft as the drag found it, to put back if the drag is called off. */
  private dragStart: OrderDraft | null = null;
  private dragging = false;

  start(side: OrderSide, price: number, quantity = 1): void {
    this.draft = { side, price, quantity };
    this.dragging = false;
  }

  cancel(): void {
    this.draft = null;
    this.dragging = false;
  }

  isActive(): boolean {
    return this.draft !== null;
  }

  isDragging(): boolean {
    return this.dragging;
  }

  getDraft(): OrderDraft | null {
    return this.draft ? { ...this.draft } : null;
  }

  /** Update the draft price directly (used by drag; pure and testable). */
  setPrice(price: number): boolean {
    if (!this.draft) return false;
    this.draft = { ...this.draft, price };
    return true;
  }

  /** Build the place intent, inferring the type from the market price. */
  toIntent(marketPrice: number | null): OrderPlaceIntent | null {
    if (!this.draft) return null;
    return {
      side: this.draft.side,
      type: inferOrderType(this.draft.side, this.draft.price, marketPrice),
      price: this.draft.price,
      quantity: this.draft.quantity,
    };
  }

  hitTest(pos: Point, viewport: ViewportState, tolerance = HANDLE_TOLERANCE): boolean {
    if (!this.draft) return false;
    return Math.abs(priceToY(this.draft.price, viewport) - pos.y) <= tolerance;
  }

  beginDrag(pos: Point, viewport: ViewportState, tolerance?: number): boolean {
    return this.hitTest(pos, viewport, tolerance) && this.beginDragOn();
  }

  /** Drag the line, pressed by its tag. */
  beginDragOn(): boolean {
    if (!this.draft) return false;
    this.dragging = true;
    this.dragStart = this.draft;
    return true;
  }

  /** Call the drag off: the line goes back to where it was. */
  cancelDrag(): void {
    if (this.dragging && this.dragStart) this.draft = this.dragStart;
    this.dragging = false;
    this.dragStart = null;
  }

  drag(pos: Point, viewport: ViewportState): boolean {
    if (!this.draft || !this.dragging) return false;
    return this.setPrice(yToPrice(pos.y, viewport));
  }

  endDrag(): void {
    this.dragging = false;
    this.dragStart = null;
  }

  /** The line and its tag (`pricePrecision` is for the axis badge, drawn apart). */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    marketPrice: number | null,
    _pricePrecision?: number,
  ): void {
    this.renderLines(ctx, viewport, theme);
    drawTags(ctx, this.tags(viewport, theme, marketPrice), viewport, theme, []);
  }

  /** The draft's line, dashed as an order's. */
  renderLines(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    const d = this.draft;
    if (!d) return;
    ctx.save();
    levelLine(ctx, viewport, priceToY(d.price, viewport), draftColor(d.side, theme), DRAFT_DASH);
    ctx.restore();
  }

  /** Its tag, a handle for the line: the quantity, then the order it will be ("Buy limit"). */
  tags(viewport: ViewportState, theme: Theme, marketPrice: number | null): TradingTag[] {
    const d = this.draft;
    if (!d) return [];
    const y = priceToY(d.price, viewport);
    if (!inPlot(y, viewport)) return [];
    const type = inferOrderType(d.side, d.price, marketPrice);
    return [{
      y,
      color: draftColor(d.side, theme),
      grab: { kind: 'draft' },
      cells: [{ kind: 'stamp', text: String(d.quantity) }, { kind: 'text', text: orderKindText({ side: d.side, type }) }],
    }];
  }

  /** Its price on the price axis. */
  renderAxisBadges(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, pricePrecision?: number): void {
    for (const badge of this.axisBadges(viewport, theme, pricePrecision)) {
      drawAxisBadge(ctx, badge.y, badge.text, badge.color, viewport, theme);
    }
  }

  /** The price it puts on the axis (on the plot). */
  axisBadges(viewport: ViewportState, theme: Theme, pricePrecision?: number): AxisBadge[] {
    const d = this.draft;
    if (!d) return [];
    const y = priceToY(d.price, viewport);
    return inPlot(y, viewport) ? [{ y, text: priceTagText(d.price, viewport, pricePrecision), color: draftColor(d.side, theme) }] : [];
  }
}

/** As the order will draw: the style keys' colours, else the candles'. */
function draftColor(side: OrderSide, theme: Theme): string {
  return side === 'buy' ? theme.style?.trading.buy ?? theme.candleUp : theme.style?.trading.sell ?? theme.candleDown;
}
