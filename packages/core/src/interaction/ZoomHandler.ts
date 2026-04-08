import type { Point } from '@chart-lib/commons';

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
  private pendingCenterX = 0;
  private rafId = 0;

  constructor(callback: ZoomCallback, sensitivity = 0.001) {
    this.callback = callback;
    this.sensitivity = sensitivity;
  }

  onWheel(deltaY: number, pos: Point): void {
    this.pendingDelta += -deltaY * this.sensitivity;
    this.pendingCenterX = pos.x;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        const delta = this.pendingDelta;
        const cx = this.pendingCenterX;
        this.pendingDelta = 0;
        this.callback(delta, cx);
      });
    }
  }

  dispose(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}
