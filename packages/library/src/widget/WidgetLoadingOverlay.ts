/**
 * How long a symbol/timeframe switch may run before the loading veil
 * appears. Faster loads just swap the chart in place — flashing a loader for
 * a 150 ms request reads as flicker, not feedback.
 */
export const LOADING_SHOW_DELAY_MS = 200;

/**
 * Silhouette of the loading mark: a short rising run of candles as
 * [body top, body height, wick top, wick height, rising] in a 64 px box
 * (y grows downward).
 */
const SKELETON_CANDLES: readonly (readonly [number, number, number, number, boolean])[] = [
  [34, 16, 28, 26, false],
  [30, 14, 24, 26, true],
  [26, 18, 20, 30, true],
  [30, 10, 24, 22, false],
  [20, 16, 14, 28, true],
  [14, 18, 8, 30, true],
  [18, 10, 12, 20, false],
  [8, 18, 2, 30, true],
];

/**
 * Loading state for the chart area: a run of candles lit one after another
 * over a sweeping accent line. The status text is for screen readers only;
 * an error message is shown.
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

    // Candles + label share a card: transparent on the opaque first-load
    // screen, a raised panel when veiling a chart so it reads over the candles.
    const card = document.createElement('div');
    card.className = 'tcw-loading-card';

    const candles = document.createElement('div');
    candles.className = 'tcw-loading-candles';
    candles.setAttribute('aria-hidden', 'true');
    SKELETON_CANDLES.forEach(([bodyTop, bodyHeight, wickTop, wickHeight, rising], i) => {
      const candle = document.createElement('span');
      candle.className = rising ? 'tcw-loading-candle tcw-loading-candle--up' : 'tcw-loading-candle';
      candle.style.setProperty('--tcw-body-top', `${bodyTop}px`);
      candle.style.setProperty('--tcw-body-h', `${bodyHeight}px`);
      candle.style.setProperty('--tcw-wick-top', `${wickTop}px`);
      candle.style.setProperty('--tcw-wick-h', `${wickHeight}px`);
      // A custom property, so a page-wide `animation-delay: 0 !important` reset can't flatten the wave.
      candle.style.setProperty('--tcw-delay', `${i * 110}ms`);
      candles.appendChild(candle);
    });
    card.appendChild(candles);

    const track = document.createElement('div');
    track.className = 'tcw-loading-track';
    track.setAttribute('aria-hidden', 'true');
    track.appendChild(document.createElement('span'));
    card.appendChild(track);

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
