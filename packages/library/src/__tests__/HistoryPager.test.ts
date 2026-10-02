import { describe, it, expect, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { HistoryPager, HISTORY_RETRY_MS, type HistoryLoadPayload } from '../HistoryPager.js';

const bars = (from: number, n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: from + i, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

function setup(oldest: number | null = 100) {
  const events: HistoryLoadPayload[] = [];
  let data = oldest === null ? [] : bars(oldest, 50);
  let now = 0;
  const pager = new HistoryPager({
    oldestTime: () => (data.length ? data[0].time : null),
    prepend: (page) => {
      const older = page.filter((b) => b.time < (data[0]?.time ?? Infinity));
      data = [...older, ...data];
      return older.length;
    },
    emit: (e) => events.push(e),
    now: () => now,
  });
  return { pager, events, data: () => data, advance: (ms: number) => { now += ms; } };
}

/** A promise with its resolve/reject handles. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('HistoryPager', () => {
  it('asks for a page before the oldest bar once the view gets close to it', async () => {
    const { pager, events, data } = setup();
    const loader = vi.fn(async (before: number, limit: number) => bars(before - limit, limit));
    pager.setLoader(loader, 30);

    pager.maybeLoad(40, 20); // 40 bars still to the left: not yet
    expect(loader).not.toHaveBeenCalled();

    pager.maybeLoad(10, 20);
    await vi.waitFor(() => expect(events.at(-1)?.state).toBe('loaded'));
    expect(loader).toHaveBeenCalledWith(100, 30);
    expect(data()[0].time).toBe(70);
    expect(events).toEqual([
      { state: 'loading', count: 0 },
      { state: 'loaded', count: 30 },
    ]);
  });

  it('runs one request at a time', async () => {
    const { pager } = setup();
    const page = deferred<OHLCBar[]>();
    const loader = vi.fn(() => page.promise);
    pager.setLoader(loader);
    pager.maybeLoad(0, 20);
    pager.maybeLoad(0, 20);
    void pager.loadMore();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(pager.isLoading()).toBe(true);
    page.resolve(bars(0, 10));
    await vi.waitFor(() => expect(pager.isLoading()).toBe(false));
  });

  it('stops at the start of the history until the series changes', async () => {
    const { pager, events } = setup();
    const loader = vi.fn(async () => [] as OHLCBar[]);
    pager.setLoader(loader);
    expect(await pager.loadMore()).toBe(0);
    expect(events.at(-1)).toEqual({ state: 'end', count: 0 });
    expect(pager.hasMore()).toBe(false);

    await pager.loadMore();
    expect(loader).toHaveBeenCalledTimes(1);

    pager.reset();
    expect(pager.hasMore()).toBe(true);
    await pager.loadMore();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('drops a page that arrives after the series changed', async () => {
    const { pager, data, events } = setup();
    const page = deferred<OHLCBar[]>();
    pager.setLoader(() => page.promise);
    const pending = pager.loadMore();
    pager.reset();
    page.resolve(bars(0, 10));
    expect(await pending).toBe(0);
    expect(data()[0].time).toBe(100);
    expect(events.map((e) => e.state)).toEqual(['loading']);
    expect(pager.isLoading()).toBe(false);
  });

  it('waits before the view retries after a failed request', async () => {
    const { pager, events, advance } = setup();
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValue(bars(0, 5));
    pager.setLoader(loader);
    expect(await pager.loadMore()).toBe(0);
    expect(events.at(-1)).toEqual({ state: 'error', count: 0, error: 'rate limited' });

    pager.maybeLoad(0, 20);
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);

    advance(HISTORY_RETRY_MS);
    pager.maybeLoad(0, 20);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  it('does nothing without a loader or without data', async () => {
    const empty = setup(null);
    const loader = vi.fn(async () => bars(0, 5));
    empty.pager.setLoader(loader);
    expect(await empty.pager.loadMore()).toBe(0);
    expect(loader).not.toHaveBeenCalled();

    const none = setup();
    expect(await none.pager.loadMore()).toBe(0);
    expect(none.events).toEqual([]);
  });

  it('drops an old loader’s page when the loader is replaced', async () => {
    const { pager, data } = setup();
    const page = deferred<OHLCBar[]>();
    pager.setLoader(() => page.promise);
    const pending = pager.loadMore();
    pager.setLoader(null);
    page.resolve(bars(0, 10));
    expect(await pending).toBe(0);
    expect(data()).toHaveLength(50);
  });
});

describe('HistoryPager after failures', () => {
  it('waits longer after each failure and stops trying on its own after five', async () => {
    const { pager, advance } = setup();
    const loader = vi.fn().mockRejectedValue(new Error('429'));
    pager.setLoader(loader);
    for (let i = 0; i < 5; i++) {
      await pager.loadMore(); // a request the user made
      advance(HISTORY_RETRY_MS * 2 ** i);
    }
    expect(loader).toHaveBeenCalledTimes(5);
    pager.maybeLoad(0, 20); // the view alone no longer retries
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(5);
    await pager.loadMore(); // a request the user made still does
    expect(loader).toHaveBeenCalledTimes(6);
  });

  it('backs off after a failure when the view asks again', async () => {
    const { pager, advance } = setup();
    const loader = vi.fn().mockRejectedValueOnce(new Error('429')).mockRejectedValueOnce(new Error('429')).mockResolvedValue([]);
    pager.setLoader(loader);
    pager.maybeLoad(0, 20);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    advance(HISTORY_RETRY_MS);
    pager.maybeLoad(0, 20);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    advance(HISTORY_RETRY_MS); // not yet: the second wait is twice as long
    pager.maybeLoad(0, 20);
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(2);
    advance(HISTORY_RETRY_MS);
    pager.maybeLoad(0, 20);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(3));
  });

  it('keeps paging when a listener throws, and reports the error', async () => {
    let first = bars(100, 50);
    const pager = new HistoryPager({
      oldestTime: () => first[0].time,
      prepend: (page) => { first = [...page, ...first]; return page.length; },
      emit: () => { throw new Error('listener bug'); },
    });
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    pager.setLoader(async (before, limit) => bars(before - limit, limit), 10);
    expect(await pager.loadMore()).toBe(10);
    expect(pager.isLoading()).toBe(false);
    expect(await pager.loadMore()).toBe(10);
    expect(report).toHaveBeenCalled();
    report.mockRestore();
  });
});
