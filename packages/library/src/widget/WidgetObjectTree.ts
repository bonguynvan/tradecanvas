import { createIcon } from './icons.js';

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
  /** When provided, a Compare section with an "add" button is shown. */
  onAddCompare?: () => void;
  onRemoveCompare?: (id: string) => void;
}

/**
 * Object-tree panel — TradingView's layers manager. Lists every active
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

  constructor(host: HTMLElement, callbacks: ObjectTreeCallbacks) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-tree-panel';
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-tree-header';
    const title = document.createElement('span');
    title.textContent = 'Objects';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-tree-close';
    closeBtn.setAttribute('aria-label', 'Close objects');
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    this.indicatorsEl = this.makeSection('Indicators');
    this.drawingsEl = this.makeSection('Drawings');
    if (this.callbacks.onAddCompare) {
      this.compareEl = this.makeSection('Compare', () => this.callbacks.onAddCompare?.());
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

  private makeSection(title: string, onAdd?: () => void): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.className = 'tcw-tree-section';
    const head = document.createElement('div');
    head.className = 'tcw-tree-section-head';
    const label = document.createElement('span');
    label.textContent = title;
    head.appendChild(label);
    if (onAdd) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'tcw-tree-add';
      addBtn.setAttribute('aria-label', `Add ${title.toLowerCase()}`);
      addBtn.title = `Add ${title.toLowerCase()}`;
      addBtn.innerHTML = createIcon('plus', 13);
      addBtn.addEventListener('click', onAdd);
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
      this.indicatorsEl.appendChild(this.emptyRow('No indicators'));
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
          ind.visible ? 'Hide' : 'Show',
          '',
          () => this.callbacks.onToggleIndicatorVisible?.(ind.instanceId, !ind.visible),
        ));
      }
      if (this.callbacks.onConfigureIndicator) {
        actions.appendChild(this.iconButton('settings', 'Indicator settings', '', () =>
          this.callbacks.onConfigureIndicator?.(ind.instanceId),
        ));
      }
      actions.appendChild(this.iconButton('trash', 'Remove indicator', 'tcw-tree-del', () =>
        this.callbacks.onRemoveIndicator(ind.instanceId),
      ));
      row.appendChild(actions);
      this.indicatorsEl.appendChild(row);
    }
  }

  private renderDrawings(drawings: ObjectTreeDrawing[]): void {
    this.drawingsEl.replaceChildren();
    if (drawings.length === 0) {
      this.drawingsEl.appendChild(this.emptyRow('No drawings'));
      return;
    }
    for (const d of drawings) {
      const row = this.row(d.label);
      if (!d.visible) row.classList.add('tcw-tree-hidden');

      const actions = document.createElement('div');
      actions.className = 'tcw-tree-actions';
      actions.appendChild(this.iconButton(
        d.visible ? 'eye' : 'eyeOff',
        d.visible ? 'Hide' : 'Show',
        '',
        () => this.callbacks.onToggleDrawingVisible(d.id, !d.visible),
      ));
      actions.appendChild(this.iconButton(
        d.locked ? 'lock' : 'unlock',
        d.locked ? 'Unlock' : 'Lock',
        d.locked ? 'tcw-tree-on' : '',
        () => this.callbacks.onToggleDrawingLocked(d.id, !d.locked),
      ));
      actions.appendChild(this.iconButton('trash', 'Remove drawing', 'tcw-tree-del', () =>
        this.callbacks.onRemoveDrawing(d.id),
      ));
      row.appendChild(actions);
      this.drawingsEl.appendChild(row);
    }
  }

  private renderCompares(compares: ObjectTreeCompare[]): void {
    if (!this.compareEl) return;
    this.compareEl.replaceChildren();
    if (compares.length === 0) {
      this.compareEl.appendChild(this.emptyRow('No comparisons'));
      return;
    }
    for (const c of compares) {
      const row = this.row(c.label);
      const dot = document.createElement('span');
      dot.className = 'tcw-tree-dot';
      dot.style.background = c.color;
      row.insertBefore(dot, row.firstChild);
      if (this.callbacks.onRemoveCompare) {
        row.appendChild(this.iconButton('trash', 'Remove comparison', 'tcw-tree-del', () =>
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
  textAnnotation: 'Text',
  anchoredVWAP: 'Anchored VWAP',
  volumeProfileRange: 'Volume Profile',
};

/** Human-readable label for a drawing type, falling back to the raw key. */
export function drawingTypeLabel(type: string): string {
  return DRAWING_TYPE_LABELS[type] ?? type;
}
