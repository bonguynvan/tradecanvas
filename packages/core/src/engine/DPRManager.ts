import type { Size } from '@chart-lib/commons';

export type ResizeCallback = (size: Size, dpr: number) => void;

export class DPRManager {
  private observer: ResizeObserver | null = null;
  private callback: ResizeCallback | null = null;
  private currentDpr = 1;
  private resizeScheduled = false;
  private cachedSize: Size;

  constructor(private container: HTMLElement) {
    this.currentDpr = window.devicePixelRatio || 1;
    this.cachedSize = { width: container.clientWidth, height: container.clientHeight };
  }

  getDpr(): number {
    return this.currentDpr;
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
        this.currentDpr = window.devicePixelRatio || 1;
        const newW = this.container.clientWidth;
        const newH = this.container.clientHeight;
        // Skip if size hasn't actually changed
        if (newW === this.cachedSize.width && newH === this.cachedSize.height) return;
        this.cachedSize = { width: newW, height: newH };
        this.callback?.(this.cachedSize, this.currentDpr);
      });
    });
    this.observer.observe(this.container);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.callback = null;
  }
}
