/** Narrower than this (px) a widget is laid out as on a phone: its own width, not the window's. */
export const NARROW_WIDGET_PX = 641;

/**
 * Keep `data-tcw-narrow` on `el` while it is narrower than
 * `NARROW_WIDGET_PX`: a phone, or a widget in a narrow column of a wide
 * page. `onChange` hears each change, the first state too. Returns the
 * function that stops watching.
 */
export function watchNarrow(el: HTMLElement, onChange?: (narrow: boolean) => void): () => void {
  let narrow: boolean | null = null;
  const check = () => {
    const width = el.clientWidth;
    // Not laid out yet (hidden, detached): leave it as it was.
    if (width === 0 && narrow !== null) return;
    const now = width < NARROW_WIDGET_PX;
    if (now === narrow) return;
    narrow = now;
    el.toggleAttribute('data-tcw-narrow', now);
    onChange?.(now);
  };
  check();
  if (typeof ResizeObserver === 'undefined') return () => {};
  const observer = new ResizeObserver(check);
  observer.observe(el);
  return () => observer.disconnect();
}
