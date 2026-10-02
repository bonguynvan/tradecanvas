/**
 * Which widget the page's keyboard shortcuts go to when several (or a grid of
 * them) share a page: the one pressed last, else the one holding focus, else
 * the first on the page. Roots nest (a grid holds widgets): a press inside a
 * widget counts for it and for the grid around it.
 */
const roots: HTMLElement[] = [];
let pressed: HTMLElement | null = null;

/** Follow presses in `root`; returns the function that stops it. */
export function registerKeyRoot(root: HTMLElement): () => void {
  // Capture order runs outer roots first, so the innermost press is kept.
  const onPress = () => { pressed = root; };
  root.addEventListener('pointerdown', onPress, true);
  roots.push(root);
  return () => {
    root.removeEventListener('pointerdown', onPress, true);
    const at = roots.indexOf(root);
    if (at >= 0) roots.splice(at, 1);
    if (pressed === root) pressed = null;
  };
}

/**
 * Whether the page's shortcuts go to `root`. `strict` leaves out the
 * first-on-the-page fallback: for a key the page itself may want (Ctrl+S),
 * the widget must have been pressed or hold focus.
 */
export function isKeyTarget(root: HTMLElement, strict = false): boolean {
  let target: HTMLElement | null = pressed?.isConnected ? pressed : null;
  if (!target) {
    const active = document.activeElement;
    target = active ? roots.find((r) => r.contains(active)) ?? null : null;
  }
  if (!target && !strict) target = roots.find((r) => r.isConnected) ?? null;
  return target !== null && root.contains(target);
}

/** Focus is in a text field (keys there are typing, not shortcuts). */
export function isTyping(): boolean {
  const active = document.activeElement as HTMLElement | null;
  return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
}
