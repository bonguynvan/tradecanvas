import type { TimeFrame } from '@tradecanvas/commons';
import { parseTimeframeInput } from './widgetTimeframes.js';

export interface IntervalInputLabels {
  /** The field's name: "Change interval". */
  title: string;
  /** Under it: "5, 15m, 1h, 1D — Enter to apply". */
  hint: string;
  /** When the text isn't an interval the chart can show. */
  invalid: string;
}

let inputSeq = 0;

/**
 * Typing a number on the chart opens this: the interval typed so far, in a
 * small field over the chart. Enter switches to it, Escape or leaving it
 * closes it.
 */
export class WidgetIntervalInput {
  private el: HTMLDivElement;
  private input: HTMLInputElement;
  private hint: HTMLDivElement;
  private returnFocus: HTMLElement | null = null;

  constructor(
    host: HTMLElement,
    private readonly labels: IntervalInputLabels,
    /** Switch to `tf`; false when the chart can't show it. */
    private readonly onApply: (tf: TimeFrame) => boolean,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-interval-input';
    this.el.hidden = true;
    // A dialog: the chart's own keys (Enter confirms a bracket order) leave it alone.
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', labels.title);
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'tcw-interval-field';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.maxLength = 6;
    this.input.setAttribute('aria-label', labels.title);
    this.hint = document.createElement('div');
    this.hint.className = 'tcw-interval-hint';
    this.hint.setAttribute('role', 'status');
    this.hint.id = `tcw-interval-hint-${++inputSeq}`;
    this.input.setAttribute('aria-describedby', this.hint.id);
    this.el.append(this.input, this.hint);
    host.appendChild(this.el);

    this.input.addEventListener('input', () => this.check());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.apply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
    this.input.addEventListener('blur', () => this.close(false));
  }

  /** Open with what was typed so far (the first digit). */
  open(text: string): void {
    if (!this.isOpen()) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.el.hidden = false;
    this.input.value = text;
    this.check();
    this.input.focus();
    this.input.setSelectionRange(text.length, text.length);
  }

  close(restoreFocus = true): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    const target = this.returnFocus;
    this.returnFocus = null;
    if (restoreFocus && target?.isConnected) target.focus({ preventScroll: true });
  }

  isOpen(): boolean {
    return !this.el.hidden;
  }

  destroy(): void {
    this.el.remove();
  }

  private check(): void {
    const valid = parseTimeframeInput(this.input.value) !== null;
    if (!valid && this.input.value.trim() !== '') this.input.setAttribute('aria-invalid', 'true');
    else this.input.removeAttribute('aria-invalid');
    this.hint.textContent = valid || this.input.value.trim() === '' ? this.labels.hint : this.labels.invalid;
  }

  private apply(): void {
    const tf = parseTimeframeInput(this.input.value);
    if (tf && this.onApply(tf)) {
      this.close();
      return;
    }
    this.input.setAttribute('aria-invalid', 'true');
    this.hint.textContent = this.labels.invalid;
  }
}
