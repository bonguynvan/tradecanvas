import { createIcon } from './icons.js';
import { markPart, type WidgetFeature } from './widgetFeatures.js';

export interface IndicatorLegendRow {
  instanceId: string;
  /**
   * A symbol compared in percent rather than an indicator: its row has no
   * settings or more buttons, and its name opens nothing.
   */
  kind?: 'compare';
  /** "EMA 50", "MACD 12 26 9", "ETHUSDT". */
  label: string;
  /** The colour of the line the row stands for, marked before its name (a compare's, whose figures are in the text colour). */
  swatch?: string;
  visible: boolean;
  /** On, but not drawn on the chart's interval (its settings keep it to others). */
  offInterval?: boolean;
  /** A compare on, but not drawn on the chart's type (Renko, Kagi and the like draw no compare lines). */
  offChartType?: boolean;
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
  /** `kind` is the row's: 'compare' for a compare line, which is no indicator. */
  onToggleVisible: (instanceId: string, visible: boolean, kind?: IndicatorLegendRow['kind']) => void;
  onSettings: (instanceId: string) => void;
  onRemove: (instanceId: string, kind?: IndicatorLegendRow['kind']) => void;
  /** The row's "more" button: a menu under `anchor` (move to another pane…). */
  onMore?: (instanceId: string, anchor: HTMLElement) => void;
  /** A pane's button: move it, fold it, maximise it. */
  onPaneAction?: (instanceId: string, action: PaneAction) => void;
  /** The stack under the OHLCV legend laid out at a new size (its border box), or `null` with nothing in it. */
  onStackResize?: (size: { width: number; height: number } | null) => void;
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
  /** A row's note while its indicator isn't drawn on this interval. */
  offInterval?: string;
  /** A row's note while its compare isn't drawn on this chart type. */
  offChartType?: string;
}

interface PaneEls {
  el: HTMLDivElement;
  buttons: Map<string, HTMLButtonElement>;
  key: string;
}

/** Collapsing is offered once this many indicators share the price pane. */
const COLLAPSE_FROM = 2;

/**
 * The least room a row's values show in, in ems of their figures: a digit
 * and an ellipsis (1.2em in a monospace face, about 1.4 in the sans face the
 * airy look sets them in). Narrower, the line would show a sliver of a digit.
 */
const VALUES_LEAST_EM = 1.5;
/** On a row's values while their box has less than `VALUES_LEAST_EM`: they hide, keeping their room. */
const NO_ROOM_CLASS = 'tcw-ind-legend-values--no-room';

/** Numbers the rows' notes, so each id is the page's only one, with several legends on it. */
let noteSeq = 0;

interface RowEls {
  el: HTMLDivElement;
  /** A button that opens the indicator's settings; plain text on a compare's row. */
  name: HTMLElement;
  /** The mark in the line's colour (`swatch`), on a compare's row. */
  swatch: HTMLSpanElement | null;
  values: HTMLSpanElement;
  eye: HTMLButtonElement;
  settings: HTMLButtonElement | null;
  more: HTMLButtonElement | null;
  remove: HTMLButtonElement;
  /** Why the row is not drawn, heard with its buttons (`aria-describedby`); empty while it is drawn. */
  note: HTMLSpanElement;
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
 * Symbols compared in percent head the stack: their price and change, with
 * show/hide and remove.
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
  /** Tells of each row's values box resized: a narrow chart, a longer name beside them. */
  private readonly valuesObserver: ResizeObserver | null;
  /** Tells of the stack resized, for the chart's drawing labels to keep clear of it. */
  private readonly stackObserver: ResizeObserver | null;

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: IndicatorLegendCallbacks,
    private readonly labels: IndicatorLegendLabels,
  ) {
    this.stack = document.createElement('div');
    this.stack.className = 'tcw-ind-legend';
    markPart(this.stack, 'indicatorLegend');
    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'tcw-ind-legend-toggle';
    this.toggle.addEventListener('click', () => {
      this.setCollapsed(!this.collapsed);
      this.renderToggle(this.overlayCount());
    });
    this.stack.appendChild(this.toggle);
    host.appendChild(this.stack);
    this.stackObserver = typeof ResizeObserver === 'undefined' || !callbacks.onStackResize
      ? null
      : new ResizeObserver(() => this.reportStackSize());
    this.stackObserver?.observe(this.stack);
    this.valuesObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
        for (const entry of entries) fitValues(entry.target as HTMLElement, entry.contentRect.width);
      });
  }

  update(rows: readonly IndicatorLegendRow[], overlay: { left: number; top: number }, panes: readonly IndicatorLegendPane[] = []): void {
    this.updatePanes(panes);
    const stackKey = `${Math.round(overlay.left)},${Math.round(overlay.top)}`;
    if (stackKey !== this.stackKey) {
      this.stackKey = stackKey;
      this.stack.style.left = `${Math.round(overlay.left)}px`;
      this.stack.style.top = `${Math.round(overlay.top)}px`;
    }

    // Rows gone first, so the rest move only when their order changed.
    const seen = new Set(rows.map((r) => r.instanceId));
    for (const [id, els] of this.rows) {
      if (seen.has(id)) continue;
      this.valuesObserver?.unobserve(els.values);
      els.el.remove();
      this.rows.delete(id);
    }
    let joinedStack = false;
    let previous: HTMLElement | null = null;
    for (const row of rows) {
      const els = this.rows.get(row.instanceId) ?? this.createRow(row.instanceId, row.kind);
      this.fill(els, row);
      if (row.pane) {
        if (els.el.parentElement !== this.host) this.host.appendChild(els.el);
      } else {
        // In the order given (compares first, then the chart's), before the toggle.
        const next: Element | null = previous ? previous.nextElementSibling : this.stack.firstElementChild;
        if (els.el.parentElement !== this.stack) joinedStack = true;
        if (els.el !== next) this.stack.insertBefore(els.el, next);
        previous = els.el;
      }
      this.place(els, row.pane);
    }
    // A collapsed stack would hide the indicator just added: open it.
    if (joinedStack && this.collapsed) this.setCollapsed(false);
    this.renderToggle(rows.filter((r) => !r.pane).length);
  }

  destroy(): void {
    this.valuesObserver?.disconnect();
    this.stackObserver?.disconnect();
    for (const els of this.rows.values()) els.el.remove();
    this.rows.clear();
    for (const els of this.panes.values()) els.el.remove();
    this.panes.clear();
    this.stack.remove();
  }

  private reportStackSize(): void {
    const width = this.stack.offsetWidth;
    const height = this.stack.offsetHeight;
    this.callbacks.onStackResize?.(width > 0 && height > 0 ? { width, height } : null);
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
    markPart(el, 'indicatorLegend');
    el.dataset.instance = instanceId;
    const buttons = new Map<string, HTMLButtonElement>();
    const run = (act: string): PaneAction => {
      if (act === 'up' || act === 'down') return act;
      if (act === 'fold') return el.dataset.collapsed === 'true' ? 'expand' : 'collapse';
      return el.dataset.maximized === 'true' ? 'restore' : 'maximize';
    };
    const switches: Record<string, WidgetFeature> = { up: 'pane.move', down: 'pane.move', fold: 'pane.collapse', max: 'pane.maximize' };
    for (const act of ['up', 'down', 'fold', 'max']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-pane-btn';
      b.dataset.act = act;
      markPart(b, switches[act]);
      b.addEventListener('click', () => this.callbacks.onPaneAction?.(instanceId, run(act)));
      buttons.set(act, b);
      el.appendChild(b);
    }
    this.host.appendChild(el);
    const els: PaneEls = { el, buttons, key: '' };
    this.panes.set(instanceId, els);
    return els;
  }

  private createRow(instanceId: string, kind?: IndicatorLegendRow['kind']): RowEls {
    const compare = kind === 'compare';
    const el = document.createElement('div');
    el.className = compare ? 'tcw-ind-legend-row tcw-ind-legend-row--compare' : 'tcw-ind-legend-row';
    markPart(el, 'indicatorLegend');
    el.dataset.instance = instanceId;

    // A compare has no settings for its name to open.
    const name = document.createElement(compare ? 'span' : 'button');
    name.className = 'tcw-ind-legend-name';
    if (name instanceof HTMLButtonElement) {
      name.type = 'button';
      name.addEventListener('click', () => this.callbacks.onSettings(instanceId));
    }

    const values = document.createElement('span');
    values.className = 'tcw-ind-legend-values';
    markPart(values, 'indicatorLegend.values');
    this.valuesObserver?.observe(values);

    const actions = document.createElement('span');
    actions.className = 'tcw-ind-legend-actions';
    // Named in fill(), once the row's label is known.
    const action = (act: string, icon: string, run: () => void, ...parts: WidgetFeature[]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-ind-legend-act';
      b.dataset.act = act;
      markPart(b, ...parts);
      b.innerHTML = createIcon(icon, 13);
      b.addEventListener('click', run);
      actions.appendChild(b);
      return b;
    };
    const eye = action('visible', 'eye', () => {
      this.callbacks.onToggleVisible(instanceId, !els.visible, kind);
    }, 'indicatorLegend.visibility');
    const settings = compare ? null : action('settings', 'settings', () => this.callbacks.onSettings(instanceId), 'indicatorSettings', 'indicatorLegend.settings');
    const more = this.callbacks.onMore && !compare
      ? action('more', 'more', () => this.callbacks.onMore?.(instanceId, more!), 'indicatorLegend.more')
      : null;
    const remove = action('remove', 'x', () => this.callbacks.onRemove(instanceId, kind), 'indicatorLegend.remove');

    const note = document.createElement('span');
    note.className = 'tcw-visually-hidden';
    note.id = `tcw-ind-note-${++noteSeq}`;

    // A compare's line is told by its colour: a mark of it, not text, which no one colour makes legible on both themes.
    const swatch = compare ? document.createElement('span') : null;
    if (swatch) {
      swatch.className = 'tcw-ind-legend-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      el.append(swatch);
    }
    el.append(name, values, actions, note);
    const els: RowEls = {
      el, name, swatch, values, eye, settings, more, remove, note, visible: true, valuesKey: '', state: '', placeKey: '',
    };
    this.rows.set(instanceId, els);
    return els;
  }

  private fill(els: RowEls, row: IndicatorLegendRow): void {
    const note = this.offNote(row);
    const state = `${row.label}|${row.visible}|${note}|${row.swatch ?? ''}`;
    if (state !== els.state) {
      els.state = state;
      if (els.swatch) els.swatch.style.backgroundColor = row.swatch ?? '';
      els.visible = row.visible;
      els.name.textContent = row.label;
      if (els.settings) els.name.title = this.labels.settings;
      els.el.classList.toggle('tcw-ind-legend-row--hidden', !row.visible || note !== null);
      if (note) els.el.title = note;
      else els.el.removeAttribute('title');
      this.describe(els, note);
      els.eye.innerHTML = createIcon(row.visible ? 'eye' : 'eyeOff', 13);
      setLabel(els.eye, row.visible ? this.labels.hide : this.labels.show, row.label);
      if (els.settings) setLabel(els.settings, this.labels.settings, row.label);
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

  /** Why the row is not drawn, heard with each of its buttons: the tooltip alone reaches only a mouse. */
  private describe(els: RowEls, note: string | null): void {
    els.note.textContent = note ?? '';
    const buttons = [els.name, els.eye, els.settings, els.more, els.remove].filter((b): b is HTMLElement => b instanceof HTMLButtonElement);
    for (const button of buttons) {
      if (note) button.setAttribute('aria-describedby', els.note.id);
      else button.removeAttribute('aria-describedby');
    }
  }

  /** Why a row that is on is not drawn ('' without a note to say so), or null when it is drawn. */
  private offNote(row: IndicatorLegendRow): string | null {
    if (row.offInterval) return this.labels.offInterval ?? '';
    if (row.offChartType) return this.labels.offChartType ?? '';
    return null;
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
 * Hide a row's values while their box, `width` px, is too narrow for a digit
 * and an ellipsis (a phone's legend beside its buttons), and show them again
 * when it is wide enough: the name then reads alone, not beside a sliver.
 */
function fitValues(values: HTMLElement, width: number): void {
  const least = (parseFloat(getComputedStyle(values).fontSize) || 0) * VALUES_LEAST_EM;
  values.classList.toggle(NO_ROOM_CLASS, width < least);
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
