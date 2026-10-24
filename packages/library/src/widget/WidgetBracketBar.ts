import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { escapeHtml } from './escapeHtml.js';

export interface BracketBarCallbacks {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Floating confirm/cancel bar shown while a bracket order is being placed.
 * The live entry / SL / TP numbers are drawn on the chart canvas; this bar
 * just carries the commit and discard actions (also bound to Enter / Esc).
 */
export class WidgetBracketBar {
  private el: HTMLDivElement;
  private labelEl: HTMLSpanElement;
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

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-bracket-cancel';
    cancel.innerHTML = `${createIcon('x', 14)}<span>${escapeHtml(this.t('common.cancel'))}</span>`;
    cancel.addEventListener('click', () => this.callbacks.onCancel());

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'tcw-bracket-confirm';
    confirm.innerHTML = `${createIcon('check', 14)}<span>${escapeHtml(this.t('bracket.place'))}</span>`;
    confirm.addEventListener('click', () => this.callbacks.onConfirm());

    this.el.appendChild(cancel);
    this.el.appendChild(confirm);
    host.appendChild(this.el);
  }

  show(side: 'buy' | 'sell'): void {
    this.visible = true;
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

  destroy(): void {
    this.el.remove();
  }
}
