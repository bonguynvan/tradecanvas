import type {
  PnLThreshold,
  PositionLabelContext,
  TradingPosition,
} from '@tradecanvas/commons';
import { formatPrice as groupedNumber, smallValueDecimals } from '@tradecanvas/commons';

/**
 * Compute live P&L context for a position. Pure — no canvas, no side effects.
 * `closedQuantity` is clamped into [0, quantity]; remaining open quantity drives the P&L.
 */
export function buildPositionLabelContext(
  pos: TradingPosition,
  currentPrice: number,
  precision: number,
  formatPrice?: (price: number) => string,
  locale?: string,
): PositionLabelContext {
  const closed = Math.min(Math.max(pos.closedQuantity ?? 0, 0), pos.quantity);
  const open = pos.quantity - closed;
  const direction = pos.side === 'buy' ? 1 : -1;
  const pnl = (currentPrice - pos.entryPrice) * open * direction;
  const pnlPct =
    pos.entryPrice === 0
      ? 0
      : ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * direction;
  return {
    side: pos.side,
    quantity: pos.quantity,
    closedQuantity: closed,
    openQuantity: open,
    entryPrice: pos.entryPrice,
    currentPrice,
    pnl,
    pnlPct,
    precision,
    formatPrice,
    locale,
  };
}

const TOKEN_RE = /\{(side|qty|closedQty|openQty|entry|price|pnl|pnlPct|pnlSign)\}/g;

export function formatPositionLabel(
  template: string,
  ctx: PositionLabelContext,
): string {
  return template.replace(TOKEN_RE, (_, key: string) => {
    switch (key) {
      case 'side':
        return ctx.side.toUpperCase();
      case 'qty':
        return String(ctx.quantity);
      case 'closedQty':
        return String(ctx.closedQuantity);
      case 'openQty':
        return String(ctx.openQuantity);
      case 'entry':
        return ctx.formatPrice?.(ctx.entryPrice) ?? groupedNumber(ctx.entryPrice, ctx.precision, ctx.locale);
      case 'price':
        return ctx.formatPrice?.(ctx.currentPrice) ?? groupedNumber(ctx.currentPrice, ctx.precision, ctx.locale);
      case 'pnl':
        return groupedNumber(ctx.pnl, ctx.precision, ctx.locale);
      case 'pnlPct':
        return `${ctx.pnlPct.toFixed(2)}%`;
      case 'pnlSign':
        return ctx.pnl >= 0 ? '+' : '';
      default:
        return '';
    }
  });
}

/**
 * Money made or lost, signed ("+40.00", "-20.00"), grouped in the number
 * locale. What rounds to nothing has no sign: a short at its entry is "0.00",
 * not "+-0.00".
 */
export function formatAmount(value: number, precision: number, locale?: string): string {
  const scale = 10 ** precision;
  const rounded = Math.round(value * scale) / scale || 0;
  return `${rounded > 0 ? '+' : ''}${groupedNumber(rounded, precision, locale)}`;
}

/** Decimals an amount of money shows without a market's or a symbol's own. */
const AMOUNT_DECIMALS = 2;

/** Significant figures of an amount too small for two decimals. */
const SMALL_AMOUNT_FIGURES = 2;
/** How many decimals past its price's own a small amount may go: a quantity of one, a move of a hundredth of a tick. */
const PAST_PRICE_DECIMALS = 2;

/**
 * Decimals for `amount`, what a position at `price` makes or loses: the
 * market's or the symbol's (`pricePrecision`) when set, else two. An amount
 * two decimals would write as nothing, on a price under 1 (a coin priced in
 * millionths makes its money there too), takes as many as show two figures
 * of it, where it read "0.00". Nothing, an amount two decimals show, and one
 * too small to be more than rounding (far under its price's own decimals)
 * keep two.
 */
export function amountDecimals(amount: number, price: number, pricePrecision?: number): number {
  if (pricePrecision !== undefined) return pricePrecision;
  const size = Math.abs(amount);
  const at = Math.abs(price);
  const showsAtTwo = Math.round(size * 10 ** AMOUNT_DECIMALS) > 0;
  if (!(size > 0) || !Number.isFinite(size) || showsAtTwo || !(at > 0 && at < 1)) return AMOUNT_DECIMALS;
  const decimals = smallValueDecimals(size, SMALL_AMOUNT_FIGURES);
  return decimals <= smallValueDecimals(at) + PAST_PRICE_DECIMALS ? decimals : AMOUNT_DECIMALS;
}

/** What a position (or the order that opens it) makes when the price reaches `price`. */
export function amountAt(
  side: 'buy' | 'sell',
  entryPrice: number,
  quantity: number,
  price: number,
): number {
  return (price - entryPrice) * quantity * (side === 'buy' ? 1 : -1);
}

export const DEFAULT_POSITION_LABEL =
  '{side} {qty} | P&L: {pnlSign}{pnl}';

export function resolvePositionLabel(
  template: string | ((ctx: PositionLabelContext) => string) | undefined,
  ctx: PositionLabelContext,
): string {
  if (typeof template === 'function') return template(ctx);
  return formatPositionLabel(template ?? DEFAULT_POSITION_LABEL, ctx);
}

/**
 * Pick the color matching `pnl` from a threshold list. The chosen entry is the
 * highest one whose `pnl` ≤ the live P&L. Returns `fallback` when no entry qualifies.
 */
export function pickPnLColor(
  pnl: number,
  thresholds: PnLThreshold[] | undefined,
  fallback: string,
): string {
  if (!thresholds || thresholds.length === 0) return fallback;
  const sorted = [...thresholds].sort((a, b) => a.pnl - b.pnl);
  let chosen: string | undefined;
  for (const t of sorted) {
    if (pnl >= t.pnl) chosen = t.color;
    else break;
  }
  return chosen ?? fallback;
}
