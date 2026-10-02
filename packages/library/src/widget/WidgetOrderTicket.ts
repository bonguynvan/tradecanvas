import type { OrderPlaceIntent, OrderSide, TimeInForce } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type MessageKey, type Translator } from './i18n.js';
import { selectInput, settingsRow, toggleSwitch } from './settingsControls.js';
import {
  orderTicketIntent,
  orderTicketProblems,
  orderTicketRiskReward,
  type OrderTicketDraft,
} from './orderTicket.js';

export interface OrderTicketCallbacks {
  onSubmit: (intent: OrderPlaceIntent) => void;
  formatPrice: (price: number) => string;
}

/** Where a ticket starts: a side and a price (a click on the chart), and the market. */
export interface OrderTicketStart {
  side?: OrderSide;
  price?: number;
  lastPrice: number | null;
}

let ticketSeq = 0;

/**
 * An order ticket: side, type, quantity, price, stop-loss, take-profit and
 * time in force, checked as it is filled in; Place sends an `orderPlace`
 * intent. Escape, Cancel or a click outside close it.
 */
export class WidgetOrderTicket {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private body: HTMLDivElement;
  private problemsEl: HTMLDivElement;
  private submit: HTMLButtonElement;
  private draft: OrderTicketDraft | null = null;
  private lastPrice: number | null = null;
  private returnFocus: HTMLElement | null = null;
  private readonly uid = ++ticketSeq;

  constructor(host: HTMLElement, private readonly callbacks: OrderTicketCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    let pressedBackdrop = false;
    this.backdrop.addEventListener('pointerdown', (e) => { pressedBackdrop = e.target === this.backdrop; });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-modal-narrow tcw-order-ticket';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', `tcw-ticket-title-${this.uid}`);
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-ticket-title-${this.uid}`;
    title.textContent = this.t('ticket.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    this.body = document.createElement('div');
    this.body.className = 'tcw-modal-body';
    this.problemsEl = document.createElement('div');
    this.problemsEl.className = 'tcw-ticket-problems';
    this.problemsEl.setAttribute('aria-live', 'polite');

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-reset-link';
    cancel.textContent = this.t('common.cancel');
    cancel.addEventListener('click', () => this.close());
    this.submit = document.createElement('button');
    this.submit.type = 'button';
    this.submit.className = 'tcw-done-btn';
    this.submit.addEventListener('click', () => this.place());
    footer.append(cancel, this.submit);

    this.modal.append(header, this.body, this.problemsEl, footer);
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  open(start: OrderTicketStart): void {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.lastPrice = start.lastPrice;
    const price = start.price ?? start.lastPrice ?? 0;
    const side = start.side ?? 'buy';
    // A price away from the market starts as the order that waits there.
    let type: OrderTicketDraft['type'] = 'market';
    if (start.price !== undefined && start.lastPrice !== null && start.price !== start.lastPrice) {
      type = (start.price < start.lastPrice) === (side === 'buy') ? 'limit' : 'stop';
    }
    this.draft = { side, type, quantity: 1, price, stopLoss: null, takeProfit: null, timeInForce: 'gtc' };
    this.render();
    this.backdrop.hidden = false;
    this.body.querySelector<HTMLElement>('button, input, select')?.focus();
  }

  close(): void {
    if (this.backdrop.hidden) return;
    this.backdrop.hidden = true;
    this.draft = null;
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  isOpen(): boolean {
    return !this.backdrop.hidden;
  }

  destroy(): void {
    this.close();
    this.backdrop.remove();
  }

  private place(): void {
    const draft = this.draft;
    if (!draft || orderTicketProblems(draft, this.lastPrice).length > 0) return;
    this.callbacks.onSubmit(orderTicketIntent(draft, this.lastPrice));
    this.close();
  }

  private set(patch: Partial<OrderTicketDraft>, rerender = false): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, ...patch };
    if (rerender) this.render();
    else this.check();
  }

  private render(): void {
    const draft = this.draft;
    if (!draft) return;
    this.body.replaceChildren(
      this.sideToggle(draft.side),
      settingsRow(this.t('ticket.type'), selectInput(
        (['market', 'limit', 'stop'] as const).map((value) => ({ value, label: this.t(`ticket.type.${value}` as MessageKey) })),
        draft.type,
        (value) => this.set({ type: value as OrderTicketDraft['type'] }, true),
      )),
      settingsRow(this.t('ticket.quantity'), this.number(draft.quantity, (quantity) => this.set({ quantity }))),
    );
    if (draft.type !== 'market') {
      this.body.append(
        settingsRow(this.t('ticket.price'), this.number(draft.price, (price) => this.set({ price }))),
        settingsRow(this.t('ticket.timeInForce'), selectInput(
          (['gtc', 'day'] as const).map((value) => ({ value, label: this.t(`ticket.tif.${value}` as MessageKey) })),
          draft.timeInForce,
          (value) => this.set({ timeInForce: value as TimeInForce }),
        )),
      );
    }
    // Switched on, a stop starts 1% the losing way and a target 2% the winning way.
    const entry = draft.type === 'market' ? this.lastPrice ?? draft.price : draft.price;
    const away = (pct: number) => roundLike(entry * (1 + (draft.side === 'buy' ? pct : -pct) / 100), entry);
    this.body.append(
      this.optionalPrice('ticket.stopLoss', draft.stopLoss, away(-1), (stopLoss) => this.set({ stopLoss }, stopLoss === null || draft.stopLoss === null)),
      this.optionalPrice('ticket.takeProfit', draft.takeProfit, away(2), (takeProfit) => this.set({ takeProfit }, takeProfit === null || draft.takeProfit === null)),
    );
    this.check();
  }

  /** Buy or Sell, as two pressed buttons. */
  private sideToggle(side: OrderSide): HTMLElement {
    const group = document.createElement('div');
    group.className = 'tcw-ticket-side';
    group.setAttribute('role', 'group');
    for (const value of ['buy', 'sell'] as const) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tcw-ticket-side-btn tcw-ticket-${value}`;
      btn.textContent = this.t(`ticket.${value}`);
      btn.setAttribute('aria-pressed', String(side === value));
      btn.addEventListener('click', () => this.set({ side: value }, true));
      group.appendChild(btn);
    }
    return group;
  }

  /** A number checked as it is typed (not only when it is left). */
  private number(value: number, onInput: (value: number) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'tcw-indi-input';
    input.step = 'any';
    input.min = '0';
    input.value = String(value);
    input.addEventListener('input', () => onInput(input.value.trim() === '' ? NaN : Number(input.value)));
    return input;
  }

  /** A price that is off unless switched on (a stop-loss, a take-profit). */
  private optionalPrice(key: MessageKey, value: number | null, start: number, onChange: (value: number | null) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row tcw-ticket-optional';
    const label = document.createElement('span');
    label.textContent = this.t(key);
    const toggle = toggleSwitch(value !== null, (on) => onChange(on ? start : null));
    toggle.setAttribute('aria-label', this.t(key));
    row.append(label, toggle);
    if (value !== null) {
      const input = this.number(value, (n) => onChange(Number.isFinite(n) ? n : NaN));
      input.setAttribute('aria-label', this.t(key));
      row.appendChild(input);
    }
    return row;
  }

  /** Show what is wrong and the reward:risk, and enable Place only for a sound order. */
  private check(): void {
    const draft = this.draft;
    if (!draft) return;
    const problems = orderTicketProblems(draft, this.lastPrice);
    const lines = problems.map((p) => this.t(`ticket.problem.${p}` as MessageKey));
    const rr = orderTicketRiskReward(draft, this.lastPrice);
    if (problems.length === 0 && rr !== null) lines.push(fill(this.t('ticket.riskReward'), { rr: rr.toFixed(2) }));
    this.problemsEl.replaceChildren(...lines.map((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }));
    this.problemsEl.classList.toggle('tcw-ticket-bad', problems.length > 0);
    this.submit.disabled = problems.length > 0;
    this.submit.classList.toggle('tcw-ticket-sell', draft.side === 'sell');
    this.submit.textContent = this.t(draft.side === 'buy' ? 'ticket.placeBuy' : 'ticket.placeSell');
  }
}

/** `value` with as many decimals as a price like `ref` needs (2, or more below 10). */
function roundLike(value: number, ref: number): number {
  const abs = Math.abs(ref);
  const decimals = abs >= 10 || abs === 0 ? 2 : abs >= 1 ? 4 : Math.min(10, Math.ceil(-Math.log10(abs)) + 3);
  return Number(value.toFixed(decimals));
}
