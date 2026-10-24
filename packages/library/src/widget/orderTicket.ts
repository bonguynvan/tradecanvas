import type { OrderPlaceIntent, OrderSide, TimeInForce } from '@tradecanvas/commons';

/** What the order ticket holds while it is filled in. */
export interface OrderTicketDraft {
  side: OrderSide;
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  /** The limit or stop price (a market order fills at the market). */
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  timeInForce: TimeInForce;
}

/** What is wrong with a draft, as message keys. */
export type OrderTicketProblem =
  | 'quantity'
  | 'price'
  /** A market order with no market price to fill at (no bars yet). */
  | 'market'
  | 'stopLoss'
  | 'takeProfit'
  | 'stopLossSide'
  | 'takeProfitSide'
  | 'limitSide'
  | 'stopSide'
  /** A price off the market's step (HOSE: 0.05 between 10 and 50 thousand dong). */
  | 'priceStep'
  /** A limit or stop price beyond the day's ceiling or floor. */
  | 'priceLimits'
  /** More than a lot, but not whole lots. */
  | 'lot';

/** A market's own rules for a ticket: its price step, the day's limits, its lot. */
export interface OrderTicketRules {
  /** A price on the market's step; a price it changes is off the step. */
  roundPrice?: (price: number) => number;
  limits?: { ceiling: number; floor: number } | null;
  /** Shares in a lot. Fewer is an odd lot, an order of its own; more must be whole lots. */
  lot?: number;
  /** Money per point of a futures contract (VN30F: 100,000 dong): what the sums are in. */
  multiplier?: number;
}

/** Prices that differ by less than this are the same price (float dust). */
const PRICE_EPSILON = 1e-9;

/**
 * Where the position would start: the limit or stop price, or the market for
 * a market order.
 */
function entryOf(draft: OrderTicketDraft, lastPrice: number | null): number | null {
  return draft.type === 'market' ? lastPrice : draft.price;
}

/**
 * The problems with a draft: a quantity or price that isn't positive, a stop-loss
 * or take-profit on the wrong side of the entry, a limit or stop on the wrong side
 * of the market (it would fill at once).
 */
export function orderTicketProblems(draft: OrderTicketDraft, lastPrice: number | null, rules: OrderTicketRules = {}): OrderTicketProblem[] {
  const problems: OrderTicketProblem[] = [];
  if (!(draft.quantity > 0) || !Number.isFinite(draft.quantity)) problems.push('quantity');
  if (draft.type !== 'market' && (!(draft.price > 0) || !Number.isFinite(draft.price))) problems.push('price');
  if (draft.type === 'market' && !((lastPrice ?? draft.price) > 0)) problems.push('market');
  const buy = draft.side === 'buy';
  if (lastPrice !== null && draft.type !== 'market' && draft.price > 0) {
    // A buy limit waits below the market, a buy stop above it; a sell the other way.
    const below = draft.price < lastPrice;
    if (draft.type === 'limit' && below !== buy && draft.price !== lastPrice) problems.push('limitSide');
    if (draft.type === 'stop' && below === buy && draft.price !== lastPrice) problems.push('stopSide');
  }
  const valid = (price: number | null) => price === null || (Number.isFinite(price) && price > 0);
  if (!valid(draft.stopLoss)) problems.push('stopLoss');
  if (!valid(draft.takeProfit)) problems.push('takeProfit');
  const entry = entryOf(draft, lastPrice);
  if (entry !== null && entry > 0) {
    if (draft.stopLoss !== null && valid(draft.stopLoss) && (buy ? draft.stopLoss >= entry : draft.stopLoss <= entry)) problems.push('stopLossSide');
    if (draft.takeProfit !== null && valid(draft.takeProfit) && (buy ? draft.takeProfit <= entry : draft.takeProfit >= entry)) problems.push('takeProfitSide');
  }
  return [...problems, ...marketProblems(draft, rules)];
}

/** What a market's rules find: prices off its step or beyond the day's limits, broken lots. */
function marketProblems(draft: OrderTicketDraft, rules: OrderTicketRules): OrderTicketProblem[] {
  const problems: OrderTicketProblem[] = [];
  const limitPrice = draft.type === 'market' ? null : draft.price;
  const priced = [limitPrice, draft.stopLoss, draft.takeProfit].filter((p): p is number => p !== null && Number.isFinite(p) && p > 0);
  const { roundPrice, limits, lot } = rules;
  if (roundPrice && priced.some((p) => Math.abs(roundPrice(p) - p) > PRICE_EPSILON)) problems.push('priceStep');
  if (limits && limitPrice !== null && limitPrice > 0
    && (limitPrice > limits.ceiling + PRICE_EPSILON || limitPrice < limits.floor - PRICE_EPSILON)) problems.push('priceLimits');
  if (lot !== undefined && lot > 1 && draft.quantity > lot && draft.quantity % lot !== 0) problems.push('lot');
  return problems;
}

/** The order a draft asks for. */
export function orderTicketIntent(draft: OrderTicketDraft, lastPrice: number | null): OrderPlaceIntent {
  const intent: OrderPlaceIntent = {
    side: draft.side,
    type: draft.type,
    price: draft.type === 'market' ? lastPrice ?? draft.price : draft.price,
    quantity: draft.quantity,
  };
  if (draft.type === 'stop') intent.stopPrice = draft.price;
  if (draft.type !== 'market') intent.timeInForce = draft.timeInForce;
  if (draft.stopLoss !== null) intent.stopLoss = draft.stopLoss;
  if (draft.takeProfit !== null) intent.takeProfit = draft.takeProfit;
  return intent;
}

/** Reward over risk for a draft with both a stop-loss and a take-profit, or null. */
export function orderTicketRiskReward(draft: OrderTicketDraft, lastPrice: number | null): number | null {
  const entry = entryOf(draft, lastPrice);
  if (entry === null || draft.stopLoss === null || draft.takeProfit === null) return null;
  const risk = Math.abs(entry - draft.stopLoss);
  return risk > 0 ? Math.abs(draft.takeProfit - entry) / risk : null;
}

/**
 * How far a stop-loss or take-profit at `price` is from the entry: in percent,
 * and what it would make for the quantity (times a contract's multiplier).
 */
export function orderTicketDistance(
  draft: OrderTicketDraft,
  lastPrice: number | null,
  price: number,
  multiplier = 1,
): { pct: number; amount: number } | null {
  const entry = entryOf(draft, lastPrice);
  if (entry === null || !(entry > 0) || !Number.isFinite(price) || !(draft.quantity > 0)) return null;
  const direction = draft.side === 'buy' ? 1 : -1;
  return { pct: ((price - entry) / entry) * 100 * direction, amount: (price - entry) * draft.quantity * direction * multiplier };
}

/** What the ticket sums up: the order's value, what its stop-loss risks and its take-profit makes, and reward over risk. */
export interface OrderTicketSummary {
  value: number | null;
  risk: number | null;
  reward: number | null;
  ratio: number | null;
}

/**
 * The receipt's sums, in money (a contract's points times its multiplier).
 * A stop or a target on the wrong side of the entry sums to nothing: its
 * "risk" would read as a gain, and reward over risk would mean nothing.
 */
export function orderTicketSummary(draft: OrderTicketDraft, lastPrice: number | null, rules: OrderTicketRules = {}): OrderTicketSummary {
  const multiplier = rules.multiplier !== undefined && rules.multiplier > 0 ? rules.multiplier : 1;
  const entry = entryOf(draft, lastPrice);
  const value = entry !== null && entry > 0 && draft.quantity > 0 ? entry * draft.quantity * multiplier : null;
  const problems = orderTicketProblems(draft, lastPrice);
  const at = (price: number | null, wrong: OrderTicketProblem) =>
    price === null || problems.includes(wrong) ? null : orderTicketDistance(draft, lastPrice, price, multiplier)?.amount ?? null;
  const risk = at(draft.stopLoss, 'stopLossSide');
  const reward = at(draft.takeProfit, 'takeProfitSide');
  return { value, risk, reward, ratio: risk !== null && reward !== null ? orderTicketRiskReward(draft, lastPrice) : null };
}
