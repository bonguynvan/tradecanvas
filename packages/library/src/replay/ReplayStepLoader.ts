import type { DataSeries, OHLCBar, ReplayStepsLoadPayload, TimeFrame } from '@tradecanvas/commons';

/** Finer bars ending before `before`, at most `limit` of them (a feed's page back). */
export type FinerSource = (before: number, limit: number) => Promise<DataSeries>;

/** Finer bars asked for in one request: the resampler's page and most venues' cap. */
export const REPLAY_PAGE_STEPS = 1000;
/** The least time between two requests (ms): at most two a second, kind to a venue's rate limit. */
export const MIN_REPLAY_ASK_GAP_MS = 500;

export interface ReplayStepLoaderOptions {
  /** Where the finer bars come from; null when the feed can't page back. */
  source: FinerSource | null;
  step: TimeFrame;
  /** Finer bars in one bar of the chart. */
  ratio: number;
  /** How long one bar of the chart is (ms), for the end of the last one. */
  barMs: number;
  /** The finer bars of the hours the chart shows. */
  keep: (bars: DataSeries) => DataSeries;
  report: (payload: ReplayStepsLoadPayload) => void;
  now?: () => number;
}

/**
 * The finer bars that shape a replay's bars as they form, fetched a page at
 * a time for the bars it is about to play and kept by bar time, so a series
 * rebuilt under the replay keeps them. A bar gets them only when its page
 * reached back to its start; one request at a time; pages that land after
 * `dispose()` are dropped (a feed can't be told to stop).
 */
export class ReplayStepLoader {
  private readonly pieces = new Map<number, OHLCBar[]>();
  /** Bars a page was asked for: not asked again until they are left behind. */
  private readonly asked = new Set<number>();
  private inFlight = false;
  private lastAsk = -Infinity;
  /** No more pages: the feed ran out, failed, can't page back, or the replay went. */
  private done = false;
  private readonly now: () => number;

  constructor(private readonly options: ReplayStepLoaderOptions) {
    this.now = options.now ?? (() => Date.now());
  }

  /** The finer bars of the bar opening at `time`, when they are in. */
  piecesOf(time: number): readonly OHLCBar[] | undefined {
    return this.pieces.get(time);
  }

  /** Have the finer bars of `coarse[from]` and the `ahead` bars after it on their way. */
  ensure(coarse: DataSeries, from: number, ahead: number): void {
    if (this.done || this.inFlight) return;
    if (!this.options.source) {
      this.finish('end', 0);
      return;
    }
    const until = Math.min(coarse.length, from + Math.max(1, ahead));
    let a = from;
    while (a < until && this.asked.has(coarse[a].time)) a++;
    if (a >= until) return;
    const now = this.now();
    if (now - this.lastAsk < MIN_REPLAY_ASK_GAP_MS) return;
    this.lastAsk = now;
    this.ask(coarse, a);
  }

  /** Forget the bars before `time`: the replay is past them (a seek back asks again). */
  evictBefore(time: number): void {
    for (const t of this.pieces.keys()) if (t < time) this.pieces.delete(t);
    for (const t of this.asked) if (t < time) this.asked.delete(t);
  }

  dispose(): void {
    this.done = true;
  }

  /** One page: the bars from `coarse[a]` that `REPLAY_PAGE_STEPS` finer ones cover, backward from the end of the last. */
  private ask(coarse: DataSeries, a: number): void {
    const { ratio, barMs, step, report } = this.options;
    const per = Math.max(1, Math.floor(REPLAY_PAGE_STEPS / ratio));
    const end = Math.min(coarse.length, a + per);
    const before = end < coarse.length ? coarse[end].time : coarse[coarse.length - 1].time + barMs;
    const bars = coarse.slice(a, end);
    for (const bar of bars) this.asked.add(bar.time);
    this.inFlight = true;
    report({ state: 'loading', step, count: 0 });
    this.options.source!(before, bars.length * ratio).then(
      (page) => this.take(bars, before, page),
      (err: unknown) => {
        if (this.done) return;
        this.inFlight = false;
        this.finish('error', 0, err instanceof Error ? err.message : String(err));
      },
    );
  }

  /** A page in: each of `bars` its finer bars, when the page reached back to its start. */
  private take(bars: OHLCBar[], before: number, page: DataSeries): void {
    if (this.done) return;
    this.inFlight = false;
    if (page.length === 0) {
      this.finish('end', 0);
      return;
    }
    const earliest = page.reduce((t, b) => Math.min(t, b.time), Infinity);
    const kept = this.options.keep([...page].sort((x, y) => x.time - y.time));
    let count = 0;
    let k = 0;
    bars.forEach((bar, i) => {
      const stop = i + 1 < bars.length ? bars[i + 1].time : before;
      while (k < kept.length && kept[k].time < bar.time) k++;
      const from = k;
      while (k < kept.length && kept[k].time < stop) k++;
      if (k > from && earliest <= bar.time) {
        this.pieces.set(bar.time, kept.slice(from, k));
        count += k - from;
      }
    });
    this.options.report({ state: 'loaded', step: this.options.step, count });
  }

  private finish(state: 'end' | 'error', count: number, error?: string): void {
    this.done = true;
    this.options.report({ state, step: this.options.step, count, ...(error !== undefined ? { error } : {}) });
  }
}
