/** Rows the value area takes on at a time, on the heavier side: the pair Market Profile counts by. */
const VALUE_AREA_STEP = 2;

/**
 * The value area around the busiest row of a profile: from row `poc`, the
 * heavier of the two rows below and the two above joins, a pair at a time
 * (one where only one is left), until the rows taken hold `target`, as
 * Market Profile counts it. A tie goes up. Gives the lowest and the highest
 * row taken. Shared by the chart's market profile (TPO counts) and the
 * session volume profile (volumes).
 */
export function growValueArea(rows: ArrayLike<number>, poc: number, target: number): [number, number] {
  const last = rows.length - 1;
  let lo = poc;
  let hi = poc;
  let held = rows[poc];
  while (held < target && (lo > 0 || hi < last)) {
    const below = lo > 0 ? rows[lo - 1] + (lo > 1 ? rows[lo - 2] : 0) : -1;
    const above = hi < last ? rows[hi + 1] + (hi < last - 1 ? rows[hi + 2] : 0) : -1;
    const down = below > above;
    for (let n = 0; n < VALUE_AREA_STEP; n++) {
      if (down && lo > 0) held += rows[--lo];
      else if (!down && hi < last) held += rows[++hi];
    }
  }
  return [lo, hi];
}
