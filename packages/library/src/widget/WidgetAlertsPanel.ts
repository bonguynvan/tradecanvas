import type { AlertCondition, AlertOptions } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type MessageKey, type Translator } from './i18n.js';
import { escapeHtml } from './escapeHtml.js';

export interface AlertListItem {
  id: string;
  price: number;
  condition: string;
  message?: string;
  triggered: boolean;
  channel?: string;
  label?: string;
  /** Set for an alert on a drawing: its price follows the drawing's line. */
  drawingId?: string;
  /** Another line it compares with, and its name. */
  target?: string;
  targetLabel?: string;
  percent?: number;
  bars?: number;
  onBarClose?: boolean;
  expiresAt?: number;
  expired?: boolean;
}

/** What the form asks for. */
export interface AlertSpec {
  /** The level (NaN when comparing with a line or measuring a move). */
  price: number;
  condition: AlertCondition;
  message: string | undefined;
  channel: string;
  label: string;
  options: AlertOptions;
}

export interface AlertSource {
  /** `'price'` or `<instanceId>:<key>`. */
  channel: string;
  label: string;
}

export interface AlertsPanelCallbacks {
  /** Add the alert; false when the chart turned it down (the form stays as it is). */
  onAdd: (spec: AlertSpec) => boolean | void;
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Latest value for a source channel, used to prefill the add form. */
  getChannelValue: (channel: string) => number | null;
  formatPrice: (price: number) => string;
  /** A time, for "until …". */
  formatTime?: (ms: number) => string;
  /** Now, in ms (an expiry is counted from it). */
  now?: () => number;
}

const CONDITION_OPTIONS: { value: AlertCondition; key: MessageKey }[] = [
  { value: 'crossing', key: 'alerts.condition.crossing' },
  { value: 'crossingUp', key: 'alerts.condition.crossingUp' },
  { value: 'crossingDown', key: 'alerts.condition.crossingDown' },
  { value: 'greaterThan', key: 'alerts.condition.greaterThan' },
  { value: 'lessThan', key: 'alerts.condition.lessThan' },
  { value: 'movesUp', key: 'alerts.condition.movesUp' },
  { value: 'movesDown', key: 'alerts.condition.movesDown' },
];

const MOVES: readonly string[] = ['movesUp', 'movesDown'];

/** How long an alert lasts, from the form's choice. */
const EXPIRY_MS: Readonly<Record<string, number>> = {
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
};

/** The value the "compared with" choice has when it is a level, not a line. */
const VALUE = '';

const CONDITION_KEY = new Map(CONDITION_OPTIONS.map((o) => [o.value, o.key]));

function roundForInput(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

function formatPlain(v: number): string {
  const abs = Math.abs(v);
  return abs >= 1000 ? v.toFixed(2) : abs >= 1 ? v.toFixed(2) : v.toPrecision(4);
}

/**
 * Floating price-alerts panel. Lists current alerts (with condition, price,
 * message, and a delete control) and an inline form to add a new one prefilled
 * with the current price. Toggled from the toolbar bell button; the host wires
 * add/remove back to the chart's `AlertManager`.
 */
export class WidgetAlertsPanel {
  private el: HTMLDivElement;
  private listEl: HTMLDivElement;
  private priceInput: HTMLInputElement;
  private conditionSelect: HTMLSelectElement;
  private sourceSelect: HTMLSelectElement;
  private targetSelect: HTMLSelectElement;
  private percentInput: HTMLInputElement;
  private barsInput: HTMLInputElement;
  private levelRow: HTMLDivElement;
  private moveRow: HTMLDivElement;
  private closeCheck: HTMLInputElement;
  private expirySelect: HTMLSelectElement;
  private messageInput: HTMLInputElement;
  private emptyEl: HTMLDivElement;
  private callbacks: AlertsPanelCallbacks;
  private open = false;
  private alerts: AlertListItem[] = [];
  private sources: AlertSource[];

  constructor(host: HTMLElement, callbacks: AlertsPanelCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.callbacks = callbacks;
    this.sources = [{ channel: 'price', label: this.t('alerts.source.price') }];

    this.el = document.createElement('div');
    this.el.className = 'tcw-alerts-panel';
    this.el.hidden = true;

    // Header
    const header = document.createElement('div');
    header.className = 'tcw-alerts-header';
    const title = document.createElement('span');
    title.textContent = this.t('alerts.title');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tcw-alerts-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', this.t('alerts.close'));
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    // Add form
    const form = document.createElement('form');
    form.className = 'tcw-alerts-form';

    this.sourceSelect = document.createElement('select');
    this.sourceSelect.className = 'tcw-alerts-source';
    this.sourceSelect.setAttribute('aria-label', this.t('alerts.source'));
    this.sourceSelect.addEventListener('change', () => {
      this.renderTargets();
      this.prefillPrice();
    });

    this.conditionSelect = document.createElement('select');
    this.conditionSelect.className = 'tcw-alerts-condition';
    this.conditionSelect.setAttribute('aria-label', this.t('alerts.conditionLabel'));
    for (const opt of CONDITION_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = this.t(opt.key);
      this.conditionSelect.appendChild(o);
    }
    this.conditionSelect.addEventListener('change', () => this.showFields());

    // A level, or another line to compare with.
    this.levelRow = document.createElement('div');
    this.levelRow.className = 'tcw-alerts-row-fields';
    this.targetSelect = document.createElement('select');
    this.targetSelect.className = 'tcw-alerts-target';
    this.targetSelect.setAttribute('aria-label', this.t('alerts.compareWith'));
    this.targetSelect.addEventListener('change', () => this.showFields());
    this.priceInput = document.createElement('input');
    this.priceInput.type = 'number';
    this.priceInput.step = 'any';
    this.priceInput.placeholder = this.t('alerts.value');
    this.priceInput.setAttribute('aria-label', this.t('alerts.value'));
    this.priceInput.className = 'tcw-alerts-price';
    this.levelRow.append(this.targetSelect, this.priceInput);

    // A move: percent within bars.
    this.moveRow = document.createElement('div');
    this.moveRow.className = 'tcw-alerts-row-fields';
    this.percentInput = this.numberField('tcw-alerts-percent', this.t('alerts.percent'), '1', '0.01');
    this.barsInput = this.numberField('tcw-alerts-bars', this.t('alerts.bars'), '10', '1');
    this.barsInput.min = '1';
    this.moveRow.append(this.percentInput, this.barsInput);

    // On bar close; an end.
    const optionsRow = document.createElement('div');
    optionsRow.className = 'tcw-alerts-row-fields tcw-alerts-options';
    const closeLabel = document.createElement('label');
    closeLabel.className = 'tcw-alerts-check';
    this.closeCheck = document.createElement('input');
    this.closeCheck.type = 'checkbox';
    closeLabel.append(this.closeCheck, document.createTextNode(this.t('alerts.onBarClose')));
    this.expirySelect = document.createElement('select');
    this.expirySelect.className = 'tcw-alerts-expiry';
    this.expirySelect.setAttribute('aria-label', this.t('alerts.expires'));
    for (const value of ['never', 'hour', 'day', 'week', 'month']) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = this.t(`alerts.expires.${value}` as MessageKey);
      this.expirySelect.appendChild(o);
    }
    optionsRow.append(closeLabel, this.expirySelect);

    this.messageInput = document.createElement('input');
    this.messageInput.type = 'text';
    this.messageInput.placeholder = this.t('alerts.note');
    this.messageInput.setAttribute('aria-label', this.t('alerts.note'));
    this.messageInput.className = 'tcw-alerts-message';

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'tcw-alerts-add';
    addBtn.innerHTML = `${createIcon('plus', 14)}<span>${escapeHtml(this.t('alerts.add'))}</span>`;

    form.append(this.sourceSelect, this.conditionSelect, this.levelRow, this.moveRow, optionsRow, this.messageInput, addBtn);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
    this.el.appendChild(form);

    // List
    this.listEl = document.createElement('div');
    this.listEl.className = 'tcw-alerts-list';
    this.el.appendChild(this.listEl);

    this.emptyEl = document.createElement('div');
    this.emptyEl.className = 'tcw-alerts-empty';
    this.emptyEl.textContent = this.t('alerts.empty');
    this.listEl.appendChild(this.emptyEl);

    this.renderSources();
    this.showFields();
    host.appendChild(this.el);
  }

  private numberField(className: string, label: string, value: string, step: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = step;
    input.min = '0';
    input.value = value;
    input.className = className;
    input.placeholder = label;
    input.setAttribute('aria-label', label);
    return input;
  }

  /** A move asks for percent and bars; a level for a value or another line. */
  private showFields(): void {
    const move = MOVES.includes(this.conditionSelect.value);
    this.moveRow.hidden = !move;
    this.levelRow.hidden = move;
    this.priceInput.hidden = this.targetSelect.value !== VALUE;
  }

  /** "Compared with": a value, or any line but the one watched. */
  private renderTargets(): void {
    const current = this.targetSelect.value;
    const watched = this.sourceSelect.value || 'price';
    this.targetSelect.replaceChildren();
    const value = document.createElement('option');
    value.value = VALUE;
    value.textContent = this.t('alerts.compare.value');
    this.targetSelect.appendChild(value);
    for (const src of this.sources) {
      if (src.channel === watched) continue;
      const o = document.createElement('option');
      o.value = src.channel;
      o.textContent = src.label;
      this.targetSelect.appendChild(o);
    }
    this.targetSelect.value = [...this.targetSelect.options].some((o) => o.value === current) ? current : VALUE;
    this.showFields();
  }

  /** Replace the alert-source options (price + indicator lines). */
  setSources(sources: AlertSource[]): void {
    this.sources = sources.length > 0 ? sources : [{ channel: 'price', label: this.t('alerts.source.price') }];
    this.renderSources();
  }

  private renderSources(): void {
    const current = this.sourceSelect.value || 'price';
    this.sourceSelect.replaceChildren();
    for (const src of this.sources) {
      const o = document.createElement('option');
      o.value = src.channel;
      o.textContent = src.label;
      this.sourceSelect.appendChild(o);
    }
    // Keep the prior selection if it still exists, else default to price.
    this.sourceSelect.value = this.sources.some((s) => s.channel === current) ? current : 'price';
    this.renderTargets();
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
    if (this.priceInput.value === '') this.prefillPrice();
  }

  /** Fill the value input with the selected source's current value. */
  private prefillPrice(): void {
    const v = this.callbacks.getChannelValue(this.sourceSelect.value || 'price');
    this.priceInput.value = v !== null ? String(roundForInput(v)) : '';
  }

  close(): void {
    this.open = false;
    this.el.hidden = true;
  }

  /** Replace the displayed alert list. */
  setAlerts(alerts: AlertListItem[]): void {
    this.alerts = alerts;
    this.renderList();
  }

  destroy(): void {
    this.el.remove();
  }

  private submitForm(): void {
    const condition = this.conditionSelect.value as AlertCondition;
    const message = this.messageInput.value.trim() || undefined;
    const channel = this.sourceSelect.value || 'price';
    const label = this.sources.find((s) => s.channel === channel)?.label ?? this.t('alerts.source.price');
    const options: AlertOptions = {};
    let price = Number.NaN;
    if (MOVES.includes(condition)) {
      options.percent = Number(this.percentInput.value);
      options.bars = Number(this.barsInput.value);
      if (!(options.percent > 0) || !Number.isInteger(options.bars) || options.bars < 1) {
        this.markInvalid(!(options.percent > 0) ? this.percentInput : this.barsInput);
        return;
      }
    } else if (this.targetSelect.value !== VALUE) {
      options.target = this.targetSelect.value;
    } else {
      price = Number(this.priceInput.value);
      if (this.priceInput.value.trim() === '' || !Number.isFinite(price)) {
        this.markInvalid(this.priceInput);
        return;
      }
    }
    if (this.closeCheck.checked) options.onBarClose = true;
    const span = EXPIRY_MS[this.expirySelect.value];
    if (span) options.expiresAt = (this.callbacks.now ?? Date.now)() + span;
    if (this.callbacks.onAdd({ price, condition, message, channel, label, options }) === false) return;
    this.messageInput.value = '';
    this.prefillPrice();
  }

  private markInvalid(input: HTMLInputElement): void {
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'), { once: true });
  }

  /** What an alert watches, in words: "RSI crossing 70", "Price crossing EMA 20", "Price up 5% within 10 bars". */
  private describe(alert: AlertListItem): string {
    const source = alert.label ?? this.t('alerts.source.price');
    const conditionKey = CONDITION_KEY.get(alert.condition as AlertCondition);
    const condition = conditionKey ? this.t(conditionKey) : alert.condition;
    if (MOVES.includes(alert.condition)) {
      return `${source} ${condition} ${fill(this.t('alerts.moveSummary'), { percent: alert.percent ?? 0, bars: alert.bars ?? 0 })}`;
    }
    if (alert.target) return `${source} ${condition} ${alert.targetLabel ?? alert.target}`;
    const isIndicator = alert.channel && alert.channel !== 'price';
    const valueStr = !Number.isFinite(alert.price) ? '—'
      : isIndicator ? formatPlain(alert.price) : this.callbacks.formatPrice(alert.price);
    const prefix = (isIndicator || alert.drawingId) && alert.label ? `${alert.label} ` : '';
    return `${prefix}${condition} ${valueStr}`;
  }

  private renderList(): void {
    // Clear rows but keep the empty placeholder reference.
    this.listEl.replaceChildren();

    if (this.alerts.length === 0) {
      this.listEl.appendChild(this.emptyEl);
      return;
    }

    // Show most recent first.
    for (const alert of [...this.alerts].reverse()) {
      const row = document.createElement('div');
      row.className = 'tcw-alerts-row' + (alert.triggered ? ' tcw-alerts-triggered' : '') + (alert.expired ? ' tcw-alerts-expired' : '');

      const info = document.createElement('div');
      info.className = 'tcw-alerts-info';
      const main = document.createElement('div');
      main.className = 'tcw-alerts-row-main';
      main.textContent = this.describe(alert);
      info.appendChild(main);
      // On bar close, until when.
      const notes: string[] = [];
      if (alert.onBarClose) notes.push(this.t('alerts.onClose'));
      if (alert.expiresAt !== undefined && !alert.expired) {
        const when = this.callbacks.formatTime?.(alert.expiresAt) ?? new Date(alert.expiresAt).toISOString();
        notes.push(fill(this.t('alerts.until'), { time: when }));
      }
      if (notes.length > 0) {
        const meta = document.createElement('div');
        meta.className = 'tcw-alerts-row-meta';
        meta.textContent = notes.join(' · ');
        info.appendChild(meta);
      }
      if (alert.message) {
        const note = document.createElement('div');
        note.className = 'tcw-alerts-row-note';
        note.textContent = alert.message;
        info.appendChild(note);
      }
      if (alert.triggered || alert.expired) {
        const badge = document.createElement('span');
        badge.className = 'tcw-alerts-badge';
        badge.textContent = this.t(alert.expired ? 'alerts.expired' : 'alerts.triggered');
        main.appendChild(badge);
      }

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tcw-alerts-del';
      del.setAttribute('aria-label', this.t('alerts.delete'));
      del.innerHTML = createIcon('trash', 14);
      del.addEventListener('click', () => this.callbacks.onRemove(alert.id));

      row.appendChild(info);
      row.appendChild(del);
      this.listEl.appendChild(row);
    }
  }
}
