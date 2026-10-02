/** What Tab can land on inside a dialog. */
export const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keep Tab inside `container` (a modal dialog): from its last control Tab
 * goes to its first, and Shift+Tab the other way. Call from its keydown.
 */
export function keepTabInside(e: KeyboardEvent, container: HTMLElement): void {
  if (e.key !== 'Tab') return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter((el) => el.getClientRects().length > 0 || el === document.activeElement);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !container.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !container.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}
