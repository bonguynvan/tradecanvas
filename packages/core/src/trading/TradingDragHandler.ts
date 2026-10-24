import type { TradingOrder, TradingPosition, ViewportState, Point } from '@tradecanvas/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import type { DragState } from './OrderRenderer.js';
import { inPlot } from './plot.js';

export interface DragResult {
  sourceType: 'order' | 'stopLoss' | 'takeProfit';
  id: string;
  newPrice: number;
  previousPrice: number;
}

/** A position's prices a drag can move. */
const STOPS = ['stopLoss', 'takeProfit'] as const;

export class TradingDragHandler {
  private dragState: DragState | null = null;
  private startY = 0;
  private dragging = false;

  constructor(private dragThreshold = 3) {}

  /** A press at `pos`: the first order line within `tolerance`, else the first stop or target. */
  onPointerDown(
    pos: Point,
    orders: TradingOrder[],
    positions: TradingPosition[],
    viewport: ViewportState,
    tolerance: number,
  ): boolean {
    const near = (price: number) => {
      const y = priceToY(price, viewport);
      return inPlot(y, viewport) && Math.abs(pos.y - y) <= tolerance;
    };
    const order = orders.find((o) => o.draggable !== false && near(o.price));
    if (order) return this.beginOrder(order, pos.y);
    for (const position of positions) {
      for (const which of STOPS) {
        const price = position[which];
        if (price !== undefined && near(price)) return this.beginStop(position, which, pos.y);
      }
    }
    return false;
  }

  /** Drag `order`'s line, pressed at `y`. */
  beginOrder(order: TradingOrder, y: number): boolean {
    if (order.draggable === false) return false;
    return this.start({ orderId: order.id, sourceType: 'order', startPrice: order.price, currentPrice: order.price }, y);
  }

  /** Drag `position`'s stop or target, pressed at `y`. */
  beginStop(position: TradingPosition, which: 'stopLoss' | 'takeProfit', y: number): boolean {
    const price = position[which];
    if (price === undefined) return false;
    return this.start({ orderId: position.id, sourceType: which, startPrice: price, currentPrice: price }, y);
  }

  private start(state: DragState, y: number): boolean {
    this.dragState = state;
    this.startY = y;
    this.dragging = false;
    return true;
  }

  onPointerMove(pos: Point, viewport: ViewportState): boolean {
    if (!this.dragState) return false;

    if (!this.dragging) {
      if (Math.abs(pos.y - this.startY) < this.dragThreshold) return true;
      this.dragging = true;
    }

    this.dragState.currentPrice = yToPrice(pos.y, viewport);
    return true;
  }

  onPointerUp(): DragResult | null {
    if (!this.dragState) return null;
    const state = this.dragState;
    this.dragState = null;

    if (!this.dragging) return null;
    this.dragging = false;

    return {
      sourceType: state.sourceType,
      id: state.orderId,
      newPrice: state.currentPrice,
      previousPrice: state.startPrice,
    };
  }

  /** Drop the drag: the line goes back to where it was, nothing to report. */
  cancel(): boolean {
    if (!this.dragState) return false;
    this.dragState = null;
    this.dragging = false;
    return true;
  }

  getDragState(): DragState | null {
    return this.dragState;
  }

  isActive(): boolean {
    return this.dragState !== null;
  }
}
