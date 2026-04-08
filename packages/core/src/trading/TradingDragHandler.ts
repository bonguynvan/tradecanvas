import type { TradingOrder, TradingPosition, ViewportState, Point } from '@chart-lib/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import type { DragState } from './OrderRenderer.js';

export interface DragResult {
  sourceType: 'order' | 'stopLoss' | 'takeProfit';
  id: string;
  newPrice: number;
  previousPrice: number;
}

export class TradingDragHandler {
  private dragState: DragState | null = null;
  private startY = 0;
  private dragging = false;

  constructor(private dragThreshold = 3) {}

  onPointerDown(
    pos: Point,
    orders: TradingOrder[],
    positions: TradingPosition[],
    viewport: ViewportState,
    tolerance: number,
  ): boolean {
    // Check order lines
    for (const order of orders) {
      if (order.draggable === false) continue;
      const y = priceToY(order.price, viewport);
      if (Math.abs(pos.y - y) <= tolerance) {
        this.dragState = {
          orderId: order.id,
          sourceType: 'order',
          startPrice: order.price,
          currentPrice: order.price,
        };
        this.startY = pos.y;
        this.dragging = false;
        return true;
      }
    }

    // Check SL/TP lines on positions
    for (const pos2 of positions) {
      if (pos2.stopLoss !== undefined) {
        const slY = priceToY(pos2.stopLoss, viewport);
        if (Math.abs(pos.y - slY) <= tolerance) {
          this.dragState = {
            orderId: pos2.id,
            sourceType: 'stopLoss',
            startPrice: pos2.stopLoss,
            currentPrice: pos2.stopLoss,
          };
          this.startY = pos.y;
          this.dragging = false;
          return true;
        }
      }
      if (pos2.takeProfit !== undefined) {
        const tpY = priceToY(pos2.takeProfit, viewport);
        if (Math.abs(pos.y - tpY) <= tolerance) {
          this.dragState = {
            orderId: pos2.id,
            sourceType: 'takeProfit',
            startPrice: pos2.takeProfit,
            currentPrice: pos2.takeProfit,
          };
          this.startY = pos.y;
          this.dragging = false;
          return true;
        }
      }
    }

    return false;
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

  getDragState(): DragState | null {
    return this.dragState;
  }

  isActive(): boolean {
    return this.dragState !== null;
  }
}
