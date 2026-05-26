import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { Emitter } from './Emitter.js';

export type ReplayStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface ReplayBarEvent {
  bar: OHLCBar;
  index: number;
  total: number;
}

export interface ReplayStateChangeEvent {
  status: ReplayStatus;
  index: number;
  total: number;
}

export interface ReplayEventMap {
  bar: ReplayBarEvent;
  finished: { total: number };
  stateChange: ReplayStateChangeEvent;
  [key: string]: unknown;
}

export interface ReplayOptions {
  /** Full historical dataset to replay through. */
  data: DataSeries;
  /** Bars emitted per second. Default 1. */
  speed?: number;
  /** Index of the first bar to emit (0-based). Default 0. */
  startIndex?: number;
  /** Auto-start when constructed. Default false. */
  autoStart?: boolean;
}

/**
 * Drives historical bars forward at a controlled speed.
 *
 * Decoupled from Chart — consumers subscribe to `bar` events and wire them
 * into a Chart (via appendBar) or a Backtester. The controller never touches
 * the chart directly, which keeps it reusable for headless analytics.
 */
export class ReplayController extends Emitter<ReplayEventMap> {
  private readonly data: ReadonlyArray<OHLCBar>;
  private speed: number;
  private index: number;
  private status: ReplayStatus = 'idle';
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: ReplayOptions) {
    super();
    if (opts.data.length === 0) {
      throw new Error('ReplayController requires non-empty data');
    }
    this.data = opts.data;
    this.speed = Math.max(0.01, opts.speed ?? 1);
    this.index = Math.max(0, Math.min(opts.startIndex ?? 0, opts.data.length));

    if (opts.autoStart) this.start();
  }

  getStatus(): ReplayStatus {
    return this.status;
  }

  getIndex(): number {
    return this.index;
  }

  getTotal(): number {
    return this.data.length;
  }

  /** Bars at indices [0, index) — useful for seeding the chart before replay. */
  getPrefix(): DataSeries {
    return this.data.slice(0, this.index);
  }

  /** Begin emitting from current index. Idempotent if already playing. */
  start(): void {
    if (this.status === 'playing') return;
    if (this.index >= this.data.length) {
      this.transition('finished');
      return;
    }
    this.transition('playing');
    this.scheduleNext();
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.clearTimer();
    this.transition('paused');
  }

  resume(): void {
    if (this.status === 'paused') this.start();
  }

  stop(): void {
    this.clearTimer();
    this.index = 0;
    this.transition('idle');
  }

  /** Emit N bars synchronously without waiting for the timer. */
  step(n = 1): void {
    if (n <= 0) return;
    this.clearTimer();
    for (let i = 0; i < n; i++) {
      if (!this.emitNext()) return;
    }
    if (this.status !== 'finished') this.transition('paused');
  }

  /** Jump to a specific index without emitting bars in between. */
  seek(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.data.length));
    this.clearTimer();
    this.index = clamped;
    const next: ReplayStatus = clamped >= this.data.length ? 'finished' : 'paused';
    this.transition(next);
  }

  setSpeed(barsPerSecond: number): void {
    this.speed = Math.max(0.01, barsPerSecond);
    if (this.status === 'playing') {
      this.clearTimer();
      this.scheduleNext();
    }
  }

  destroy(): void {
    this.clearTimer();
    this.removeAllListeners();
  }

  private scheduleNext(): void {
    const delayMs = 1000 / this.speed;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.status !== 'playing') return;
      const more = this.emitNext();
      if (more) this.scheduleNext();
    }, delayMs);
  }

  private emitNext(): boolean {
    if (this.index >= this.data.length) {
      this.transition('finished');
      this.emit('finished', { total: this.data.length });
      return false;
    }
    const bar = this.data[this.index];
    const index = this.index;
    this.index++;
    this.emit('bar', { bar, index, total: this.data.length });
    if (this.index >= this.data.length) {
      this.transition('finished');
      this.emit('finished', { total: this.data.length });
      return false;
    }
    return true;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private transition(next: ReplayStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.emit('stateChange', {
      status: next,
      index: this.index,
      total: this.data.length,
    });
  }
}
