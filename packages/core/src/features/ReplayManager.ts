import type { OHLCBar, DataSeries } from '@chart-lib/commons';
import { Emitter } from '../realtime/Emitter.js';

export interface ReplayConfig {
  speed: number;          // Multiplier: 1 = real-time, 2 = 2x, 0.5 = half speed
  interval: number;       // Base tick interval in ms (default: 500)
  startIndex?: number;    // Bar index to start from
}

interface ReplayEvents {
  bar: { bar: OHLCBar; index: number; total: number };
  complete: void;
  stateChange: 'playing' | 'paused' | 'stopped';
}

/**
 * Replays historical data bar-by-bar for backtesting and review.
 * Feeds bars to the chart sequentially at configurable speed.
 */
export class ReplayManager extends Emitter<ReplayEvents> {
  private data: DataSeries = [];
  private currentIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: 'playing' | 'paused' | 'stopped' = 'stopped';
  private config: ReplayConfig = { speed: 1, interval: 500 };

  load(data: DataSeries): void {
    this.stop();
    this.data = data;
    this.currentIndex = 0;
  }

  play(config?: Partial<ReplayConfig>): void {
    if (this.data.length === 0) return;
    if (config) Object.assign(this.config, config);
    if (config?.startIndex !== undefined) this.currentIndex = config.startIndex;

    this.state = 'playing';
    this.emit('stateChange', 'playing');

    this.timer = setInterval(() => {
      if (this.currentIndex >= this.data.length) {
        this.stop();
        this.emit('complete', undefined as any);
        return;
      }

      const bar = this.data[this.currentIndex];
      this.emit('bar', { bar, index: this.currentIndex, total: this.data.length });
      this.currentIndex++;
    }, this.config.interval / this.config.speed);
  }

  pause(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = 'paused';
    this.emit('stateChange', 'paused');
  }

  resume(): void {
    if (this.state === 'paused') {
      this.play();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = 'stopped';
    this.currentIndex = 0;
    this.emit('stateChange', 'stopped');
  }

  seekTo(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.data.length - 1));
  }

  setSpeed(speed: number): void {
    this.config.speed = speed;
    if (this.state === 'playing') {
      this.pause();
      this.play();
    }
  }

  getState(): 'playing' | 'paused' | 'stopped' {
    return this.state;
  }

  getProgress(): { current: number; total: number; percent: number } {
    return {
      current: this.currentIndex,
      total: this.data.length,
      percent: this.data.length > 0 ? (this.currentIndex / this.data.length) * 100 : 0,
    };
  }

  dispose(): void {
    this.stop();
    this.removeAllListeners();
    this.data = [];
  }
}
