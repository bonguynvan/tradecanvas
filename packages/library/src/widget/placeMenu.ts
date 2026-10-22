/** Room kept between a menu in a layer and its button, and the window's edges (px). */
const GAP_PX = 6;
const EDGE_PX = 8;
/** The least height a menu keeps when the room beside its button is short (px). */
const MIN_HEIGHT_PX = 120;

/**
 * Fixes `panel` beside `anchor`: below it, or above when there is more room,
 * kept inside the window. `align` names the edge both start from ('right'
 * starts from the anchor's end edge; mirrored in a right-to-left widget).
 */
export function placeMenu(panel: HTMLElement, anchor: Element, align: 'left' | 'right' = 'left'): void {
  const s = panel.style;
  const at = anchor.getBoundingClientRect();
  s.position = 'fixed';
  s.margin = '0';
  s.top = s.bottom = s.left = s.right = '';
  const below = window.innerHeight - at.bottom - GAP_PX - EDGE_PX;
  const above = at.top - GAP_PX - EDGE_PX;
  const natural = panel.scrollHeight;
  // Each side set outright: a stylesheet's own top (a menu under its button) must not win.
  if (natural <= below || below >= above) {
    s.top = `${at.bottom + GAP_PX}px`;
    s.bottom = 'auto';
    s.maxHeight = `${Math.max(MIN_HEIGHT_PX, below)}px`;
  } else {
    s.top = 'auto';
    s.bottom = `${window.innerHeight - at.top + GAP_PX}px`;
    s.maxHeight = `${Math.max(MIN_HEIGHT_PX, above)}px`;
  }
  const rtl = getComputedStyle(anchor).direction === 'rtl';
  const fromEnd = (align === 'right') !== rtl;
  const width = panel.offsetWidth;
  const start = fromEnd ? at.right - width : at.left;
  s.left = `${Math.max(EDGE_PX, Math.min(start, window.innerWidth - width - EDGE_PX))}px`;
}
