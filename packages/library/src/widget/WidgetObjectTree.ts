import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type MessageKey, type Translator } from './i18n.js';
import { markPart } from './widgetFeatures.js';

export interface ObjectTreeIndicator {
  instanceId: string;
  /** As its chip and the legend name it: 'BB 20 2'. */
  name: string;
  /** Its full name, for the row's tooltip ('Bollinger Bands'); `name` without one. */
  title?: string;
  visible: boolean;
}

export interface ObjectTreeDrawing {
  id: string;
  /** As the row names it: its own name, else its tool's. */
  label: string;
  visible: boolean;
  /** Shown, but kept to other intervals than the chart's: not drawn now. */
  offInterval?: boolean;
  locked: boolean;
  /** The group it belongs to; a group's drawings are listed under one row. */
  group?: { id: string; name: string };
}

export interface ObjectTreeCompare {
  id: string;
  label: string;
  /** The line's colour, for a compare that has one of its own (the percent way). */
  color?: string;
  /** How it is compared, in words. */
  way?: string;
}

export interface ObjectTreeCallbacks {
  /** Its close button: the dock it sits in shuts. Without it, the panel hides itself. */
  onClose?: () => void;
  onRemoveIndicator: (instanceId: string) => void;
  onConfigureIndicator?: (instanceId: string) => void;
  onToggleIndicatorVisible?: (instanceId: string, visible: boolean) => void;
  onRemoveDrawing: (id: string) => void;
  onToggleDrawingVisible: (id: string, visible: boolean) => void;
  onToggleDrawingLocked: (id: string, locked: boolean) => void;
  /** When provided, each drawing row gets a settings button. */
  onConfigureDrawing?: (id: string) => void;
  /** Group rows: hide, lock, rename (or double-click its name) and ungroup the group. */
  onToggleGroupVisible?: (groupId: string, visible: boolean) => void;
  onToggleGroupLocked?: (groupId: string, locked: boolean) => void;
  onUngroup?: (groupId: string) => void;
  onRenameGroup?: (groupId: string, name: string) => void;
  /** A drawing's row: a click on its name selects it, a double-click renames it ('' clears the name). */
  onSelectDrawing?: (id: string) => void;
  onRenameDrawing?: (id: string, name: string) => void;
  /** Each drawing row gets a clone button. */
  onCloneDrawing?: (id: string) => void;
  /**
   * Each drawing outside a group gets a grip: dragged onto another such row,
   * the drawing takes that row's place in the chart's order; a group moves
   * as one, from the chart.
   */
  onMoveDrawing?: (id: string, index: number) => void;
  /** When provided, a Compare section with an "add" button is shown. */
  onAddCompare?: () => void;
  onRemoveCompare?: (id: string) => void;
}

/**
 * Object-tree panel — a layers manager. Lists every active
 * indicator and drawing on the chart with per-item controls: indicators can be
 * removed; drawings can be shown/hidden, locked/unlocked, and removed. Toggled
 * from the toolbar layers button; the host wires actions back to the chart.
 */
export class WidgetObjectTree {
  private el: HTMLDivElement;
  private indicatorsEl: HTMLDivElement;
  private drawingsEl: HTMLDivElement;
  private compareEl: HTMLDivElement | null = null;
  private callbacks: ObjectTreeCallbacks;
  private open = false;
  /** Each drawing's place in the chart's order (bottom first), as last listed. */
  private drawingIndex = new Map<string, number>();
  /** The drawings outside a group, in the order the list shows them: what the grips move among. */
  private loose: string[] = [];
  /** Drawings listed while a rename or a drag was under way, drawn when it ends. */
  private pending: ObjectTreeDrawing[] | null = null;
  private renaming = false;
  /** A row being dragged by its grip, and the listeners that follow the pointer. */
  private dragging: { id: string; stop: () => void } | null = null;

  constructor(host: HTMLElement, callbacks: ObjectTreeCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-tree-panel';
    markPart(this.el, 'objectTree');
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-tree-header';
    const title = document.createElement('span');
    title.textContent = this.t('objects.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-tree-close';
    closeBtn.setAttribute('aria-label', this.t('objects.close'));
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => (this.callbacks.onClose ? this.callbacks.onClose() : this.close()));
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    this.indicatorsEl = this.makeSection(this.t('objects.indicators'));
    this.drawingsEl = this.makeSection(this.t('objects.drawings'));
    if (this.callbacks.onAddCompare) {
      this.compareEl = this.makeSection(this.t('objects.compare'), {
        label: this.t('objects.addCompare'),
        run: () => this.callbacks.onAddCompare?.(),
      });
      // Its add button goes with the compare switch; compares already on stay listed, to remove.
      const add = this.compareEl.parentElement?.querySelector<HTMLElement>('.tcw-tree-add');
      if (add) markPart(add, 'compare');
    }

    host.appendChild(this.el);
  }

  /** The panel, for the dock to hold. */
  get element(): HTMLElement {
    return this.el;
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open ? this.close() : this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.el.hidden = false;
  }

  close(): void {
    this.open = false;
    this.el.hidden = true;
  }

  destroy(): void {
    this.pending = null;
    this.dragging?.stop();
    this.el.remove();
  }

  /** Replace all lists. Cheap full re-render — counts are small. */
  setObjects(
    indicators: ObjectTreeIndicator[],
    drawings: ObjectTreeDrawing[],
    compares: ObjectTreeCompare[] = [],
  ): void {
    this.renderIndicators(indicators);
    this.renderDrawings(drawings);
    this.renderCompares(compares);
  }

  private makeSection(title: string, add?: { label: string; run: () => void }): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.className = 'tcw-tree-section';
    const head = document.createElement('div');
    head.className = 'tcw-tree-section-head';
    const label = document.createElement('span');
    label.textContent = title;
    head.appendChild(label);
    if (add) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'tcw-tree-add';
      addBtn.setAttribute('aria-label', add.label);
      addBtn.title = add.label;
      addBtn.innerHTML = createIcon('plus', 13);
      addBtn.addEventListener('click', add.run);
      head.appendChild(addBtn);
    }
    const list = document.createElement('div');
    list.className = 'tcw-tree-list';
    wrap.appendChild(head);
    wrap.appendChild(list);
    this.el.appendChild(wrap);
    return list;
  }

  private renderIndicators(indicators: ObjectTreeIndicator[]): void {
    this.indicatorsEl.replaceChildren();
    if (indicators.length === 0) {
      this.indicatorsEl.appendChild(this.emptyRow(this.t('objects.noIndicators')));
      return;
    }
    for (const ind of indicators) {
      const row = this.row(ind.name, ind.title);
      if (!ind.visible) row.classList.add('tcw-tree-hidden');
      const actions = document.createElement('div');
      actions.className = 'tcw-tree-actions';
      if (this.callbacks.onToggleIndicatorVisible) {
        actions.appendChild(this.iconButton(
          ind.visible ? 'eye' : 'eyeOff',
          ind.visible ? this.t('common.hide') : this.t('common.show'),
          '',
          () => this.callbacks.onToggleIndicatorVisible?.(ind.instanceId, !ind.visible),
        ));
      }
      if (this.callbacks.onConfigureIndicator) {
        const gear = this.iconButton('settings', this.t('objects.indicatorSettings'), '', () =>
          this.callbacks.onConfigureIndicator?.(ind.instanceId),
        );
        markPart(gear, 'indicatorSettings');
        actions.appendChild(gear);
      }
      actions.appendChild(this.iconButton('trash', this.t('objects.removeIndicator'), 'tcw-tree-del', () =>
        this.callbacks.onRemoveIndicator(ind.instanceId),
      ));
      row.appendChild(actions);
      this.indicatorsEl.appendChild(row);
    }
  }

  private renderDrawings(drawings: ObjectTreeDrawing[]): void {
    // A name being typed or a row being dragged would be thrown away: the list waits for it.
    if (this.renaming || this.dragging) {
      this.pending = drawings;
      return;
    }
    this.pending = null;
    // The grip with the focus keeps it, so the arrow keys go on moving its drawing.
    const focusedGrip = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.tcw-tree-grip')
      ?.closest<HTMLElement>('[data-drawing-id]')?.dataset.drawingId;
    this.drawingIndex = new Map(drawings.map((d, i) => [d.id, i]));
    this.loose = drawings.filter((d) => !d.group).map((d) => d.id);
    this.drawingsEl.replaceChildren();
    this.listDrawings(drawings);
    if (focusedGrip) this.drawingsEl.querySelector<HTMLElement>(`[data-drawing-id="${focusedGrip}"] .tcw-tree-grip`)?.focus();
  }

  /** Draw the list held back by a rename or a drag, once it ends. */
  private flushPending(): void {
    if (this.pending && !this.renaming && !this.dragging) this.renderDrawings(this.pending);
  }

  private listDrawings(drawings: ObjectTreeDrawing[]): void {
    if (drawings.length === 0) {
      this.drawingsEl.appendChild(this.emptyRow(this.t('objects.noDrawings')));
      return;
    }
    const listed = new Set<string>();
    for (const d of drawings) {
      if (!d.group) {
        this.drawingsEl.appendChild(this.drawingRow(d));
        continue;
      }
      if (listed.has(d.group.id)) continue;
      // A group is listed where its first drawing is, its drawings under it.
      listed.add(d.group.id);
      const groupId = d.group.id;
      const members = drawings.filter((m) => m.group?.id === groupId);
      this.drawingsEl.appendChild(this.groupRow(groupId, d.group.name, members));
      for (const m of members) {
        const row = this.drawingRow(m);
        row.classList.add('tcw-tree-member');
        this.drawingsEl.appendChild(row);
      }
    }
  }

  private groupRow(groupId: string, name: string, members: readonly ObjectTreeDrawing[]): HTMLDivElement {
    const row = this.row(name);
    row.classList.add('tcw-tree-group');
    const visible = members.some((m) => m.visible);
    const locked = members.every((m) => m.locked);
    if (!visible) row.classList.add('tcw-tree-hidden');
    const nameEl = row.querySelector<HTMLSpanElement>('.tcw-tree-name')!;
    nameEl.innerHTML = createIcon('layers', 13);
    nameEl.append(` ${name}`);
    const actions = document.createElement('div');
    actions.className = 'tcw-tree-actions';
    if (this.callbacks.onRenameGroup) {
      nameEl.addEventListener('dblclick', () => this.renameGroup(nameEl, groupId, name));
      actions.appendChild(this.iconButton('penLine', this.t('objects.renameGroup'), '', () => this.renameGroup(nameEl, groupId, name)));
    }
    if (this.callbacks.onToggleGroupVisible) {
      actions.appendChild(this.iconButton(
        visible ? 'eye' : 'eyeOff',
        visible ? this.t('common.hide') : this.t('common.show'),
        '',
        () => this.callbacks.onToggleGroupVisible?.(groupId, !visible),
      ));
    }
    if (this.callbacks.onToggleGroupLocked) {
      actions.appendChild(this.iconButton(
        locked ? 'lock' : 'unlock',
        locked ? this.t('common.unlock') : this.t('common.lock'),
        locked ? 'tcw-tree-on' : '',
        () => this.callbacks.onToggleGroupLocked?.(groupId, !locked),
      ));
    }
    if (this.callbacks.onUngroup) {
      actions.appendChild(this.iconButton('x', this.t('drawingMenu.ungroup'), '', () => this.callbacks.onUngroup?.(groupId)));
    }
    row.appendChild(actions);
    return row;
  }

  /** Swap a group's name for a text box: Enter or leaving it renames, Escape keeps the name. */
  private renameGroup(nameEl: HTMLElement, groupId: string, name: string): void {
    this.renameInline(nameEl, name, this.t('objects.renameGroup'), (next) => {
      if (next && next !== name) this.callbacks.onRenameGroup?.(groupId, next);
    });
  }

  /**
   * Swap a name for a text box holding `name`: Enter or leaving it calls
   * `save` with the trimmed text, Escape keeps the name.
   */
  private renameInline(nameEl: HTMLElement, name: string, label: string, save: (next: string) => void): void {
    if (!nameEl.isConnected) return; // already being renamed
    this.renaming = true;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tcw-tree-rename';
    input.value = name;
    input.maxLength = MAX_NAME;
    input.setAttribute('aria-label', label);
    let done = false;
    const finish = (keep: boolean) => {
      if (done) return;
      done = true;
      const next = input.value.trim();
      if (input.isConnected) input.replaceWith(nameEl);
      this.renaming = false;
      if (keep) save(next);
      this.flushPending();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') {
        e.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
    nameEl.replaceWith(input);
    input.focus();
    input.select();
  }

  private drawingRow(d: ObjectTreeDrawing): HTMLDivElement {
    const row = this.row(d.label);
    row.dataset.drawingId = d.id;
    if (!d.visible || d.offInterval) row.classList.add('tcw-tree-hidden');
    if (d.offInterval) row.title = this.t('indicatorSettings.offInterval');
    if (this.callbacks.onMoveDrawing && !d.group) {
      row.dataset.reorder = 'true';
      row.insertBefore(this.grip(d.id), row.firstChild);
    }

    const nameEl = row.querySelector<HTMLSpanElement>('.tcw-tree-name')!;
    if (this.callbacks.onSelectDrawing) {
      nameEl.classList.add('tcw-tree-pick');
      nameEl.addEventListener('click', () => this.callbacks.onSelectDrawing?.(d.id));
    }
    if (this.callbacks.onRenameDrawing) {
      nameEl.addEventListener('dblclick', () => this.renameInline(nameEl, d.label, this.t('objects.renameDrawing'), (next) => {
        if (next !== d.label) this.callbacks.onRenameDrawing?.(d.id, next);
      }));
    }

    const actions = document.createElement('div');
    actions.className = 'tcw-tree-actions';
    actions.appendChild(this.iconButton(
      d.visible ? 'eye' : 'eyeOff',
      d.visible ? this.t('common.hide') : this.t('common.show'),
      '',
      () => this.callbacks.onToggleDrawingVisible(d.id, !d.visible),
    ));
    actions.appendChild(this.iconButton(
      d.locked ? 'lock' : 'unlock',
      d.locked ? this.t('common.unlock') : this.t('common.lock'),
      d.locked ? 'tcw-tree-on' : '',
      () => this.callbacks.onToggleDrawingLocked(d.id, !d.locked),
    ));
    if (this.callbacks.onCloneDrawing) {
      actions.appendChild(this.iconButton('copy', this.t('objects.cloneDrawing'), '', () => this.callbacks.onCloneDrawing?.(d.id)));
    }
    if (this.callbacks.onConfigureDrawing) {
      const gear = this.iconButton('settings', this.t('objects.drawingSettings'), '', () =>
        this.callbacks.onConfigureDrawing?.(d.id),
      );
      markPart(gear, 'drawingSettings');
      actions.appendChild(gear);
    }
    actions.appendChild(this.iconButton('trash', this.t('objects.removeDrawing'), 'tcw-tree-del', () =>
      this.callbacks.onRemoveDrawing(d.id),
    ));
    row.appendChild(actions);
    return row;
  }

  /**
   * A drawing row's grip: dragged onto another loose drawing's row, the
   * drawing takes that one's place; the arrow keys move it a row up or down.
   */
  private grip(id: string): HTMLButtonElement {
    const grip = this.iconButton('grip', this.t('objects.dragToReorder'), 'tcw-tree-grip', () => {});
    grip.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
    grip.addEventListener('pointerdown', (e) => {
      if ((e as MouseEvent).button !== 0) return;
      e.preventDefault();
      this.beginRowDrag(id);
    });
    grip.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!step) return;
      e.preventDefault();
      // The row above or under among the loose drawings: the drawing takes its place.
      const neighbour = this.loose[this.loose.indexOf(id) + step];
      const to = neighbour === undefined ? undefined : this.drawingIndex.get(neighbour);
      if (to !== undefined) this.callbacks.onMoveDrawing?.(id, to);
    });
    return grip;
  }

  /** Follow the pointer from a grip until it is let go: the row under it is marked, and takes the drawing on release. */
  private beginRowDrag(id: string): void {
    this.dragging?.stop();
    let target: HTMLElement | null = null;
    const mark = (row: HTMLElement | null) => {
      target?.classList.remove('tcw-tree-drop');
      target = row && row.dataset.drawingId !== id ? row : null;
      target?.classList.add('tcw-tree-drop');
    };
    const rowAt = (y: number) => [...this.drawingsEl.querySelectorAll<HTMLElement>('.tcw-tree-row[data-reorder]')]
      .find((row) => { const r = row.getBoundingClientRect(); return y >= r.top && y < r.bottom; }) ?? null;
    const move = (e: Event) => mark(rowAt((e as MouseEvent).clientY));
    const up = (e: Event) => {
      mark(rowAt((e as MouseEvent).clientY));
      const index = target ? this.drawingIndex.get(target.dataset.drawingId ?? '') : undefined;
      stop();
      if (index !== undefined) this.callbacks.onMoveDrawing?.(id, index);
    };
    const stop = () => {
      mark(null);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', stop);
      this.dragging = null;
      this.flushPending();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', stop);
    this.dragging = { id, stop };
  }

  private renderCompares(compares: ObjectTreeCompare[]): void {
    if (!this.compareEl) return;
    this.compareEl.replaceChildren();
    if (compares.length === 0) {
      this.compareEl.appendChild(this.emptyRow(this.t('objects.noComparisons')));
      return;
    }
    // The symbols line up: beside a coloured one, a compare without a colour keeps the dot's room, empty.
    const dots = compares.some((c) => c.color);
    for (const c of compares) {
      const row = this.row(c.label);
      row.classList.add('tcw-tree-compare');
      if (dots) {
        const dot = document.createElement('span');
        dot.className = 'tcw-tree-dot';
        if (c.color) dot.style.background = c.color;
        row.insertBefore(dot, row.firstChild);
      }
      if (c.way) {
        const way = document.createElement('span');
        way.className = 'tcw-tree-way';
        way.textContent = c.way;
        way.title = c.way;
        row.appendChild(way);
      }
      if (this.callbacks.onRemoveCompare) {
        row.appendChild(this.iconButton('trash', this.t('objects.removeComparison'), 'tcw-tree-del', () =>
          this.callbacks.onRemoveCompare?.(c.id),
        ));
      }
      this.compareEl.appendChild(row);
    }
  }

  private row(label: string, title = label): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-tree-row';
    const name = document.createElement('span');
    name.className = 'tcw-tree-name';
    name.textContent = label;
    name.title = title;
    row.appendChild(name);
    return row;
  }

  private emptyRow(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-tree-empty';
    el.textContent = text;
    return el;
  }

  private iconButton(icon: string, label: string, extraClass: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tcw-tree-btn ${extraClass}`.trim();
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = createIcon(icon, 14);
    btn.addEventListener('click', onClick);
    return btn;
  }
}

/** Longest name a rename takes, as a chart keeps it. */
const MAX_NAME = 80;

const DRAWING_TYPE_LABELS: Record<string, string> = {
  trendLine: 'Trend Line',
  ray: 'Ray',
  extendedLine: 'Extended Line',
  horizontalLine: 'Horizontal Line',
  horizontalRay: 'Horizontal Ray',
  crossLine: 'Cross Line',
  infoLine: 'Info Line',
  trendAngle: 'Trend Angle',
  circle: 'Circle',
  fibChannel: 'Fib Channel',
  fibSpeedResistanceFan: 'Fib Speed Resistance Fan',
  schiffPitchfork: 'Schiff Pitchfork',
  modifiedSchiffPitchfork: 'Modified Schiff Pitchfork',
  xabcdPattern: 'XABCD Pattern',
  abcdPattern: 'ABCD Pattern',
  headAndShoulders: 'Head and Shoulders',
  dateAndPriceRange: 'Date and Price Range',
  cyclicLines: 'Cyclic Lines',
  priceLabel: 'Price Label',
  verticalLine: 'Vertical Line',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  arrow: 'Arrow',
  parallelChannel: 'Parallel Channel',
  regressionChannel: 'Regression Channel',
  pitchfork: 'Pitchfork',
  fibRetracement: 'Fib Retracement',
  fibExtension: 'Fib Extension',
  fibTimeZones: 'Fib Time Zones',
  gannBox: 'Gann Box',
  gannFan: 'Gann Fan',
  elliottWave: 'Elliott Wave',
  priceRange: 'Price Range',
  dateRange: 'Date Range',
  measure: 'Measure',
  text: 'Text',
  textAnnotation: 'Text',
  anchoredVWAP: 'Anchored VWAP',
  volumeProfileRange: 'Volume Profile',
  riskReward: 'Long/Short Position',
  signpost: 'Signpost',
  balloon: 'Balloon',
  anchoredText: 'Anchored Text',
  anchoredNote: 'Anchored Note',
};

/** Label for a drawing type in the widget's language, falling back to English, then the raw key. */
export function drawingTypeLabel(type: string, t?: Translator): string {
  const key = `tool.${type}` as MessageKey;
  const translated = t?.(key);
  return translated && translated !== key ? translated : DRAWING_TYPE_LABELS[type] ?? type;
}
