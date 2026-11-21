import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import { escapeHtml } from './escapeHtml.js';
import { stepperField } from './settingsControls.js';

export interface BracketBarCallbacks {
  onConfirm: () => void;
  onCancel: () => void;
  /** The quantity typed in the field, or null when what is there is none (empty, zero, not a number). */
  onQuantity: (quantity: number | null) => void;
}

/** The quantity a bracket starts with in the bar's field. */
export interface BracketBarQuantity {
  quantity: number;
  /** What − and + move it by, from where it is: a market's lot. Unset: one. */
  step?: (quantity: number) => number;
}

/**
 * Floating bar shown while a bracket order is being placed: its quantity
 * in a field, and the commit and discard actions (also bound to Enter /
 * Esc). The live entry / SL / TP numbers are drawn on the chart canvas.
 */
export class WidgetBracketBar {
  private el: HTMLDivElement;
  private labelEl: HTMLSpanElement;
  private quantityEl: HTMLDivElement;
  private quantityInput: HTMLInputElement;
  private confirmBtn: HTMLButtonElement;
  private quantityStep: (quantity: number) => number = () => 1;
  private callbacks: BracketBarCallbacks;
  private visible = false;

  constructor(host: HTMLElement, callbacks: BracketBarCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-bracket-bar';
    // A named group of two buttons: Tab moves between them.
    this.el.setAttribute('role', 'group');
    this.el.hidden = true;

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'tcw-bracket-label';
    this.el.appendChild(this.labelEl);

    const hint = document.createElement('span');
    hint.className = 'tcw-bracket-hint';
    hint.textContent = this.t('bracket.hint');
    this.el.appendChild(hint);

    // The quantity: without one the broker is sent nothing.
    const quantityName = this.t('ticket.quantity');
    this.quantityInput = document.createElement('input');
    this.quantityInput.type = 'number';
    this.quantityInput.className = 'tcw-indi-input';
    this.quantityInput.step = 'any';
    this.quantityInput.min = '0';
    this.quantityInput.setAttribute('aria-label', quantityName);
    this.quantityInput.title = quantityName;
    this.quantityInput.addEventListener('input', () => this.onQuantityTyped());
    this.quantityInput.addEventListener('keydown', (e) => this.onQuantityKey(e));
    const stepper = stepperField(this.quantityInput, {
      step: (value) => this.quantityStep(value),
      fallback: () => this.quantityStep(Number.NaN),
      labels: { down: fill(this.t('ticket.stepDown'), { field: quantityName }), up: fill(this.t('ticket.stepUp'), { field: quantityName }) },
    });
    this.quantityEl = document.createElement('div');
    this.quantityEl.className = 'tcw-bracket-quantity';
    this.quantityEl.hidden = true;
    this.quantityEl.appendChild(stepper.element);
    this.el.appendChild(this.quantityEl);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-bracket-cancel';
    // Its name when a phone's bar shows only its icon.
    cancel.setAttribute('aria-label', this.t('common.cancel'));
    cancel.innerHTML = `${createIcon('x', 14)}<span>${escapeHtml(this.t('common.cancel'))}</span>`;
    cancel.addEventListener('click', () => this.callbacks.onCancel());

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'tcw-bracket-confirm';
    confirm.innerHTML = `${createIcon('check', 14)}<span>${escapeHtml(this.t('bracket.place'))}</span>`;
    confirm.addEventListener('click', () => this.callbacks.onConfirm());
    this.confirmBtn = confirm;

    this.el.appendChild(cancel);
    this.el.appendChild(confirm);
    host.appendChild(this.el);
  }

  /**
   * Show the bar for a bracket of this side. `start` is the quantity its
   * field begins with; without it the field is away: the bracket is sized
   * elsewhere (by its risk), and has no quantity to type.
   */
  show(side: 'buy' | 'sell', start?: BracketBarQuantity): void {
    this.visible = true;
    this.quantityEl.hidden = !start;
    // A phone's bar makes room for the field: see the styles.
    this.el.toggleAttribute('data-quantity', !!start);
    this.quantityStep = start?.step ?? (() => 1);
    this.quantityInput.value = start ? String(start.quantity) : '';
    this.markQuantity();
    const name = side === 'buy' ? this.t('toolbar.longBracket') : this.t('toolbar.shortBracket');
    this.labelEl.textContent = name;
    this.el.setAttribute('aria-label', name);
    // Its side colours the label and Place.
    this.el.dataset.side = side;
    // It sits on the chart, which is always left to right; it reads as the widget does.
    this.el.dir = this.el.closest<HTMLElement>('.tcw-root')?.dir || 'auto';
    this.el.hidden = false;
  }

  hide(): void {
    this.visible = false;
    this.el.hidden = true;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** The quantity in the field; null when the field is away or what is there is none. */
  quantity(): number | null {
    if (this.quantityEl.hidden) return null;
    const text = this.quantityInput.value.trim();
    const typed = text === '' ? Number.NaN : Number(text);
    return Number.isFinite(typed) && typed > 0 ? typed : null;
  }

  private onQuantityTyped(): void {
    this.markQuantity();
    this.callbacks.onQuantity(this.quantity());
  }

  /** A field with no quantity is marked, and Place is off: there is nothing to place. */
  private markQuantity(): void {
    const missing = !this.quantityEl.hidden && this.quantity() === null;
    if (missing) this.quantityInput.setAttribute('aria-invalid', 'true');
    else this.quantityInput.removeAttribute('aria-invalid');
    this.quantityEl.toggleAttribute('data-invalid', missing);
    this.confirmBtn.disabled = missing;
  }

  /** Enter places and Esc cancels, as on the chart; neither goes on to it, to be taken twice. */
  private onQuantityKey(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') this.callbacks.onCancel();
    else if (this.quantity() !== null) this.callbacks.onConfirm();
  }

  destroy(): void {
    this.el.remove();
  }
}
