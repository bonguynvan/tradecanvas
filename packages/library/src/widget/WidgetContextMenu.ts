import { createIcon } from './icons.js';

export type ContextMenuEntry =
  /** `checked` makes it a switch (ticked when on). */
  | { id: string; label: string; icon?: string; danger?: boolean; checked?: boolean }
  | 'separator';

/** Room kept between the menu and the edge it would touch. */
const MENU_MARGIN = 4;

/** Where a menu `size` long starts along one axis: after `at`, or before it when it would pass `end`. */
function place(at: number, size: number, end: number): number {
  const start = at + size > end ? at - size : at;
  return Math.max(0, Math.min(start, end - size));
}

/**
 * A small menu opened at a point (a right-click on a drawing, say): arrow
 * keys, Home and End move through it, Enter picks, Escape, Tab or a click
 * outside close it. Focus returns to where it was.
 */
export class WidgetContextMenu {
  private el: HTMLDivElement;
  private onPick: ((id: string) => void) | null = null;
  private returnFocus: HTMLElement | null = null;
  /** The button that opened it: pressing it again is its click's to handle (a toggle). */
  private anchor: HTMLElement | null = null;
  private readonly onDocPointer = (e: Event) => {
    const target = e.target as Node;
    if (this.el.contains(target) || this.anchor?.contains(target)) return;
    this.close();
  };
  /** Scrolling, resizing or leaving the window moves the chart from under the menu. */
  private readonly onAway = () => this.close();

  constructor(private readonly host: HTMLElement, label: string) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-context-menu';
    this.el.setAttribute('role', 'menu');
    this.el.setAttribute('aria-label', label);
    this.el.hidden = true;
    this.el.addEventListener('keydown', (e) => this.onKeyDown(e));
    host.appendChild(this.el);
  }

  /**
   * Open at (`x`, `y`) in the host's coordinates. It opens up or to the left
   * of the point when there is no room below or to the right, and stays
   * inside both the host and the window.
   */
  open(entries: readonly ContextMenuEntry[], x: number, y: number, onPick: (id: string) => void, anchor?: HTMLElement): void {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.onPick = onPick;
    this.anchor = anchor ?? null;
    this.el.replaceChildren(...entries.map((entry) => this.entry(entry)));
    this.el.hidden = false;
    const hostRect = this.host.getBoundingClientRect();
    const right = Math.min(this.host.clientWidth, window.innerWidth - hostRect.left) - MENU_MARGIN;
    const bottom = Math.min(this.host.clientHeight, window.innerHeight - hostRect.top) - MENU_MARGIN;
    this.el.style.left = `${place(x, this.el.offsetWidth, right)}px`;
    this.el.style.top = `${place(y, this.el.offsetHeight, bottom)}px`;
    document.addEventListener('pointerdown', this.onDocPointer, true);
    document.addEventListener('wheel', this.onAway, { capture: true, passive: true });
    window.addEventListener('resize', this.onAway);
    window.addEventListener('blur', this.onAway);
    this.items()[0]?.focus({ preventScroll: true });
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.onPick = null;
    this.anchor = null;
    document.removeEventListener('pointerdown', this.onDocPointer, true);
    document.removeEventListener('wheel', this.onAway, { capture: true });
    window.removeEventListener('resize', this.onAway);
    window.removeEventListener('blur', this.onAway);
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = null;
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  destroy(): void {
    this.close();
    this.el.remove();
  }

  private entry(entry: ContextMenuEntry): HTMLElement {
    if (entry === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'tcw-context-sep';
      sep.setAttribute('role', 'separator');
      return sep;
    }
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `tcw-context-item${entry.danger ? ' tcw-context-danger' : ''}`;
    item.setAttribute('role', entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox');
    if (entry.checked !== undefined) item.setAttribute('aria-checked', String(entry.checked));
    item.tabIndex = -1;
    item.dataset.id = entry.id;
    // A switch shows a tick when on, and room for one when off.
    const icon = entry.checked !== undefined ? (entry.checked ? 'check' : '') : entry.icon ?? '';
    item.innerHTML = icon ? createIcon(icon, 14) : '<span class="tcw-context-icon"></span>';
    const text = document.createElement('span');
    text.textContent = entry.label;
    item.appendChild(text);
    item.addEventListener('click', () => this.pick(entry.id));
    return item;
  }

  private pick(id: string): void {
    const onPick = this.onPick;
    this.close();
    onPick?.(id);
  }

  private items(): HTMLButtonElement[] {
    return [...this.el.querySelectorAll<HTMLButtonElement>('[role=menuitem], [role=menuitemcheckbox]')];
  }

  private onKeyDown(e: KeyboardEvent): void {
    const items = this.items();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (at + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    } else return;
    e.preventDefault();
    items[next]?.focus({ preventScroll: true });
  }
}
