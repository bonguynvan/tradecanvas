import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { SeriesStore, barPlacement } from '../SeriesStore.js';

const bar = (time: number, close = 10): OHLCBar => ({ time, open: 10, high: Math.max(10, close), low: Math.min(10, close), close, volume: 1 });
const times = (bars: readonly OHLCBar[]) => bars.map((b) => b.time);

/** Hours shown: even times only, once there are two bars to tell the interval by. */
const evenHours = () => {
  let hidden = true;
  const store = new SeriesStore((bars) => (hidden && bars.length >= 2 ? (time: number) => time % 2 === 0 : null));
  return { store, show: (shown: boolean) => { hidden = !shown; } };
};

describe('SeriesStore', () => {
  it('shows the bars in the hours shown, and keeps the whole series beside them', () => {
    const { store } = evenHours();
    store.load([bar(1), bar(2), bar(3), bar(4)]);
    expect(times(store.bars())).toEqual([2, 4]);
    expect(times(store.liveBars())).toEqual([1, 2, 3, 4]);
  });

  it('takes a bar outside the hours shown into the whole series only', () => {
    const { store } = evenHours();
    store.load([bar(2), bar(4)]);
    expect(store.append(bar(5))).toEqual({ to: 'hidden', before: 2, refiltered: false });
    expect(store.append(bar(6))).toEqual({ to: 'shown', before: 2, refiltered: false });
    expect(times(store.bars())).toEqual([2, 4, 6]);
    expect(times(store.liveBars())).toEqual([2, 4, 5, 6]);
  });

  it('shows the hidden bars again when the hours are shown', () => {
    const { store, show } = evenHours();
    store.load([bar(1), bar(2), bar(3)]);
    store.append(bar(5));
    show(true);
    expect(store.refilter()).toBe(true);
    expect(times(store.bars())).toEqual([1, 2, 3, 5]);
    expect(times(store.liveBars())).toEqual([1, 2, 3, 5]);
  });

  it('places a stream bar by its time, and leaves an older one out', () => {
    const store = new SeriesStore(() => null);
    store.load([bar(1), bar(2)]);
    expect(store.placeStreamBar(bar(2, 12)).to).toBe('shown');
    expect(store.placeStreamBar(bar(3)).to).toBe('shown');
    expect(store.placeStreamBar(bar(1, 99)).to).toBe('none');
    expect(store.bars().map((b) => [b.time, b.close])).toEqual([[1, 10], [2, 12], [3, 10]]);
  });

  it('adds older bars in front, counting the ones it shows and the ones it took', () => {
    const { store } = evenHours();
    store.load([bar(10), bar(11), bar(12)]);
    expect(store.prepend([bar(7), bar(8), bar(9), bar(12)])).toEqual({ added: 1, taken: 3 });
    expect(times(store.bars())).toEqual([8, 10, 12]);
    expect(times(store.liveBars())).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it('merges a reconnect snapshot over the bars held, or asks for a new load', () => {
    const store = new SeriesStore(() => null);
    store.load([bar(1), bar(2), bar(3)]);
    expect(store.mergeSnapshot([bar(2, 20), bar(3), bar(4)])).toBe(true);
    expect(store.bars().map((b) => [b.time, b.close])).toEqual([[1, 10], [2, 20], [3, 10], [4, 10]]);
    expect(store.mergeSnapshot([bar(9)])).toBe(false);
  });

  it('keeps the live series aside during a replay, the bars shown being the replay’s', () => {
    const store = new SeriesStore(() => null);
    store.load([bar(1), bar(2), bar(3)]);
    store.beginReplay();
    store.showReplayed([bar(1)]);
    expect(store.append(bar(4)).to).toBe('aside');
    expect(store.placeStreamBar(bar(5)).to).toBe('aside');
    expect(store.placeStreamBar(bar(5, 15)).to).toBe('aside');
    expect(store.placeStreamBar(bar(2)).to).toBe('none');
    expect(store.mergeTick({ price: 16, time: 5 }).to).toBe('aside');
    expect(times(store.bars())).toEqual([1]);
    const live = store.endReplay();
    expect(live?.map((b) => [b.time, b.close])).toEqual([[1, 10], [2, 10], [3, 10], [4, 10], [5, 16]]);
    expect(store.append(bar(6)).to).toBe('shown');
  });

  it('starts a whole series when a bar first tells the interval, filtering the bars shown', () => {
    const { store } = evenHours();
    store.load([bar(3)]); // one bar: no interval to tell the hours by
    expect(times(store.bars())).toEqual([3]);
    expect(store.append(bar(4))).toEqual({ to: 'shown', before: 0, refiltered: true });
    expect(times(store.bars())).toEqual([4]);
    expect(times(store.liveBars())).toEqual([3, 4]);
  });
});

describe('barPlacement', () => {
  it('reads each time by its own size, a stream in milliseconds on a series in seconds', () => {
    expect(barPlacement([bar(1_700_000_000)], bar(1_700_000_000_000))).toBe('update');
    expect(barPlacement([bar(1_700_000_000)], bar(1_700_000_060_000))).toBe('append');
    expect(barPlacement([], bar(5))).toBe('append');
  });
});
