import { createIcon } from './icons.js';

export type ContextMenuEntry =
  /**
   * `checked` makes it a switch (ticked when on); with `radio` it is one
   * choice among the radios beside it. `shortcut` ("Alt+I") is written at
   * the row's end. `submenu` opens more entries beside this one. `remove`
   * (its action's name, "Delete template Swing") gives it a remove button
   * and the Delete key; the menu's `onRemove` hears it.
   */
  | {
      id: string;
      label: string;
      icon?: string;
      danger?: boolean;
      checked?: boolean;
      radio?: boolean;
      shortcut?: string;
      submenu?: readonly ContextMenuEntry[];
      remove?: string;
    }
  | 'separator';

type MenuItem = Exclude<ContextMenuEntry, 'separator'>;

/** Room kept between the menu and the edge it would touch. */
const MENU_MARGIN = 4;
/**
 * How long the pointer rests on an entry before its submenu opens, or the
 * open one closes: crossing an entry on the way into a submenu does neither.
 */
const HOVER_DELAY_MS = 150;
const ITEM_SELECTOR = '[role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]';
/** Where menus open as sheets from the bottom (the stylesheet's phone width): a submenu covers its menu. */
const SHEET_QUERY = '(max-width: 640px)';
/** The way back from a submenu opened as a sheet. */
const BACK_ID = 'tcw:back';

/** Where a menu opens along each axis, in the host's coordinates. */
interface MenuPlace {
  x: number;
  y: number;
  /** Where it ends instead, when there is no room after `x` or below `y`. */
  xBack: number;
  yBack: number;
  /** Ending at `xBack` first, and starting at `x` only without room there (a submenu, right to left). */
  before?: boolean;
}

/**
 * Where a menu `size` long starts along one axis: at `at`, or ending at
 * `back` when it would pass `end`; with `before`, the other way round.
 */
function place(at: number, size: number, end: number, back = at, before = false): number {
  const start = before
    ? (back - size >= 0 ? back - size : at)
    : (at + size > end ? back - size : at);
  return Math.max(0, Math.min(start, end - size));
}

function itemRole(entry: MenuItem): string {
  if (entry.radio) return 'menuitemradio';
  return entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox';
}

/** What leads an entry: a tick on a switch that is on, a dot on the choice made, else its icon or room for one. */
function leadMark(entry: MenuItem): string {
  const blank = '<span class="tcw-context-icon"></span>';
  if (entry.radio) return entry.checked ? '<span class="tcw-context-icon tcw-context-dot"></span>' : blank;
  if (entry.checked !== undefined) return entry.checked ? createIcon('check', 14) : blank;
  return (entry.icon && createIcon(entry.icon, 14)) || blank;
}

/**
 * A small menu opened at a point (a right-click on a drawing, say): arrow
 * keys, Home and End move through it, Enter picks, Escape, Tab or a click
 * outside close it. Focus returns to where it was. An entry with a submenu
 * opens it beside itself on a click, Enter, the right arrow (the left one
 * right to left) or a rest of the pointer; the other arrow or Escape closes
 * it again.
 */
export class WidgetContextMenu {
  private el: HTMLDivElement;
  private onPick: ((id: string) => void) | null = null;
  private onRemove: ((id: string) => void) | null = null;
  private returnFocus: HTMLElement | null = null;
  /** The button that opened it: pressing it again is its click's to handle (a toggle). */
  private anchor: HTMLElement | null = null;
  /** The submenu, made the first time an entry opens one. */
  private child: WidgetContextMenu | null = null;
  /** The menu this one is the submenu of. */
  private parent: WidgetContextMenu | null = null;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onDocPointer = (e: Event) => {
    const target = e.target as Node;
    if (this.holds(target) || this.anchor?.contains(target)) return;
    this.close();
  };
  /** Scrolling a long menu keeps it; scrolling anywhere else moves the chart from under it. */
  private readonly onWheel = (e: Event) => {
    if (!this.holds(e.target as Node)) this.close();
  };
  /** Resizing or leaving the window moves the chart from under the menu. */
  private readonly onAway = () => this.close();

  /**
   * `backLabel` ("Back") names the first entry of a submenu on a phone, which
   * leads back to the menu under it.
   */
  constructor(private readonly host: HTMLElement, label: string, private readonly backLabel = '') {
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
  open(
    entries: readonly ContextMenuEntry[],
    x: number,
    y: number,
    onPick: (id: string) => void,
    anchor?: HTMLElement,
    onRemove?: (id: string) => void,
  ): void {
    this.show(entries, { x, y, xBack: x, yBack: y }, onPick, anchor, onRemove, true);
  }

  close(): void {
    this.clearHover();
    this.child?.close();
    if (this.el.hidden) return;
    // A submenu the pointer closes leaves the keyboard where it is, in the menu.
    const giveBack = !this.parent || this.el.contains(document.activeElement);
    this.el.hidden = true;
    this.onPick = null;
    this.onRemove = null;
    this.anchor?.setAttribute('aria-expanded', 'false');
    this.anchor = null;
    document.removeEventListener('pointerdown', this.onDocPointer, true);
    document.removeEventListener('wheel', this.onWheel, { capture: true });
    window.removeEventListener('resize', this.onAway);
    window.removeEventListener('blur', this.onAway);
    if (giveBack && this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = null;
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  destroy(): void {
    this.close();
    this.child?.destroy();
    this.el.remove();
  }

  private show(
    entries: readonly ContextMenuEntry[],
    at: MenuPlace,
    onPick: (id: string) => void,
    anchor: HTMLElement | undefined,
    onRemove: ((id: string) => void) | undefined,
    focusFirst: boolean,
  ): void {
    this.clearHover();
    this.child?.close();
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.onPick = onPick;
    this.onRemove = onRemove ?? null;
    this.anchor = anchor ?? null;
    this.anchor?.setAttribute('aria-expanded', 'true');
    this.el.replaceChildren(...entries.map((entry) => this.entry(entry)));
    this.el.hidden = false;
    const hostRect = this.host.getBoundingClientRect();
    const right = Math.min(this.host.clientWidth, window.innerWidth - hostRect.left) - MENU_MARGIN;
    const bottom = Math.min(this.host.clientHeight, window.innerHeight - hostRect.top) - MENU_MARGIN;
    // Taller than the room (a short widget), it scrolls.
    this.el.style.maxHeight = `${Math.max(0, bottom)}px`;
    this.el.style.left = `${place(at.x, this.el.offsetWidth, right, at.xBack, at.before)}px`;
    this.el.style.top = `${place(at.y, this.el.offsetHeight, bottom, at.yBack)}px`;
    document.addEventListener('pointerdown', this.onDocPointer, true);
    document.addEventListener('wheel', this.onWheel, { capture: true, passive: true });
    window.addEventListener('resize', this.onAway);
    window.addEventListener('blur', this.onAway);
    const chosen = this.revealChoice();
    if (focusFirst) (chosen ?? this.items()[0])?.focus({ preventScroll: true });
  }

  /**
   * A long list of choices (the time zones) opens scrolled to the one made,
   * returned to take the keyboard; null when it is in sight already.
   */
  private revealChoice(): HTMLElement | null {
    const chosen = this.el.querySelector<HTMLElement>('[role=menuitemradio][aria-checked=true]');
    if (!chosen || chosen.offsetTop + chosen.offsetHeight <= this.el.clientHeight) return null;
    this.el.scrollTop = chosen.offsetTop - (this.el.clientHeight - chosen.offsetHeight) / 2;
    return chosen;
  }

  /** The widget reads right to left (`dir="rtl"`): submenus open to the left, and the arrows swap. */
  private rtl(): boolean {
    return this.host.closest('[dir]')?.getAttribute('dir') === 'rtl';
  }

  /** Whether `node` is in this menu or its open submenu. */
  private holds(node: Node): boolean {
    return this.el.contains(node) || (this.child?.holds(node) ?? false);
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
    item.setAttribute('role', itemRole(entry));
    if (entry.radio || entry.checked !== undefined) item.setAttribute('aria-checked', String(entry.checked ?? false));
    item.tabIndex = -1;
    item.dataset.id = entry.id;
    item.innerHTML = leadMark(entry);
    const text = document.createElement('span');
    text.className = 'tcw-context-label';
    text.textContent = entry.label;
    item.appendChild(text);
    this.appendEnd(item, entry);
    const submenu = entry.submenu;
    // A finger's tap is a click: only a pointer resting on an entry opens its submenu.
    item.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') this.hover(item, entry.label, submenu);
    });
    item.addEventListener('click', () => {
      if (submenu) this.openSubmenu(item, entry.label, submenu, true);
      else this.pick(entry.id);
    });
    return entry.remove ? this.removableRow(item, entry.remove) : item;
  }

  /** The shortcut, or the mark of a submenu, at the row's end. */
  private appendEnd(item: HTMLButtonElement, entry: MenuItem): void {
    if (entry.shortcut) {
      // Named once, by aria-keyshortcuts: the key is for the eye.
      item.setAttribute('aria-keyshortcuts', entry.shortcut);
      const key = document.createElement('kbd');
      key.className = 'tcw-context-key';
      key.setAttribute('aria-hidden', 'true');
      key.textContent = entry.shortcut;
      item.appendChild(key);
    }
    if (entry.submenu) {
      item.setAttribute('aria-haspopup', 'menu');
      item.setAttribute('aria-expanded', 'false');
      item.insertAdjacentHTML('beforeend', createIcon('chevronRight', 12));
      item.lastElementChild?.classList.add('tcw-context-more');
    }
  }

  /** The keyboard removes it with Delete; the button is for a pointer. */
  private removableRow(item: HTMLButtonElement, action: string): HTMLElement {
    item.setAttribute('aria-keyshortcuts', 'Delete');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tcw-context-remove';
    remove.tabIndex = -1;
    remove.setAttribute('aria-hidden', 'true');
    remove.title = action;
    remove.innerHTML = createIcon('x', 12);
    remove.addEventListener('click', () => this.remove(item));
    const row = document.createElement('div');
    row.className = 'tcw-context-row';
    row.setAttribute('role', 'none');
    row.append(item, remove);
    return row;
  }

  /** Open `entries` beside `item`, after it (to its right, or left in RTL) or, without room there, before it. */
  private openSubmenu(item: HTMLButtonElement, label: string, entries: readonly ContextMenuEntry[], focusFirst: boolean): void {
    this.clearHover();
    const child = this.child ?? this.makeChild();
    if (child.isOpen() && child.anchor === item) {
      if (focusFirst) child.items()[0]?.focus({ preventScroll: true });
      return;
    }
    child.close();
    child.el.setAttribute('aria-label', label);
    const hostRect = this.host.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    const at: MenuPlace = {
      x: r.right - hostRect.left,
      y: r.top - hostRect.top,
      xBack: r.left - hostRect.left,
      yBack: r.bottom - hostRect.top,
      before: this.rtl(),
    };
    // As a sheet it hides the menu under it: its first entry leads back there.
    const sheet = window.matchMedia?.(SHEET_QUERY).matches ?? false;
    const list: readonly ContextMenuEntry[] = sheet
      ? [{ id: BACK_ID, label, icon: 'chevronLeft' }, 'separator', ...entries]
      : entries;
    child.show(list, at, (id) => {
      if (id !== BACK_ID) this.pick(id);
    }, item, (id) => this.onRemove?.(id), focusFirst);
    const back = sheet ? child.el.querySelector<HTMLElement>(`[data-id="${BACK_ID}"]`) : null;
    back?.classList.add('tcw-context-back');
    if (back && this.backLabel) back.setAttribute('aria-label', `${this.backLabel}: ${label}`);
    // Closed, it gives the keyboard back to its entry (a click on a button doesn't focus it everywhere).
    child.returnFocus = item;
  }

  private makeChild(): WidgetContextMenu {
    const child = new WidgetContextMenu(this.host, '', this.backLabel);
    child.parent = this;
    // Reaching the submenu keeps it, whatever the pointer crossed on the way.
    child.el.addEventListener('pointerenter', () => this.clearHover());
    this.child = child;
    return child;
  }

  /** After a rest on `item`: open its submenu, or close the one open for another entry. */
  private hover(item: HTMLButtonElement, label: string, submenu?: readonly ContextMenuEntry[]): void {
    this.clearHover();
    const open = this.child?.isOpen() ? this.child.anchor : null;
    if (submenu ? open === item : open === null) return;
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null;
      if (submenu) this.openSubmenu(item, label, submenu, false);
      else this.child?.close();
    }, HOVER_DELAY_MS);
  }

  private clearHover(): void {
    if (this.hoverTimer === null) return;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = null;
  }

  /** Take an entry out (its `onRemove` told), the keyboard on the one after it; the menu closes when none is left. */
  private remove(item: HTMLButtonElement): void {
    const id = item.dataset.id;
    const row = item.closest('.tcw-context-row');
    if (!id || !row) return;
    const items = this.items();
    const at = items.indexOf(item);
    this.onRemove?.(id);
    row.remove();
    // A separator left first, last or next to another goes too.
    const seps = [...this.el.children].filter((el, i, all) => el.classList.contains('tcw-context-sep')
      && (i === 0 || i === all.length - 1 || all[i - 1].classList.contains('tcw-context-sep')));
    for (const sep of seps) sep.remove();
    const left = this.items();
    if (left.length === 0) {
      this.close();
      return;
    }
    left[Math.min(at, left.length - 1)].focus({ preventScroll: true });
  }

  private pick(id: string): void {
    const onPick = this.onPick;
    this.close();
    onPick?.(id);
  }

  private items(): HTMLButtonElement[] {
    return [...this.el.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR)];
  }

  private onKeyDown(e: KeyboardEvent): void {
    const items = this.items();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const [openKey, backKey] = this.rtl() ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    let next = -1;
    if (e.key === 'ArrowDown') next = (at + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === openKey && items[at]?.hasAttribute('aria-haspopup')) {
      e.preventDefault();
      items[at].click();
      return;
    } else if (e.key === backKey && this.parent) {
      e.preventDefault();
      this.close();
      return;
    } else if (e.key === 'Delete' && at >= 0) {
      e.preventDefault();
      this.remove(items[at]);
      return;
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      // Escape steps back out of a submenu; Tab leaves the menus altogether.
      let menu: WidgetContextMenu = this;
      while (e.key === 'Tab' && menu.parent) menu = menu.parent;
      menu.close();
      return;
    } else return;
    e.preventDefault();
    // Moving on from the entry a resting pointer opened a submenu for closes it.
    this.child?.close();
    items[next]?.focus({ preventScroll: true });
  }
}
