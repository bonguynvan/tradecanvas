/**
 * How long a symbol/timeframe switch may run before the loading veil
 * appears. Faster loads just swap the chart in place — flashing a loader for
 * a 150 ms request reads as flicker, not feedback.
 */
export const LOADING_SHOW_DELAY_MS = 200;

const SKELETON_BARS = 20;

/**
 * TradingView-style loading state for the chart area.
 *
 * - First load (nothing to show yet): opaque skeleton, shown immediately.
 * - Switch (a chart is already on screen): the old chart stays visible and is
 *   veiled only if the load outlasts `LOADING_SHOW_DELAY_MS`.
 * - Failure: the label becomes the error message until the next load or a
 *   successful retry ends it.
 */
export class WidgetLoadingOverlay {
  private readonly el: HTMLDivElement;
  private readonly label: HTMLDivElement;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  // Starts loading: the widget mounts before its first bars arrive.
  private phase: 'idle' | 'loading' | 'failed' = 'loading';

  constructor(parent: HTMLElement, private readonly loadingText: string) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-loading-overlay';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');

    // Bars + label share a card: transparent on the opaque first-load screen,
    // a raised panel when veiling a chart so it reads over the candles.
    const card = document.createElement('div');
    card.className = 'tcw-loading-card';

    const bars = document.createElement('div');
    bars.className = 'tcw-loading-bars';
    for (let i = 0; i < SKELETON_BARS; i++) {
      const bar = document.createElement('span');
      bar.className = 'tcw-loading-bar';
      bar.style.height = `${20 + Math.round(Math.sin(i * 0.9) * 18 + 18)}px`;
      bar.style.animationDelay = `${i * 45}ms`;
      bars.appendChild(bar);
    }
    card.appendChild(bars);

    this.label = document.createElement('div');
    this.label.className = 'tcw-loading-label';
    this.label.textContent = loadingText;
    card.appendChild(this.label);
    this.el.appendChild(card);

    parent.appendChild(this.el);
  }

  /**
   * Start a load. `hasContent`: a chart is already on screen to keep showing.
   * `immediate`: skip the show delay — the caller knows the load is slow.
   */
  begin(hasContent: boolean, immediate = false): void {
    this.phase = 'loading';
    this.clearTimer();
    this.label.textContent = this.loadingText;
    this.el.classList.remove('tcw-loading-overlay--error');
    this.el.classList.toggle('tcw-loading-overlay--veil', hasContent);
    if (!hasContent || immediate || this.isShown()) {
      this.el.classList.remove('tcw-loading-overlay--hidden');
      return;
    }
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.el.classList.remove('tcw-loading-overlay--hidden');
    }, LOADING_SHOW_DELAY_MS);
  }

  /** The load finished: fade out, or never appear if still within the delay. */
  end(): void {
    this.phase = 'idle';
    this.clearTimer();
    this.el.classList.add('tcw-loading-overlay--hidden');
  }

  /** The current load failed (a retry may still be running): show why. */
  fail(message: string): void {
    if (this.phase === 'idle') return;
    this.phase = 'failed';
    this.clearTimer();
    this.label.textContent = message;
    this.el.classList.add('tcw-loading-overlay--error');
    this.el.classList.remove('tcw-loading-overlay--hidden');
  }

  /** Whether a load is in progress (begun, not yet ended) — failed included. */
  isActive(): boolean {
    return this.phase !== 'idle';
  }

  /** Whether the current load failed and is waiting on a retry. */
  hasFailed(): boolean {
    return this.phase === 'failed';
  }

  /** Whether the overlay is on screen (or fading in). */
  isShown(): boolean {
    return !this.el.classList.contains('tcw-loading-overlay--hidden');
  }

  destroy(): void {
    this.clearTimer();
    this.el.remove();
  }

  private clearTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
