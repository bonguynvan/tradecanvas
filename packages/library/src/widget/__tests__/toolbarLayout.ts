/** A box from `start` to `end` px along the toolbar's line, as the browser gives one. */
const box = (start: number, end: number): DOMRect => ({
  left: start, right: end, width: end - start, top: 0, bottom: 36, height: 36, x: start, y: 0, toJSON: () => ({}),
}) as DOMRect;

/**
 * Lay the toolbar `el` out `width` px wide, its controls reaching `need()` px
 * from its start (from its right edge when its style says right to left), as
 * jsdom lays out nothing. What the stylesheet hides has no box: a folded
 * button, and "more" while nothing is. `scale`: a container's transform,
 * which scales the boxes on screen but not the layout px. Its scroll width is
 * the browser's: whole px, and never under its own width.
 */
export function layoutToolbar(el: HTMLElement, width: number, need: () => number, scale = 1): void {
  const rtl = el.style.direction === 'rtl';
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => width });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => width });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => Math.max(width, Math.round(need())) });
  el.getBoundingClientRect = () => box(0, width * scale);
  const hidden = (child: Element) => child.hasAttribute('data-tcw-folded')
    || (child.classList.contains('tcw-toolbar-more') && !el.classList.contains('tcw-toolbar--collapsed'));
  for (const child of el.children) {
    child.getClientRects = () => (hidden(child) ? [] : [box(0, 0)]) as unknown as DOMRectList;
    child.getBoundingClientRect = () => (rtl ? box((width - need()) * scale, width * scale) : box(0, need() * scale));
  }
}
