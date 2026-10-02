import type { HistoryLoadPayload, OHLCBar } from '@tradecanvas/commons';

export type { HistoryLoadPayload };

/**
 * Loads up to `limit` bars older than `before` (the oldest loaded bar's time,
 * in the bars' own unit), oldest first. An empty result means the history
 * starts here.
 */
export type HistoryLoader = (before: number, limit: number) => Promise<OHLCBar[]>;

/** How long to wait after a failed page before the view asks again; doubles with each failure. */
export const HISTORY_RETRY_MS = 5_000;

/** Longest wait between automatic retries. */
export const HISTORY_RETRY_MAX_MS = 60_000;

/** Failures in a row after which only an explicit `loadMore` tries again. */
export const HISTORY_MAX_AUTO_FAILURES = 5;

export const DEFAULT_HISTORY_PAGE_SIZE = 500;

export interface HistoryPagerHost {
  /** Time of the oldest loaded bar, or null without data. */
  oldestTime(): number | null;
  /** Put a page in front of the data; returns how many bars it added. */
  prepend(bars: OHLCBar[]): number;
  emit(payload: HistoryLoadPayload): void;
  now?(): number;
}

/**
 * Pages older bars in as the view nears the start of the loaded data. One
 * request at a time; a page that arrives after the series changed (`reset`)
 * or the loader was replaced is dropped. An empty page ends the paging until
 * the next series. After a failure the view waits before asking again,
 * longer each time, and gives up asking after a few failures in a row.
 */
export class HistoryPager {
  private loader: HistoryLoader | null = null;
  private pageSize = DEFAULT_HISTORY_PAGE_SIZE;
  private loading = false;
  private exhausted = false;
  private failures = 0;
  private retryAt = 0;
  /** Bumped whenever an in-flight page must be dropped. */
  private seq = 0;

  constructor(private readonly host: HistoryPagerHost) {}

  setLoader(loader: HistoryLoader | null, pageSize = DEFAULT_HISTORY_PAGE_SIZE): void {
    this.loader = loader;
    this.pageSize = Math.max(1, Math.floor(pageSize));
    this.reset();
  }

  hasLoader(): boolean {
    return this.loader !== null;
  }

  /** A new series: drop any page in flight and allow paging again. */
  reset(): void {
    this.seq++;
    this.loading = false;
    this.exhausted = false;
    this.failures = 0;
    this.retryAt = 0;
  }

  isLoading(): boolean {
    return this.loading;
  }

  /** False once a page came back empty. */
  hasMore(): boolean {
    return !this.exhausted;
  }

  /** Load a page when fewer than `ahead` bars are left of the first visible one. */
  maybeLoad(firstVisible: number, ahead: number): void {
    if (firstVisible >= ahead || !this.canLoad()) return;
    if (this.failures >= HISTORY_MAX_AUTO_FAILURES || this.now() < this.retryAt) return;
    void this.loadMore();
  }

  /** Load one page now, whatever the wait after a failure. Resolves to the number of bars added. */
  async loadMore(): Promise<number> {
    const loader = this.loader;
    const before = this.host.oldestTime();
    if (!loader || !this.canLoad() || before === null) return 0;

    const seq = this.seq;
    this.loading = true;
    this.emit({ state: 'loading', count: 0 });
    let page: OHLCBar[];
    try {
      page = await loader(before, this.pageSize);
    } catch (err: unknown) {
      if (seq !== this.seq) return 0;
      this.loading = false;
      this.failures++;
      this.retryAt = this.now() + Math.min(HISTORY_RETRY_MAX_MS, HISTORY_RETRY_MS * 2 ** (this.failures - 1));
      this.emit({ state: 'error', count: 0, error: err instanceof Error ? err.message : String(err) });
      return 0;
    }
    if (seq !== this.seq) return 0;
    this.loading = false;
    this.failures = 0;
    this.retryAt = 0;
    const added = this.host.prepend(page);
    if (added === 0) {
      this.exhausted = true;
      this.emit({ state: 'end', count: 0 });
    } else {
      this.emit({ state: 'loaded', count: added });
    }
    return added;
  }

  private canLoad(): boolean {
    return this.loader !== null && !this.loading && !this.exhausted;
  }

  /** A listener that throws must not stall the paging: report it and go on. */
  private emit(payload: HistoryLoadPayload): void {
    try {
      this.host.emit(payload);
    } catch (err: unknown) {
      console.error('[TradeCanvas] A historyLoad listener threw:', err);
    }
  }

  private now(): number {
    return this.host.now ? this.host.now() : Date.now();
  }
}
