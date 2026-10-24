import type { TradingOrder, TradingConfig, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { UI_ICONS, priceTagText } from '@tradecanvas/commons';
import type { LineButton } from './lineButtons.js';
import { inPlot, levelLine } from './plot.js';
import { amountAt, formatAmount } from './positionFormat.js';
import { drawAxisBadge, drawTags, type AxisBadge, type TagCell, type TradingTag } from './tradingTags.js';

export interface DragState {
  orderId: string;
  sourceType: 'order' | 'stopLoss' | 'takeProfit';
  startPrice: number;
  currentPrice: number;
}

/** A working order's line: long dashes. Its stop's and target's: dots, as prices it only brings. */
const ORDER_DASH = [6, 4];
const PLANNED_DASH = [2, 3];
/** Where a dragged order was: dotted and faint. */
const GHOST_DASH = [2, 4];
const GHOST_ALPHA = 0.3;

/** The words for an order's kind ("Buy limit", "Sell stop limit"), or its own label's for a stop or a target. */
export function orderKindText(order: Pick<TradingOrder, 'side' | 'type' | 'label'>): string {
  if (order.label === 'SL' || order.label === 'TP') return order.label;
  const kind = order.label ? order.label.toLowerCase() : order.type === 'stopLimit' ? 'stop limit' : order.type;
  return `${order.side === 'buy' ? 'Buy' : 'Sell'} ${kind}`;
}

function colorsOf(config: TradingConfig): { buy: string; sell: string; profit: string; loss: string } {
  return {
    buy: config.orderColors?.buy ?? '#1fa874',
    sell: config.orderColors?.sell ?? '#e8505b',
    profit: config.positionColors?.profit ?? '#1fa874',
    loss: config.positionColors?.loss ?? '#e8505b',
  };
}

/** Whether `order` is the one being dragged. */
function isDragged(order: TradingOrder, dragState: DragState | null): boolean {
  return dragState?.orderId === order.id && dragState.sourceType === 'order';
}

/** Where an order is drawn: where it is being dragged to, else its price. */
function priceOf(order: TradingOrder, dragState: DragState | null): number {
  return isDragged(order, dragState) ? dragState!.currentPrice : order.price;
}

export class OrderRenderer {
  /** The lines and their tags, the tags laid out among themselves. */
  render(
    ctx: CanvasRenderingContext2D,
    orders: TradingOrder[],
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
    dragState: DragState | null,
    buttons: LineButton[] = [],
  ): void {
    this.renderLines(ctx, orders, viewport, config, dragState);
    drawTags(ctx, this.tags(orders, viewport, config, dragState), viewport, theme, buttons);
  }

  /** Each order's line (and, while it is dragged, a ghost where it was), and its stop's and target's. */
  renderLines(
    ctx: CanvasRenderingContext2D,
    orders: TradingOrder[],
    viewport: ViewportState,
    config: TradingConfig,
    dragState: DragState | null,
  ): void {
    const colors = colorsOf(config);
    for (const order of orders) {
      const y = priceToY(priceOf(order, dragState), viewport);
      const color = order.side === 'buy' ? colors.buy : colors.sell;
      if (inPlot(y, viewport)) levelLine(ctx, viewport, y, color, ORDER_DASH);
      if (isDragged(order, dragState)) {
        ctx.globalAlpha = GHOST_ALPHA;
        levelLine(ctx, viewport, priceToY(dragState!.startPrice, viewport), color, GHOST_DASH);
        ctx.globalAlpha = 1;
      }
      for (const [price, stopColor] of [[order.stopLoss, colors.loss], [order.takeProfit, colors.profit]] as const) {
        const stopY = price === undefined ? NaN : priceToY(price, viewport);
        if (inPlot(stopY, viewport)) levelLine(ctx, viewport, stopY, stopColor, PLANNED_DASH);
      }
    }
  }

  /**
   * Each order's tag: its quantity, its side and kind, and a × that cancels
   * it; a tag on its stop and its target saying what they would make.
   */
  tags(orders: TradingOrder[], viewport: ViewportState, config: TradingConfig, dragState: DragState | null): TradingTag[] {
    const colors = colorsOf(config);
    const precision = config.pricePrecision ?? 2;
    const tags: TradingTag[] = [];
    for (const order of orders) {
      const price = priceOf(order, dragState);
      const y = priceToY(price, viewport);
      if (inPlot(y, viewport)) {
        const cells: TagCell[] = [
          { kind: 'stamp', text: String(order.quantity) },
          { kind: 'text', text: orderKindText(order) },
        ];
        if (config.lineButtons?.cancel !== false && !isDragged(order, dragState)) {
          cells.push({ kind: 'button', icon: UI_ICONS.x, action: { type: 'cancelOrder', orderId: order.id } });
        }
        const grab = order.draggable === false ? undefined : { kind: 'order' as const, orderId: order.id };
        tags.push({ y, color: order.side === 'buy' ? colors.buy : colors.sell, cells, grab });
      }
      for (const which of ['stopLoss', 'takeProfit'] as const) {
        const stop = order[which];
        const stopY = stop === undefined ? NaN : priceToY(stop, viewport);
        if (stop === undefined || !inPlot(stopY, viewport)) continue;
        const amount = amountAt(order.side, price, order.quantity, stop);
        tags.push({
          y: stopY,
          color: which === 'stopLoss' ? colors.loss : colors.profit,
          cells: [
            { kind: 'stamp', text: which === 'stopLoss' ? 'SL' : 'TP' },
            { kind: 'text', text: formatAmount(amount, precision, viewport.numberLocale), color: amount >= 0 ? colors.profit : colors.loss },
          ],
        });
      }
    }
    return tags;
  }

  /**
   * Each order's price on the price axis, written as the axis writes it.
   * Called after the price axis so they paint over its labels.
   */
  renderAxisBadges(
    ctx: CanvasRenderingContext2D,
    orders: TradingOrder[],
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
    dragState: DragState | null,
  ): void {
    for (const badge of this.axisBadges(orders, viewport, config, dragState)) {
      drawAxisBadge(ctx, badge.y, badge.text, badge.color, viewport, theme);
    }
  }

  /** The price each order puts on the axis (on the plot): where it is being dragged to, else its own. */
  axisBadges(orders: TradingOrder[], viewport: ViewportState, config: TradingConfig, dragState: DragState | null): AxisBadge[] {
    const colors = colorsOf(config);
    const badges: AxisBadge[] = [];
    for (const order of orders) {
      const price = priceOf(order, dragState);
      const y = priceToY(price, viewport);
      if (inPlot(y, viewport)) badges.push({ y, text: priceTagText(price, viewport, config.pricePrecision), color: order.side === 'buy' ? colors.buy : colors.sell });
    }
    return badges;
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
