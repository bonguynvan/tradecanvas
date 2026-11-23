import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { keepTabInside } from './focusTrap.js';

export interface ConfirmRequest {
  title: string;
  /** What is about to happen, in full: the side, the quantity, the price. */
  text: string;
  /** The words on the button that does it. */
  confirmLabel: string;
  onConfirm: () => void;
}

let confirmSeq = 0;

/**
 * A small dialog that asks before something that cannot be taken back is done:
 * a position closed or reversed, an order placed in one press. Enter does it,
 * Escape and a press outside leave it undone.
 */
export class WidgetConfirm {
  private backdrop: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private textEl: HTMLParagraphElement;
  private submit: HTMLButtonElement;
  private request: ConfirmRequest | null = null;
  private returnFocus: HTMLElement | null = null;
  private readonly uid = ++confirmSeq;

  constructor(host: HTMLElement, private readonly t: Translator = EN_TRANSLATOR) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    let pressedBackdrop = false;
    this.backdrop.addEventListener('pointerdown', (e) => { pressedBackdrop = e.target === this.backdrop; });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    const modal = document.createElement('form');
    modal.className = 'tcw-modal tcw-modal-narrow tcw-confirm';
    modal.noValidate = true;
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-confirm-title-${this.uid}`);
    modal.setAttribute('aria-describedby', `tcw-confirm-text-${this.uid}`);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
        return;
      }
      // A key still held from the press that asked (Enter on a ladder's cell) is no answer.
      if (e.key === 'Enter' && e.repeat) {
        e.preventDefault();
        return;
      }
      keepTabInside(e, modal);
    });
    modal.addEventListener('submit', (e) => {
      e.preventDefault();
      this.done();
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    this.titleEl = document.createElement('h3');
    this.titleEl.id = `tcw-confirm-title-${this.uid}`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(this.titleEl, closeBtn);

    const body = document.createElement('div');
    body.className = 'tcw-modal-body';
    this.textEl = document.createElement('p');
    this.textEl.className = 'tcw-confirm-text';
    this.textEl.id = `tcw-confirm-text-${this.uid}`;
    body.appendChild(this.textEl);

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-footer-cancel';
    cancel.textContent = this.t('common.cancel');
    cancel.addEventListener('click', () => this.close());
    this.submit = document.createElement('button');
    this.submit.type = 'submit';
    this.submit.className = 'tcw-done-btn';
    footer.append(cancel, this.submit);

    modal.append(header, body, footer);
    this.backdrop.appendChild(modal);
    host.appendChild(this.backdrop);
  }

  /** Ask. One already open is put aside undone: the last thing asked for is the one answered. */
  open(request: ConfirmRequest): void {
    if (!this.isOpen()) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.request = request;
    this.titleEl.textContent = request.title;
    this.textEl.textContent = request.text;
    this.submit.textContent = request.confirmLabel;
    // Over whatever opened it (a dialog mounted after it): last in its host.
    this.backdrop.parentElement?.appendChild(this.backdrop);
    this.backdrop.hidden = false;
    this.submit.focus();
  }

  close(): void {
    if (this.backdrop.hidden) return;
    this.backdrop.hidden = true;
    this.request = null;
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

  /** Done once: the dialog shuts before it is, so a second Enter finds nothing to do again. */
  private done(): void {
    const request = this.request;
    if (!request) return;
    this.close();
    request.onConfirm();
  }
}
