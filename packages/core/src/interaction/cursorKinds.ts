import type { CrosshairCursor } from '@tradecanvas/commons';

/** The pointer's looks over the chart, in the order a menu lists them. */
export const CROSSHAIR_CURSORS: readonly CrosshairCursor[] = ['cross', 'dot', 'arrow'];

/** Whether `value` is one of the pointer's looks (a saved setting, a host's option). */
export function isCrosshairCursor(value: unknown): value is CrosshairCursor {
  return typeof value === 'string' && (CROSSHAIR_CURSORS as readonly string[]).includes(value);
}

/** The dot cursor's image, in CSS px: big enough to find, small enough not to hide a candle. */
const DOT_SIZE = 9;
const DOT_RADIUS = 3;
/** The ring in the chart's background colour keeps the dot visible on a candle of its own colour. */
const DOT_RING = 1.5;

/** A colour for an SVG attribute: what could close the attribute or the tag is left out. */
function svgColor(color: string): string {
  return color.replace(/['"<>&]/g, '');
}

/**
 * The CSS cursor over the chart for a cursor kind: the crosshair, a dot in
 * the crosshair's colour ringed in the background's, or the arrow.
 */
export function idleCssCursor(kind: CrosshairCursor, color: string, ring: string): string {
  if (kind === 'arrow') return 'default';
  if (kind === 'cross') return 'crosshair';
  const centre = DOT_SIZE / 2;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${DOT_SIZE}' height='${DOT_SIZE}'>`
    + `<circle cx='${centre}' cy='${centre}' r='${DOT_RADIUS}' fill='${svgColor(color)}' stroke='${svgColor(ring)}' stroke-width='${DOT_RING}'/></svg>`;
  const hotspot = Math.floor(centre);
  // A browser that refuses the image shows the crosshair.
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot} ${hotspot}, crosshair`;
}
