import { createIcon } from './icons.js';

export interface IndicatorLegendRow {
  instanceId: string;
  /** "EMA 50", "MACD 12 26 9". */
  label: string;
  visible: boolean;
  /** The values at the bar in view; `color` null = the neutral text colour. */
  values: readonly { text: string; color: string | null }[];
  /**
   * Where the row sits inside its own pane (container px, `width` = the room
   * it may take); null = stacked under the OHLCV legend.
   */
  pane: { x: number; y: number; width: number } | null;
}

/** An indicator pane, for the buttons at its top right. */
export interface IndicatorLegendPane {
  /** The indicator whose pane it is. */
  instanceId: string;
  /** The pane's top right corner, inside the price axis (container px). */
  x: number;
  y: number;
  /** For the buttons' names: "Collapse pane RSI 14". */
  label: string;
  collapsed: boolean;
  maximized: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export type PaneAction = 'up' | 'down' | 'collapse' | 'expand' | 'maximize' | 'restore';

export interface IndicatorLegendCallbacks {
  onToggleVisible: (instanceId: string, visible: boolean) => void;
  onSettings: (instanceId: string) => void;
  onRemove: (instanceId: string) => void;
  /** The row's "more" button: a menu under `anchor` (move to another pane…). */
  onMore?: (instanceId: string, anchor: HTMLElement) => void;
  /** A pane's button: move it, fold it, maximise it. */
  onPaneAction?: (instanceId: string, action: PaneAction) => void;
}

export interface IndicatorLegendLabels {
  show: string;
  hide: string;
  settings: string;
  remove: string;
  collapse: string;
  expand: string;
  more?: string;
  paneUp?: string;
  paneDown?: string;
  paneCollapse?: string;
  paneExpand?: string;
  paneMaximize?: string;
  paneRestore?: string;
}

interface PaneEls {
  el: HTMLDivElement;
  buttons: Map<string, HTMLButtonElement>;
  key: string;
}

/** Collapsing is offered once this many indicators share the price pane. */
const COLLAPSE_FROM = 2;

interface RowEls {
  el: HTMLDivElement;
  name: HTMLButtonElement;
  values: HTMLSpanElement;
  eye: HTMLButtonElement;
  settings: HTMLButtonElement;
  more: HTMLButtonElement | null;
  remove: HTMLButtonElement;
  visible: boolean;
  valuesKey: string;
  state: string;
  placeKey: string;
}

/**
 * The indicators on the chart itself, instead of chips in the toolbar: price
 * pane indicators stack under the OHLCV legend, pane indicators sit at the
 * top of their pane. Each row reads "EMA 50  123.45" and, on hover or focus,
 * offers show/hide, settings and remove. A long stack can be collapsed.
 *
 * `update()` is cheap to call every frame: rows are kept by instance id and
 * only changed text and positions are written.
 */
export class WidgetIndicatorLegend {
  private readonly stack: HTMLDivElement;
  private readonly toggle: HTMLButtonElement;
  private readonly rows = new Map<string, RowEls>();
  private readonly panes = new Map<string, PaneEls>();
  private collapsed = false;
  private toggleKey = '';
  private stackKey = '';

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: IndicatorLegendCallbacks,
    private readonly labels: IndicatorLegendLabels,
  ) {
    this.stack = document.createElement('div');
    this.stack.className = 'tcw-ind-legend';
    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'tcw-ind-legend-toggle';
    this.toggle.addEventListener('click', () => {
      this.setCollapsed(!this.collapsed);
      this.renderToggle(this.overlayCount());
    });
    this.stack.appendChild(this.toggle);
    host.appendChild(this.stack);
  }

  update(rows: readonly IndicatorLegendRow[], overlay: { left: number; top: number }, panes: readonly IndicatorLegendPane[] = []): void {
    this.updatePanes(panes);
    const stackKey = `${Math.round(overlay.left)},${Math.round(overlay.top)}`;
    if (stackKey !== this.stackKey) {
      this.stackKey = stackKey;
      this.stack.style.left = `${Math.round(overlay.left)}px`;
      this.stack.style.top = `${Math.round(overlay.top)}px`;
    }

    const seen = new Set<string>();
    let joinedStack = false;
    for (const row of rows) {
      seen.add(row.instanceId);
      const els = this.rows.get(row.instanceId) ?? this.createRow(row.instanceId);
      this.fill(els, row);
      if (row.pane) {
        if (els.el.parentElement !== this.host) this.host.appendChild(els.el);
      } else if (els.el.parentElement !== this.stack) {
        // New rows join the end (the chart's order), before the toggle.
        this.stack.insertBefore(els.el, this.toggle);
        joinedStack = true;
      }
      this.place(els, row.pane);
    }
    for (const [id, els] of this.rows) {
      if (seen.has(id)) continue;
      els.el.remove();
      this.rows.delete(id);
    }
    // A collapsed stack would hide the indicator just added: open it.
    if (joinedStack && this.collapsed) this.setCollapsed(false);
    this.renderToggle(rows.filter((r) => !r.pane).length);
  }

  destroy(): void {
    for (const els of this.rows.values()) els.el.remove();
    this.rows.clear();
    for (const els of this.panes.values()) els.el.remove();
    this.panes.clear();
    this.stack.remove();
  }

  /** Each pane's buttons at its top right: move up, move down, fold, maximise. */
  private updatePanes(panes: readonly IndicatorLegendPane[]): void {
    if (!this.callbacks.onPaneAction) return;
    const seen = new Set<string>();
    for (const pane of panes) {
      seen.add(pane.instanceId);
      const els = this.panes.get(pane.instanceId) ?? this.createPane(pane.instanceId);
      const key = `${Math.round(pane.x)},${Math.round(pane.y)}|${pane.label}|${pane.collapsed}|${pane.maximized}|${pane.canMoveUp}|${pane.canMoveDown}`;
      if (key === els.key) continue;
      els.key = key;
      els.el.style.left = `${Math.round(pane.x)}px`;
      els.el.style.top = `${Math.round(pane.y)}px`;
      const l = this.labels;
      const show = (act: string, visible: boolean, icon: string, label: string | undefined) => {
        const b = els.buttons.get(act)!;
        if (!visible && document.activeElement === b) els.buttons.get('max')!.focus();
        b.hidden = !visible;
        b.innerHTML = createIcon(icon, 12);
        setLabel(b, label ?? act, pane.label);
      };
      show('up', pane.canMoveUp && !pane.maximized, 'arrowUp', l.paneUp);
      show('down', pane.canMoveDown && !pane.maximized, 'arrowDown', l.paneDown);
      show('fold', !pane.maximized, pane.collapsed ? 'chevronDown' : 'chevronUp', pane.collapsed ? l.paneExpand : l.paneCollapse);
      show('max', true, pane.maximized ? 'minimize' : 'maximize', pane.maximized ? l.paneRestore : l.paneMaximize);
      els.el.dataset.collapsed = String(pane.collapsed);
      els.el.dataset.maximized = String(pane.maximized);
    }
    for (const [id, els] of this.panes) {
      if (seen.has(id)) continue;
      els.el.remove();
      this.panes.delete(id);
    }
  }

  private createPane(instanceId: string): PaneEls {
    const el = document.createElement('div');
    el.className = 'tcw-pane-controls';
    el.dataset.instance = instanceId;
    const buttons = new Map<string, HTMLButtonElement>();
    const run = (act: string): PaneAction => {
      if (act === 'up' || act === 'down') return act;
      if (act === 'fold') return el.dataset.collapsed === 'true' ? 'expand' : 'collapse';
      return el.dataset.maximized === 'true' ? 'restore' : 'maximize';
    };
    for (const act of ['up', 'down', 'fold', 'max']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-pane-btn';
      b.dataset.act = act;
      b.addEventListener('click', () => this.callbacks.onPaneAction?.(instanceId, run(act)));
      buttons.set(act, b);
      el.appendChild(b);
    }
    this.host.appendChild(el);
    const els: PaneEls = { el, buttons, key: '' };
    this.panes.set(instanceId, els);
    return els;
  }

  private createRow(instanceId: string): RowEls {
    const el = document.createElement('div');
    el.className = 'tcw-ind-legend-row';
    el.dataset.instance = instanceId;

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'tcw-ind-legend-name';
    name.addEventListener('click', () => this.callbacks.onSettings(instanceId));

    const values = document.createElement('span');
    values.className = 'tcw-ind-legend-values';

    const actions = document.createElement('span');
    actions.className = 'tcw-ind-legend-actions';
    // Named in fill(), once the row's label is known.
    const action = (act: string, icon: string, run: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-ind-legend-act';
      b.dataset.act = act;
      b.innerHTML = createIcon(icon, 13);
      b.addEventListener('click', run);
      actions.appendChild(b);
      return b;
    };
    const eye = action('visible', 'eye', () => {
      this.callbacks.onToggleVisible(instanceId, !els.visible);
    });
    const settings = action('settings', 'settings', () => this.callbacks.onSettings(instanceId));
    const more = this.callbacks.onMore
      ? action('more', 'more', () => this.callbacks.onMore?.(instanceId, more!))
      : null;
    const remove = action('remove', 'x', () => this.callbacks.onRemove(instanceId));

    el.append(name, values, actions);
    const els: RowEls = {
      el, name, values, eye, settings, more, remove, visible: true, valuesKey: '', state: '', placeKey: '',
    };
    this.rows.set(instanceId, els);
    return els;
  }

  private fill(els: RowEls, row: IndicatorLegendRow): void {
    const state = `${row.label}|${row.visible}`;
    if (state !== els.state) {
      els.state = state;
      els.visible = row.visible;
      els.name.textContent = row.label;
      els.name.title = this.labels.settings;
      els.el.classList.toggle('tcw-ind-legend-row--hidden', !row.visible);
      els.eye.innerHTML = createIcon(row.visible ? 'eye' : 'eyeOff', 13);
      setLabel(els.eye, row.visible ? this.labels.hide : this.labels.show, row.label);
      setLabel(els.settings, this.labels.settings, row.label);
      if (els.more) {
        setLabel(els.more, this.labels.more ?? 'More', row.label);
        els.more.setAttribute('aria-haspopup', 'menu');
      }
      setLabel(els.remove, this.labels.remove, row.label);
    }
    const valuesKey = row.values.map((v) => `${v.text}${v.color ?? ''}`).join('\u0001');
    if (valuesKey === els.valuesKey) return;
    els.valuesKey = valuesKey;
    els.values.replaceChildren(...row.values.map((v) => {
      const span = document.createElement('span');
      span.textContent = v.text;
      if (v.color) span.style.color = v.color;
      return span;
    }));
  }

  /** Pane rows are placed in their pane; stacked rows flow in the stack. */
  private place(els: RowEls, pane: IndicatorLegendRow['pane']): void {
    const key = pane ? `${Math.round(pane.x)},${Math.round(pane.y)},${Math.round(pane.width)}` : '';
    if (key === els.placeKey) return;
    els.placeKey = key;
    els.el.classList.toggle('tcw-ind-legend-row--pane', pane !== null);
    els.el.style.left = pane ? `${Math.round(pane.x)}px` : '';
    els.el.style.top = pane ? `${Math.round(pane.y)}px` : '';
    els.el.style.maxWidth = pane ? `${Math.max(0, Math.round(pane.width))}px` : '';
  }

  private setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.stack.classList.toggle('tcw-ind-legend--collapsed', collapsed);
  }

  private overlayCount(): number {
    return this.stack.querySelectorAll(':scope > .tcw-ind-legend-row').length;
  }

  /** Written only when something changed: `update()` runs every frame. */
  private renderToggle(count: number): void {
    const shown = count >= COLLAPSE_FROM;
    if (!shown && this.collapsed) this.setCollapsed(false);
    const key = `${shown}|${this.collapsed}|${count}`;
    if (key === this.toggleKey) return;
    this.toggleKey = key;
    this.toggle.hidden = !shown;
    if (!shown) return;
    const label = this.collapsed ? this.labels.expand : this.labels.collapse;
    setLabel(this.toggle, label, this.collapsed ? `(${count})` : undefined);
    this.toggle.setAttribute('aria-expanded', String(!this.collapsed));
    const icon = createIcon(this.collapsed ? 'chevronDown' : 'chevronUp', 12);
    this.toggle.innerHTML = this.collapsed ? `${icon}<span>${count}</span>` : icon;
  }
}

/**
 * An icon button's name: `title` for the tooltip ("Remove"), and an
 * `aria-label` that says what it acts on ("Remove EMA 50") for assistive tech,
 * which would otherwise hear a column of identical "Remove" buttons. (The
 * tooltip also lifts `title` off the element while it is hovered.)
 */
function setLabel(button: HTMLButtonElement, label: string, subject?: string): void {
  button.title = label;
  button.setAttribute('aria-label', subject ? `${label} ${subject}` : label);
}
