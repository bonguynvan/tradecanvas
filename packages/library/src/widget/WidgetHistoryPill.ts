import type { HistoryLoadPayload } from '@tradecanvas/commons';

/** How long a failed history page stays reported. */
export const HISTORY_ERROR_MS = 4000;

/**
 * A small status pill at the left edge of the chart while older bars load
 * (scrolling back in time), and briefly when a page fails.
 */
export class WidgetHistoryPill {
  private readonly el: HTMLDivElement;
  private readonly text: HTMLSpanElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(parent: HTMLElement, private readonly texts: { loading: string; failed: string }) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-history-pill tcw-history-pill--hidden';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    const spinner = document.createElement('span');
    spinner.className = 'tcw-history-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    this.text = document.createElement('span');
    this.el.append(spinner, this.text);
    parent.appendChild(this.el);
  }

  update(payload: HistoryLoadPayload): void {
    this.clearTimer();
    if (payload.state === 'loading') {
      this.show(this.texts.loading, false);
    } else if (payload.state === 'error') {
      this.show(this.texts.failed, true);
      this.hideTimer = setTimeout(() => this.hide(), HISTORY_ERROR_MS);
    } else {
      this.hide();
    }
  }

  destroy(): void {
    this.clearTimer();
    this.el.remove();
  }

  private show(text: string, failed: boolean): void {
    this.text.textContent = text;
    this.el.classList.toggle('tcw-history-pill--error', failed);
    this.el.classList.remove('tcw-history-pill--hidden');
  }

  private hide(): void {
    this.hideTimer = null;
    this.el.classList.add('tcw-history-pill--hidden');
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
}
