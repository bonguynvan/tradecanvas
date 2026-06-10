import { createIcon } from './icons.js';

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

  constructor(host: HTMLElement, callbacks: BracketBarCallbacks) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-bracket-bar';
    this.el.hidden = true;

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'tcw-bracket-label';
    this.el.appendChild(this.labelEl);

    const hint = document.createElement('span');
    hint.className = 'tcw-bracket-hint';
    hint.textContent = 'drag lines to adjust';
    this.el.appendChild(hint);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-bracket-cancel';
    cancel.innerHTML = `${createIcon('x', 14)}<span>Cancel</span>`;
    cancel.addEventListener('click', () => this.callbacks.onCancel());

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'tcw-bracket-confirm';
    confirm.innerHTML = `${createIcon('check', 14)}<span>Place</span>`;
    confirm.addEventListener('click', () => this.callbacks.onConfirm());

    this.el.appendChild(cancel);
    this.el.appendChild(confirm);
    host.appendChild(this.el);
  }

  show(side: 'buy' | 'sell'): void {
    this.visible = true;
    this.labelEl.textContent = side === 'buy' ? 'Long bracket' : 'Short bracket';
    this.labelEl.dataset.side = side;
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
