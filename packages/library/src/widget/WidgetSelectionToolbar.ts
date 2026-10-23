import type { DrawingStyle } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { escapeHtml } from './escapeHtml.js';
import { LINE_STYLES, SWATCHES, WIDTHS } from './WidgetDrawingStyle.js';

/** Where the selection is and what can be done to it. */
export interface SelectionToolbarTarget {
  /** The selection's box, in px from the widget root's top-left. */
  rect: { x: number; y: number; width: number; height: number };
  /** The area the toolbar has to stay inside, same coordinates. */
  bounds: { x: number; y: number; width: number; height: number };
  /** The primary drawing's style, shown on the buttons. */
  style: DrawingStyle;
  /** All of the selection is locked: the lock button shows it, and unlocks. */
  locked: boolean;
  /** Some of the selection can be deleted (is not locked). */
  canDelete: boolean;
  canSettings: boolean;
  canAlert: boolean;
}

export interface SelectionToolbarCallbacks {
  onStyle: (patch: Partial<Pick<DrawingStyle, 'color' | 'lineWidth' | 'lineStyle'>>) => void;
  onSettings: () => void;
  onAlert: () => void;
  onLock: (locked: boolean) => void;
  /** The full drawing menu, opened under the given point (root px). */
  onMore: (x: number, y: number) => void;
  onDelete: () => void;
}

type Pop = 'color' | 'width' | 'lineStyle';

/** Gap between the toolbar and the selection, px. */
const GAP = 10;
/** Space kept between the toolbar and the edge of its bounds, px. */
const EDGE = 4;
/** Swatches per row in the colour picker (arrow up and down move by a row). */
const SWATCH_COLUMNS = 4;
/** Widths the toolbar shows, px; a saved layout may hold anything. */
const MAX_WIDTH = 20;

/** A colour as CSS takes it, or null: saved layouts are not trusted to hold one. */
const COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/+-]+\)|[a-z]+)$/i;

function safeColor(value: unknown): string {
  return typeof value === 'string' && COLOR.test(value.trim()) ? value.trim() : '#7d8696';
}

function safeWidth(value: unknown): number {
  const w = Number(value);
  return Number.isFinite(w) && w > 0 ? Math.min(w, MAX_WIDTH) : 1;
}

function safeLineStyle(value: unknown): DrawingStyle['lineStyle'] {
  return (LINE_STYLES as readonly string[]).includes(value as string) ? value as DrawingStyle['lineStyle'] : 'solid';
}

/**
 * A small toolbar that appears over the drawing a user selects, so its
 * colour, width and line style, its settings, lock and delete are one click
 * away instead of behind a right-click.
 */
export class WidgetSelectionToolbar {
  private el: HTMLDivElement;
  private pop: HTMLDivElement;
  private target: SelectionToolbarTarget | null = null;
  /** What the buttons were last built from. */
  private built = '';
  private size: { w: number; h: number } | null = null;
  private openPop: Pop | null = null;
  /** Where the user dragged the toolbar (root px): it stays there, for every drawing, until the grip is double-clicked. */
  private pinned: { left: number; top: number } | null = null;
  private drag: { x: number; y: number; left: number; top: number } | null = null;
  private readonly onDragMove = (e: PointerEvent) => {
    if (!this.drag || !this.target) return;
    this.pinned = { left: this.drag.left + e.clientX - this.drag.x, top: this.drag.top + e.clientY - this.drag.y };
    this.place(this.target);
  };
  private readonly onDragEnd = () => {
    this.drag = null;
    document.removeEventListener('pointermove', this.onDragMove);
    document.removeEventListener('pointerup', this.onDragEnd);
  };
  private readonly onDocDown = (e: PointerEvent) => {
    if (this.openPop && !this.el.contains(e.target as Node) && !this.pop.contains(e.target as Node)) this.closePop();
  };

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: SelectionToolbarCallbacks,
    private readonly t: Translator = EN_TRANSLATOR,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-sel-toolbar';
    this.el.setAttribute('role', 'toolbar');
    this.el.setAttribute('aria-label', t('selectionToolbar.label'));
    this.el.hidden = true;
    this.pop = document.createElement('div');
    this.pop.className = 'tcw-sel-pop';
    this.pop.setAttribute('role', 'dialog');
    this.pop.hidden = true;
    host.append(this.el, this.pop);
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('keydown', (e) => this.onKey(e));
    this.pop.addEventListener('click', (e) => this.onPick(e));
    this.pop.addEventListener('keydown', (e) => this.onPopKey(e));
    // Clicks on the toolbar must not reach the chart under it (and deselect).
    for (const el of [this.el, this.pop]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
    // The grip drags the toolbar out of the way; a double-click sends it back over the drawing.
    this.el.addEventListener('pointerdown', (e) => {
      if (!(e.target as Element).closest('.tcw-sel-grip')) return;
      e.preventDefault();
      this.drag = { x: e.clientX, y: e.clientY, left: parseFloat(this.el.style.left) || 0, top: parseFloat(this.el.style.top) || 0 };
      document.addEventListener('pointermove', this.onDragMove);
      document.addEventListener('pointerup', this.onDragEnd);
    });
    this.el.addEventListener('dblclick', (e) => {
      if (!(e.target as Element).closest('.tcw-sel-grip') || !this.target) return;
      this.pinned = null;
      this.place(this.target);
    });
    document.addEventListener('pointerdown', this.onDocDown, true);
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  show(target: SelectionToolbarTarget): void {
    this.target = target;
    const s = target.style;
    const key = [safeColor(s.color), safeWidth(s.lineWidth), safeLineStyle(s.lineStyle),
      target.locked, target.canDelete, target.canSettings, target.canAlert].join('|');
    if (key !== this.built) {
      this.built = key;
      this.render(target);
      this.size = null;
    }
    this.el.hidden = false;
    if (!this.size) this.size = { w: this.el.offsetWidth, h: this.el.offsetHeight };
    this.place(target);
    if (this.openPop) this.placePop();
  }

  hide(): void {
    this.closePop();
    this.el.hidden = true;
    this.target = null;
  }

  destroy(): void {
    this.onDragEnd();
    document.removeEventListener('pointerdown', this.onDocDown, true);
    this.el.remove();
    this.pop.remove();
  }

  private render(target: SelectionToolbarTarget): void {
    const t = this.t;
    const color = safeColor(target.style.color);
    const width = safeWidth(target.style.lineWidth);
    const lineStyle = safeLineStyle(target.style.lineStyle);
    const locked = target.locked;
    const focused = this.el.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.action : undefined;
    const btn = (action: string, label: string, inner: string, extra = '') =>
      `<button type="button" class="tcw-sel-btn${extra}" data-action="${action}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${inner}</button>`;
    const pop = (action: Pop, label: string, inner: string) =>
      btn(action, label, inner, ' tcw-sel-has-pop').replace('<button ', '<button aria-haspopup="dialog" aria-expanded="false" ');
    this.el.innerHTML = [
      '<span class="tcw-sel-grip" aria-hidden="true"></span>',
      pop('color', t('drawingSettings.color'), `<span class="tcw-sel-color" style="background:${escapeHtml(color)}"></span>`),
      pop('width', t('drawingSettings.lineWidth'), `<span class="tcw-sel-width" style="--w:${width}px"></span><span class="tcw-sel-num">${width}px</span>`),
      pop('lineStyle', t('drawingSettings.lineStyle'), lineGlyph(lineStyle)),
      '<span class="tcw-sel-sep" aria-hidden="true"></span>',
      target.canSettings ? btn('settings', t('legend.settings'), createIcon('settings', 15)) : '',
      target.canAlert ? btn('alert', t('drawingSettings.addAlert'), createIcon('bell', 15)) : '',
      btn('lock', locked ? t('common.unlock') : t('common.lock'), createIcon(locked ? 'lock' : 'unlock', 15), locked ? ' tcw-sel-on' : '')
        .replace('<button ', `<button aria-pressed="${locked}" `),
      btn('more', t('legend.more'), createIcon('more', 15)),
      target.canDelete ? btn('delete', t('drawingMenu.delete'), createIcon('trash', 15), ' tcw-sel-danger') : '',
    ].join('');
    // One tab stop: the button that had focus (or the lock, when delete went with it), else the first.
    const buttons = this.buttons();
    const current = buttons.find((b) => b.dataset.action === focused)
      ?? (focused ? buttons.find((b) => b.dataset.action === 'lock') : undefined);
    this.rove(current ?? buttons[0], current !== undefined);
  }

  private buttons(): HTMLButtonElement[] {
    return [...this.el.querySelectorAll<HTMLButtonElement>('button')];
  }

  /** Make `button` the toolbar's one tab stop, focusing it when asked. */
  private rove(button: HTMLButtonElement | undefined, focus: boolean): void {
    for (const b of this.buttons()) b.tabIndex = b === button ? 0 : -1;
    if (focus) button?.focus();
  }

  /** Over the selection, centred on it; under it when there is no room above; where the user dropped it, once dragged. */
  private place(target: SelectionToolbarTarget): void {
    const { rect, bounds } = target;
    const { w, h } = this.size ?? { w: 0, h: 0 };
    if (this.pinned) {
      const left = Math.max(bounds.x + EDGE, Math.min(this.pinned.left, bounds.x + bounds.width - w - EDGE));
      const top = Math.max(bounds.y + EDGE, Math.min(this.pinned.top, bounds.y + bounds.height - h - EDGE));
      this.el.style.left = `${Math.round(left)}px`;
      this.el.style.top = `${Math.round(top)}px`;
      return;
    }
    let left = rect.x + rect.width / 2 - w / 2;
    left = Math.max(bounds.x + EDGE, Math.min(left, bounds.x + bounds.width - w - EDGE));
    let top = rect.y - h - GAP;
    if (top < bounds.y + EDGE) top = Math.min(rect.y + rect.height + GAP, bounds.y + bounds.height - h - EDGE);
    top = Math.max(top, bounds.y + EDGE);
    this.el.style.left = `${Math.round(left)}px`;
    this.el.style.top = `${Math.round(top)}px`;
  }

  private onClick(e: MouseEvent): void {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-action]');
    if (!b) return;
    this.rove(b, false);
    const action = b.dataset.action!;
    if (action === 'color' || action === 'width' || action === 'lineStyle') {
      if (this.openPop === action) this.closePop();
      else this.openPopover(action, b);
      return;
    }
    this.closePop();
    if (action === 'settings') this.callbacks.onSettings();
    else if (action === 'alert') this.callbacks.onAlert();
    else if (action === 'lock') this.callbacks.onLock(!this.target?.locked);
    else if (action === 'delete') this.callbacks.onDelete();
    else if (action === 'more') {
      const r = b.getBoundingClientRect();
      const root = this.host.getBoundingClientRect();
      this.callbacks.onMore(r.left - root.left, r.bottom - root.top + EDGE);
    }
  }

  /** Arrow keys, Home and End move along the toolbar, as a toolbar's should. */
  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.openPop) {
      e.stopPropagation();
      this.closePop(true);
      return;
    }
    const buttons = this.buttons();
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const next = e.key === 'ArrowRight' ? (i + 1) % buttons.length
      : e.key === 'ArrowLeft' ? (i - 1 + buttons.length) % buttons.length
        : e.key === 'Home' ? 0
          : e.key === 'End' ? buttons.length - 1
            : -1;
    if (next < 0) return;
    e.preventDefault();
    this.rove(buttons[next], true);
  }

  private openPopover(kind: Pop, anchor: HTMLButtonElement): void {
    const s = this.target!.style;
    const color = safeColor(s.color).toLowerCase();
    const width = safeWidth(s.lineWidth);
    const lineStyle = safeLineStyle(s.lineStyle);
    const pick = (cls: string, on: boolean, attrs: string, inner = '') =>
      `<button type="button" class="${cls}${on ? ' tcw-sel-on' : ''}" aria-pressed="${on}" ${attrs}>${inner}</button>`;
    this.openPop = kind;
    if (kind === 'color') {
      this.pop.innerHTML = SWATCHES.map((c) =>
        pick('tcw-sel-swatch', c.toLowerCase() === color, `data-color="${c}" style="background:${c}" aria-label="${c}"`)).join('');
    } else if (kind === 'width') {
      this.pop.innerHTML = WIDTHS.map((w) =>
        pick('tcw-sel-option', w === width, `data-width="${w}"`, `<span class="tcw-sel-width" style="--w:${w}px"></span>${w}px`)).join('');
    } else {
      this.pop.innerHTML = LINE_STYLES.map((ls) =>
        pick('tcw-sel-option', ls === lineStyle, `data-style="${ls}"`, lineGlyph(ls) + escapeHtml(this.t(`drawingSettings.lineStyle.${ls}`)))).join('');
    }
    this.pop.className = `tcw-sel-pop tcw-sel-pop--${kind}`;
    this.pop.setAttribute('aria-label', anchor.getAttribute('aria-label') ?? '');
    this.pop.hidden = false;
    for (const b of this.el.querySelectorAll('[aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
    anchor.setAttribute('aria-expanded', 'true');
    this.placePop();
    this.pop.querySelector<HTMLButtonElement>('.tcw-sel-on, button')?.focus();
  }

  /** Arrow keys move through the choices (by a row in the colours); Escape goes back to the toolbar. */
  private onPopKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.closePop(true);
      return;
    }
    const options = [...this.pop.querySelectorAll<HTMLButtonElement>('button')];
    const i = options.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const row = this.openPop === 'color' ? SWATCH_COLUMNS : 1;
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1
      : e.key === 'ArrowDown' ? row : e.key === 'ArrowUp' ? -row : 0;
    if (!step) return;
    e.preventDefault();
    options[(i + step + options.length) % options.length].focus();
  }

  private placePop(): void {
    const anchor = this.el.querySelector<HTMLElement>(`[data-action="${this.openPop}"]`);
    if (!anchor) return;
    this.pop.style.left = `${this.el.offsetLeft + anchor.offsetLeft}px`;
    this.pop.style.top = `${this.el.offsetTop + this.el.offsetHeight + 6}px`;
  }

  private onPick(e: MouseEvent): void {
    const b = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.dataset.color) this.callbacks.onStyle({ color: b.dataset.color });
    else if (b.dataset.width) this.callbacks.onStyle({ lineWidth: Number(b.dataset.width) });
    else if (b.dataset.style) this.callbacks.onStyle({ lineStyle: safeLineStyle(b.dataset.style) });
    this.closePop(true);
  }

  private closePop(refocus = false): void {
    if (!this.openPop) return;
    const anchor = this.el.querySelector<HTMLButtonElement>(`[data-action="${this.openPop}"]`);
    anchor?.setAttribute('aria-expanded', 'false');
    this.openPop = null;
    this.pop.hidden = true;
    if (refocus) anchor?.focus();
  }
}

/** A short line drawn in the given style, for the line-style button and options. */
function lineGlyph(style: DrawingStyle['lineStyle']): string {
  const dash = style === 'dashed' ? ' stroke-dasharray="4 3"' : style === 'dotted' ? ' stroke-dasharray="1 3" stroke-linecap="round"' : '';
  return `<svg class="tcw-sel-line" width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="currentColor" stroke-width="2"${dash}/></svg>`;
}
