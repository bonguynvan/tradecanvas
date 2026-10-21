/**
 * Keep `--tcw-keyboard-inset` on `elements` at the height the on-screen
 * keyboard covers at the bottom of the layout viewport, so the widget's
 * bottom sheets sit above it (iOS lays the keyboard over fixed content).
 * Returns the function that stops watching. Nothing where the browser has
 * no visual viewport.
 */
export function watchKeyboardInset(elements: readonly HTMLElement[]): () => void {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return () => {};
  let written = -1;
  const update = () => {
    // Pinch-zoomed, the visual viewport is smaller with no keyboard at all:
    // the sheets stay at the bottom rather than float up.
    const zoomed = (vv.scale ?? 1) > 1.01;
    const inset = zoomed ? 0 : Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    if (inset === written) return;
    written = inset;
    for (const el of elements) el.style.setProperty('--tcw-keyboard-inset', `${inset}px`);
  };
  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
  };
}
