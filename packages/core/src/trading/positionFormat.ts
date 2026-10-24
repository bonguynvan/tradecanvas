import type {
  PnLThreshold,
  PositionLabelContext,
  TradingPosition,
} from '@tradecanvas/commons';
import { formatPrice as groupedNumber } from '@tradecanvas/commons';

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
