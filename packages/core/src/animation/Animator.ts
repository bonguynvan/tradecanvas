/**
 * Easing functions for smooth animations.
 */
export const Easing = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  },
  spring: (t: number) => 1 - Math.pow(Math.E, -6 * t) * Math.cos(8 * t),
};

export type EasingFn = (t: number) => number;

export interface AnimationOptions {
  duration: number;
  easing?: EasingFn;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

/**
 * Lightweight animation scheduler.
 * Runs multiple concurrent animations on the rAF loop.
 */
export class Animator {
  private animations = new Map<string, AnimationState>();
  private frameId = 0;
  private running = false;

  /**
   * Start a named animation. If one with the same name is running, it's replaced.
   */
  animate(name: string, opts: AnimationOptions): void {
    this.animations.set(name, {
      startTime: -1,
      duration: opts.duration,
      easing: opts.easing ?? Easing.easeOutCubic,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
    });

    if (!this.running) {
      this.running = true;
      this.tick();
    }
  }

  /** Cancel a specific animation */
  cancel(name: string): void {
    this.animations.delete(name);
    if (this.animations.size === 0) this.stop();
  }

  /** Cancel all animations */
  cancelAll(): void {
    this.animations.clear();
    this.stop();
  }

  isAnimating(name?: string): boolean {
    if (name) return this.animations.has(name);
    return this.animations.size > 0;
  }

  private tick(): void {
    this.frameId = requestAnimationFrame((now) => {
      const toRemove: string[] = [];

      for (const [name, anim] of this.animations) {
        if (anim.startTime < 0) anim.startTime = now;

        const elapsed = now - anim.startTime;
        const t = Math.min(1, elapsed / anim.duration);
        const progress = anim.easing(t);

        anim.onUpdate(progress);

        if (t >= 1) {
          anim.onComplete?.();
          toRemove.push(name);
        }
      }

      for (const name of toRemove) this.animations.delete(name);

      if (this.animations.size > 0) {
        this.tick();
      } else {
        this.running = false;
      }
    });
  }

  private stop(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
    this.running = false;
  }

  dispose(): void {
    this.cancelAll();
  }
}

interface AnimationState {
  startTime: number;
  duration: number;
  easing: EasingFn;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}
