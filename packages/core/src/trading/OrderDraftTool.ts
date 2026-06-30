import type {
  OrderSide,
  OrderType,
  OrderPlaceIntent,
  Point,
  ViewportState,
  Theme,
} from '@tradecanvas/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';

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

/**
 * In-progress single-order placement: one draggable price line whose order type
 * (limit/stop) is derived from where it sits relative to the market. Geometry
 * and state only — the `TradingManager` owns lifecycle and emits `orderPlace`
 * on confirm. Mirrors `BracketTool`.
 */
export class OrderDraftTool {
  private draft: OrderDraft | null = null;
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

  hitTest(pos: Point, viewport: ViewportState): boolean {
    if (!this.draft) return false;
    return Math.abs(priceToY(this.draft.price, viewport) - pos.y) <= HANDLE_TOLERANCE;
  }

  beginDrag(pos: Point, viewport: ViewportState): boolean {
    if (!this.hitTest(pos, viewport)) return false;
    this.dragging = true;
    return true;
  }

  drag(pos: Point, viewport: ViewportState): boolean {
    if (!this.draft || !this.dragging) return false;
    return this.setPrice(yToPrice(pos.y, viewport));
  }

  endDrag(): void {
    this.dragging = false;
  }

  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    marketPrice: number | null,
    pricePrecision = 2,
  ): void {
    const d = this.draft;
    if (!d) return;
    const { chartRect } = viewport;
    const x0 = chartRect.x;
    const x1 = chartRect.x + chartRect.width;
    const y = priceToY(d.price, viewport);
    const type = inferOrderType(d.side, d.price, marketPrice);
    const color = d.side === 'buy' ? theme.candleUp : theme.candleDown;

    ctx.save();
    drawHLine(ctx, x0, x1, y, color, [6, 3]);
    const sideLabel = d.side === 'buy' ? 'BUY' : 'SELL';
    priceTag(
      ctx,
      x0 + 6,
      y,
      `${sideLabel} ${type.toUpperCase()} ${d.price.toFixed(pricePrecision)}`,
      color,
      theme.background,
    );
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x1 - 6, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  color: string,
  dash: number[],
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x0, Math.round(y) + 0.5);
  ctx.lineTo(x1, Math.round(y) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

function priceTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  bg: string,
): void {
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const w = ctx.measureText(text).width;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = bg;
  ctx.fillRect(x - 3, y - 8, w + 6, 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 0.5);
}
