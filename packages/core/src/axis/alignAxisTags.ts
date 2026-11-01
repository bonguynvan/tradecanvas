/** A tag on the price axis: its line's y and how far the tag reaches above and below it. */
export interface AxisTagBox {
  y: number;
  above: number;
  below: number;
}

/**
 * Where tags on a price axis go so none covers another. The anchor (the
 * last price's tag) stays on its line; the tags above it are pushed up and
 * those below it pushed down, each only as far as the tag nearer the anchor
 * needs, so a tag leaves its line only when another would cover it. With
 * no anchor, the tag nearest the middle of the span they cover stays.
 * Returns each tag's centre, in the order given; with `bounds` (the plot),
 * NaN for a tag pushed past them, which is left out rather than drawn over
 * the time axis.
 */
export function alignAxisTags(
  tags: readonly AxisTagBox[],
  anchor: number | null,
  bounds?: { top: number; bottom: number },
): number[] {
  const at = tags.map((t) => t.y);
  if (tags.length === 0) return at;
  const still = anchor !== null && tags[anchor] ? anchor : nearestMiddle(tags);
  const others = tags.map((_, i) => i).filter((i) => i !== still);
  const centre = tags[still].y;
  // Nearest the anchor first on each side: a tag on the anchor's own price goes above it.
  const up = others.filter((i) => tags[i].y <= centre).sort((a, b) => tags[b].y - tags[a].y);
  const down = others.filter((i) => tags[i].y > centre).sort((a, b) => tags[a].y - tags[b].y);

  let ceiling = at[still] - tags[still].above;
  for (const i of up) {
    if (at[i] + tags[i].below > ceiling) at[i] = ceiling - tags[i].below;
    ceiling = at[i] - tags[i].above;
  }
  let floor = at[still] + tags[still].below;
  for (const i of down) {
    if (at[i] - tags[i].above < floor) at[i] = floor + tags[i].above;
    floor = at[i] + tags[i].below;
  }
  if (!bounds) return at;
  return at.map((y, i) => (y !== tags[i].y && (y - tags[i].above < bounds.top || y + tags[i].below > bounds.bottom) ? NaN : y));
}

/** The tag whose line is nearest the middle of the span the tags cover. */
function nearestMiddle(tags: readonly AxisTagBox[]): number {
  const ys = tags.map((t) => t.y);
  const middle = (Math.min(...ys) + Math.max(...ys)) / 2;
  let best = 0;
  ys.forEach((y, i) => { if (Math.abs(y - middle) < Math.abs(ys[best] - middle)) best = i; });
  return best;
}
