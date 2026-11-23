import type { TradingOrder, TradingConfig, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY } from '../viewport/ScaleMapping.js';
import { UI_ICONS, orderQuantityText, priceTagText } from '@tradecanvas/commons';
import type { LineButton } from './lineButtons.js';
import { inPlot, levelLine } from './plot.js';
import { amountAt, amountDecimals, formatAmount } from './positionFormat.js';
import { levelTags } from './PositionRenderer.js';
import { drawAxisBadge, drawTags, type AxisBadge, type TagCell, type TradingTag } from './tradingTags.js';

/** What is left of an order to fill: all of it, less what has filled of one that fills in parts. */
function leftOf(order: TradingOrder): number {
  const filled = order.filledQuantity;
  return typeof filled === 'number' && Number.isFinite(filled) && filled > 0 ? Math.max(0, order.quantity - filled) : order.quantity;
}

export interface DragState {
  orderId: string;
  /**
   * What is dragged: an order's line, a stop-limit order's stop (`'orderStop'`),
   * a position's stop or target, or one of its take-profit levels (`level`).
   */
  sourceType: 'order' | 'orderStop' | 'stopLoss' | 'takeProfit' | 'level';
  /** Which of the position's take-profit levels, for a `'level'`. */
  level?: number;
  startPrice: number;
  currentPrice: number;
  /** A stop or a target the position had not got, being added. */
  created?: boolean;
}

/** A working order's line: long dashes. Its stop's and target's: dots, as prices it only brings. */
const ORDER_DASH = [6, 4];
const PLANNED_DASH = [2, 3];
/** A stop-limit's stop: a dash and a dot, the order's own and yet not its line, nor a target of its colour. */
const STOP_DASH = [6, 3, 1, 3];
/** What a stop-limit's stop is called on its tag. */
const STOP_STAMP = 'STOP';
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

/**
 * Where a stop-limit order's stop is drawn: the price at which it begins to
 * work, when that is a price of its own (a stop order's is its line). With
 * the order dragged it goes with it, the room between the two kept; dragged
 * itself, it is where it is dragged to. None for any other order.
 */
export function stopOf(order: TradingOrder, dragState: DragState | null): number | undefined {
  const stop = order.stopPrice;
  if (order.type !== 'stopLimit' || stop === undefined || !Number.isFinite(stop) || stop === order.price) return undefined;
  if (dragState?.orderId !== order.id) return stop;
  if (dragState.sourceType === 'orderStop') return dragState.currentPrice;
  return dragState.sourceType === 'order' ? stop + (dragState.currentPrice - dragState.startPrice) : stop;
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
      // Where a stop-limit begins to work: a price of the order's own, in its colour.
      const stop = stopOf(order, dragState);
      const triggerY = stop === undefined ? NaN : priceToY(stop, viewport);
      if (inPlot(triggerY, viewport)) levelLine(ctx, viewport, triggerY, color, STOP_DASH);
      // Where each line was, while one is dragged: the order's, and its stop's when that moved too.
      const ghosts = [isDragged(order, dragState) ? dragState!.startPrice : undefined, stop !== undefined && stop !== order.stopPrice ? order.stopPrice : undefined];
      for (const was of ghosts) {
        const wasY = was === undefined ? NaN : priceToY(was, viewport);
        if (!inPlot(wasY, viewport)) continue;
        ctx.globalAlpha = GHOST_ALPHA;
        levelLine(ctx, viewport, wasY, color, GHOST_DASH);
        ctx.globalAlpha = 1;
      }
      for (const [price, stopColor] of [[order.stopLoss, colors.loss], [order.takeProfit, colors.profit]] as const) {
        const stopY = price === undefined ? NaN : priceToY(price, viewport);
        if (inPlot(stopY, viewport)) levelLine(ctx, viewport, stopY, stopColor, PLANNED_DASH);
      }
      for (const level of order.takeProfits ?? []) {
        const levelY = priceToY(level.price, viewport);
        if (inPlot(levelY, viewport)) levelLine(ctx, viewport, levelY, colors.profit, PLANNED_DASH);
      }
    }
  }

  /**
   * Each order's tag: its quantity (how much has filled of how much, once
   * a part of it has), its side and kind, OCO when it is one of a group
   * where one cancels the others, and a × that cancels it; a tag on its
   * stop and its target saying what they would make.
   */
  tags(orders: TradingOrder[], viewport: ViewportState, config: TradingConfig, dragState: DragState | null): TradingTag[] {
    const colors = colorsOf(config);
    const tags: TradingTag[] = [];
    // The tags of the stop-limits' stops, laid out after all the others: they have the least to say, and give way.
    const stops: TradingTag[] = [];
    for (const order of orders) {
      const price = priceOf(order, dragState);
      const y = priceToY(price, viewport);
      if (inPlot(y, viewport)) {
        const cells: TagCell[] = [
          { kind: 'stamp', text: orderQuantityText(order) },
          { kind: 'text', text: orderKindText(order) },
        ];
        // One of a group where one cancels the others: its filling takes the rest off.
        if (order.ocoGroup) cells.push({ kind: 'text', text: 'OCO' });
        if (config.lineButtons?.cancel !== false && !isDragged(order, dragState)) {
          cells.push({ kind: 'button', icon: UI_ICONS.x, action: { type: 'cancelOrder', orderId: order.id } });
        }
        const grab = order.draggable === false ? undefined : { kind: 'order' as const, orderId: order.id };
        tags.push({ y, color: order.side === 'buy' ? colors.buy : colors.sell, cells, grab });
      }
      // A stop-limit's stop says what it is, and takes its own line: the stop moves alone, the order by its own.
      const trigger = stopOf(order, dragState);
      const triggerY = trigger === undefined ? NaN : priceToY(trigger, viewport);
      if (inPlot(triggerY, viewport)) {
        const grab = order.draggable === false ? undefined : { kind: 'orderStop' as const, orderId: order.id };
        stops.push({ y: triggerY, color: order.side === 'buy' ? colors.buy : colors.sell, cells: [{ kind: 'stamp', text: STOP_STAMP }], grab });
      }
      // What its stop and its target would make is of what is left of it: what has filled is a position, with tags of its own.
      const left = leftOf(order);
      for (const which of ['stopLoss', 'takeProfit'] as const) {
        const stop = order[which];
        const stopY = stop === undefined ? NaN : priceToY(stop, viewport);
        if (stop === undefined || !inPlot(stopY, viewport)) continue;
        const amount = amountAt(order.side, price, left, stop);
        tags.push({
          y: stopY,
          color: which === 'stopLoss' ? colors.loss : colors.profit,
          cells: [
            // A stop that will follow the price once the order fills says so: TSL.
            { kind: 'stamp', text: which === 'takeProfit' ? 'TP' : typeof order.trailingStop === 'number' && order.trailingStop > 0 ? 'TSL' : 'SL' },
            { kind: 'text', text: formatAmount(amount, amountDecimals(amount, price, config.pricePrecision), viewport.numberLocale), color: amount >= 0 ? colors.profit : colors.loss },
          ],
        });
      }
      // Its levels are sizes of the position's plan, not of what is left of the order: written as planned.
      tags.push(...levelTags(order.takeProfits, order.side, price, order.quantity, viewport, config));
    }
    return [...tags, ...stops];
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
      const color = order.side === 'buy' ? colors.buy : colors.sell;
      // The order's price, and a stop-limit's stop.
      for (const price of [priceOf(order, dragState), stopOf(order, dragState)]) {
        const y = price === undefined ? NaN : priceToY(price, viewport);
        if (price !== undefined && inPlot(y, viewport)) badges.push({ y, text: priceTagText(price, viewport, config.pricePrecision), color });
      }
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
