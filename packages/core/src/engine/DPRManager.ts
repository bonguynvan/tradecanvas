import type { Size } from '@tradecanvas/commons';

export type ResizeCallback = (size: Size, dpr: number) => void;

/**
 * The highest device pixel ratio the chart draws at by default. A 3x phone
 * screen drawn at 2x has 56% fewer pixels to fill, rasterise and composite,
 * and needs less than half the canvas memory, for lines barely softer.
 */
export const DEFAULT_MAX_PIXEL_RATIO = 2;

/** The screen's pixel ratio, held to `max` (no cap for `Infinity` or a value that isn't a positive number). */
export function cappedPixelRatio(max: number = DEFAULT_MAX_PIXEL_RATIO): number {
  const raw = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return max > 0 ? Math.min(raw, max) : raw;
}

export class DPRManager {
  private observer: ResizeObserver | null = null;
  private callback: ResizeCallback | null = null;
  private currentDpr = 1;
  private resizeScheduled = false;
  private cachedSize: Size;
  private stopWatchingRatio: (() => void) | null = null;

  constructor(private container: HTMLElement, private maxPixelRatio: number = DEFAULT_MAX_PIXEL_RATIO) {
    this.currentDpr = cappedPixelRatio(maxPixelRatio);
    this.cachedSize = { width: container.clientWidth, height: container.clientHeight };
  }

  getDpr(): number {
    return this.currentDpr;
  }

  getMaxPixelRatio(): number {
    return this.maxPixelRatio;
  }

  /** The highest pixel ratio to draw at (`Infinity`: the screen's own); the canvases resize to it. */
  setMaxPixelRatio(max: number): void {
    this.maxPixelRatio = max;
    this.update(true);
  }

  getContainerSize(): Size {
    return this.cachedSize;
  }

  /** Read live container size (bypasses cache). Use when externally triggered. */
  readContainerSize(): Size {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w !== this.cachedSize.width || h !== this.cachedSize.height) {
      this.cachedSize = { width: w, height: h };
    }
    return this.cachedSize;
  }

  onResize(cb: ResizeCallback): void {
    this.callback = cb;
    this.observer = new ResizeObserver(() => {
      // Debounce via rAF — collapse multiple resize events into one per frame
      if (this.resizeScheduled) return;
      this.resizeScheduled = true;
      requestAnimationFrame(() => {
        this.resizeScheduled = false;
        this.update(false);
      });
    });
    this.observer.observe(this.container);
    this.watchRatio();
  }

  /** Tell the callback when the size or the pixel ratio changed (or always, when `force`). */
  private update(force: boolean): void {
    const dpr = cappedPixelRatio(this.maxPixelRatio);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const changed = dpr !== this.currentDpr || w !== this.cachedSize.width || h !== this.cachedSize.height;
    this.currentDpr = dpr;
    this.cachedSize = { width: w, height: h };
    if (changed || force) this.callback?.(this.cachedSize, dpr);
  }

  /**
   * The screen's pixel ratio can change with the size the same: a window
   * dragged to another screen, the page zoomed. A media query on the current
   * ratio says when, and is set again for the new one.
   */
  private watchRatio(): void {
    this.stopWatchingRatio?.();
    this.stopWatchingRatio = null;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    if (!query || typeof query.addEventListener !== 'function') return;
    const onChange = () => {
      this.update(false);
      this.watchRatio();
    };
    query.addEventListener('change', onChange);
    this.stopWatchingRatio = () => query.removeEventListener('change', onChange);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.stopWatchingRatio?.();
    this.stopWatchingRatio = null;
    this.callback = null;
  }
}
