import type { Point } from '@chart-lib/commons';

export type PanCallback = (deltaX: number) => void;

/**
 * Handles drag-to-pan with momentum/inertia scrolling.
 * On release, velocity decays smoothly over ~500ms.
 */
export class PanHandler {
  private dragging = false;
  private lastX = 0;
  private lastTime = 0;
  private velocity = 0;
  private momentumId = 0;
  private callback: PanCallback;
  private friction = 0.92;

  constructor(callback: PanCallback) {
    this.callback = callback;
  }

  onPointerDown(pos: Point): void {
    this.dragging = true;
    this.lastX = pos.x;
    this.lastTime = Date.now();
    this.velocity = 0;
    this.stopMomentum();
  }

  onPointerMove(pos: Point): void {
    if (!this.dragging) return;
    const now = Date.now();
    const delta = this.lastX - pos.x;
    const dt = now - this.lastTime;

    // Track velocity (pixels per ms)
    if (dt > 0) {
      this.velocity = delta / dt;
    }

    this.lastX = pos.x;
    this.lastTime = now;
    this.callback(delta);
  }

  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;

    // Start momentum if flick was fast enough
    if (Math.abs(this.velocity) > 0.1) {
      this.startMomentum();
    }
  }

  private startMomentum(): void {
    this.stopMomentum();
    let v = this.velocity * 16; // Convert to pixels per frame (~16ms)

    const tick = () => {
      v *= this.friction;
      if (Math.abs(v) < 0.5) {
        this.momentumId = 0;
        return;
      }
      this.callback(v);
      this.momentumId = requestAnimationFrame(tick);
    };

    this.momentumId = requestAnimationFrame(tick);
  }

  private stopMomentum(): void {
    if (this.momentumId) {
      cancelAnimationFrame(this.momentumId);
      this.momentumId = 0;
    }
  }
}
