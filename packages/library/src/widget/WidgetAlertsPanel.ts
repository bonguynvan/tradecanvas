import type { AlertCondition } from '@tradecanvas/core';
import { createIcon } from './icons.js';

export interface AlertListItem {
  id: string;
  price: number;
  condition: string;
  message?: string;
  triggered: boolean;
}

export interface AlertsPanelCallbacks {
  onAdd: (price: number, condition: AlertCondition, message: string | undefined) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  /** Last traded / close price, used to prefill the add form. */
  getCurrentPrice: () => number | null;
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
  private messageInput: HTMLInputElement;
  private emptyEl: HTMLDivElement;
  private callbacks: AlertsPanelCallbacks;
  private open = false;
  private alerts: AlertListItem[] = [];

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

    this.priceInput = document.createElement('input');
    this.priceInput.type = 'number';
    this.priceInput.step = 'any';
    this.priceInput.placeholder = 'Price';
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
    // Prefill the price with the current market price each time it opens.
    const price = this.callbacks.getCurrentPrice();
    if (price !== null && this.priceInput.value === '') {
      this.priceInput.value = String(price);
    }
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
    this.callbacks.onAdd(price, condition, message);
    this.messageInput.value = '';
    // Leave the price prefilled with the next current price for fast entry.
    const next = this.callbacks.getCurrentPrice();
    this.priceInput.value = next !== null ? String(next) : '';
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
      main.textContent = `${label} ${this.callbacks.formatPrice(alert.price)}`;
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
