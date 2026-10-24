import { placeMenu } from './placeMenu.js';
import { MonthView, type CalendarLabels } from './monthView.js';

export { monthGrid, weekStart, type CalendarDay, type CalendarLabels } from './monthView.js';

/**
 * The calendar a date field opens, drawn by the widget: a month of days with
 * arrows to turn it, today marked and a button to go there. The field stays
 * the `<input type="date">` it was; a pick sets its value (YYYY-MM-DD) and
 * fires `input` and `change`.
 */
export class CalendarPopup {
  private input: HTMLInputElement | null = null;
  private view: MonthView | null = null;
  private readonly onOutside = (e: PointerEvent) => {
    const target = e.target as Node;
    if (this.view?.element.contains(target) || this.input?.contains(target)) return;
    this.close(false);
  };
  private readonly onAway = () => this.close(false);
  private readonly onScroll = (e: Event) => {
    if (e.target instanceof Node && this.view?.element.contains(e.target)) return;
    this.close(false);
  };
  /** Closes the calendar when its field leaves the page (its dialog closed). */
  private readonly watch = new MutationObserver(() => {
    if (this.input && !this.input.isConnected) this.close(false);
  });

  constructor(
    private readonly layer: () => HTMLElement,
    private readonly labels: () => CalendarLabels,
    private readonly locale: () => string,
  ) {}

  isOpenFor(input: HTMLInputElement): boolean {
    return this.input === input;
  }

  /** Whether `node` is the open calendar's field or inside the calendar. */
  owns(node: Node | null): boolean {
    return node !== null && (node === this.input || this.view?.element.contains(node) === true);
  }

  open(input: HTMLInputElement): void {
    this.close(false);
    this.input = input;
    const view = new MonthView(this.labels(), this.locale(), (value) => this.pick(value));
    view.show(input.value, { min: input.min || undefined, max: input.max || undefined });
    const panel = view.element;
    panel.setAttribute('role', 'dialog');
    const label = input.getAttribute('aria-label') ?? input.labels?.[0]?.textContent ?? '';
    if (label) panel.setAttribute('aria-label', label.trim());
    // A press on the calendar's own ground keeps focus where it is (and the calendar open).
    panel.addEventListener('mousedown', (e) => {
      if (!(e.target as Element).closest('button')) e.preventDefault();
    });
    panel.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keys here must not drive chart shortcuts
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close(true);
      }
    });
    this.view = view;
    this.layer().appendChild(panel);
    placeMenu(panel, input);
    document.addEventListener('pointerdown', this.onOutside, true);
    window.addEventListener('resize', this.onAway);
    document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    this.watch.observe(document.documentElement, { childList: true, subtree: true });
  }

  /** Closes the calendar; `refocus` puts focus back on the field. */
  close(refocus: boolean): void {
    const input = this.input;
    if (!input) return;
    document.removeEventListener('pointerdown', this.onOutside, true);
    window.removeEventListener('resize', this.onAway);
    document.removeEventListener('scroll', this.onScroll, { capture: true });
    this.watch.disconnect();
    this.view?.element.remove();
    this.view = null;
    this.input = null;
    if (refocus && input.isConnected) input.focus();
  }

  /** Moves keyboard focus into the days (from the field: ArrowDown). */
  focusGrid(): void {
    this.view?.focusGrid();
  }

  destroy(): void {
    this.close(false);
  }

  private pick(value: string): void {
    const input = this.input;
    if (!input) return;
    const changed = input.value !== value;
    input.value = value;
    this.close(true);
    if (!changed) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
