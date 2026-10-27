import type { OHLCBar, DataSeries, TimeFrame } from '@tradecanvas/commons';
import { Emitter } from '../realtime/Emitter.js';

export interface ReplayConfig {
  /** A multiplier on the pace: one bar every `interval / speed` ms. Default 1. */
  speed: number;
  /** The time between bars at speed 1, ms. Default 500 (two bars a second). */
  interval: number;
  /**
   * Play from where it is to the end in about this long (ms), whatever the
   * number of bars: a 30-day window of 5-minute bars takes as long as a
   * day of them. It sets the pace: pausing, resuming and seeking keep it,
   * and a later start without it, or a speed set later, takes over.
   */
  duration?: number;
  /** The first bar the replay reveals: the bars before it show, the later ones as it reaches them. */
  startIndex?: number;
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
  /**
   * Draw each bar growing over its time, as a live one does: from its open
   * to the extreme its direction says came first (a rising bar dips first),
   * the other one, then its close; with finer bars (`step` or `steps`) along
   * their prices. It ends as the bar is in the series. Not for a bar shorter
   * than three frames (it comes whole), and under reduced motion it moves
   * from one of those prices to the next without the slide. Default `false`;
   * ChartWidget turns it on. With it, indices, `speed` and `duration` count
   * the chart's bars, also with `steps`.
   */
  animate?: boolean;
  /**
   * With `animate`: the finer interval whose bars shape each bar as it forms,
   * fetched through the connected feed for the bars the replay is about to
   * play (`'auto'`: the finest it serves with at most 60 to a bar). A bar
   * they don't cover forms from its own prices. The chart reads this.
   */
  step?: TimeFrame | 'auto';
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
/** A bar shorter than this (three frames) comes whole: it would not be seen forming. */
const MIN_FORMING_STEP_MS = 3 * FRAME_MS;
/** How often a forming bar is told: about 30 times a second, which keeps a Canvas 2D chart smooth at high DPR. */
const FORMING_INTERVAL_MS = 1000 / 30;
/** Rounding slack when the time owed is exactly a bar's. */
const OWED_EPSILON = 1e-9;
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
  /** With `animate`: how far (0..1) bar `index`, the next one, has formed. */
  phase: { index: number; fraction: number };
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
 * frame, each reported once. With `animate` it always plays on frames and
 * tells `phase`, how far the next bar has formed, about 30 times a second.
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
  /** With `animate`: the time played into the next bar, kept through a pause. */
  private owedMs = 0;

  constructor(private readonly clock: ReplayClock = DEFAULT_CLOCK) {
    super();
  }

  load(data: DataSeries): void {
    this.stop();
    this.data = data;
    this.cursor = -1;
    this.owedMs = 0;
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
      if (start !== null) {
        this.cursor = start - 1;
        this.owedMs = 0;
      }
      this.setPace(duration);
    }
    if (this.isAtEnd()) {
      // Nothing left to reveal: stay on the last bar.
      this.clearTimer();
      this.setState('paused');
      return;
    }

    this.clearTimer();
    const stepMs = this.stepMs();
    // A speed of 0, below it or not a number has no pace to keep: it waits.
    if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
      this.setState('paused');
      return;
    }
    this.setState('playing');
    if (this.config.animate) this.runForming(stepMs);
    else if (stepMs < FRAME_MS || this.paceMs !== null) this.runFrames(stepMs);
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
    this.owedMs = 0;
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
    this.owedMs = 0;
    this.emit('bar', { bar: this.data[this.cursor], index: this.cursor, total: this.data.length });
  }

  setSpeed(speed: number): void {
    // The bar forming keeps how far it is: the time owed scales with the pace.
    const fraction = this.getFraction();
    this.config = { ...this.config, speed };
    this.paceMs = null;
    const stepMs = this.stepMs();
    this.owedMs = stepMs > 0 && Number.isFinite(stepMs) ? fraction * stepMs : 0;
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

  /**
   * With a `duration` pace, the time left to play to the end (ms), so a
   * replay rebuilt on other bars can keep it; null with an interval pace.
   */
  remainingMs(): number | null {
    return this.paceMs === null ? null : this.paceMs * Math.max(0, this.data.length - 1 - this.cursor);
  }

  /** A bar's time at the pace now (ms): a `duration`'s, else the interval at the speed. */
  getStepMs(): number {
    return this.stepMs();
  }

  /** With `animate`: how far (0..1) the next bar has formed; 0 when it hasn't started. */
  getFraction(): number {
    const stepMs = this.stepMs();
    return stepMs > 0 && Number.isFinite(stepMs) ? Math.min(1, this.owedMs / stepMs) : 0;
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

  /** A bar's time at the pace now: a `duration`'s, else the interval at the speed. */
  private stepMs(): number {
    return this.paceMs ?? this.config.interval / this.config.speed;
  }

  /**
   * Frames that form the next bar (`animate`): the time owed is kept between
   * runs, a bar lands when it is paid for, and the bar forming is told at
   * once, then about 30 times a second.
   */
  private runForming(stepMs: number): void {
    const run = this.run;
    const forms = stepMs >= MIN_FORMING_STEP_MS;
    let last = this.clock.now();
    let told = -Infinity;
    const tell = (at: number): void => {
      if (!forms || this.isAtEnd() || run !== this.run || this.state !== 'playing') return;
      told = at;
      this.emit('phase', { index: this.cursor + 1, fraction: Math.min(1, this.owedMs / stepMs) });
    };
    const frame = (): void => {
      if (run !== this.run || this.state !== 'playing') return;
      this.frameHandle = null;
      const now = this.clock.now();
      this.owedMs += Math.min(MAX_REPLAY_FRAME_MS, Math.max(0, now - last));
      last = now;
      const bars = Math.floor((this.owedMs + OWED_EPSILON) / stepMs);
      try {
        if (bars > 0) {
          this.owedMs = Math.max(0, this.owedMs - bars * stepMs);
          this.advance(bars);
          tell(now);
        } else if (now - told + FRAME_MS / 2 >= FORMING_INTERVAL_MS) {
          tell(now);
        }
      } finally {
        if (run === this.run && this.state === 'playing' && this.frameHandle === null) this.frameHandle = this.clock.frame(frame);
      }
    };
    tell(last);
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
