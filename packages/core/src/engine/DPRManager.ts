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

/** A canvas's backing store, and whether it is the container's own device pixels. */
export interface BackingSize extends Size {
  /**
   * The size is the box's own count of device pixels, as the browser snapped
   * it: a canvas that fills the box is then drawn one pixel to one, whatever
   * the ratio and wherever on the page the box begins.
   */
  exact: boolean;
}

/**
 * The backing store for a canvas over a box `size` CSS px drawn at `dpr`.
 * `device` is the box in device pixels as the browser reports it (null where
 * it doesn't). At a ratio like 1.25 or 1.5 a box is seldom a whole number of
 * device pixels wide, nor does it begin on one: a canvas sized by rounding is
 * then stretched or shifted by a fraction of a pixel and every line in it goes
 * soft. The browser's own count is taken when it is the box drawn at `dpr`:
 * not when the ratio is capped under the screen's, nor when the box has
 * padding the canvases lie over.
 */
export function backingSize(size: Size, dpr: number, device: Size | null): BackingSize {
  // A box a fraction of a CSS pixel wide reads rounded: half a CSS pixel off at the most, and the snap's half a device pixel.
  const tolerance = dpr / 2 + 0.5;
  const fits = (px: number, css: number) => Number.isInteger(px) && px > 0 && Math.abs(px - css * dpr) <= tolerance;
  if (device && fits(device.width, size.width) && fits(device.height, size.height)) {
    return { width: device.width, height: device.height, exact: true };
  }
  return { width: Math.round(size.width * dpr), height: Math.round(size.height * dpr), exact: false };
}

/** Size `canvas` for a box `size` CSS px at `dpr` (see `backingSize`); a canvas already that size is not cleared. */
export function sizeCanvas(canvas: HTMLCanvasElement, size: Size, dpr: number, device: Size | null): void {
  const backing = backingSize(size, dpr, device);
  if (canvas.width !== backing.width || canvas.height !== backing.height) {
    canvas.width = backing.width;
    canvas.height = backing.height;
  }
  // The box's own pixels fill the box itself, fractions of a CSS pixel and all.
  canvas.style.width = backing.exact ? '100%' : `${size.width}px`;
  canvas.style.height = backing.exact ? '100%' : `${size.height}px`;
}

export class DPRManager {
  private observer: ResizeObserver | null = null;
  private callback: ResizeCallback | null = null;
  private currentDpr = 1;
  private resizeScheduled = false;
  private deviceChanged = false;
  private cachedSize: Size;
  /** The container in device pixels, where the browser reports it. */
  private deviceSize: Size | null = null;
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

  /** The container in device pixels as the browser snapped it, or null before it said or where it doesn't. */
  getDeviceSize(): Size | null {
    return this.deviceSize;
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
    this.observer = new ResizeObserver((entries) => {
      const box = entries?.[entries.length - 1]?.devicePixelContentBoxSize?.[0];
      const device = box ? { width: box.inlineSize, height: box.blockSize } : null;
      if (device?.width !== this.deviceSize?.width || device?.height !== this.deviceSize?.height) {
        this.deviceSize = device;
        this.deviceChanged = true;
      }
      // Debounce via rAF — collapse multiple resize events into one per frame
      if (this.resizeScheduled) return;
      this.resizeScheduled = true;
      requestAnimationFrame(() => {
        this.resizeScheduled = false;
        this.update(false);
      });
    });
    try {
      // In device pixels: it also tells when the box moved onto other pixels at the same size.
      this.observer.observe(this.container, { box: 'device-pixel-content-box' });
    } catch {
      this.observer.observe(this.container);
    }
    this.watchRatio();
  }

  /** Tell the callback when the size or the pixel ratio changed (or always, when `force`). */
  private update(force: boolean): void {
    const dpr = cappedPixelRatio(this.maxPixelRatio);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const changed = this.deviceChanged || dpr !== this.currentDpr || w !== this.cachedSize.width || h !== this.cachedSize.height;
    this.deviceChanged = false;
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
