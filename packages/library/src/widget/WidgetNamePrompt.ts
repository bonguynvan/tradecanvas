import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { MAX_LAYOUT_NAME, cleanLayoutName } from '../state/LayoutSession.js';
import { keepTabInside } from './focusTrap.js';

export interface NamePromptRequest {
  title: string;
  /** The name to start from (a rename), selected. */
  value?: string;
  submitLabel: string;
  /** Resolves when done; a rejection keeps the prompt open. */
  onSubmit: (name: string) => void | Promise<void>;
}

let promptSeq = 0;

/** A small dialog asking for a name (save a layout as, rename one). */
export class WidgetNamePrompt {
  private backdrop: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private input: HTMLInputElement;
  private submit: HTMLButtonElement;
  private request: NamePromptRequest | null = null;
  private returnFocus: HTMLElement | null = null;
  private busy = false;
  private readonly uid = ++promptSeq;

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
    modal.className = 'tcw-modal tcw-modal-narrow tcw-name-prompt';
    modal.noValidate = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-name-title-${this.uid}`);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
        return;
      }
      keepTabInside(e, modal);
    });
    modal.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.done();
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    this.titleEl = document.createElement('h3');
    this.titleEl.id = `tcw-name-title-${this.uid}`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(this.titleEl, closeBtn);

    const body = document.createElement('div');
    body.className = 'tcw-modal-body';
    const label = document.createElement('label');
    label.className = 'tcw-name-field';
    const caption = document.createElement('span');
    caption.textContent = this.t('layouts.name');
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'tcw-indi-input';
    this.input.maxLength = MAX_LAYOUT_NAME;
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.placeholder = this.t('layouts.namePlaceholder');
    this.input.addEventListener('input', () => this.check());
    label.append(caption, this.input);
    body.appendChild(label);

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-reset-link';
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

  open(request: NamePromptRequest): void {
    if (!this.isOpen()) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.request = request;
    this.busy = false;
    this.titleEl.textContent = request.title;
    this.submit.textContent = request.submitLabel;
    this.input.value = request.value ?? '';
    this.check();
    this.backdrop.hidden = false;
    this.input.focus();
    this.input.select();
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

  private check(): void {
    this.submit.disabled = this.busy || cleanLayoutName(this.input.value) === null;
  }

  private async done(): Promise<void> {
    const request = this.request;
    const name = cleanLayoutName(this.input.value);
    if (!request || name === null || this.busy) return;
    this.busy = true;
    this.check();
    try {
      await request.onSubmit(name);
      if (this.request === request) this.close();
    } catch {
      // The caller said what went wrong; the name stays to try again.
    } finally {
      this.busy = false;
      this.check();
    }
  }
}
