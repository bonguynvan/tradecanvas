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

/** Release velocity is measured over the pointer's last this-many ms. */
const VELOCITY_WINDOW_MS = 100;
/** A pointer that rested this long before release was stopped, not flicked. */
const RELEASE_IDLE_MS = 50;
/** Below this speed (px/ms) a release is a plain stop, not a flick. */
const MIN_FLICK_SPEED = 0.1;
/** Momentum never starts faster than this many px per frame. */
const MAX_MOMENTUM_PX_PER_FRAME = 60;
const FRAME_MS = 16;

interface Sample {
  t: number;
  x: number;
  y: number;
}

/**
 * Handles drag-to-pan with momentum/inertia scrolling on both axes.
 * On release, velocity decays smoothly over ~500ms.
 */
export class PanHandler {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private samples: Sample[] = [];
  private momentumId = 0;
  private callback: PanCallback;
  private onStart?: () => void;
  private friction = 0.92;

  constructor(callback: PanCallback, onStart?: () => void) {
    this.callback = callback;
    this.onStart = onStart;
  }

  isDragging(): boolean {
    return this.dragging;
  }

  onPointerDown(pos: Point): void {
    this.dragging = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.samples = [{ t: Date.now(), x: pos.x, y: pos.y }];
    this.stopMomentum();
    this.onStart?.();
  }

  onPointerMove(pos: Point): void {
    if (!this.dragging) return;
    const deltaX = this.lastX - pos.x;
    const deltaY = this.lastY - pos.y;
    this.lastX = pos.x;
    this.lastY = pos.y;

    const now = Date.now();
    this.samples.push({ t: now, x: pos.x, y: pos.y });
    // Keep only the recent window (plus one older sample to measure from).
    while (this.samples.length > 2 && now - this.samples[1].t > VELOCITY_WINDOW_MS) {
      this.samples.shift();
    }

    if (deltaX || deltaY) this.callback(deltaX, deltaY);
  }

  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;

    const v = this.releaseVelocity(Date.now());
    this.samples = [];
    if (v && Math.hypot(v.x, v.y) > MIN_FLICK_SPEED) {
      this.startMomentum(v.x, v.y);
    }
  }

  /** Stop any coasting immediately (e.g. a new gesture or a programmatic jump). */
  cancelMomentum(): void {
    this.stopMomentum();
  }

  /**
   * Velocity (px/ms, delta convention) over the last VELOCITY_WINDOW_MS, or
   * null when the pointer had come to rest before release. Measuring over a
   * window instead of the final sample keeps one jittery event from either
   * killing a flick or launching the chart after the user had stopped.
   */
  private releaseVelocity(now: number): { x: number; y: number } | null {
    const last = this.samples[this.samples.length - 1];
    if (!last || now - last.t > RELEASE_IDLE_MS) return null;
    const first = this.samples.find((s) => last.t - s.t <= VELOCITY_WINDOW_MS) ?? this.samples[0];
    const dt = last.t - first.t;
    if (dt <= 0) return null;
    return { x: (first.x - last.x) / dt, y: (first.y - last.y) / dt };
  }

  private startMomentum(velocityX: number, velocityY: number): void {
    this.stopMomentum();
    let vx = velocityX * FRAME_MS;
    let vy = velocityY * FRAME_MS;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_MOMENTUM_PX_PER_FRAME) {
      vx *= MAX_MOMENTUM_PX_PER_FRAME / speed;
      vy *= MAX_MOMENTUM_PX_PER_FRAME / speed;
    }

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
