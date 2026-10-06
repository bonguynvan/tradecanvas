import type { OHLCBar, DataSeries } from '@tradecanvas/commons';
import { Emitter } from '../realtime/Emitter.js';

export interface ReplayConfig {
  speed: number;          // Multiplier on the tick rate: one bar every `interval / speed` ms
  interval: number;       // Base tick interval in ms (default: 500)
  /**
   * Play from where it is to the end in about this long (ms), whatever the
   * number of bars: a 30-day window of 5-minute bars takes as long as a
   * day of them. It sets the pace: pausing, resuming and seeking keep it,
   * and a later start without it, or a speed set later, takes over.
   */
  duration?: number;
  startIndex?: number;    // First bar to reveal
  /**
   * Reveal `startIndex` at once and wait paused, instead of revealing it on
   * the first tick — so entering replay shows the cut immediately.
   */
  paused?: boolean;
  /**
   * Where to start, by time: the first bar at or after it (instead of
   * `startIndex`). The chart reads this.
   */
  startTime?: number;
  /**
   * Leave the bars before the start out while the replay runs: the chart
   * shows only what it replays, and gets them back on `replayStop()`. Its
   * indices (`replayStep`, `getReplayBarIndex`, a restart's `startIndex`)
   * count from the start, and indicators begin there too (a 200-bar average
   * has its first value 200 bars in). The chart reads this.
   */
  hideHistory?: boolean;
  /**
   * Show the signal markers and trade zones as the replay reaches them: a
   * marker once its bar is shown, a trade once entered and open until its
   * exit. Default `true`; `false` shows them all through the replay. The
   * chart reads this.
   */
  revealMarks?: boolean;
  /**
   * Finer bars to replay through (5-minute bars under an hourly chart): each
   * step grows the forming bar from them, and closed bars show as they are
   * in the chart's series. `startIndex` stays a bar of the chart's series.
   * The chart reads this; the manager itself steps through what it is given.
   */
  steps?: DataSeries;
}

/**
 * What drives a replay that is quicker than a bar a frame: animation frames
 * and their time. Swappable, for tests.
 */
export interface ReplayClock {
  now(): number;
  frame(run: () => void): unknown;
  cancel(handle: unknown): void;
}

/** A bar quicker than this plays on the frame clock, several bars a frame when need be. */
const FRAME_MS = 16;
/** The most replay time one frame may add: a late frame slows the replay rather than skip ahead. */
export const MAX_REPLAY_FRAME_MS = 50;

/** Whether animation frames run now: a browser, with the page on screen (a hidden tab has none). */
const framesRun = (): boolean =>
  typeof requestAnimationFrame === 'function' && !(typeof document !== 'undefined' && document.hidden);

/** Animation frames where they run, else a timer at about the same rate (slowed by a hidden tab, not stopped). */
const DEFAULT_CLOCK: ReplayClock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  frame: (run) => (framesRun() ? { raf: requestAnimationFrame(run) } : { timeout: setTimeout(run, FRAME_MS) }),
  cancel: (handle) => {
    const h = handle as { raf?: number; timeout?: ReturnType<typeof setTimeout> };
    if (h.raf !== undefined) cancelAnimationFrame(h.raf);
    if (h.timeout !== undefined) clearTimeout(h.timeout);
  },
};

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
 *
 * A bar a frame or slower ticks on a timer; quicker (a high speed, or a
 * `duration` over many bars) it plays on animation frames, several bars a
 * frame, each reported once.
 */
export class ReplayManager extends Emitter<ReplayEvents> {
  private data: DataSeries = [];
  private cursor = -1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameHandle: unknown = null;
  /** Bumped by every clock started or stopped: a frame of an older clock does nothing. */
  private run = 0;
  private state: 'playing' | 'paused' | 'stopped' = 'stopped';
  private config: ReplayConfig = { speed: 1, interval: 500 };
  /** A bar's time set by a `duration` (null: the interval at the speed). */
  private paceMs: number | null = null;

  constructor(private readonly clock: ReplayClock = DEFAULT_CLOCK) {
    super();
  }

  load(data: DataSeries): void {
    this.stop();
    this.data = data;
    this.cursor = -1;
  }

  play(config?: Partial<ReplayConfig>): void {
    if (this.data.length === 0) return;
    if (config) {
      const { startIndex, paused, duration, ...rest } = config;
      this.config = { ...this.config, ...rest };
      const start = startIndex !== undefined ? this.clamp(startIndex) : null;
      if (paused) {
        // Show the start bar (or the current one) and wait.
        this.clearTimer();
        this.seekTo(start ?? Math.max(0, this.cursor));
        this.setPace(duration);
        this.setState('paused');
        return;
      }
      if (start !== null) this.cursor = start - 1;
      this.setPace(duration);
    }
    if (this.isAtEnd()) {
      // Nothing left to reveal: stay on the last bar.
      this.clearTimer();
      this.setState('paused');
      return;
    }

    this.clearTimer();
    const stepMs = this.paceMs ?? this.config.interval / this.config.speed;
    // A speed of 0, below it or not a number has no pace to keep: it waits.
    if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
      this.setState('paused');
      return;
    }
    this.setState('playing');
    if (stepMs < FRAME_MS || this.paceMs !== null) this.runFrames(stepMs);
    else this.timer = setInterval(() => this.advance(1), stepMs);
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
    this.config = { ...this.config, speed };
    this.paceMs = null;
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

  /** A `duration` spread over the bars still to show from here (a valid one), else no pace of its own. */
  private setPace(duration: number | undefined): void {
    this.paceMs = duration !== undefined && duration > 0 && Number.isFinite(duration)
      ? duration / Math.max(1, this.data.length - 1 - this.cursor)
      : null;
  }

  /** Frames that each add the time since the last (at most MAX_REPLAY_FRAME_MS), and the bars it pays for. */
  private runFrames(stepMs: number): void {
    const run = this.run;
    let last = this.clock.now();
    let owed = 0;
    const frame = (): void => {
      // A clock started or stopped since (by a listener, say) owns the replay now.
      if (run !== this.run || this.state !== 'playing') return;
      this.frameHandle = null;
      const now = this.clock.now();
      owed += Math.min(MAX_REPLAY_FRAME_MS, Math.max(0, now - last));
      last = now;
      const bars = Math.floor(owed / stepMs);
      try {
        if (bars > 0) {
          owed -= bars * stepMs;
          this.advance(bars);
        }
      } finally {
        // Even when a listener throws, the replay goes on (as a timer's would).
        if (run === this.run && this.state === 'playing' && this.frameHandle === null) this.frameHandle = this.clock.frame(frame);
      }
    };
    this.frameHandle = this.clock.frame(frame);
  }

  /** Reveal `count` more bars at once (reported once), finishing on the last. */
  private advance(count: number): void {
    if (this.isAtEnd()) {
      this.finish();
      return;
    }
    this.cursor = Math.min(this.data.length - 1, this.cursor + count);
    this.emit('bar', { bar: this.data[this.cursor], index: this.cursor, total: this.data.length });
    // The last bar just landed: finish now rather than one idle tick later.
    if (this.isAtEnd()) this.finish();
  }

  private finish(): void {
    this.clearTimer();
    this.setState('paused');
    this.emit('complete', undefined as never);
  }

  private clamp(index: number): number {
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.min(Math.floor(index), this.data.length - 1));
  }

  private clearTimer(): void {
    this.run++;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.frameHandle !== null) {
      this.clock.cancel(this.frameHandle);
      this.frameHandle = null;
    }
  }

  private setState(state: 'playing' | 'paused' | 'stopped'): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('stateChange', state);
  }
}
