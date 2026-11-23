/**
 * How a price is put on a market's grid: its smallest step there, or the
 * decimals it is written to. A chart gives its own (`chart.roundPrice`).
 */
export type PriceRounding = (price: number) => number;

/** How many times a price goes on the same way to find a step of the grid that is not where it came from. */
const MAX_STEPS_AWAY = 200;

/** `price` on the grid `round` knows; as it is with no grid told, or where `round` gives no price. */
export function onGrid(round: PriceRounding | null, price: number): number {
  if (!round || !Number.isFinite(price)) return price;
  const rounded = round(price);
  return Number.isFinite(rounded) ? rounded : price;
}

/**
 * The price `away` put on the grid, and kept off `from`: a stop or a target
 * that starts a per cent from its entry, on a grid coarser than that, would
 * land on the entry itself. It then goes on the same way, to the first step
 * that is not `from`.
 */
export function onGridAwayFrom(round: PriceRounding | null, from: number, away: number): number {
  const first = onGrid(round, away);
  if (!round || first !== from || away === from) return first;
  for (let times = 2; times <= MAX_STEPS_AWAY; times++) {
    const next = onGrid(round, from + (away - from) * times);
    if (next !== from) return next;
  }
  return away;
}
