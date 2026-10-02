import type { HistoryLoadPayload, OHLCBar } from '@tradecanvas/commons';

export type { HistoryLoadPayload };

/**
 * Loads up to `limit` bars older than `before` (the oldest loaded bar's time,
 * in the bars' own unit), oldest first. An empty result means the history
 * starts here.
 */
export type HistoryLoader = (before: number, limit: number) => Promise<OHLCBar[]>;

/** How long to wait after a failed page before asking again. */
export const HISTORY_RETRY_MS = 5_000;

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
 * the next series.
 */
export class HistoryPager {
  private loader: HistoryLoader | null = null;
  private pageSize = DEFAULT_HISTORY_PAGE_SIZE;
  private loading = false;
  private exhausted = false;
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
    void this.loadMore();
  }

  /** Load one page now. Resolves to the number of bars added. */
  async loadMore(): Promise<number> {
    const loader = this.loader;
    const before = this.host.oldestTime();
    if (!loader || !this.canLoad() || before === null) return 0;

    const seq = this.seq;
    this.loading = true;
    this.host.emit({ state: 'loading', count: 0 });
    try {
      const page = await loader(before, this.pageSize);
      if (seq !== this.seq) return 0;
      this.loading = false;
      const added = this.host.prepend(page);
      if (added === 0) {
        this.exhausted = true;
        this.host.emit({ state: 'end', count: 0 });
      } else {
        this.host.emit({ state: 'loaded', count: added });
      }
      return added;
    } catch (err: unknown) {
      if (seq !== this.seq) return 0;
      this.loading = false;
      this.retryAt = this.now() + HISTORY_RETRY_MS;
      this.host.emit({ state: 'error', count: 0, error: err instanceof Error ? err.message : String(err) });
      return 0;
    }
  }

  private canLoad(): boolean {
    return this.loader !== null && !this.loading && !this.exhausted && this.now() >= this.retryAt;
  }

  private now(): number {
    return this.host.now ? this.host.now() : Date.now();
  }
}
