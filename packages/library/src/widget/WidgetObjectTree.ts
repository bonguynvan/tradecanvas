import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type MessageKey, type Translator } from './i18n.js';
import { markPart } from './widgetFeatures.js';

export interface ObjectTreeIndicator {
  instanceId: string;
  name: string;
  visible: boolean;
}

export interface ObjectTreeDrawing {
  id: string;
  label: string;
  visible: boolean;
  locked: boolean;
  /** The group it belongs to; a group's drawings are listed under one row. */
  group?: { id: string; name: string };
}

export interface ObjectTreeCompare {
  id: string;
  label: string;
  color: string;
}

export interface ObjectTreeCallbacks {
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
    closeBtn.addEventListener('click', () => this.close());
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
      const row = this.row(ind.name);
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
    this.drawingsEl.replaceChildren();
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
    if (!nameEl.isConnected) return; // already being renamed
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tcw-tree-rename';
    input.value = name;
    input.maxLength = 80;
    input.setAttribute('aria-label', this.t('objects.renameGroup'));
    let done = false;
    const finish = (save: boolean) => {
      if (done) return;
      done = true;
      const next = input.value.trim();
      if (input.isConnected) input.replaceWith(nameEl);
      if (save && next && next !== name) this.callbacks.onRenameGroup?.(groupId, next);
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
    if (!d.visible) row.classList.add('tcw-tree-hidden');

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

  private renderCompares(compares: ObjectTreeCompare[]): void {
    if (!this.compareEl) return;
    this.compareEl.replaceChildren();
    if (compares.length === 0) {
      this.compareEl.appendChild(this.emptyRow(this.t('objects.noComparisons')));
      return;
    }
    for (const c of compares) {
      const row = this.row(c.label);
      const dot = document.createElement('span');
      dot.className = 'tcw-tree-dot';
      dot.style.background = c.color;
      row.insertBefore(dot, row.firstChild);
      if (this.callbacks.onRemoveCompare) {
        row.appendChild(this.iconButton('trash', this.t('objects.removeComparison'), 'tcw-tree-del', () =>
          this.callbacks.onRemoveCompare?.(c.id),
        ));
      }
      this.compareEl.appendChild(row);
    }
  }

  private row(label: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-tree-row';
    const name = document.createElement('span');
    name.className = 'tcw-tree-name';
    name.textContent = label;
    name.title = label;
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
};

/** Label for a drawing type in the widget's language, falling back to English, then the raw key. */
export function drawingTypeLabel(type: string, t?: Translator): string {
  const key = `tool.${type}` as MessageKey;
  const translated = t?.(key);
  return translated && translated !== key ? translated : DRAWING_TYPE_LABELS[type] ?? type;
}
