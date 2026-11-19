import { createIcon, createToolIcon } from './icons.js';
import { browserStorage } from './pageEnv.js';
import { markPart } from './widgetFeatures.js';

/** Where the bar is kept in this browser: shown or not, and where it was left. */
const STORAGE_KEY = 'tcw:favoritesBar';
/** Room kept between the bar and the chart's edges, and where it first sits from the top, px. */
const EDGE_GAP = 8;
/** A tool's icon on the bar, as on the sidebar. */
const TOOL_ICON_PX = 18;

export interface FavoritesBarCallbacks {
  /** A tool on the bar was pressed. */
  onPick: (tool: string) => void;
  /** A tool on the bar was right-clicked: unpinned, as on the sidebar's strip. */
  onUnpin: (tool: string) => void;
}

export interface FavoritesBarLabels {
  /** The bar's name, for a screen reader. */
  bar: string;
  /** Its grip, dragged to move it. */
  grip: string;
  /** A tool's name. */
  tool: (tool: string) => string;
  /** How to unpin it, after its name in its tooltip. */
  toolHint: (tool: string) => string;
}

interface KeptBar {
  shown: boolean;
  left: number;
  top: number;
}

function readKept(): KeptBar | null {
  try {
    const raw = browserStorage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const kept = JSON.parse(raw) as Partial<KeptBar>;
    if (typeof kept.shown !== 'boolean' || !Number.isFinite(kept.left) || !Number.isFinite(kept.top)) return null;
    return { shown: kept.shown, left: kept.left as number, top: kept.top as number };
  } catch {
    return null; // storage refused, or not ours: the defaults
  }
}

/**
 * The pinned drawing tools as a bar floating over the chart, moved by its
 * grip wherever it is wanted and kept there, in this browser, with whether
 * it shows. A tool on it picks the tool; right-clicked, it is unpinned.
 */
export class WidgetFavoritesBar {
  readonly element: HTMLDivElement;
  private readonly toolsEl: HTMLDivElement;
  private tools: string[] = [];
  private active: string | null = null;
  private shown = false;
  /** The host lets it show (its switch is on). */
  private allowed = true;
  /** Where it was put, kept as asked: drawn inside the chart, it comes back here when the chart has room again. */
  private left = EDGE_GAP;
  private top = EDGE_GAP;
  /** Where it is drawn: where it was put, within the chart. */
  private drawnLeft = EDGE_GAP;
  private drawnTop = EDGE_GAP;
  /** Where it was put: a default not yet centred until the chart has a size. */
  private placed = false;
  private drag: { x: number; y: number; left: number; top: number; pointer: number | undefined } | null = null;
  private readonly observer: ResizeObserver | null = null;

  private readonly onMove = (e: MouseEvent) => {
    if (!this.drag || !this.samePointer(e)) return;
    this.moveTo(this.drag.left + e.clientX - this.drag.x, this.drag.top + e.clientY - this.drag.y);
  };
  private readonly onUp = (e: MouseEvent) => {
    if (!this.drag || !this.samePointer(e)) return;
    this.drag = null;
    this.stopDrag();
    this.keep();
  };

  constructor(private readonly host: HTMLElement, private readonly labels: FavoritesBarLabels, private readonly callbacks: FavoritesBarCallbacks) {
    const el = document.createElement('div');
    el.className = 'tcw-favorites-bar';
    el.setAttribute('role', 'toolbar');
    el.setAttribute('aria-label', labels.bar);
    el.hidden = true;
    markPart(el, 'favoritesBar');

    const grip = document.createElement('span');
    grip.className = 'tcw-favorites-grip';
    grip.title = labels.grip;
    grip.setAttribute('aria-hidden', 'true');
    grip.innerHTML = createIcon('grip', 14);
    grip.addEventListener('pointerdown', (e) => this.startDrag(e));

    this.toolsEl = document.createElement('div');
    this.toolsEl.className = 'tcw-favorites-tools';
    el.append(grip, this.toolsEl);
    host.appendChild(el);
    this.element = el;

    const kept = readKept();
    if (kept) {
      this.shown = kept.shown;
      this.left = kept.left;
      this.top = kept.top;
      this.placed = true;
    }
    // The chart made smaller (a window, a panel beside it): the bar stays on it, and goes back when there is room.
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.place());
      this.observer.observe(host);
    }
  }

  /** Whether it is asked to show (kept from last time). */
  isShown(): boolean {
    return this.shown;
  }

  /** Whether it shows now: asked to, let to, and with a tool to show. */
  isShowing(): boolean {
    return this.shown && this.allowed && this.tools.length > 0;
  }

  /** The host's switch: off, it never shows, whatever was kept. */
  setAllowed(allowed: boolean): void {
    this.allowed = allowed;
    this.sync();
  }

  setShown(shown: boolean): void {
    this.shown = shown;
    this.sync();
    this.keep();
  }

  /** The pinned tools, in their order. */
  setTools(tools: readonly string[]): void {
    this.tools = [...tools];
    this.toolsEl.replaceChildren(...this.tools.map((tool) => this.toolButton(tool)));
    this.markActive();
    this.sync();
  }

  /** The tool in use, marked on the bar. */
  setActive(tool: string | null): void {
    if (tool === this.active) return;
    this.active = tool;
    this.markActive();
  }

  destroy(): void {
    this.stopDrag();
    this.observer?.disconnect();
    this.element.remove();
  }

  /** Shown when asked for, let and with a tool to show; placed on the chart. */
  private sync(): void {
    const visible = this.isShowing();
    this.element.hidden = !visible;
    if (!visible) return;
    if (!this.placed && this.host.clientWidth > 0) {
      // First shown: centred at the chart's top.
      this.left = Math.round((this.host.clientWidth - this.element.offsetWidth) / 2);
      this.placed = true;
    }
    this.place();
  }

  private toolButton(tool: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-favorites-tool';
    btn.dataset.toolValue = tool;
    btn.title = this.labels.toolHint(tool);
    btn.setAttribute('aria-label', this.labels.tool(tool));
    btn.innerHTML = createToolIcon(tool, TOOL_ICON_PX);
    btn.addEventListener('click', () => this.callbacks.onPick(tool));
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.callbacks.onUnpin(tool);
    });
    return btn;
  }

  private markActive(): void {
    for (const btn of this.toolsEl.querySelectorAll<HTMLButtonElement>('[data-tool-value]')) {
      const on = btn.dataset.toolValue === this.active;
      btn.classList.toggle('tcw-active', on);
      btn.setAttribute('aria-pressed', String(on));
    }
  }

  /** Put it at (`left`, `top`) in the chart, px: where it was asked to be. */
  private moveTo(left: number, top: number): void {
    this.left = Math.round(left);
    this.top = Math.round(top);
    this.place();
  }

  /** Draw it where it was put, kept inside the chart where the chart has a size (and it shows, so it has one too). */
  private place(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const fits = !this.element.hidden;
    const maxLeft = Math.max(0, width - this.element.offsetWidth);
    const maxTop = Math.max(0, height - this.element.offsetHeight);
    this.drawnLeft = width > 0 && fits ? Math.min(maxLeft, Math.max(0, this.left)) : this.left;
    this.drawnTop = height > 0 && fits ? Math.min(maxTop, Math.max(0, this.top)) : this.top;
    this.element.style.left = `${this.drawnLeft}px`;
    this.element.style.top = `${this.drawnTop}px`;
  }

  private samePointer(e: MouseEvent): boolean {
    const id = (e as PointerEvent).pointerId;
    return this.drag?.pointer === undefined || id === undefined || id === this.drag.pointer;
  }

  private startDrag(e: MouseEvent): void {
    // One pointer moves it: a second finger landing is not a new drag.
    if (e.button !== 0 || this.drag || (e as PointerEvent).isPrimary === false) return;
    e.preventDefault();
    // From where it is drawn: a bar held in by a small chart moves from there.
    this.drag = { x: e.clientX, y: e.clientY, left: this.drawnLeft, top: this.drawnTop, pointer: (e as PointerEvent).pointerId };
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerup', this.onUp);
    document.addEventListener('pointercancel', this.onUp);
  }

  private stopDrag(): void {
    document.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerup', this.onUp);
    document.removeEventListener('pointercancel', this.onUp);
  }

  private keep(): void {
    try {
      browserStorage()?.setItem(STORAGE_KEY, JSON.stringify({ shown: this.shown, left: this.left, top: this.top }));
    } catch { /* storage full or refused: it lasts this session */ }
  }
}
