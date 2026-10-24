import type { OrderPlaceIntent, OrderSide, TimeInForce } from '@tradecanvas/commons';
import { stepDecimals } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type MessageKey, type Translator } from './i18n.js';
import { segmentedControl, stepperField, toggleSwitch } from './settingsControls.js';
import { keepTabInside } from './focusTrap.js';
import {
  orderTicketDistance,
  orderTicketIntent,
  orderTicketProblems,
  orderTicketSummary,
  type OrderTicketDraft,
  type OrderTicketProblem,
  type OrderTicketRules,
} from './orderTicket.js';

export interface OrderTicketCallbacks {
  onSubmit: (intent: OrderPlaceIntent) => void;
  formatPrice: (price: number) => string;
  /** Money made, lost or spent (a stop's risk, the order's value); unset, as a price. */
  formatAmount?: (value: number) => string;
  /** A plain figure to `decimals` (a percent, reward over risk), in the number locale; unset, with a point. */
  formatNumber?: (value: number, decimals: number) => string;
}

/** Where a ticket starts: a side and a price (a click on the chart), and the market. */
export interface OrderTicketStart {
  side?: OrderSide;
  price?: number;
  lastPrice: number | null;
  /** The market's price step, the day's limits, its lot and a contract's multiplier; a lot is the first quantity. */
  rules?: OrderTicketRules;
  /** The symbol the order is for, named beside the title. */
  symbol?: string;
  /** The market's price step at a price (its band there); unset, a hundredth of the price, rounded. */
  step?: (price: number) => number;
  /** A price as the chart rounds it (a click on the chart lands between its steps). */
  round?: (price: number) => number;
}

type PriceField = 'price' | 'stopLoss' | 'takeProfit';

/** The key code a browser gives a key an input method takes. */
const IME_KEY_CODE = 229;
/** A stop-loss starts this many percent the losing way, a take-profit this many the winning way. */
const STOP_START_PCT = 1;
const TARGET_START_PCT = 2;
/** Just below a band's edge: the step going down from it is the band's below. */
const BELOW_EDGE = 1 - 1e-9;

let ticketSeq = 0;

/**
 * An order ticket: side, type, quantity, price, stop-loss, take-profit and
 * time in force, checked as it is filled in and summed up as a receipt; Place
 * sends an `orderPlace` intent. Escape, Cancel or a click outside close it.
 */
export class WidgetOrderTicket {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private symbolEl: HTMLSpanElement;
  private body: HTMLDivElement;
  private summaryEl: HTMLDivElement;
  private problemsEl: HTMLDivElement;
  private submit: HTMLButtonElement;
  private draft: OrderTicketDraft | null = null;
  private lastPrice: number | null = null;
  private rules: OrderTicketRules = {};
  private step: (price: number) => number = defaultStep;
  private round: (price: number) => number = (p) => roundLike(p, p);
  /** What was typed in each field, kept through a rebuild: a field shows what Place sends. */
  private typed = new Map<string, string>();
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
    this.modal.className = 'tcw-modal tcw-order-ticket';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', `tcw-ticket-title-${this.uid}`);
    this.modal.addEventListener('keydown', (e) => {
      // An input method's Escape ends what it composes; the ticket stays.
      if (e.key === 'Escape' && !e.isComposing && e.keyCode !== IME_KEY_CODE) {
        e.stopPropagation();
        this.close();
        return;
      }
      keepTabInside(e, this.modal);
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const heading = document.createElement('div');
    heading.className = 'tcw-ticket-heading';
    const title = document.createElement('h3');
    title.id = `tcw-ticket-title-${this.uid}`;
    title.textContent = this.t('ticket.title');
    this.symbolEl = document.createElement('span');
    this.symbolEl.className = 'tcw-ticket-symbol';
    heading.append(title, this.symbolEl);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(heading, closeBtn);

    this.body = document.createElement('div');
    this.body.className = 'tcw-modal-body tcw-ticket-body';
    this.summaryEl = document.createElement('div');
    this.summaryEl.className = 'tcw-ticket-summary';
    // Always in place, its text changed only when it says something new: a screen reader hears each problem once.
    this.problemsEl = document.createElement('div');
    this.problemsEl.className = 'tcw-ticket-problems';
    this.problemsEl.setAttribute('aria-live', 'polite');

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-footer-cancel';
    cancel.textContent = this.t('common.cancel');
    cancel.addEventListener('click', () => this.close());
    this.submit = document.createElement('button');
    this.submit.type = 'button';
    this.submit.className = 'tcw-ticket-place';
    this.submit.addEventListener('click', () => this.place());
    const end = document.createElement('div');
    end.className = 'tcw-footer-end';
    end.append(cancel, this.submit);
    footer.append(end);

    this.modal.append(header, this.body, this.summaryEl, this.problemsEl, footer);
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  open(start: OrderTicketStart): void {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.lastPrice = start.lastPrice;
    this.rules = start.rules ?? {};
    this.step = start.step ?? defaultStep;
    this.round = start.round ?? ((p) => roundLike(p, p));
    this.typed.clear();
    this.symbolEl.textContent = start.symbol ?? '';
    const price = this.round(start.price ?? start.lastPrice ?? 0);
    const side = start.side ?? 'buy';
    // A price away from the market starts as the order that waits there.
    let type: OrderTicketDraft['type'] = 'market';
    if (start.price !== undefined && start.lastPrice !== null && price !== start.lastPrice) {
      type = (price < start.lastPrice) === (side === 'buy') ? 'limit' : 'stop';
    }
    this.draft = { side, type, quantity: this.lot(), price, stopLoss: null, takeProfit: null, timeInForce: 'gtc' };
    this.problemsEl.replaceChildren();
    this.render();
    this.backdrop.hidden = false;
    this.body.querySelector<HTMLElement>('button[aria-pressed="true"]')?.focus();
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

  /** The latest price, while the ticket is open (a market order's price, the checks). */
  setLastPrice(price: number | null): void {
    if (!this.draft || price === this.lastPrice) return;
    this.lastPrice = price;
    const market = this.body.querySelector('.tcw-ticket-market');
    if (market) market.textContent = this.marketText();
    this.check();
  }

  destroy(): void {
    this.close();
    this.backdrop.remove();
  }

  /** A market's lot when it has one, else one: the first quantity. */
  private lot(): number {
    return this.rules.lot !== undefined && this.rules.lot > 1 ? this.rules.lot : 1;
  }

  /** What − and + move a quantity by: a lot, else the quantity's own last digit (0.5 moves by 0.1). */
  private quantityStep(quantity: number): number {
    if (this.rules.lot !== undefined && this.rules.lot > 1) return this.rules.lot;
    const decimals = Number.isFinite(quantity) ? stepDecimals(quantity) : 0;
    return decimals > 0 ? Number((10 ** -decimals).toFixed(decimals)) : 1;
  }

  /** What − and + move a price by: the market's step there, the band's below its edge going down. */
  private priceStep(price: number, dir: 1 | -1): number {
    return this.step(dir > 0 ? price : price * BELOW_EDGE);
  }

  /** A price as a field writes it: to the decimals of the market's step there, when the chart gave one. */
  private writePrice(price: number): string {
    if (!Number.isFinite(price)) return '';
    return this.step === defaultStep ? String(price) : price.toFixed(stepDecimals(this.step(price)));
  }

  private place(): void {
    const draft = this.draft;
    if (!draft || orderTicketProblems(draft, this.lastPrice, this.rules).length > 0) return;
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
    const restore = this.focusedField();
    this.modal.dataset.side = draft.side;
    this.body.replaceChildren(
      this.sideToggle(draft.side),
      this.row('ticket.type', this.choices('type', ['market', 'limit', 'stop'] as const, draft.type, 'ticket.type', (type) => this.set({ type }, true))),
      this.row('ticket.quantity', this.stepped('quantity', draft.quantity, (q) => this.quantityStep(q), () => this.lot(), String, (quantity) => this.set({ quantity }))),
    );
    if (draft.type === 'market') {
      const market = document.createElement('span');
      market.className = 'tcw-ticket-market';
      market.textContent = this.marketText();
      this.body.append(this.row('ticket.price', market));
    } else {
      this.body.append(
        this.row('ticket.price', this.priceField('price', draft.price, (price) => this.set({ price }))),
        this.row('ticket.timeInForce', this.choices('timeInForce', ['gtc', 'day'] as const, draft.timeInForce, 'ticket.timeInForce', (timeInForce: TimeInForce) => this.set({ timeInForce }))),
      );
    }
    this.body.append(this.optionalPrice('stopLoss', draft.stopLoss), this.optionalPrice('takeProfit', draft.takeProfit));
    if (restore) this.body.querySelector<HTMLElement>(restore)?.focus();
    this.check();
  }

  /** Where focus is in the body, as a selector that finds the same control after a rebuild. */
  private focusedField(): string | null {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !this.body.contains(active)) return null;
    const own = active.dataset.ticketField;
    return own ? `[data-ticket-field="${own}"]` : null;
  }

  /**
   * A labelled row. Not a `<label>`: a press on one reaches its first
   * button, and the first of a stepper's is −.
   */
  private row(key: MessageKey, control: HTMLElement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row tcw-ticket-row';
    const label = document.createElement('span');
    label.className = 'tcw-settings-label';
    label.textContent = this.t(key);
    row.append(label, control);
    return row;
  }

  /** A row of choices (the type, the time in force), each named so focus finds it after a rebuild. */
  private choices<T extends string>(name: string, values: readonly T[], value: T, key: MessageKey, onChange: (value: T) => void): HTMLElement {
    const prefix = name === 'type' ? 'ticket.type' : 'ticket.tif';
    const group = field(name, segmentedControl(values.map((v) => ({ value: v, label: this.t(`${prefix}.${v}` as MessageKey) })), value, onChange, this.t(key)));
    for (const radio of group.querySelectorAll<HTMLElement>('[role=radio]')) radio.dataset.ticketField = `${name}-${radio.dataset.value}`;
    return group;
  }

  /** What a market order fills at: the market, and its price now. */
  private marketText(): string {
    const market = this.t('ticket.type.market');
    return this.lastPrice === null ? market : `${market} · ${this.callbacks.formatPrice(this.lastPrice)}`;
  }

  /**
   * The type a side's order takes: a waiting order stays where it was put, so
   * a buy over the market is a stop and a sell over it a limit. A market
   * order, or no price to tell by, keeps its type.
   */
  private typeFor(draft: OrderTicketDraft, side: OrderSide): OrderTicketDraft['type'] {
    if (draft.type === 'market' || this.lastPrice === null) return draft.type;
    if (!(draft.price > 0) || draft.price === this.lastPrice) return draft.type;
    return (draft.price < this.lastPrice) === (side === 'buy') ? 'limit' : 'stop';
  }

  /** Buy or Sell, as two pressed buttons; a press on the one chosen changes nothing. */
  private sideToggle(side: OrderSide): HTMLElement {
    const group = document.createElement('div');
    group.className = 'tcw-ticket-side';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', `${this.t('ticket.buy')} / ${this.t('ticket.sell')}`);
    for (const value of ['buy', 'sell'] as const) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tcw-ticket-side-btn tcw-ticket-${value}`;
      btn.textContent = this.t(`ticket.${value}`);
      btn.setAttribute('aria-pressed', String(side === value));
      btn.dataset.ticketField = `side-${value}`;
      btn.addEventListener('click', () => {
        const draft = this.draft;
        if (!draft || draft.side === value) return;
        this.set({ side: value, type: this.typeFor(draft, value) }, true);
      });
      group.appendChild(btn);
    }
    return group;
  }

  /** A price field: stepped by the market's step, an empty one from the market's price. */
  private priceField(name: PriceField, value: number, onInput: (value: number) => void): HTMLElement {
    const fallback = () => this.lastPrice ?? this.draft?.price ?? 0;
    return this.stepped(name, value, (p, dir) => this.priceStep(p, dir), fallback, (p) => this.writePrice(p), onInput);
  }

  /**
   * A number checked as it is typed, between a − and a + that move it on its
   * step's grid. It shows what was typed (through a rebuild too), else `value`
   * written by `write`.
   */
  private stepped(
    name: string,
    value: number,
    step: (value: number, dir: 1 | -1) => number,
    fallback: () => number,
    write: (value: number) => string,
    onInput: (value: number) => void,
  ): HTMLElement {
    const input = field(name, document.createElement('input'));
    input.type = 'number';
    input.className = 'tcw-indi-input';
    input.step = 'any';
    input.min = '0';
    input.value = this.typed.get(name) ?? write(value);
    const fieldName = this.t(`ticket.${name}` as MessageKey);
    input.setAttribute('aria-label', fieldName);
    input.addEventListener('input', () => {
      this.typed.set(name, input.value);
      onInput(input.value.trim() === '' ? NaN : Number(input.value));
    });
    const stepper = stepperField(input, {
      step,
      fallback,
      format: write,
      labels: { down: fill(this.t('ticket.stepDown'), { field: fieldName }), up: fill(this.t('ticket.stepUp'), { field: fieldName }) },
    });
    stepper.down.dataset.ticketField = `${name}-down`;
    stepper.up.dataset.ticketField = `${name}-up`;
    return stepper.element;
  }

  /**
   * A price that is off unless switched on (a stop-loss, a take-profit), with
   * how far it is when on, under its name. Switched on, it starts a set
   * distance from the entry as it is then, rounded as the chart rounds.
   */
  private optionalPrice(which: 'stopLoss' | 'takeProfit', value: number | null): HTMLElement {
    const key: MessageKey = which === 'stopLoss' ? 'ticket.stopLoss' : 'ticket.takeProfit';
    const row = document.createElement('div');
    row.className = 'tcw-settings-row tcw-ticket-optional';
    const toggle = toggleSwitch(value !== null, (on) => {
      this.typed.delete(which);
      this.set({ [which]: on ? this.startOf(which) : null }, true);
    });
    toggle.setAttribute('aria-label', this.t(key));
    toggle.dataset.ticketField = `${which}-switch`;
    const name = document.createElement('div');
    name.className = 'tcw-ticket-optional-name';
    const label = document.createElement('span');
    label.className = 'tcw-settings-label';
    label.textContent = this.t(key);
    name.appendChild(label);
    row.append(toggle, name);
    if (value !== null) {
      const away = document.createElement('span');
      away.className = 'tcw-ticket-away';
      away.dataset.for = which;
      // Figures read left to right in any widget: "-1.00%", never "1.00%-".
      away.dir = 'ltr';
      name.appendChild(away);
      row.appendChild(this.priceField(which, value, (n) => this.set({ [which]: Number.isFinite(n) ? n : NaN })));
    }
    return row;
  }

  /** Where a stop starts: 1% the losing way from the entry now, a target 2% the winning way; no entry, no price. */
  private startOf(which: 'stopLoss' | 'takeProfit'): number {
    const draft = this.draft;
    if (!draft) return NaN;
    const entry = draft.type === 'market' ? this.lastPrice ?? draft.price : draft.price;
    if (!(entry > 0)) return NaN;
    const pct = which === 'stopLoss' ? -STOP_START_PCT : TARGET_START_PCT;
    return this.round(entry * (1 + (draft.side === 'buy' ? pct : -pct) / 100));
  }

  /** Show what is wrong, the distances and the sums, and enable Place only for a sound order. */
  private check(): void {
    const draft = this.draft;
    if (!draft) return;
    const problems = orderTicketProblems(draft, this.lastPrice, this.rules);
    const said = problems.map((p) => this.problemText(p));
    if (said.join('\n') !== [...this.problemsEl.children].map((p) => p.textContent).join('\n')) {
      this.problemsEl.replaceChildren(...said.map((text) => {
        const line = document.createElement('p');
        line.textContent = text;
        return line;
      }));
    }
    for (const which of ['stopLoss', 'takeProfit'] as const) {
      const el = this.body.querySelector<HTMLElement>(`.tcw-ticket-away[data-for="${which}"]`);
      const price = draft[which];
      const distance = price === null ? null : orderTicketDistance(draft, this.lastPrice, price, this.rules.multiplier);
      if (el) el.textContent = distance ? `${this.signedNumber(distance.pct, 2)}% · ${this.amount(distance.amount)}` : '';
    }
    this.renderSummary(draft);
    this.submit.disabled = problems.length > 0;
    this.submit.textContent = this.t(draft.side === 'buy' ? 'ticket.placeBuy' : 'ticket.placeSell');
  }

  /** The receipt: the order's value, then what the stop risks, the target makes, and the one over the other. */
  private renderSummary(draft: OrderTicketDraft): void {
    const sum = orderTicketSummary(draft, this.lastPrice, this.rules);
    const rows: [string, MessageKey, string | null, 'up' | 'down' | null][] = [
      ['value', 'ticket.value', sum.value === null ? null : this.money(sum.value), null],
      ['risk', 'ticket.risk', sum.risk === null ? null : this.amount(sum.risk), tone(sum.risk)],
      ['reward', 'ticket.reward', sum.reward === null ? null : this.amount(sum.reward), tone(sum.reward)],
      ['ratio', 'ticket.rewardRisk', sum.ratio === null ? null : this.number(sum.ratio, 2), null],
    ];
    this.summaryEl.replaceChildren(...rows.filter(([, , figure]) => figure !== null).map(([id, key, figure, mood]) => {
      const row = document.createElement('div');
      row.className = 'tcw-ticket-summary-row';
      row.dataset.row = id;
      const label = document.createElement('span');
      label.textContent = this.t(key);
      const value = document.createElement('span');
      value.className = `tcw-ticket-figure${mood ? ` tcw-ticket-${mood}` : ''}`;
      value.dir = 'ltr';
      value.textContent = figure;
      row.append(label, value);
      return row;
    }));
  }

  private number(value: number, decimals: number): string {
    return this.callbacks.formatNumber ? this.callbacks.formatNumber(value, decimals) : value.toFixed(decimals);
  }

  /** A figure with its sign: "-1.00", "+2.00", "0.00". */
  private signedNumber(value: number, decimals: number): string {
    return signed(this.number(Math.abs(value), decimals), value);
  }

  /** Money made or lost, signed. */
  private amount(value: number): string {
    return signed(this.money(Math.abs(value)), value);
  }

  private money(value: number): string {
    return (this.callbacks.formatAmount ?? this.callbacks.formatPrice)(value);
  }

  private problemText(problem: OrderTicketProblem): string {
    const text = this.t(`ticket.problem.${problem}` as MessageKey);
    const { limits, lot } = this.rules;
    if (problem === 'priceLimits' && limits) {
      return fill(text, { floor: this.callbacks.formatPrice(limits.floor), ceiling: this.callbacks.formatPrice(limits.ceiling) });
    }
    return problem === 'lot' ? fill(text, { lot: lot ?? 1 }) : text;
  }
}

/** Name a control, so focus can find it again after a rebuild. */
function field<T extends HTMLElement>(name: string, el: T): T {
  el.dataset.ticketField = name;
  return el;
}

/** A gain up, a loss down, nothing neither. */
function tone(value: number | null): 'up' | 'down' | null {
  return value === null || value === 0 ? null : value > 0 ? 'up' : 'down';
}

/** `text` with the sign of `value`: a plus for a gain, a minus for a loss, none for what is written as nothing ("0.00"). */
function signed(text: string, value: number): string {
  const bare = text.replace(/^[-+−]/, '');
  if (!/[1-9]/.test(bare)) return bare;
  return value > 0 ? `+${bare}` : value < 0 ? `-${bare}` : bare;
}

/** A hundredth of a price, as a round step (1, 0.01, 0.0001…): − and + without a market's step. */
function defaultStep(price: number): number {
  const abs = Math.abs(price);
  if (!(abs > 0)) return 1;
  return 10 ** Math.floor(Math.log10(abs / 100));
}

/** `value` with as many decimals as a price like `ref` needs (2, or more below 10). */
function roundLike(value: number, ref: number): number {
  const abs = Math.abs(ref);
  const decimals = abs >= 10 || abs === 0 ? 2 : abs >= 1 ? 4 : Math.min(10, Math.ceil(-Math.log10(abs)) + 3);
  return Number(value.toFixed(decimals));
}
