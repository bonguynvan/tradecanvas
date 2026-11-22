import type { OrderPlaceIntent, OrderSide, TakeProfitLevel, TimeInForce } from '@tradecanvas/commons';
import { stepDecimals } from '@tradecanvas/commons';

/** What the order ticket holds while it is filled in. */
export interface OrderTicketDraft {
  side: OrderSide;
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  /** The limit or stop price (a market order fills at the market). */
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  /** The stop-loss is to trail the price, at its distance from the entry. */
  trailing?: boolean;
  timeInForce: TimeInForce;
  /** When an order good till a date (`'gtd'`) ends, ms; null or unset until one is picked. Kept while another kind is chosen. */
  expireTime?: number | null;
  /**
   * How many targets the take-profit is reached in (1 to 3; 1 when unset):
   * with more than one, a part of the quantity comes off at each target on
   * the way, evenly spaced, and the take-profit closes what is left.
   */
  targets?: number;
}

/** The most targets a ticket parts its take-profit into. */
export const TICKET_MAX_TARGETS = 3;

/**
 * The take-profit levels of a draft with several targets: one before each
 * target but the last, which is the take-profit itself. They part the way
 * from `entry` to the take-profit evenly, and each takes an even part of the
 * quantity, down to the lot or to the quantity's own last digit. None with
 * one target, no take-profit (or one on the wrong side of the entry), no
 * entry, or a quantity too small to part; a target the market's rounding
 * puts on another price there is left out.
 */
export function ticketTakeProfitLevels(
  draft: Pick<OrderTicketDraft, 'side' | 'quantity' | 'takeProfit' | 'targets'>,
  entry: number | null,
  rules: Pick<OrderTicketRules, 'lot' | 'roundPrice'> = {},
): TakeProfitLevel[] {
  const targets = ticketTargets(draft.targets);
  const target = draft.takeProfit;
  if (!(targets > 1) || target === null || !Number.isFinite(target) || entry === null || !Number.isFinite(entry)) return [];
  // A take-profit on the wrong side of the entry is no profit to part.
  const up = draft.side === 'buy';
  if (up ? target <= entry : target >= entry) return [];
  if (!(draft.quantity > 0) || !Number.isFinite(draft.quantity)) return [];
  const step = rules.lot !== undefined && rules.lot > 1 ? rules.lot : 10 ** -stepDecimals(draft.quantity);
  const part = Number((Math.floor(draft.quantity / targets / step + PART_SLACK) * step).toFixed(stepDecimals(step)));
  if (!(part > 0)) return [];
  const round = rules.roundPrice ?? ((price: number) => price);
  const levels: TakeProfitLevel[] = [];
  let before = entry;
  for (let k = 1; k < targets; k++) {
    const price = round(entry + ((target - entry) * k) / targets);
    // Rounded, a target may land on the entry, on the one before it or on the take-profit: it is then no target of its own.
    const own = up ? price > before && price < target : price < before && price > target;
    if (!own) continue;
    levels.push({ price, quantity: part });
    before = price;
  }
  return levels;
}

/** A draft's number of targets as the ticket takes it: a whole number from 1 to the most there are. */
export function ticketTargets(targets: number | undefined): number {
  return targets !== undefined && Number.isFinite(targets) ? Math.min(TICKET_MAX_TARGETS, Math.max(1, Math.floor(targets))) : 1;
}

/** Room for a quotient a hair under a whole number of steps. */
const PART_SLACK = 1e-9;

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
  /** An order good till a date with no date, or one that is not to come. */
  | 'expireTime'
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
  /** The moment now, ms: an order good till a date has to end after it. The clock's when left out. */
  now?: number;
}

/** Prices that differ by less than this are the same price (float dust). */
const PRICE_EPSILON = 1e-9;

/**
 * Where the position would start: the limit or stop price, or the market for
 * a market order (null with no market price yet). A limit that fills at once
 * or not at all starts at the market too when it is through it: its price is
 * then the worst it takes, not where it fills.
 */
export function ticketEntry(draft: Pick<OrderTicketDraft, 'side' | 'type' | 'price' | 'timeInForce'>, lastPrice: number | null): number | null {
  if (draft.type === 'market') return lastPrice;
  if (draft.type !== 'limit' || lastPrice === null || !(lastPrice > 0)) return draft.price;
  const kind = ticketTimeInForce(draft);
  if (kind !== 'ioc' && kind !== 'fok') return draft.price;
  const through = draft.side === 'buy' ? draft.price > lastPrice : draft.price < lastPrice;
  return through ? lastPrice : draft.price;
}

/**
 * The problems with a draft: a quantity or price that isn't positive, a stop-loss
 * or take-profit on the wrong side of the entry, a limit or stop on the wrong side
 * of the market (it would fill at once, which only an order that is not to wait may),
 * a good-till-date order with no date to come.
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
    // A limit that fills at once or not at all is to go through the market: no side of it is a slip.
    const kind = ticketTimeInForce(draft);
    const waits = kind !== 'ioc' && kind !== 'fok';
    if (draft.type === 'limit' && waits && below !== buy && draft.price !== lastPrice) problems.push('limitSide');
    if (draft.type === 'stop' && below === buy && draft.price !== lastPrice) problems.push('stopSide');
  }
  const valid = (price: number | null) => price === null || (Number.isFinite(price) && price > 0);
  if (!valid(draft.stopLoss)) problems.push('stopLoss');
  if (!valid(draft.takeProfit)) problems.push('takeProfit');
  if (draft.type !== 'market' && ticketTimeInForce(draft) === 'gtd' && !(ticketExpireTime(draft) > (rules.now ?? Date.now()))) problems.push('expireTime');
  const entry = ticketEntry(draft, lastPrice);
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

/** How long a ticket's order may work, by its type: one that waits for its stop cannot fill at once or not at all. */
export function ticketTimesInForce(type: OrderTicketDraft['type']): readonly TimeInForce[] {
  return type === 'limit' ? ['gtc', 'day', 'gtd', 'ioc', 'fok'] : ['gtc', 'day', 'gtd'];
}

/** When the draft's order ends, ms; NaN for a draft with no time, or one that is no moment. */
export function ticketExpireTime(draft: Pick<OrderTicketDraft, 'expireTime'>): number {
  return typeof draft.expireTime === 'number' && Number.isFinite(draft.expireTime) ? draft.expireTime : Number.NaN;
}

/** The draft's time in force as its type takes it: good till cancelled in place of one it does not. */
export function ticketTimeInForce(draft: Pick<OrderTicketDraft, 'type' | 'timeInForce'>): TimeInForce {
  return ticketTimesInForce(draft.type).includes(draft.timeInForce) ? draft.timeInForce : 'gtc';
}

/** The order a draft asks for. */
export function orderTicketIntent(draft: OrderTicketDraft, lastPrice: number | null, rules: Pick<OrderTicketRules, 'lot' | 'roundPrice'> = {}): OrderPlaceIntent {
  const intent: OrderPlaceIntent = {
    side: draft.side,
    type: draft.type,
    price: draft.type === 'market' ? lastPrice ?? draft.price : draft.price,
    quantity: draft.quantity,
  };
  if (draft.type === 'stop') intent.stopPrice = draft.price;
  if (draft.type !== 'market') intent.timeInForce = ticketTimeInForce(draft);
  // Only an order good till a date carries one: a date left in the draft by an earlier choice is not sent.
  if (intent.timeInForce === 'gtd' && !Number.isNaN(ticketExpireTime(draft))) intent.expireTime = ticketExpireTime(draft);
  if (draft.stopLoss !== null) intent.stopLoss = draft.stopLoss;
  if (draft.takeProfit !== null) intent.takeProfit = draft.takeProfit;
  // The levels and the trail are counted from where the position starts, which a limit through the market's price is not.
  const entry = ticketEntry(draft, lastPrice) ?? intent.price;
  const levels = ticketTakeProfitLevels(draft, entry, rules);
  if (levels.length > 0) intent.takeProfits = levels;
  if (draft.trailing && draft.stopLoss !== null) {
    const distance = priceDistance(entry, draft.stopLoss);
    if (distance > 0) intent.trailingStop = distance;
  }
  return intent;
}

/** Most decimals a distance is written to. */
const MAX_DISTANCE_DECIMALS = 12;

/** The decimals a price is written with (0.05 has two); a figure in exponent form has as many as are kept. */
function decimalsOf(price: number): number {
  const text = String(price);
  const dot = text.indexOf('.');
  return text.includes('e') ? MAX_DISTANCE_DECIMALS : dot === -1 ? 0 : Math.min(MAX_DISTANCE_DECIMALS, text.length - dot - 1);
}

/** How far apart two prices are, to their own decimals: 0.3 and 0.1 are 0.2 apart, not 0.19999999999999998. */
function priceDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  if (!Number.isFinite(distance)) return NaN;
  return Number(distance.toFixed(Math.max(decimalsOf(a), decimalsOf(b))));
}

/** Reward over risk for a draft with both a stop-loss and a take-profit, or null. */
export function orderTicketRiskReward(draft: OrderTicketDraft, lastPrice: number | null): number | null {
  const entry = ticketEntry(draft, lastPrice);
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
  const entry = ticketEntry(draft, lastPrice);
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
 * With several targets the reward is what the parts make where each comes
 * off, and the ratio is that reward over the risk.
 * A stop or a target on the wrong side of the entry sums to nothing: its
 * "risk" would read as a gain, and reward over risk would mean nothing.
 */
export function orderTicketSummary(draft: OrderTicketDraft, lastPrice: number | null, rules: OrderTicketRules = {}): OrderTicketSummary {
  const multiplier = rules.multiplier !== undefined && rules.multiplier > 0 ? rules.multiplier : 1;
  const entry = ticketEntry(draft, lastPrice);
  const value = entry !== null && entry > 0 && draft.quantity > 0 ? entry * draft.quantity * multiplier : null;
  const problems = orderTicketProblems(draft, lastPrice);
  const at = (price: number | null, wrong: OrderTicketProblem) =>
    price === null || problems.includes(wrong) ? null : orderTicketDistance(draft, lastPrice, price, multiplier)?.amount ?? null;
  const risk = at(draft.stopLoss, 'stopLossSide');
  const whole = at(draft.takeProfit, 'takeProfitSide');
  // The parts taken off on the way make less than they would at the take-profit: by their distance short of it.
  const levels = whole === null ? [] : ticketTakeProfitLevels(draft, entry, rules);
  const short = levels.reduce((sum, level) => sum + level.quantity * Math.abs((draft.takeProfit as number) - level.price) * multiplier, 0);
  const reward = whole === null ? null : whole - short;
  const ratio = risk === null || reward === null ? null : levels.length > 0 && risk !== 0 ? reward / Math.abs(risk) : orderTicketRiskReward(draft, lastPrice);
  return { value, risk, reward, ratio };
}
