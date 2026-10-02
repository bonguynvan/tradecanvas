import type { Theme, ThemeName, VisibleRangeChangePayload } from '@tradecanvas/commons';
import { ChartWidget } from './ChartWidget.js';
import type { ChartWidgetOptions, WidgetLayoutsOptions } from './types.js';
import type { GridLayout } from '../grid/ChartGrid.js';
import { injectWidgetStyles, removeWidgetStyles } from './WidgetStyles.js';
import { createTranslator, fill, resolveMessages, type MessageKey, type Translator } from './i18n.js';
import { createIcon } from './icons.js';
import { escapeHtml as esc } from './escapeHtml.js';
import { WidgetLayoutsUI } from './WidgetLayoutsUI.js';
import { LayoutSession } from '../state/LayoutSession.js';
import { localStorageLayouts, type SavedLayout } from '../state/layoutStorage.js';
import { parseLayoutJson, readWidgetLayout, type WidgetLayoutContent } from './widgetLayout.js';
import { utcToWallTime } from './WidgetGoToDate.js';

/** What the charts of a grid follow from each other. */
export interface WidgetGridSync {
  /** A new symbol on one chart goes to all. */
  symbol: boolean;
  /** A new interval on one chart goes to all. */
  interval: boolean;
  /** The crosshair's time shows on every chart. */
  crosshair: boolean;
  /** Scrolling and zooming one chart moves the others to the same times. */
  time: boolean;
  /** Drawings are copied to the charts showing the same symbol. */
  drawings: boolean;
}

export const DEFAULT_GRID_SYNC: Readonly<WidgetGridSync> = { symbol: false, interval: false, crosshair: true, time: false, drawings: false };

const SYNC_KEYS: readonly (keyof WidgetGridSync)[] = ['symbol', 'interval', 'crosshair', 'time', 'drawings'];

/** Columns and rows of each arrangement. */
export const GRID_SHAPES: Readonly<Record<GridLayout, { cols: number; rows: number }>> = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 2, rows: 1 },
  '2x1': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  '1x3': { cols: 3, rows: 1 },
  '3x1': { cols: 1, rows: 3 },
  '2x3': { cols: 3, rows: 2 },
  '3x2': { cols: 2, rows: 3 },
};

export interface ChartWidgetGridOptions {
  /** How the charts are arranged. Default `'1x2'` (two side by side). */
  layout?: GridLayout;
  /** The arrangements the bar offers. Default all of them. */
  layoutChoices?: readonly GridLayout[];
  /** Options for every chart. */
  widget?: ChartWidgetOptions;
  /** Each chart's own options, by position (its symbol and interval, say), over `widget`. */
  cells?: readonly ChartWidgetOptions[];
  /** What the charts follow from each other; see {@link DEFAULT_GRID_SYNC}. */
  sync?: Partial<WidgetGridSync>;
  /** Named layouts of the whole grid (arrangement, sync and every chart). Default `true`. */
  layouts?: boolean | WidgetLayoutsOptions;
  /** The bar above the charts: arrangement, sync, layouts. Default `true`. */
  bar?: boolean;
  /** The chart in use changed (pressed, or the grid shrank). */
  onActiveChange?: (index: number, widget: ChartWidget) => void;
}

/** What a grid's named layout holds. */
export interface WidgetGridLayoutContent {
  v: 1;
  kind: 'grid';
  layout: GridLayout;
  sync: WidgetGridSync;
  active: number;
  cells: WidgetLayoutContent[];
}

interface Cell {
  el: HTMLDivElement;
  widget: ChartWidget;
}

let lastPressedGrid: ChartWidgetGrid | null = null;

/** A small picture of an arrangement: `cols` × `rows` boxes. */
function shapeIcon(cols: number, rows: number, size = 16): string {
  const gap = 2;
  const w = (20 - gap * (cols - 1)) / cols;
  const h = (20 - gap * (rows - 1)) / rows;
  let rects = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects += `<rect x="${2 + c * (w + gap)}" y="${2 + r * (h + gap)}" width="${w}" height="${h}" rx="1"/>`;
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">${rects}</svg>`;
}

/** A grid's layout read back from storage, or `null` when it is not one. */
export function readGridLayout(value: unknown): WidgetGridLayoutContent | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.v !== 1 || v.kind !== 'grid' || typeof v.layout !== 'string' || !(v.layout in GRID_SHAPES) || !Array.isArray(v.cells)) return null;
  const cells = v.cells.map(readWidgetLayout);
  if (cells.some((c) => c === null)) return null;
  const rawSync = (typeof v.sync === 'object' && v.sync !== null ? v.sync : {}) as Record<string, unknown>;
  const sync = { ...DEFAULT_GRID_SYNC };
  for (const key of SYNC_KEYS) if (typeof rawSync[key] === 'boolean') sync[key] = rawSync[key] as boolean;
  const active = typeof v.active === 'number' && Number.isInteger(v.active) ? v.active : 0;
  return { v: 1, kind: 'grid', layout: v.layout as GridLayout, sync, active, cells: cells as WidgetLayoutContent[] };
}

/**
 * Several chart widgets side by side, each with its own symbol, interval,
 * indicators and drawings. A bar above them picks the arrangement, links them
 * (symbol, interval, crosshair, time, drawings) and saves the whole grid as a
 * named layout. The chart pressed last is the active one.
 */
export class ChartWidgetGrid {
  private root: HTMLDivElement;
  private cellsEl: HTMLDivElement;
  private cells: Cell[] = [];
  private layout: GridLayout;
  private sync: WidgetGridSync;
  private active = 0;
  /** The chart under the pointer: scrolling there moves the others. */
  private hovered: Cell | null = null;
  /** Set while the grid itself passes a change on, so the charts it changes don't pass it back. */
  private relaying = false;
  private drawingFrame = 0;
  private drawingSource: Cell | null = null;
  private layoutButtons = new Map<GridLayout, HTMLButtonElement>();
  private syncButtons = new Map<keyof WidgetGridSync, HTMLButtonElement>();
  private layoutsButton: HTMLButtonElement | null = null;
  private session: LayoutSession | null = null;
  private layoutsUI: WidgetLayoutsUI | null = null;
  private readonly t: Translator;
  private destroyed = false;
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || (e.key !== 's' && e.key !== 'S')) return;
    if (!this.layoutsUI || (lastPressedGrid !== null && lastPressedGrid !== this)) return;
    e.preventDefault();
    void this.layoutsUI.save();
  };
  private readonly onPointerDown = () => { lastPressedGrid = this; };

  constructor(container: HTMLElement, private readonly options: ChartWidgetGridOptions = {}) {
    this.layout = options.layout && options.layout in GRID_SHAPES ? options.layout : '1x2';
    this.sync = { ...DEFAULT_GRID_SYNC, ...options.sync };
    this.t = createTranslator(resolveMessages(options.widget?.locale, options.widget?.messages));
    injectWidgetStyles();

    this.root = document.createElement('div');
    this.root.className = 'tcw-root tcw-grid';
    this.root.dataset.tcwTheme = options.widget?.theme === 'light' ? 'light' : 'dark';
    this.root.addEventListener('pointerdown', this.onPointerDown, true);
    if (options.bar !== false) this.root.appendChild(this.buildBar());
    this.cellsEl = document.createElement('div');
    this.cellsEl.className = 'tcw-grid-cells';
    this.root.appendChild(this.cellsEl);
    container.appendChild(this.root);

    this.applyShape();
    for (let i = 0; i < this.shapeCount(); i++) this.cells.push(this.createCell(i));
    this.markActive();

    if (options.layouts !== false) this.setupLayouts(options.layouts === true || options.layouts === undefined ? {} : options.layouts);
    document.addEventListener('keydown', this.onKeyDown);
  }

  // --- Public API ---

  getWidget(index: number): ChartWidget | null {
    return this.cells[index]?.widget ?? null;
  }

  getWidgets(): ChartWidget[] {
    return this.cells.map((c) => c.widget);
  }

  getActiveIndex(): number {
    return this.active;
  }

  getActiveWidget(): ChartWidget {
    return this.cells[this.active].widget;
  }

  setActive(index: number): void {
    if (index < 0 || index >= this.cells.length || index === this.active) return;
    this.active = index;
    this.markActive();
    this.options.onActiveChange?.(index, this.cells[index].widget);
  }

  getLayout(): GridLayout {
    return this.layout;
  }

  /** Arrange the charts: extra ones go, new ones open on the active chart's symbol and interval when those are synced. */
  setLayout(layout: GridLayout): void {
    if (layout === this.layout || !(layout in GRID_SHAPES)) return;
    this.layout = layout;
    const count = this.shapeCount();
    while (this.cells.length > count) this.destroyCell(this.cells.pop()!);
    this.applyShape();
    for (let i = this.cells.length; i < count; i++) this.cells.push(this.createCell(i));
    if (this.active >= count) {
      this.active = 0;
      this.options.onActiveChange?.(0, this.cells[0].widget);
    }
    this.markActive();
    this.renderBar();
    this.session?.changed();
  }

  getSync(): WidgetGridSync {
    return { ...this.sync };
  }

  setSync(patch: Partial<WidgetGridSync>): void {
    const before = this.sync;
    this.sync = { ...this.sync, ...patch };
    if (before.crosshair && !this.sync.crosshair) for (const c of this.cells) c.widget.getChart().setCrosshairTime(null);
    // Switched on: line the others up with the active chart now.
    const source = this.cells[this.active];
    if (source && !this.relaying) {
      const state = source.widget.captureLayout();
      if (!before.symbol && this.sync.symbol) this.relay(source, (w) => void w.setSymbol(state.symbol));
      if (!before.interval && this.sync.interval) this.relay(source, (w) => void w.setTimeframe(state.timeframe));
      if (!before.drawings && this.sync.drawings) this.copyDrawings(source);
    }
    this.renderBar();
    this.session?.changed();
  }

  /** Every chart's theme. */
  setTheme(theme: ThemeName | Theme): void {
    for (const c of this.cells) c.widget.setTheme(theme);
    this.followTheme();
  }

  /** Named layouts of the grid. `null` with `layouts: false`. */
  getLayoutSession(): LayoutSession | null {
    return this.session;
  }

  /** The grid as a layout: arrangement, sync and every chart. */
  captureLayout(): WidgetGridLayoutContent {
    return {
      v: 1,
      kind: 'grid',
      layout: this.layout,
      sync: { ...this.sync },
      active: this.active,
      cells: this.cells.map((c) => c.widget.captureLayout()),
    };
  }

  async restoreLayout(content: WidgetGridLayoutContent): Promise<void> {
    this.relaying = true;
    try {
      this.setLayout(content.layout);
      this.sync = { ...content.sync };
      this.renderBar();
      await Promise.all(this.cells.map((c, i) => (content.cells[i] ? c.widget.restoreLayout(content.cells[i]) : undefined)));
    } finally {
      this.relaying = false;
    }
    if (this.destroyed) return;
    this.setActive(Math.min(Math.max(0, content.active), this.cells.length - 1));
  }

  getLayoutContent(): string {
    return JSON.stringify(this.captureLayout());
  }

  /** Show a layout from `getLayoutContent()`; `false` when it is not one. */
  async applyLayoutContent(content: string): Promise<boolean> {
    const layout = readGridLayout(parseLayoutJson(content));
    if (!layout) return false;
    await this.restoreLayout(layout);
    return true;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    document.removeEventListener('keydown', this.onKeyDown);
    this.root.removeEventListener('pointerdown', this.onPointerDown, true);
    if (lastPressedGrid === this) lastPressedGrid = null;
    if (this.drawingFrame) cancelAnimationFrame(this.drawingFrame);
    this.session?.destroy();
    this.layoutsUI?.destroy();
    for (const c of this.cells) this.destroyCell(c);
    this.cells = [];
    this.root.remove();
    removeWidgetStyles();
  }

  // --- Cells ---

  private shapeCount(): number {
    const { cols, rows } = GRID_SHAPES[this.layout];
    return cols * rows;
  }

  private applyShape(): void {
    const { cols, rows } = GRID_SHAPES[this.layout];
    this.cellsEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    this.cellsEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  }

  private createCell(index: number): Cell {
    const el = document.createElement('div');
    el.className = 'tcw-grid-cell';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', fill(this.t('grid.chart'), { n: index + 1 }));
    this.cellsEl.appendChild(el);

    const shared = this.options.widget ?? {};
    const own = this.options.cells?.[index] ?? {};
    // A new chart joins the synced symbol and interval.
    const lead = this.cells[this.active]?.widget.captureLayout();
    const cell = {} as Cell;
    const widget = new ChartWidget(el, {
      ...shared,
      ...own,
      ...(lead && this.sync.symbol ? { symbol: lead.symbol } : {}),
      ...(lead && this.sync.interval ? { timeframe: lead.timeframe } : {}),
      // The grid keeps the layouts, of all its charts at once.
      layouts: false,
      onSymbolChange: (symbol) => {
        own.onSymbolChange?.(symbol);
        shared.onSymbolChange?.(symbol);
        if (this.sync.symbol) this.relay(cell, (w) => void w.setSymbol(symbol));
        this.session?.changed();
      },
      onTimeframeChange: (tf) => {
        own.onTimeframeChange?.(tf);
        shared.onTimeframeChange?.(tf);
        if (this.sync.interval) this.relay(cell, (w) => void w.setTimeframe(tf));
        this.session?.changed();
      },
    });
    cell.el = el;
    cell.widget = widget;
    this.wireCell(cell);
    el.addEventListener('pointerdown', () => this.setActive(this.cells.indexOf(cell)), true);
    el.addEventListener('pointerenter', () => { this.hovered = cell; });
    el.addEventListener('pointerleave', () => { if (this.hovered === cell) this.hovered = null; });
    return cell;
  }

  /** The chart's links to the others (its listeners go with it when the widget is destroyed). */
  private wireCell(cell: Cell): void {
    const chart = cell.widget.getChart();
    const others = () => this.cells.filter((c) => c !== cell);
    chart.on('crosshairMove', (e) => {
      const time = (e.payload as { bar?: { time: number } }).bar?.time;
      if (!this.sync.crosshair || time === undefined) return;
      for (const other of others()) other.widget.getChart().setCrosshairTime(time);
    });
    chart.on('crosshairLeave', () => {
      if (!this.sync.crosshair) return;
      for (const other of others()) other.widget.getChart().setCrosshairTime(null);
    });
    chart.on('visibleRangeChange', (e) => {
      // Only the chart being scrolled leads, so new bars on the others don't pull it back.
      if (!this.sync.time || this.relaying || (this.hovered ?? this.cells[this.active]) !== cell) return;
      const { from, to } = e.payload as VisibleRangeChangePayload;
      const data = chart.getData();
      const fromTime = data[from]?.time;
      const toTime = data[to]?.time;
      if (fromTime === undefined || toTime === undefined) return;
      this.relay(cell, (w) => w.getChart().setVisibleRange(fromTime, toTime));
    });
    for (const event of ['drawingCreate', 'drawingUpdate', 'drawingRemove'] as const) {
      chart.on(event, () => {
        if (this.sync.drawings && !this.relaying) this.copyDrawingsSoon(cell);
      });
    }
    chart.on('stateChange', () => this.session?.changed());
    chart.on('themeChange', () => {
      if (!this.relaying) this.followTheme(cell);
    });
  }

  private destroyCell(cell: Cell): void {
    if (this.hovered === cell) this.hovered = null;
    if (this.drawingSource === cell) this.drawingSource = null;
    cell.widget.destroy();
    cell.el.remove();
  }

  /** Pass a change from `source` on to the other charts, without it coming back. */
  private relay(source: Cell, apply: (widget: ChartWidget) => void): void {
    if (this.relaying) return;
    this.relaying = true;
    try {
      for (const c of this.cells) if (c !== source) apply(c.widget);
    } finally {
      this.relaying = false;
    }
  }

  /** Drawings move in bursts (a drag): copy them once a frame. */
  private copyDrawingsSoon(source: Cell): void {
    this.drawingSource = source;
    if (this.drawingFrame) return;
    this.drawingFrame = requestAnimationFrame(() => {
      this.drawingFrame = 0;
      const from = this.drawingSource;
      this.drawingSource = null;
      if (from && !this.destroyed) this.copyDrawings(from);
    });
  }

  /** `source`'s drawings onto the charts showing its symbol. */
  private copyDrawings(source: Cell): void {
    const symbol = source.widget.captureLayout().symbol;
    const drawings = source.widget.getChart().getDrawings();
    this.relaying = true;
    try {
      for (const c of this.cells) {
        if (c !== source && c.widget.captureLayout().symbol === symbol) c.widget.getChart().setDrawings(drawings);
      }
    } finally {
      this.relaying = false;
    }
  }

  /** Dark or light, as `source` (or the active chart) now is, for the bar and every chart. */
  private followTheme(source: Cell = this.cells[this.active]): void {
    const theme = source?.el.querySelector<HTMLElement>('.tcw-root')?.dataset.tcwTheme;
    if (!theme) return;
    this.root.dataset.tcwTheme = theme;
    this.relaying = true;
    try {
      for (const c of this.cells) {
        if (c !== source && c.el.querySelector<HTMLElement>('.tcw-root')?.dataset.tcwTheme !== theme) c.widget.setTheme(theme as ThemeName);
      }
    } finally {
      this.relaying = false;
    }
  }

  private markActive(): void {
    this.cells.forEach((c, i) => c.el.classList.toggle('tcw-grid-cell-active', i === this.active && this.cells.length > 1));
  }

  // --- Bar ---

  private buildBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'tcw-grid-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', this.t('grid.bar'));

    const shapes = document.createElement('div');
    shapes.className = 'tcw-grid-group';
    shapes.setAttribute('role', 'group');
    shapes.setAttribute('aria-label', this.t('grid.layout'));
    const choices = this.options.layoutChoices?.filter((l) => l in GRID_SHAPES) ?? (Object.keys(GRID_SHAPES) as GridLayout[]);
    for (const layout of choices) {
      const { cols, rows } = GRID_SHAPES[layout];
      const label = cols * rows === 1
        ? this.t('grid.single')
        : fill(this.t('grid.layoutOption'), { count: cols * rows, cols, rows });
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-btn-icon';
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.innerHTML = shapeIcon(cols, rows);
      btn.addEventListener('click', () => this.setLayout(layout));
      this.layoutButtons.set(layout, btn);
      shapes.appendChild(btn);
    }

    const sync = document.createElement('div');
    sync.className = 'tcw-grid-group';
    sync.setAttribute('role', 'group');
    sync.setAttribute('aria-label', this.t('grid.sync'));
    const syncLabel = document.createElement('span');
    syncLabel.className = 'tcw-grid-label';
    syncLabel.innerHTML = `${createIcon('link', 13)}<span>${esc(this.t('grid.sync'))}</span>`;
    sync.appendChild(syncLabel);
    for (const key of SYNC_KEYS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-btn tcw-grid-sync';
      btn.textContent = this.t(`grid.sync.${key}` as MessageKey);
      btn.title = this.t(`grid.sync.${key}.hint` as MessageKey);
      btn.addEventListener('click', () => this.setSync({ [key]: !this.sync[key] }));
      this.syncButtons.set(key, btn);
      sync.appendChild(btn);
    }

    const spacer = document.createElement('span');
    spacer.className = 'tcw-toolbar-spacer';
    bar.append(shapes, this.sep(), sync, spacer);

    if (this.options.layouts !== false) {
      this.layoutsButton = document.createElement('button');
      this.layoutsButton.type = 'button';
      this.layoutsButton.className = 'tcw-dropdown-trigger tcw-layouts-btn';
      this.layoutsButton.setAttribute('aria-haspopup', 'menu');
      this.layoutsButton.addEventListener('click', () => {
        if (this.layoutsButton) void this.layoutsUI?.openMenu(this.layoutsButton);
      });
      bar.appendChild(this.layoutsButton);
    }
    this.renderBar();
    return bar;
  }

  private sep(): HTMLSpanElement {
    const s = document.createElement('span');
    s.className = 'tcw-toolbar-sep';
    return s;
  }

  private renderBar(): void {
    for (const [layout, btn] of this.layoutButtons) {
      const on = layout === this.layout;
      btn.classList.toggle('tcw-active', on);
      btn.setAttribute('aria-pressed', String(on));
    }
    for (const [key, btn] of this.syncButtons) {
      btn.classList.toggle('tcw-active', this.sync[key]);
      btn.setAttribute('aria-pressed', String(this.sync[key]));
    }
    this.renderLayoutsButton();
  }

  private renderLayoutsButton(): void {
    const btn = this.layoutsButton;
    if (!btn) return;
    const name = this.session?.current()?.name ?? this.t('layouts.unnamed');
    const dirty = this.session?.isDirty() ?? false;
    const label = `${this.t('toolbar.layouts')}: ${name}${dirty ? ` (${this.t('layouts.unsavedChanges')})` : ''}`;
    btn.innerHTML = `${createIcon('save', 14)}<span class="tcw-layouts-label">${esc(name)}</span>`
      + (dirty ? '<span class="tcw-layouts-dirty" aria-hidden="true"></span>' : '')
      + createIcon('chevronDown', 12);
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  // --- Layouts ---

  private setupLayouts(cfg: WidgetLayoutsOptions): void {
    const session = new LayoutSession(cfg.storage ?? localStorageLayouts('tcw:grid-layouts:'), {
      capture: () => {
        const lead = this.cells[this.active].widget.captureLayout();
        return { content: this.getLayoutContent(), symbol: lead.symbol, timeframe: lead.timeframe };
      },
      apply: async (layout: SavedLayout) => {
        if (!(await this.applyLayoutContent(layout.content))) throw new Error('Not a grid layout');
      },
    }, {
      autoSave: cfg.autoSave,
      debounceMs: cfg.debounceMs,
      onChange: () => this.renderLayoutsButton(),
      onError: () => this.toast(this.t('layouts.saveFailed'), 'error'),
    });
    this.session = session;
    this.layoutsUI = new WidgetLayoutsUI(session, {
      root: this.root,
      t: this.t,
      toast: (message, kind) => this.toast(message, kind),
      formatTime: (ms) => {
        const { date, time } = utcToWallTime(ms, null);
        return `${date} ${time}`;
      },
    });
    this.renderLayoutsButton();
    if (cfg.openLast) {
      void session.list().then(([last]) => (last && !this.destroyed ? this.layoutsUI?.open(last.id) : undefined), () => undefined);
    }
  }

  private toast(message: string, kind: 'info' | 'error' = 'info'): void {
    this.cells[this.active]?.widget.toast(message, kind);
  }
}
