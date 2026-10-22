import { placeMenu } from './placeMenu.js';

/** How long typed letters add up to one search before starting over (ms). */
const TYPEAHEAD_MS = 700;

interface Row {
  option: HTMLOptionElement;
  el: HTMLElement;
}

/**
 * The list a `<select>` opens, drawn by the widget: the select stays the
 * field (its value, its events, its form), only the browser's plain popup is
 * replaced. A pick sets the select's value and fires `input` and `change`, so
 * code listening to the select sees what it always did.
 */
export class SelectMenu {
  private select: HTMLSelectElement | null = null;
  private panel: HTMLElement | null = null;
  private rows: Row[] = [];
  private active = -1;
  private typed = '';
  private typedAt = 0;
  private readonly onOutside = (e: PointerEvent) => {
    const target = e.target as Node;
    if (this.panel?.contains(target) || this.select?.contains(target)) return;
    this.close(false);
  };
  private readonly onAway = () => this.close(false);
  private readonly onScroll = (e: Event) => {
    if (e.target instanceof Node && this.panel?.contains(e.target)) return;
    this.close(false);
  };
  /** Closes the list when its select leaves the page (its dialog closed). */
  private readonly watch = new MutationObserver(() => {
    if (this.select && !this.select.isConnected) this.close(false);
  });

  constructor(private readonly layer: () => HTMLElement) {}

  isOpenFor(select: HTMLSelectElement): boolean {
    return this.select === select;
  }

  /** Whether `node` is the open list's field or inside the list. */
  owns(node: Node | null): boolean {
    return node !== null && (node === this.select || this.panel?.contains(node) === true);
  }

  open(select: HTMLSelectElement): void {
    this.close(false);
    this.select = select;
    const panel = document.createElement('div');
    panel.className = 'tcw-dropdown tcw-select-menu';
    panel.setAttribute('role', 'listbox');
    panel.id = `tcw-select-menu-${Math.random().toString(36).slice(2, 9)}`;
    const label = select.getAttribute('aria-label') ?? select.labels?.[0]?.textContent ?? '';
    if (label) panel.setAttribute('aria-label', label.trim());
    panel.style.minWidth = `${select.getBoundingClientRect().width}px`;
    this.rows = [];
    for (const child of select.children) {
      if (child instanceof HTMLOptGroupElement) {
        const head = document.createElement('div');
        head.className = 'tcw-select-group';
        head.textContent = child.label;
        panel.appendChild(head);
        for (const option of child.querySelectorAll('option')) this.addRow(panel, option, child.disabled);
      } else if (child instanceof HTMLOptionElement) {
        this.addRow(panel, child, false);
      }
    }
    // A press on a row picks it; nothing in the list takes focus from the select.
    panel.addEventListener('mousedown', (e) => e.preventDefault());
    const rowAt = (e: Event) => this.rows.findIndex((r) => r.el.contains(e.target as Node));
    panel.addEventListener('click', (e) => {
      const row = rowAt(e);
      if (row >= 0) this.pick(row);
    });
    // The pointer and the keys share one highlighted row.
    panel.addEventListener('mousemove', (e) => {
      const row = rowAt(e);
      if (row >= 0 && row !== this.active && this.enabled(row)) this.setActive(row, false);
    });
    this.layer().appendChild(panel);
    this.panel = panel;
    placeMenu(panel, select);
    select.setAttribute('aria-expanded', 'true');
    select.setAttribute('aria-controls', panel.id);
    this.setActive(this.rows.findIndex((r) => r.option.selected));
    document.addEventListener('pointerdown', this.onOutside, true);
    window.addEventListener('resize', this.onAway);
    document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    this.watch.observe(document.documentElement, { childList: true, subtree: true });
  }

  /** Closes the list; `refocus` puts focus back on the select. */
  close(refocus: boolean): void {
    const select = this.select;
    if (!select) return;
    document.removeEventListener('pointerdown', this.onOutside, true);
    window.removeEventListener('resize', this.onAway);
    document.removeEventListener('scroll', this.onScroll, { capture: true });
    this.watch.disconnect();
    this.panel?.remove();
    this.panel = null;
    this.rows = [];
    this.select = null;
    select.setAttribute('aria-expanded', 'false');
    select.removeAttribute('aria-controls');
    select.removeAttribute('aria-activedescendant');
    if (refocus && select.isConnected) select.focus();
  }

  /** A key on the select while the list is open; true when the list used it. */
  key(e: KeyboardEvent): boolean {
    if (!this.select) return false;
    switch (e.key) {
      case 'ArrowDown': this.step(1); return true;
      case 'ArrowUp': this.step(-1); return true;
      case 'Home': this.setActive(this.nextEnabled(-1, 1)); return true;
      case 'End': this.setActive(this.nextEnabled(this.rows.length, -1)); return true;
      case 'PageDown': this.step(8); return true;
      case 'PageUp': this.step(-8); return true;
      case ' ':
        // Inside a search being typed, a space is part of it ("new y…").
        if (this.typed && Date.now() - this.typedAt <= TYPEAHEAD_MS) {
          this.typeahead(' ');
          return true;
        }
        if (this.active >= 0) this.pick(this.active);
        else this.close(true);
        return true;
      case 'Enter':
        if (this.active >= 0) this.pick(this.active);
        else this.close(true);
        return true;
      case 'Escape': this.close(true); return true;
      case 'Tab': this.close(false); return false;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.typeahead(e.key);
          return true;
        }
        return false;
    }
  }

  destroy(): void {
    this.close(false);
  }

  private addRow(panel: HTMLElement, option: HTMLOptionElement, groupDisabled: boolean): void {
    const el = document.createElement('div');
    el.className = 'tcw-select-option';
    el.id = `${panel.id}-${this.rows.length}`;
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', String(option.selected));
    if (option.disabled || groupDisabled) el.setAttribute('aria-disabled', 'true');
    const text = document.createElement('span');
    text.className = 'tcw-select-option-text';
    text.textContent = option.label || option.textContent || '';
    const check = document.createElement('span');
    check.className = 'tcw-select-check';
    check.setAttribute('aria-hidden', 'true');
    el.append(check, text);
    panel.appendChild(el);
    this.rows.push({ option, el });
  }

  private enabled(i: number): boolean {
    return this.rows[i]?.el.getAttribute('aria-disabled') !== 'true';
  }

  private nextEnabled(from: number, dir: 1 | -1): number {
    for (let i = from + dir; i >= 0 && i < this.rows.length; i += dir) if (this.enabled(i)) return i;
    return -1;
  }

  private step(by: number): void {
    const dir = by > 0 ? 1 : -1;
    let at = this.active;
    for (let n = 0; n < Math.abs(by); n++) {
      const next = this.nextEnabled(at, dir);
      if (next < 0) break;
      at = next;
    }
    if (at >= 0) this.setActive(at);
  }

  private setActive(i: number, reveal = true): void {
    this.rows[this.active]?.el.classList.remove('tcw-active');
    this.active = i;
    const row = this.rows[i];
    if (!row) return;
    row.el.classList.add('tcw-active');
    this.select?.setAttribute('aria-activedescendant', row.el.id);
    if (reveal) row.el.scrollIntoView?.({ block: 'nearest' });
  }

  private typeahead(char: string): void {
    const now = Date.now();
    this.typed = now - this.typedAt > TYPEAHEAD_MS ? char.toLowerCase() : this.typed + char.toLowerCase();
    this.typedAt = now;
    const match = (i: number) => this.enabled(i) && (this.rows[i].el.textContent ?? '').trim().toLowerCase().startsWith(this.typed);
    // A new first letter looks past the current row, so pressing it again cycles.
    const start = this.typed.length === 1 ? this.active + 1 : Math.max(0, this.active);
    for (let n = 0; n < this.rows.length; n++) {
      const i = (start + n) % this.rows.length;
      if (match(i)) {
        this.setActive(i);
        return;
      }
    }
  }

  private pick(i: number): void {
    const select = this.select;
    const row = this.rows[i];
    if (!select || !row || !this.enabled(i)) return;
    const changed = !row.option.selected;
    row.option.selected = true;
    this.close(true);
    if (!changed) return;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
