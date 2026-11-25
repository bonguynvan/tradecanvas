import type { Theme } from '@tradecanvas/commons';
import { priceReadoutColors, readableOn } from '@tradecanvas/commons';

/** The smallest type the chart writes under a theme's small size (px): a theme's own smaller size is its own. */
const MIN_TYPE = 10;
/** The room a line of type needs over and under it in a box of a set height (px, the two together). */
const BOX_ROOM = 3;
/** The contrast a coloured figure has on the chart's ground, at the least. */
const TEXT_CONTRAST = 4.5;

/**
 * The size of the chart's smaller type: the theme's small size, or `down`
 * steps under it (a name beside a line, a marker's word). They were 11, 10
 * and 9 px in every theme, which a theme set a size up, or a widget grown
 * for a wide screen, left behind; nothing is under 10 px now. `box`: the height of a box the type is
 * written in, which it stays inside however large the theme's type is.
 */
export function chartTypeSize(theme: Theme, down = 0, box?: number): number {
  const size = theme.font.sizeSmall - Math.max(0, down);
  const floor = Math.min(MIN_TYPE, theme.font.sizeSmall);
  const sized = Math.max(floor, size);
  // A box holds what it holds: under the floor too, in a box that small.
  return box === undefined ? sized : Math.min(sized, box - BOX_ROOM);
}

/** A canvas font in the theme's face at `chartTypeSize(theme, down, box)`, with a weight where one is given. */
export function chartFont(theme: Theme, down = 0, weight = '', box?: number): string {
  return `${weight ? `${weight} ` : ''}${chartTypeSize(theme, down, box)}px ${theme.font.family}`;
}

/**
 * A rise's and a fall's colours as text on the chart's ground: the readout's
 * (`priceReadoutColors`), each taken toward the chart's text until it reads
 * there at 4.5:1. A theme that names no ground or no text (a stand-in) keeps
 * them as they are.
 */
export function readoutTextColors(theme: Theme): { up: string; down: string } {
  const read = priceReadoutColors(theme);
  if (typeof theme.background !== 'string' || typeof theme.text !== 'string') return read;
  return {
    up: readableOn(read.up, theme.background, theme.text, TEXT_CONTRAST),
    down: readableOn(read.down, theme.background, theme.text, TEXT_CONTRAST),
  };
}
