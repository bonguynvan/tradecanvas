import type { AlertCondition } from '@tradecanvas/core';
import { createIcon } from './icons.js';

export interface AlertListItem {
  id: string;
  price: number;
  condition: string;
  message?: string;
  triggered: boolean;
  channel?: string;
  label?: string;
}

export interface AlertSource {
  /** `'price'` or `<instanceId>:<key>`. */
  channel: string;
  label: string;
}

export interface AlertsPanelCallbacks {
  onAdd: (price: number, condition: AlertCondition, message: string | undefined, channel: string, label: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Latest value for a source channel, used to prefill the add form. */
  getChannelValue: (channel: string) => number | null;
  formatPrice: (price: number) => string;
}

const CONDITION_OPTIONS: { value: AlertCondition; label: string }[] = [
  { value: 'crossing', label: 'Crossing' },
  { value: 'crossingUp', label: 'Crossing up' },
  { value: 'crossingDown', label: 'Crossing down' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
];

const CONDITION_LABEL = new Map(CONDITION_OPTIONS.map((o) => [o.value, o.label]));

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
  private messageInput: HTMLInputElement;
  private emptyEl: HTMLDivElement;
  private callbacks: AlertsPanelCallbacks;
  private open = false;
  private alerts: AlertListItem[] = [];
  private sources: AlertSource[] = [{ channel: 'price', label: 'Price' }];

  constructor(host: HTMLElement, callbacks: AlertsPanelCallbacks) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-alerts-panel';
    this.el.hidden = true;

    // Header
    const header = document.createElement('div');
    header.className = 'tcw-alerts-header';
    const title = document.createElement('span');
    title.textContent = 'Price Alerts';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tcw-alerts-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close alerts');
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
    this.sourceSelect.addEventListener('change', () => this.prefillPrice());

    this.priceInput = document.createElement('input');
    this.priceInput.type = 'number';
    this.priceInput.step = 'any';
    this.priceInput.placeholder = 'Value';
    this.priceInput.className = 'tcw-alerts-price';
    this.priceInput.required = true;

    this.conditionSelect = document.createElement('select');
    this.conditionSelect.className = 'tcw-alerts-condition';
    for (const opt of CONDITION_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      this.conditionSelect.appendChild(o);
    }

    this.messageInput = document.createElement('input');
    this.messageInput.type = 'text';
    this.messageInput.placeholder = 'Note (optional)';
    this.messageInput.className = 'tcw-alerts-message';

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'tcw-alerts-add';
    addBtn.innerHTML = `${createIcon('plus', 14)}<span>Add alert</span>`;

    form.appendChild(this.sourceSelect);
    form.appendChild(this.priceInput);
    form.appendChild(this.conditionSelect);
    form.appendChild(this.messageInput);
    form.appendChild(addBtn);
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
    this.emptyEl.textContent = 'No alerts yet. Add one above, or right-click the chart.';
    this.listEl.appendChild(this.emptyEl);

    this.renderSources();
    host.appendChild(this.el);
  }

  /** Replace the alert-source options (price + indicator lines). */
  setSources(sources: AlertSource[]): void {
    this.sources = sources.length > 0 ? sources : [{ channel: 'price', label: 'Price' }];
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
    const price = Number(this.priceInput.value);
    if (!Number.isFinite(price)) return;
    const condition = this.conditionSelect.value as AlertCondition;
    const message = this.messageInput.value.trim() || undefined;
    const channel = this.sourceSelect.value || 'price';
    const label = this.sources.find((s) => s.channel === channel)?.label ?? 'Price';
    this.callbacks.onAdd(price, condition, message, channel, label);
    this.messageInput.value = '';
    this.prefillPrice();
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
      row.className = 'tcw-alerts-row' + (alert.triggered ? ' tcw-alerts-triggered' : '');

      const info = document.createElement('div');
      info.className = 'tcw-alerts-info';
      const main = document.createElement('div');
      main.className = 'tcw-alerts-row-main';
      const label = CONDITION_LABEL.get(alert.condition as AlertCondition) ?? alert.condition;
      const isIndicator = alert.channel && alert.channel !== 'price';
      const valueStr = isIndicator ? formatPlain(alert.price) : this.callbacks.formatPrice(alert.price);
      const prefix = isIndicator && alert.label ? `${alert.label} ` : '';
      main.textContent = `${prefix}${label} ${valueStr}`;
      info.appendChild(main);
      if (alert.message) {
        const note = document.createElement('div');
        note.className = 'tcw-alerts-row-note';
        note.textContent = alert.message;
        info.appendChild(note);
      }
      if (alert.triggered) {
        const badge = document.createElement('span');
        badge.className = 'tcw-alerts-badge';
        badge.textContent = 'triggered';
        main.appendChild(badge);
      }

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tcw-alerts-del';
      del.setAttribute('aria-label', 'Delete alert');
      del.innerHTML = createIcon('trash', 14);
      del.addEventListener('click', () => this.callbacks.onRemove(alert.id));

      row.appendChild(info);
      row.appendChild(del);
      this.listEl.appendChild(row);
    }
  }
}
