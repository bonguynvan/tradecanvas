/**
 * How a price is put on a market's grid: its smallest step there, or the
 * decimals it is written to. A chart gives its own (`chart.roundPrice`).
 */
export type PriceRounding = (price: number) => number;

/** The prices an order may be at today: the day's floor and its ceiling. */
export interface PriceBounds {
  floor: number;
  ceiling: number;
}

/**
 * `price` kept inside `bounds`: the ceiling for one over it, the floor for
 * one under. As it is with no bounds, or with bounds that are no prices or
 * the wrong way round.
 */
export function withinBounds(bounds: PriceBounds | null | undefined, price: number): number {
  if (!bounds || !Number.isFinite(price)) return price;
  const { floor, ceiling } = bounds;
  if (!Number.isFinite(floor) || !Number.isFinite(ceiling) || floor > ceiling) return price;
  return Math.min(Math.max(price, floor), ceiling);
}

/** Whether `price` is inside `bounds`, a bound itself included; true with none, or with bounds that hold nothing. */
export function isWithinBounds(bounds: PriceBounds | null | undefined, price: number): boolean {
  return withinBounds(bounds, price) === price;
}

/** How near two prices are, as a part of the larger, to be the one price: a sum's dust. */
const SAME_PRICE = 1e-9;

/** Whether `a` is over `b` by more than a sum's dust. */
function over(a: number, b: number): boolean {
  return a - b > Math.max(Math.abs(a), Math.abs(b), 1) * SAME_PRICE;
}

/**
 * The bounds as prices of the grid, from inside: the highest step not over
 * the ceiling, the lowest not under the floor. A day's limits are a per cent
 * of a reference price: on a market that gave no price step they are sums no
 * order can be at (27.1245), and a sum may be a hair off the price it stands
 * for (1.8199999999999998). As they are with no grid, with none, or where the
 * grid has no step between them.
 */
export function boundsOnGrid(round: PriceRounding | null, bounds: PriceBounds | null): PriceBounds | null {
  if (!round || !bounds || !Number.isFinite(bounds.floor) || !Number.isFinite(bounds.ceiling)) return bounds;
  const top = onGrid(round, bounds.ceiling);
  const ceiling = over(top, bounds.ceiling) ? nextOnGrid(round, bounds.ceiling, -1) : top;
  const bottom = onGrid(round, bounds.floor);
  const floor = over(bounds.floor, bottom) ? nextOnGrid(round, bounds.floor, 1) : bottom;
  return floor <= ceiling ? { floor, ceiling } : bounds;
}

/**
 * The bounds for a price that takes another with it, `room` away (a
 * stop-limit's stop, with its order): narrowed so that both stay inside,
 * the room between them kept. As they are where the room is wider than
 * they are.
 */
export function boundsWithRoom(bounds: PriceBounds | null, room: number): PriceBounds | null {
  if (!bounds || !Number.isFinite(room) || room === 0) return bounds;
  const floor = bounds.floor - Math.min(room, 0);
  const ceiling = bounds.ceiling - Math.max(room, 0);
  return floor <= ceiling ? { floor, ceiling } : bounds;
}

/** How many times the reach is doubled to find the next step of a grid: from a billionth of the price to past any step. */
const MAX_DOUBLINGS = 200;
/** Where the search for the next step begins, as a part of the price. */
const FIRST_REACH = 1e-9;

/** `price` on the grid `round` knows; as it is with no grid told, or where `round` gives no price. */
export function onGrid(round: PriceRounding | null, price: number): number {
  if (!round || !Number.isFinite(price)) return price;
  const rounded = round(price);
  return Number.isFinite(rounded) ? rounded : price;
}

/**
 * The step of the grid next to `from`, up (`way` 1) or down (-1): the first
 * price of the grid strictly on that side of it. `from` need not be on the
 * grid (a fill seldom is). The reach is doubled from next to nothing, so the
 * first step found is the nearest. `from` itself with no grid, or none found.
 */
export function nextOnGrid(round: PriceRounding | null, from: number, way: 1 | -1): number {
  if (!round || !Number.isFinite(from)) return from;
  let reach = Math.max(Math.abs(from), 1) * FIRST_REACH;
  for (let doubling = 0; doubling < MAX_DOUBLINGS; doubling++) {
    const next = onGrid(round, from + way * reach);
    if (way > 0 ? next > from : next < from) return next;
    reach *= 2;
  }
  return from;
}

/**
 * `price` put on the grid and kept strictly on the `way` side of `from` (1:
 * over it, -1: under it): a stop a per cent from its entry, on a grid coarser
 * than that, would round onto the entry or across it, and be no stop. It is
 * then the step next to `from` on its side. With no grid told, `price` as it
 * is.
 */
export function onGridBeyond(round: PriceRounding | null, from: number, price: number, way: 1 | -1): number {
  const first = onGrid(round, price);
  if (!round) return first;
  if (way > 0 ? first > from : first < from) return first;
  return nextOnGrid(round, from, way);
}
