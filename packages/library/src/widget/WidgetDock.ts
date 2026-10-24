import { createIcon } from './icons.js';
import { markPart, type WidgetFeature } from './widgetFeatures.js';

/** A panel the dock holds: shown in its panel while it is the open one, opened from its button on the rail. */
export interface DockPage {
  id: string;
  label: string;
  icon: string;
  element: HTMLElement;
  /** The switches its rail button goes with. */
  parts?: readonly WidgetFeature[];
  /** Told when it shows (to draw itself now) and when it hides. */
  onShow?: () => void;
  onHide?: () => void;
}

export interface DockLabels {
  /** The rail's name, for a screen reader. */
  rail: string;
  /** The panel's edge, dragged to resize it. */
  resize: string;
}

export interface DockOptions {
  labels: DockLabels;
  /** The width kept from last time, if any. */
  savedWidth?: () => number | null;
  /** Keep the width the panel was given. */
  saveWidth?: (width: number) => void;
  /** After a page opened, or the dock shut (null). */
  onChange?: (page: string | null) => void;
  /** A press on a rail button (a choice of the user's), before it opens or shuts its page. */
  onPick?: (page: string) => void;
  /** Whether the rail shows now (not on a phone, not switched off). */
  railShown?: () => boolean;
  /** Where the keyboard goes when the dock shuts and the page's rail button is out of sight. */
  focusAfterClose?: (page: string) => HTMLElement | null;
  /** The width of the row the dock sits in, which the chart shares. */
  room?: () => number;
}

/**
 * The panel's widths: 377 at most, a step of phi above 233; it opens at
 * 377 / sqrt(phi) = 296, as the indicator settings sit half a step under the
 * indicators dialog.
 */
export const DOCK_WIDTH = { min: 233, default: 296, max: 377 } as const;
/** One arrow key's worth of resizing. */
export const DOCK_WIDTH_STEP = 13;
/** The most of its row the panel takes: the chart keeps 61.8%. */
const DOCK_SHARE = 0.382;

/** A rail button that shows: not switched off, not hidden. */
const shown = (el: HTMLElement) => !el.hidden && getComputedStyle(el).display !== 'none';

/**
 * The widget's panels by the chart: a rail of buttons on the outer edge and,
 * beside the chart, the panel of the page open (one at a time). A rail button
 * opens its page, or shuts the dock when its page is the one open. The panel
 * is resized from its edge, by pointer or keyboard, between 233 and 377 px,
 * and never takes more than 38.2% of its row. It sits on the right, on the
 * left in a right-to-left widget. As a sheet over the chart (a phone),
 * Escape shuts it.
 */
export class WidgetDock {
  readonly element: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly rail: HTMLDivElement;
  private readonly handle: HTMLDivElement;
  private readonly pages = new Map<string, { page: DockPage; button: HTMLButtonElement }>();
  private open_: string | null = null;
  /** The width asked for; the panel is narrower where its row has no room for it. */
  private width: number;
  private drag: { x: number; width: number; dir: 1 | -1; pointer: number | undefined } | null = null;
  private readonly observer: ResizeObserver | null = null;

  private readonly onMove = (e: MouseEvent) => {
    if (!this.drag || !this.samePointer(e)) return;
    this.setWidth(this.drag.width + (this.drag.x - e.clientX) * this.drag.dir);
  };
  private readonly onUp = (e: MouseEvent) => {
    if (!this.drag || !this.samePointer(e)) return;
    this.drag = null;
    this.stopDrag();
    this.options.saveWidth?.(this.width);
  };

  constructor(host: HTMLElement, private readonly options: DockOptions) {
    const element = document.createElement('div');
    element.className = 'tcw-dock';

    const panel = document.createElement('div');
    panel.className = 'tcw-dock-panel';
    panel.hidden = true;
    panel.addEventListener('keydown', (e) => this.onPanelKey(e));
    const handle = document.createElement('div');
    handle.className = 'tcw-dock-resize';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', options.labels.resize);
    handle.setAttribute('aria-valuemin', String(DOCK_WIDTH.min));
    handle.tabIndex = 0;
    handle.addEventListener('pointerdown', (e) => this.startDrag(e));
    handle.addEventListener('keydown', (e) => this.onHandleKey(e));
    panel.appendChild(handle);

    const rail = document.createElement('div');
    rail.className = 'tcw-dock-rail';
    rail.setAttribute('role', 'toolbar');
    rail.setAttribute('aria-orientation', 'vertical');
    rail.setAttribute('aria-label', options.labels.rail);
    markPart(rail, 'dock');
    rail.addEventListener('keydown', (e) => this.onRailKey(e));

    element.append(panel, rail);
    host.appendChild(element);
    this.element = element;
    this.panel = panel;
    this.rail = rail;
    this.handle = handle;
    this.width = this.clamp(options.savedWidth?.() ?? DOCK_WIDTH.default, DOCK_WIDTH.max);
    this.applyWidth();
    // Its row narrowing (a window made smaller): the panel keeps to its share.
    if (options.room && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.fit());
      this.observer.observe(host);
    }
  }

  addPage(page: DockPage): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tcw-dock-btn';
    button.dataset.page = page.id;
    button.title = page.label;
    button.setAttribute('aria-label', page.label);
    button.setAttribute('aria-pressed', 'false');
    button.tabIndex = -1;
    button.innerHTML = createIcon(page.icon, 18);
    if (page.parts?.length) markPart(button, ...page.parts);
    button.addEventListener('click', () => {
      this.options.onPick?.(page.id);
      this.toggle(page.id);
    });
    button.addEventListener('focus', () => this.rove(button));
    this.rail.appendChild(button);
    page.element.hidden = true;
    page.element.classList.add('tcw-dock-page');
    this.panel.appendChild(page.element);
    this.pages.set(page.id, { page, button });
    this.syncRail();
  }

  /** Open `id`'s page, in place of the one open. */
  open(id: string): void {
    const entry = this.pages.get(id);
    if (!entry || this.open_ === id) return;
    this.hideCurrent();
    this.open_ = id;
    this.panel.hidden = false;
    entry.page.element.hidden = false;
    entry.button.setAttribute('aria-pressed', 'true');
    this.fit();
    entry.page.onShow?.();
    this.options.onChange?.(id);
  }

  /**
   * Shut the dock. The keyboard, if it was in the panel, goes to the page's
   * rail button, or where the owner says when that is out of sight.
   */
  close(): void {
    const id = this.open_;
    if (id === null) return;
    const hadFocus = this.panel.contains(document.activeElement);
    this.hideCurrent();
    this.panel.hidden = true;
    if (hadFocus) {
      const button = this.pages.get(id)?.button;
      const usable = button && (this.options.railShown?.() ?? true) && shown(button);
      (usable ? button : this.options.focusAfterClose?.(id))?.focus();
    }
    this.options.onChange?.(null);
  }

  /** Open `id`'s page, or shut the dock when it is the one open. */
  toggle(id: string): void {
    if (this.open_ === id) this.close();
    else this.open(id);
  }

  /** Shut the dock if `id`'s page is the one open. */
  closePage(id: string): void {
    if (this.open_ === id) this.close();
  }

  current(): string | null {
    return this.open_;
  }

  isOpen(id: string): boolean {
    return this.open_ === id;
  }

  /** After switches changed which rail buttons show: Tab lands on one that does. */
  syncRail(): void {
    const buttons = [...this.pages.values()].map((p) => p.button);
    const visible = buttons.filter(shown);
    const stop = buttons.find((b) => b.tabIndex === 0);
    if (stop && visible.includes(stop)) return;
    const next = visible.find((b) => b.getAttribute('aria-pressed') === 'true') ?? visible[0];
    for (const b of buttons) b.tabIndex = b === next ? 0 : -1;
  }

  /** The panel's width again, after its row changed size. */
  fit(): void {
    this.applyWidth();
  }

  destroy(): void {
    this.drag = null;
    this.stopDrag();
    this.observer?.disconnect();
    this.element.remove();
  }

  private hideCurrent(): void {
    const entry = this.open_ === null ? null : this.pages.get(this.open_);
    this.open_ = null;
    if (!entry) return;
    entry.page.element.hidden = true;
    entry.button.setAttribute('aria-pressed', 'false');
    entry.page.onHide?.();
  }

  // --- Width ---

  /** The widest the panel may be now: 377, or 38.2% of its row where that is less (never under 233). */
  private maxNow(): number {
    const room = this.options.room?.() ?? 0;
    if (room <= 0) return DOCK_WIDTH.max;
    return Math.max(DOCK_WIDTH.min, Math.min(DOCK_WIDTH.max, Math.floor(room * DOCK_SHARE)));
  }

  private clamp(width: number, max = this.maxNow()): number {
    return Math.round(Math.min(max, Math.max(DOCK_WIDTH.min, width)));
  }

  /** The width shown: the one asked for, within the room there is. */
  private shownWidth(): number {
    return this.clamp(this.width);
  }

  private setWidth(width: number): void {
    this.width = this.clamp(width);
    this.applyWidth();
  }

  private applyWidth(): void {
    const width = this.shownWidth();
    this.element.style.setProperty('--tcw-dock-w', `${width}px`);
    this.handle.setAttribute('aria-valuemax', String(this.maxNow()));
    this.handle.setAttribute('aria-valuenow', String(width));
  }

  private samePointer(e: MouseEvent): boolean {
    const id = (e as PointerEvent).pointerId;
    return this.drag?.pointer === undefined || id === undefined || id === this.drag.pointer;
  }

  /** The panel's edge faces the chart: dragged towards it, the panel widens. */
  private startDrag(e: PointerEvent | MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    const rtl = getComputedStyle(this.element).direction === 'rtl' || this.element.closest('[dir]')?.getAttribute('dir') === 'rtl';
    this.drag = { x: e.clientX, width: this.shownWidth(), dir: rtl ? -1 : 1, pointer: (e as PointerEvent).pointerId };
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerup', this.onUp);
    document.addEventListener('pointercancel', this.onUp);
  }

  private stopDrag(): void {
    document.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerup', this.onUp);
    document.removeEventListener('pointercancel', this.onUp);
  }

  /** Arrow keys a step (towards the chart widens), Home the narrowest, End the widest. */
  private onHandleKey(e: KeyboardEvent): void {
    const rtl = this.element.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const [wider, narrower] = rtl ? ['ArrowRight', 'ArrowLeft'] : ['ArrowLeft', 'ArrowRight'];
    const now = this.shownWidth();
    const next = e.key === wider ? now + DOCK_WIDTH_STEP
      : e.key === narrower ? now - DOCK_WIDTH_STEP
      : e.key === 'Home' ? DOCK_WIDTH.min
      : e.key === 'End' ? DOCK_WIDTH.max
      : null;
    if (next === null) return;
    e.preventDefault();
    this.setWidth(next);
    this.options.saveWidth?.(this.width);
  }

  /** A sheet over the chart (a phone) shuts on Escape; beside the chart it stays, the key left to the page. */
  private onPanelKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || e.defaultPrevented || !this.element.closest('[data-tcw-narrow]')) return;
    e.preventDefault();
    e.stopPropagation();
    this.close();
  }

  // --- The rail's keys ---

  /** One button takes Tab: the one focused last. */
  private rove(button: HTMLButtonElement): void {
    for (const { button: b } of this.pages.values()) b.tabIndex = b === button ? 0 : -1;
  }

  /** Up and down along the buttons that show (wrapping), Home and End to the ends. */
  private onRailKey(e: KeyboardEvent): void {
    const buttons = [...this.pages.values()].map((p) => p.button).filter(shown);
    const at = buttons.indexOf(e.target as HTMLButtonElement);
    if (at < 0) return;
    const next = e.key === 'ArrowDown' ? (at + 1) % buttons.length
      : e.key === 'ArrowUp' ? (at - 1 + buttons.length) % buttons.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? buttons.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    buttons[next].focus();
  }
}
