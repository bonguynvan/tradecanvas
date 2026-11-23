import type { TakeProfitLevel, TradingPosition, TradingConfig, ViewportState, Theme } from '@tradecanvas/commons';
import { priceToY, yToPrice } from '../viewport/ScaleMapping.js';
import { UI_ICONS, priceTagText, quantityText } from '@tradecanvas/commons';
import {
  amountAt,
  buildPositionLabelContext,
  amountDecimals,
  formatAmount,
  pickPnLColor,
  resolvePositionLabel,
} from './positionFormat.js';
import type { LineButton } from './lineButtons.js';
import type { DragState } from './OrderRenderer.js';
import { inPlot, levelLine } from './plot.js';
import { defaultStopPrice, isBeyond, stopSide } from './positionStops.js';
import { TAG_HEIGHT, drawAxisBadge, drawTags, type AxisBadge, type TagCell, type TradingTag } from './tradingTags.js';

/** A stop's or a target's line: dashed, as a price the position may yet reach. */
const STOP_DASH = [4, 4];
/** Where a dragged stop was: dotted and faint. */
const GHOST_DASH = [2, 4];
const GHOST_ALPHA = 0.3;
/** How strongly the open profit or loss tints the band between the entry and the price. */
const PNL_BAND_ALPHA = 0.08;
/** The closed part of a position: a band at the plot's left edge, this much of its width for all of it. */
const CLOSED_BAND_ALPHA = 0.25;
const CLOSED_BAND_SHARE = 0.04;
const STOPS = ['stopLoss', 'takeProfit'] as const;
type Stop = (typeof STOPS)[number];

/** The colours a position draws in: the config's, else these. */
function colorsOf(config: TradingConfig): { profit: string; loss: string; entry: string } {
  return {
    profit: config.positionColors?.profit ?? '#1fa874',
    loss: config.positionColors?.loss ?? '#e8505b',
    entry: config.positionColors?.entry ?? '#4c8dff',
  };
}

/** A tag centred on `y` lies wholly inside the plot (not over a pane below it): its buttons can be pressed. */
function fitsPlot(y: number, viewport: ViewportState): boolean {
  const { chartRect } = viewport;
  return y - TAG_HEIGHT / 2 >= chartRect.y && y + TAG_HEIGHT / 2 <= chartRect.y + chartRect.height;
}

/**
 * Where a stop or a target added to `pos` starts, where it can be seen and
 * dragged: its default, else the plot's edge on its side, as long as that is
 * still beyond the entry and the price now. Null when not even that is: the
 * view is zoomed in on the wrong side of it.
 */
function newStopStart(pos: TradingPosition, which: Stop, currentPrice: number | null, viewport: ViewportState): number | null {
  const price = defaultStopPrice(pos, which, currentPrice);
  if (fitsPlot(priceToY(price, viewport), viewport)) return price;
  const { chartRect } = viewport;
  // Half a tag in from either edge, so its tag fits too; by price, so an inverted scale reads the same.
  const near = yToPrice(chartRect.y + TAG_HEIGHT / 2, viewport);
  const far = yToPrice(chartRect.y + chartRect.height - TAG_HEIGHT / 2, viewport);
  const edge = stopSide(pos, which) > 0 ? Math.max(near, far) : Math.min(near, far);
  return Number.isFinite(edge) && isBeyond(pos, which, edge, currentPrice) ? edge : null;
}

/** What is still open of a position. */
function openQuantity(pos: TradingPosition): number {
  return pos.quantity - Math.min(Math.max(pos.closedQuantity ?? 0, 0), pos.quantity);
}

/** A position's stop or target where it is: where it is being dragged to, else its own. */
function stopPrice(pos: TradingPosition, which: Stop, dragState: DragState | null): number | undefined {
  return dragState?.orderId === pos.id && dragState.sourceType === which ? dragState.currentPrice : pos[which];
}

/** The index of the take-profit level of `pos` being dragged, or -1. */
function draggedLevel(pos: TradingPosition, dragState: DragState | null): number {
  return dragState?.orderId === pos.id && dragState.sourceType === 'level' && dragState.level !== undefined ? dragState.level : -1;
}

/** A position's take-profit levels where they are: the one being dragged at where it is dragged to. */
function levelsShown(pos: TradingPosition, dragState: DragState | null): readonly TakeProfitLevel[] | undefined {
  const dragged = draggedLevel(pos, dragState);
  if (dragged < 0 || !dragState) return pos.takeProfits;
  return pos.takeProfits?.map((level, i) => (i === dragged ? { ...level, price: dragState.currentPrice } : level));
}

export class PositionRenderer {
  /** The lines and their tags, the tags laid out among themselves. */
  render(
    ctx: CanvasRenderingContext2D,
    positions: TradingPosition[],
    currentPrice: number | null,
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
    buttons: LineButton[] = [],
    dragState: DragState | null = null,
  ): void {
    this.renderLines(ctx, positions, currentPrice, viewport, config, dragState);
    drawTags(ctx, this.tags(positions, currentPrice, viewport, config, dragState), viewport, theme, buttons);
  }

  /** Each position's entry line, its open profit or loss as a band to the price, its stop's and target's lines. */
  renderLines(
    ctx: CanvasRenderingContext2D,
    positions: TradingPosition[],
    currentPrice: number | null,
    viewport: ViewportState,
    config: TradingConfig,
    dragState: DragState | null = null,
  ): void {
    const colors = colorsOf(config);
    for (const pos of positions) {
      const entryY = priceToY(pos.entryPrice, viewport);
      levelLine(ctx, viewport, entryY, colors.entry, []);
      if (currentPrice !== null) this.renderBand(ctx, pos, entryY, priceToY(currentPrice, viewport), currentPrice, viewport, config);
      for (const which of STOPS) {
        const price = stopPrice(pos, which, dragState);
        const y = price === undefined ? NaN : priceToY(price, viewport);
        const color = which === 'stopLoss' ? colors.loss : colors.profit;
        // None priced off the plot: it would show as a sliver at its edge.
        if (inPlot(y, viewport)) levelLine(ctx, viewport, y, color, STOP_DASH);
        const from = pos[which];
        if (from !== undefined && price !== from) {
          ctx.globalAlpha = GHOST_ALPHA;
          levelLine(ctx, viewport, priceToY(from, viewport), color, GHOST_DASH);
          ctx.globalAlpha = 1;
        }
      }
      // Its take-profit levels: a line each, as the target's; one being dragged where it is dragged to, and faint where it was.
      const dragged = draggedLevel(pos, dragState);
      (levelsShown(pos, dragState) ?? []).forEach((level, i) => {
        const y = priceToY(level.price, viewport);
        if (inPlot(y, viewport)) levelLine(ctx, viewport, y, colors.profit, STOP_DASH);
        const from = pos.takeProfits?.[i]?.price;
        if (i === dragged && from !== undefined && from !== level.price) {
          ctx.globalAlpha = GHOST_ALPHA;
          levelLine(ctx, viewport, priceToY(from, viewport), colors.profit, GHOST_DASH);
          ctx.globalAlpha = 1;
        }
      });
    }
  }

  /** The open profit or loss, a band from the entry to the price; the closed part at the left edge. */
  private renderBand(
    ctx: CanvasRenderingContext2D,
    pos: TradingPosition,
    entryY: number,
    currentY: number,
    currentPrice: number,
    viewport: ViewportState,
    config: TradingConfig,
  ): void {
    const { chartRect } = viewport;
    const colors = colorsOf(config);
    const labelCtx = buildPositionLabelContext(pos, currentPrice, config.pricePrecision ?? 2, undefined, undefined, config.amountMultiplier);
    const top = Math.min(entryY, currentY);
    const height = Math.abs(currentY - entryY);
    ctx.fillStyle = pickPnLColor(labelCtx.pnl, config.pnlThresholds, labelCtx.pnl >= 0 ? colors.profit : colors.loss);
    ctx.globalAlpha = PNL_BAND_ALPHA;
    ctx.fillRect(chartRect.x, top, chartRect.width, height);
    if (labelCtx.closedQuantity > 0 && pos.quantity > 0) {
      ctx.fillStyle = colors.entry;
      ctx.globalAlpha = CLOSED_BAND_ALPHA;
      ctx.fillRect(chartRect.x, top, Math.max(2, chartRect.width * (labelCtx.closedQuantity / pos.quantity) * CLOSED_BAND_SHARE) + 2, height);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Each position's tags: on its entry its open quantity, its side and its
   * open profit (or the `positionLabel`), then reverse and close; on its stop
   * and its target what they would make, then a × that removes them.
   */
  tags(
    positions: TradingPosition[],
    currentPrice: number | null,
    viewport: ViewportState,
    config: TradingConfig,
    dragState: DragState | null = null,
  ): TradingTag[] {
    const tags: TradingTag[] = [];
    for (const pos of positions) {
      const entry = this.entryTag(pos, currentPrice, viewport, config, dragState);
      if (entry) tags.push(entry);
      for (const which of STOPS) {
        const stop = this.stopTag(pos, which, viewport, config, dragState, currentPrice);
        if (stop) tags.push(stop);
      }
      tags.push(...levelTags(levelsShown(pos, dragState), pos.side, pos.entryPrice, openQuantity(pos), viewport, config, pos.id));
    }
    return tags;
  }

  /**
   * The entry's tag, when the entry is on the plot: its quantity, side and
   * open profit, then SL and TP for the stop-loss and take-profit it has not
   * got (not while one is being dragged out), then reverse and close.
   */
  private entryTag(pos: TradingPosition, currentPrice: number | null, viewport: ViewportState, config: TradingConfig, dragState: DragState | null = null): TradingTag | null {
    const y = priceToY(pos.entryPrice, viewport);
    if (!inPlot(y, viewport)) return null;
    const colors = colorsOf(config);
    const side = pos.side === 'buy' ? 'Long' : 'Short';
    const cells: TagCell[] = [{ kind: 'stamp', text: String(openQuantity(pos)) }];
    if (currentPrice === null) {
      cells.push({ kind: 'text', text: side });
    } else {
      const precision = config.pricePrecision ?? 2;
      const labelCtx = buildPositionLabelContext(
        pos, currentPrice, precision, (p) => priceTagText(p, viewport, config.pricePrecision), viewport.numberLocale, config.amountMultiplier,
      );
      if (config.positionLabel !== undefined) {
        cells.push({ kind: 'text', text: resolvePositionLabel(config.positionLabel, labelCtx) });
      } else {
        const color = pickPnLColor(labelCtx.pnl, config.pnlThresholds, labelCtx.pnl >= 0 ? colors.profit : colors.loss);
        cells.push({ kind: 'text', text: side }, { kind: 'text', text: formatAmount(labelCtx.pnl, amountDecimals(labelCtx.pnl, currentPrice, config.pricePrecision), viewport.numberLocale), color });
      }
    }
    const show = config.lineButtons ?? {};
    if (fitsPlot(y, viewport)) {
      if (show.addStops !== false) {
        for (const which of STOPS) {
          if (pos[which] !== undefined || (dragState?.orderId === pos.id && dragState.sourceType === which)) continue;
          const start = newStopStart(pos, which, currentPrice, viewport);
          if (start === null) continue;
          cells.push({
            kind: 'button',
            text: which === 'stopLoss' ? 'SL' : 'TP',
            color: which === 'stopLoss' ? colors.loss : colors.profit,
            action: { type: 'addStop', positionId: pos.id, which, price: start },
          });
        }
      }
      if (show.reverse !== false) cells.push({ kind: 'button', icon: UI_ICONS.arrowUpDown, action: { type: 'reversePosition', positionId: pos.id } });
      if (show.close !== false) cells.push({ kind: 'button', icon: UI_ICONS.x, action: { type: 'closePosition', positionId: pos.id } });
    }
    return { y, color: colors.entry, cells };
  }

  /** A stop's or a target's tag, where it is (or is being dragged to) on the plot: a handle for its line. */
  private stopTag(pos: TradingPosition, which: Stop, viewport: ViewportState, config: TradingConfig, dragState: DragState | null, currentPrice: number | null = null): TradingTag | null {
    const price = stopPrice(pos, which, dragState);
    const y = price === undefined ? NaN : priceToY(price, viewport);
    if (price === undefined || !inPlot(y, viewport)) return null;
    const colors = colorsOf(config);
    const amount = amountAt(pos.side, pos.entryPrice, openQuantity(pos), price, config.amountMultiplier);
    // A distance, not the 0 or null a broker's own record may hold for "none".
    const trailing = typeof pos.trailingStop === 'number' && pos.trailingStop > 0;
    const cells: TagCell[] = [
      // A stop that follows the price says so: TSL.
      { kind: 'stamp', text: which === 'takeProfit' ? 'TP' : trailing ? 'TSL' : 'SL' },
      { kind: 'text', text: formatAmount(amount, amountDecimals(amount, pos.entryPrice, config.pricePrecision), viewport.numberLocale), color: amount >= 0 ? colors.profit : colors.loss },
    ];
    const dragged = dragState?.orderId === pos.id && dragState.sourceType === which;
    if (which === 'stopLoss' && config.lineButtons?.trailStop !== false && fitsPlot(y, viewport) && !dragged) {
      // Trailing: the button ends it. Not: it starts one at the stop's distance from the price now,
      // which a stop the price is already past does not have.
      const long = pos.side === 'buy';
      const distance = currentPrice === null ? NaN : long ? currentPrice - price : price - currentPrice;
      const action = trailing ? null : distance > 0 ? distance : undefined;
      if (action !== undefined) {
        cells.push({ kind: 'button', icon: long ? UI_ICONS.trendingUp : UI_ICONS.trendingDown, action: { type: 'trailStop', positionId: pos.id, distance: action }, active: trailing });
      }
    }
    if (config.lineButtons?.removeStops !== false && fitsPlot(y, viewport) && !dragged) {
      cells.push({ kind: 'button', icon: UI_ICONS.x, action: { type: 'removeStop', positionId: pos.id, which } });
    }
    return { y, color: which === 'stopLoss' ? colors.loss : colors.profit, cells, grab: { kind: 'stop', positionId: pos.id, which } };
  }

  /**
   * Each position's entry, stop and target on the price axis. Called after
   * the price axis so they paint over its labels.
   */
  renderAxisBadges(
    ctx: CanvasRenderingContext2D,
    positions: TradingPosition[],
    viewport: ViewportState,
    theme: Theme,
    config: TradingConfig,
  ): void {
    for (const badge of this.axisBadges(positions, viewport, config)) {
      drawAxisBadge(ctx, badge.y, badge.text, badge.color, viewport, theme);
    }
  }

  /** The prices each position puts on the axis (on the plot): its stop and target (where dragged to) and its entry. */
  axisBadges(positions: TradingPosition[], viewport: ViewportState, config: TradingConfig, dragState: DragState | null = null): AxisBadge[] {
    const colors = colorsOf(config);
    const badges: AxisBadge[] = [];
    for (const pos of positions) {
      const prices = [
        [stopPrice(pos, 'stopLoss', dragState), colors.loss],
        [stopPrice(pos, 'takeProfit', dragState), colors.profit],
        ...(levelsShown(pos, dragState) ?? []).map((level) => [level.price, colors.profit] as const),
        [pos.entryPrice, colors.entry],
      ] as const;
      for (const [price, color] of prices) {
        if (price === undefined) continue;
        const y = priceToY(price, viewport);
        if (inPlot(y, viewport)) badges.push({ y, text: priceTagText(price, viewport, config.pricePrecision), color });
      }
    }
    return badges;
  }
}

/**
 * A tag for each take-profit level on the plot: which it is (TP1 is the
 * nearest still waiting), the part it takes off, and what that part would
 * make from `entry`. A level takes no more than is left of `open` after the
 * levels before it, and one with nothing left to take has no tag. With the
 * position's id each is a handle for its line; an order's, which are a plan
 * the order brings, are none.
 */
export function levelTags(
  levels: readonly TakeProfitLevel[] | undefined,
  side: TradingPosition['side'],
  entry: number,
  open: number,
  viewport: ViewportState,
  config: TradingConfig,
  positionId?: string,
): TradingTag[] {
  const colors = colorsOf(config);
  const tags: TradingTag[] = [];
  let left = open;
  (levels ?? []).forEach((level, i) => {
    const part = Math.min(level.quantity, left);
    left -= part;
    if (!(part > 0)) return;
    const y = priceToY(level.price, viewport);
    if (!inPlot(y, viewport)) return;
    const amount = amountAt(side, entry, part, level.price, config.amountMultiplier);
    tags.push({
      y,
      color: colors.profit,
      cells: [
        { kind: 'stamp', text: `TP${i + 1}` },
        { kind: 'text', text: quantityText(part) },
        { kind: 'text', text: formatAmount(amount, amountDecimals(amount, entry, config.pricePrecision), viewport.numberLocale), color: amount >= 0 ? colors.profit : colors.loss },
      ],
      ...(positionId === undefined ? {} : { grab: { kind: 'level' as const, positionId, index: i } }),
    });
  });
  return tags;
}
