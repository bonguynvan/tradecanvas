import type { TradingOrder, TradingConfig, ViewportState, Theme } from '@chart-lib/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH } from '@chart-lib/commons';

export interface DragState {
  orderId: string;
  sourceType: 'order' | 'stopLoss' | 'takeProfit';
  startPrice: number;
  currentPrice: number;
}

export class OrderRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    orders: TradingOrder[],
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
    dragState: DragState | null,
  ): void {
    const buyColor = config.orderColors?.buy ?? '#26A69A';
    const sellColor = config.orderColors?.sell ?? '#EF5350';
    const precision = config.pricePrecision ?? 2;
    const { chartRect } = viewport;

    for (const order of orders) {
      const isDragging = dragState?.orderId === order.id && dragState.sourceType === 'order';
      const price = isDragging ? dragState!.currentPrice : order.price;
      const y = priceToY(price, viewport);

      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;

      const color = order.side === 'buy' ? buyColor : sellColor;

      // Dashed order line
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Order type label (left side)
      const label = order.label ?? order.type.toUpperCase();
      ctx.font = `bold 10px ${theme.font.family}`;
      const labelWidth = ctx.measureText(label).width + 8;
      ctx.fillStyle = color;
      ctx.fillRect(chartRect.x + 4, y - 8, labelWidth, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(label, chartRect.x + 8, y);

      // Price + qty badge (right axis)
      const priceText = `${price.toFixed(precision)} x ${order.quantity}`;
      ctx.font = `11px ${theme.font.family}`;
      const badgeWidth = ctx.measureText(priceText).width + 10;
      const axisX = chartRect.x + chartRect.width + 1;
      ctx.fillStyle = color;
      ctx.fillRect(axisX, y - 9, Math.min(badgeWidth, PRICE_AXIS_WIDTH - 2), 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(priceText, axisX + 5, y);

      // Side indicator (small triangle)
      const triX = chartRect.x + 4 + labelWidth + 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (order.side === 'buy') {
        ctx.moveTo(triX, y + 4);
        ctx.lineTo(triX + 5, y - 2);
        ctx.lineTo(triX + 10, y + 4);
      } else {
        ctx.moveTo(triX, y - 4);
        ctx.lineTo(triX + 5, y + 2);
        ctx.lineTo(triX + 10, y - 4);
      }
      ctx.fill();

      // Ghost line at original price if dragging
      if (isDragging) {
        const origY = priceToY(dragState!.startPrice, viewport);
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(chartRect.x, Math.round(origY) + 0.5);
        ctx.lineTo(chartRect.x + chartRect.width, Math.round(origY) + 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
    }
  }

  hitTest(
    y: number,
    orders: TradingOrder[],
    viewport: ViewportState,
    tolerance: number,
  ): TradingOrder | null {
    for (const order of orders) {
      if (order.draggable === false) continue;
      const orderY = priceToY(order.price, viewport);
      if (Math.abs(y - orderY) <= tolerance) return order;
    }
    return null;
  }
}
