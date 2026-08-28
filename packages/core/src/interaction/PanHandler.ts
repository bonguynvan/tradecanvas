import type { Point } from '@tradecanvas/commons';

/**
 * Drag delta since the last pointer sample, in CSS pixels.
 * `deltaX > 0` when the pointer moved left (content should scroll right);
 * `deltaY > 0` when the pointer moved up. Both follow the "content follows
 * the cursor" convention the chart pans with.
 *
 * Existing single-argument callbacks stay valid — `deltaY` is simply extra.
 */
export type PanCallback = (deltaX: number, deltaY: number) => void;

/**
 * Handles drag-to-pan with momentum/inertia scrolling on both axes.
 * On release, velocity decays smoothly over ~500ms.
 */
export class PanHandler {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastTime = 0;
  private velocityX = 0;
  private velocityY = 0;
  private momentumId = 0;
  private callback: PanCallback;
  private onStart?: () => void;
  private friction = 0.92;

  constructor(callback: PanCallback, onStart?: () => void) {
    this.callback = callback;
    this.onStart = onStart;
  }

  onPointerDown(pos: Point): void {
    this.dragging = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.lastTime = Date.now();
    this.velocityX = 0;
    this.velocityY = 0;
    this.stopMomentum();
    this.onStart?.();
  }

  onPointerMove(pos: Point): void {
    if (!this.dragging) return;
    const now = Date.now();
    const deltaX = this.lastX - pos.x;
    const deltaY = this.lastY - pos.y;
    const dt = now - this.lastTime;

    // Track velocity (pixels per ms)
    if (dt > 0) {
      this.velocityX = deltaX / dt;
      this.velocityY = deltaY / dt;
    }

    this.lastX = pos.x;
    this.lastY = pos.y;
    this.lastTime = now;
    this.callback(deltaX, deltaY);
  }

  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;

    // Start momentum if flick was fast enough on either axis
    if (Math.hypot(this.velocityX, this.velocityY) > 0.1) {
      this.startMomentum();
    }
  }

  private startMomentum(): void {
    this.stopMomentum();
    let vx = this.velocityX * 16; // Convert to pixels per frame (~16ms)
    let vy = this.velocityY * 16;

    const tick = () => {
      vx *= this.friction;
      vy *= this.friction;
      if (Math.hypot(vx, vy) < 0.5) {
        this.momentumId = 0;
        return;
      }
      this.callback(vx, vy);
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
