/**
 * How a price is put on a market's grid: its smallest step there, or the
 * decimals it is written to. A chart gives its own (`chart.roundPrice`).
 */
export type PriceRounding = (price: number) => number;

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
