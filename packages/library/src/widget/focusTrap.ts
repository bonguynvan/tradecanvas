/** What Tab can land on inside a dialog. */
export const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keep Tab inside `container` (a modal dialog): past its last stop Tab goes
 * to its first, and Shift+Tab the other way. "Past" counts a control Tab
 * skips over (`tabindex="-1"`, a list row's star) after the last stop or
 * before the first: from there the browser would leave the dialog. Call from
 * its keydown.
 */
export function keepTabInside(e: KeyboardEvent, container: HTMLElement): void {
  if (e.key !== 'Tab') return;
  const active = document.activeElement;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter((el) => el.tabIndex >= 0 && (el.getClientRects().length > 0 || el === active));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const inside = active instanceof Node && container.contains(active);
  const before = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
  if (e.shiftKey && (!inside || active === first || before(first, active!))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (!inside || active === last || before(active!, last))) {
    e.preventDefault();
    first.focus();
  }
}
