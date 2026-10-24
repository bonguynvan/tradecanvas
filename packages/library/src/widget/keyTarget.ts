/**
 * Which widget the page's keyboard shortcuts go to when several (or a grid of
 * them) share a page: the one pressed last, else the one holding focus, else
 * the first on the page. Roots nest (a grid holds widgets): a press inside a
 * widget counts for it and for the grid around it. A press anywhere else on
 * the page leaves the keys to the page.
 */
const roots: HTMLElement[] = [];
/** Each root's other parts: its layer of dialogs and menus, outside it in the page. */
const parts = new Map<HTMLElement, readonly HTMLElement[]>();
let pressed: HTMLElement | null = null;

/** A press outside every widget and its parts: the widget pressed last no longer takes the keys. */
const onPagePress = (e: Event): void => {
  const target = e.target instanceof Node ? e.target : null;
  const inside = target !== null && roots.some((root) => root.contains(target) || parts.get(root)?.some((part) => part.contains(target)));
  if (!inside) pressed = null;
};

/** Follow presses in `root` and in `others` (its layer of dialogs and menus); returns the function that stops it. */
export function registerKeyRoot(root: HTMLElement, others: readonly HTMLElement[] = []): () => void {
  // Capture order runs outer roots first, so the innermost press is kept.
  const onPress = () => { pressed = root; };
  const all = [root, ...others];
  for (const el of all) el.addEventListener('pointerdown', onPress, true);
  if (roots.length === 0) document.addEventListener('pointerdown', onPagePress, true);
  roots.push(root);
  parts.set(root, others);
  return () => {
    for (const el of all) el.removeEventListener('pointerdown', onPress, true);
    const at = roots.indexOf(root);
    if (at >= 0) roots.splice(at, 1);
    parts.delete(root);
    if (roots.length === 0) document.removeEventListener('pointerdown', onPagePress, true);
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
