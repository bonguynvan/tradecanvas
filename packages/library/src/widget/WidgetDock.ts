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
}

/**
 * The panel's widths: 377 at most, a step of phi above 233; it opens at
 * 377 / sqrt(phi) = 296, as the indicator settings sit half a step under the
 * indicators dialog.
 */
export const DOCK_WIDTH = { min: 233, default: 296, max: 377 } as const;
/** One arrow key's worth of resizing. */
export const DOCK_WIDTH_STEP = 13;

const clampWidth = (w: number) => Math.round(Math.min(DOCK_WIDTH.max, Math.max(DOCK_WIDTH.min, w)));

/**
 * The widget's panels by the chart: a rail of buttons on the outer edge and,
 * beside the chart, the panel of the page open (one at a time). A rail button
 * opens its page, or shuts the dock when its page is the one open. The panel
 * is resized from its edge, by pointer or keyboard, between 233 and 377 px.
 * It sits on the right, on the left in a right-to-left widget.
 */
export class WidgetDock {
  readonly element: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly rail: HTMLDivElement;
  private readonly handle: HTMLDivElement;
  private readonly pages = new Map<string, { page: DockPage; button: HTMLButtonElement }>();
  private open_: string | null = null;
  private width: number;
  private drag: { x: number; width: number; dir: 1 | -1 } | null = null;

  private readonly onMove = (e: MouseEvent) => {
    if (!this.drag) return;
    this.setWidth(this.drag.width + (this.drag.x - e.clientX) * this.drag.dir);
  };
  private readonly onUp = () => {
    if (!this.drag) return;
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
    const handle = document.createElement('div');
    handle.className = 'tcw-dock-resize';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', options.labels.resize);
    handle.setAttribute('aria-valuemin', String(DOCK_WIDTH.min));
    handle.setAttribute('aria-valuemax', String(DOCK_WIDTH.max));
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
    this.width = clampWidth(options.savedWidth?.() ?? DOCK_WIDTH.default);
    this.applyWidth();
  }

  addPage(page: DockPage): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tcw-dock-btn';
    button.dataset.page = page.id;
    button.title = page.label;
    button.setAttribute('aria-label', page.label);
    button.setAttribute('aria-pressed', 'false');
    button.tabIndex = this.pages.size === 0 ? 0 : -1;
    button.innerHTML = createIcon(page.icon, 18);
    if (page.parts?.length) markPart(button, ...page.parts);
    button.addEventListener('click', () => this.toggle(page.id));
    button.addEventListener('focus', () => this.rove(button));
    this.rail.appendChild(button);
    page.element.hidden = true;
    page.element.classList.add('tcw-dock-page');
    this.panel.appendChild(page.element);
    this.pages.set(page.id, { page, button });
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
    entry.page.onShow?.();
    this.options.onChange?.(id);
  }

  /** Shut the dock; the keyboard, if it was in the panel, goes to the page's button. */
  close(): void {
    const id = this.open_;
    if (id === null) return;
    const hadFocus = this.panel.contains(document.activeElement);
    this.hideCurrent();
    this.panel.hidden = true;
    if (hadFocus) this.pages.get(id)?.button.focus();
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

  destroy(): void {
    this.stopDrag();
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

  private setWidth(width: number): void {
    this.width = clampWidth(width);
    this.applyWidth();
  }

  private applyWidth(): void {
    this.element.style.setProperty('--tcw-dock-w', `${this.width}px`);
    this.handle.setAttribute('aria-valuenow', String(this.width));
  }

  /** The panel's edge faces the chart: dragged towards it, the panel widens. */
  private startDrag(e: PointerEvent | MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    const rtl = getComputedStyle(this.element).direction === 'rtl' || this.element.closest('[dir]')?.getAttribute('dir') === 'rtl';
    this.drag = { x: e.clientX, width: this.width, dir: rtl ? -1 : 1 };
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
    const next = e.key === wider ? this.width + DOCK_WIDTH_STEP
      : e.key === narrower ? this.width - DOCK_WIDTH_STEP
      : e.key === 'Home' ? DOCK_WIDTH.min
      : e.key === 'End' ? DOCK_WIDTH.max
      : null;
    if (next === null) return;
    e.preventDefault();
    this.setWidth(next);
    this.options.saveWidth?.(this.width);
  }

  // --- The rail's keys ---

  /** One button takes Tab: the one focused last. */
  private rove(button: HTMLButtonElement): void {
    for (const { button: b } of this.pages.values()) b.tabIndex = b === button ? 0 : -1;
  }

  /** Up and down along the buttons that show (wrapping), Home and End to the ends. */
  private onRailKey(e: KeyboardEvent): void {
    const buttons = [...this.pages.values()].map((p) => p.button).filter((b) => b.getClientRects().length > 0 || !b.closest('[hidden]'));
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
