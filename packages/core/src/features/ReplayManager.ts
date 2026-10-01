import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { Emitter } from '../realtime/Emitter.js';

export interface ReplayConfig {
  speed: number;          // Multiplier on the tick rate: one bar every `interval / speed` ms
  interval: number;       // Base tick interval in ms (default: 500)
  startIndex?: number;    // First bar to reveal
  /**
   * Reveal `startIndex` at once and wait paused, instead of revealing it on
   * the first tick — so entering replay shows the cut immediately.
   */
  paused?: boolean;
}

interface ReplayEvents {
  bar: { bar: OHLCBar; index: number; total: number };
  complete: void;
  stateChange: 'playing' | 'paused' | 'stopped';
  [key: string]: unknown;
}

/**
 * Replays historical data bar-by-bar for backtesting and review.
 * Feeds bars to the chart sequentially at configurable speed.
 *
 * The cursor is the bar on screen (`-1` before the first one). Reaching the
 * last bar pauses there and emits `complete`; it doesn't wrap to the start.
 */
export class ReplayManager extends Emitter<ReplayEvents> {
  private data: DataSeries = [];
  private cursor = -1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: 'playing' | 'paused' | 'stopped' = 'stopped';
  private config: ReplayConfig = { speed: 1, interval: 500 };

  load(data: DataSeries): void {
    this.stop();
    this.data = data;
    this.cursor = -1;
  }

  play(config?: Partial<ReplayConfig>): void {
    if (this.data.length === 0) return;
    if (config) {
      const { startIndex, paused, ...rest } = config;
      Object.assign(this.config, rest);
      const start = startIndex !== undefined ? this.clamp(startIndex) : null;
      if (paused) {
        // Show the start bar (or the current one) and wait.
        this.clearTimer();
        this.seekTo(start ?? Math.max(0, this.cursor));
        this.setState('paused');
        return;
      }
      if (start !== null) this.cursor = start - 1;
    }
    if (this.isAtEnd()) {
      // Nothing left to reveal: stay on the last bar.
      this.clearTimer();
      this.setState('paused');
      return;
    }

    this.clearTimer();
    this.setState('playing');
    this.timer = setInterval(() => this.tick(), this.config.interval / this.config.speed);
  }

  pause(): void {
    this.clearTimer();
    this.setState('paused');
  }

  resume(): void {
    if (this.state === 'paused') this.play();
  }

  stop(): void {
    this.clearTimer();
    this.cursor = -1;
    this.setState('stopped');
  }

  /**
   * Jump to a specific bar. Emits `bar` synchronously so chart consumers can
   * re-render the slice — without this, seeking while paused leaves the chart
   * stuck on whichever bar last fired through the timer.
   */
  seekTo(index: number): void {
    if (this.data.length === 0) return;
    this.cursor = this.clamp(index);
    this.emit('bar', { bar: this.data[this.cursor], index: this.cursor, total: this.data.length });
  }

  setSpeed(speed: number): void {
    this.config.speed = speed;
    if (this.state === 'playing') this.play();
  }

  getState(): 'playing' | 'paused' | 'stopped' {
    return this.state;
  }

  /** Whether the last bar is on screen. */
  isAtEnd(): boolean {
    return this.data.length > 0 && this.cursor >= this.data.length - 1;
  }

  /** `current`: index of the bar on screen (0 before the first one). */
  getProgress(): { current: number; total: number; percent: number } {
    const total = this.data.length;
    return {
      current: Math.max(0, this.cursor),
      total,
      percent: total > 0 ? ((this.cursor + 1) / total) * 100 : 0,
    };
  }

  dispose(): void {
    this.stop();
    this.removeAllListeners();
    this.data = [];
  }

  private tick(): void {
    if (this.isAtEnd()) {
      this.clearTimer();
      this.setState('paused');
      this.emit('complete', undefined as never);
      return;
    }
    this.cursor++;
    this.emit('bar', { bar: this.data[this.cursor], index: this.cursor, total: this.data.length });
    if (this.isAtEnd()) {
      // The last bar just landed: finish now rather than one idle tick later.
      this.clearTimer();
      this.setState('paused');
      this.emit('complete', undefined as never);
    }
  }

  private clamp(index: number): number {
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.min(Math.floor(index), this.data.length - 1));
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private setState(state: 'playing' | 'paused' | 'stopped'): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('stateChange', state);
  }
}
