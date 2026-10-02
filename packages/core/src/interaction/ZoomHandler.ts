import type { Point } from '@tradecanvas/commons';

export type ZoomCallback = (delta: number, centerX: number) => void;

/**
 * Coalesces rapid wheel events into a single callback per animation frame.
 * Accumulates delta across all wheel events within a frame, then fires once.
 */
export class ZoomHandler {
  private callback: ZoomCallback;
  private sensitivity: number;

  // rAF coalescing state
  private pendingDelta = 0;
  /** Pinch steps this frame, multiplied: the change in finger distance. */
  private pendingScale = 1;
  private pendingCenterX = 0;
  private rafId = 0;

  constructor(callback: ZoomCallback, sensitivity = 0.001) {
    this.callback = callback;
    this.sensitivity = sensitivity;
  }

  onWheel(deltaY: number, pos: Point): void {
    this.pendingDelta += -deltaY * this.sensitivity;
    this.pendingCenterX = pos.x;
    this.schedule();
  }

  /**
   * A pinch step: `scale` is the new finger distance over the last one, so
   * the bars grow or shrink as much as the fingers spread or close.
   */
  onPinch(scale: number, pos: Point): void {
    if (!(scale > 0) || !Number.isFinite(scale)) return;
    this.pendingScale *= scale;
    this.pendingCenterX = pos.x;
    this.schedule();
  }

  private schedule(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      const delta = (1 + this.pendingDelta) * this.pendingScale - 1;
      const cx = this.pendingCenterX;
      this.pendingDelta = 0;
      this.pendingScale = 1;
      this.callback(delta, cx);
    });
  }

  dispose(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}
