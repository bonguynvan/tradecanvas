import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { SeriesStore, barPlacement, type LiveChange } from '../SeriesStore.js';

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

describe('SeriesStore.replace', () => {
  const series = () => [bar(1), bar(2), bar(3), bar(4), bar(5)];

  it('replaces a loaded bar by its time, anywhere in the series', () => {
    const store = new SeriesStore(() => null);
    store.load(series());
    const array = store.bars();
    expect(store.replace(bar(3, 12))).toEqual({ to: 'shown', index: 2, changed: true });
    expect(store.bars().map((b) => [b.time, b.close])).toEqual([[1, 10], [2, 10], [3, 12], [4, 10], [5, 10]]);
    // In place: the same array, as a tick changes it.
    expect(store.bars()).toBe(array);
  });

  it('refuses a time not loaded: between bars, before the first, after the last', () => {
    const store = new SeriesStore(() => null);
    store.load(series());
    for (const time of [2.5, 0, 6]) expect(store.replace(bar(time))).toEqual({ to: 'none', index: -1, changed: false });
    expect(store.replace({ ...bar(3), high: 1, low: 2 })).toEqual({ to: 'none', index: -1, changed: false });
    expect(times(store.bars())).toEqual([1, 2, 3, 4, 5]);
    expect(new SeriesStore(() => null).replace(bar(1)).to).toBe('none');
  });

  it('corrects a hidden bar in the whole series only; it shows with the hours', () => {
    const { store, show } = evenHours();
    store.load(series());
    expect(times(store.bars())).toEqual([2, 4]);
    expect(store.replace(bar(3, 13))).toEqual({ to: 'hidden', index: -1, changed: true });
    expect(store.bars().map((b) => b.close)).toEqual([10, 10]);
    expect(store.replace(bar(4, 14))).toEqual({ to: 'shown', index: 1, changed: true });
    show(true);
    store.refilter();
    expect(store.bars().map((b) => [b.time, b.close])).toEqual([[1, 10], [2, 10], [3, 13], [4, 14], [5, 10]]);
  });

  it('corrects the live series kept aside during a replay, not the bars shown', () => {
    const store = new SeriesStore(() => null);
    store.load(series());
    store.beginReplay();
    store.showReplayed(series().slice(0, 4));
    expect(store.replace(bar(3, 13))).toEqual({ to: 'aside', index: -1, changed: true });
    expect(store.replace(bar(3, 13))).toEqual({ to: 'aside', index: -1, changed: false });
    expect(store.replace(bar(9))).toEqual({ to: 'none', index: -1, changed: false });
    expect(store.bars().map((b) => b.close)).toEqual([10, 10, 10, 10]);
    expect(store.endReplay()?.map((b) => b.close)).toEqual([10, 10, 13, 10, 10]);
  });

  it('tells an unchanged bar apart, and counts the bars shown it wrote', () => {
    const store = new SeriesStore(() => null);
    store.load(series());
    const revision = store.revision();
    expect(store.replace(bar(3))).toEqual({ to: 'shown', index: 2, changed: false });
    expect(store.revision()).toBe(revision);
    store.replace(bar(3, 11));
    expect(store.revision()).toBe(revision + 1);
  });

  it('counts no hidden bar or replay write as a change of the bars shown', () => {
    const { store } = evenHours();
    store.load(series());
    const revision = store.revision();
    store.replace(bar(3, 13));
    store.beginReplay();
    store.replace(bar(4, 14));
    expect(store.revision()).toBe(revision);
  });

  it('leaves out a time whose bar the chart could not take', () => {
    const { store } = evenHours();
    const broken = { ...bar(4), close: Number.NaN };
    store.load([bar(1), bar(2), bar(3), broken, bar(5), bar(6)]);
    expect(times(store.bars())).toEqual([2, 6]);
    expect(store.replace(bar(4, 14))).toEqual({ to: 'none', index: -1, changed: false });
  });

  it('takes a bar in milliseconds onto a series in seconds', () => {
    const store = new SeriesStore(() => null);
    store.load([bar(1_700_000_000), bar(1_700_000_060)]);
    expect(store.replace(bar(1_700_000_000_000, 12))).toEqual({ to: 'shown', index: 0, changed: true });
    expect(store.bars()[0]).toMatchObject({ time: 1_700_000_000, close: 12 });
  });
});

describe('barPlacement', () => {
  it('reads each time by its own size, a stream in milliseconds on a series in seconds', () => {
    expect(barPlacement([bar(1_700_000_000)], bar(1_700_000_000_000))).toBe('update');
    expect(barPlacement([bar(1_700_000_000)], bar(1_700_000_060_000))).toBe('append');
    expect(barPlacement([], bar(5))).toBe('append');
  });
});

describe('SeriesStore during a replay', () => {
  const replaying = () => {
    const changes: LiveChange[] = [];
    const store = new SeriesStore(() => null, (change) => changes.push(change));
    store.load([bar(10), bar(20), bar(30), bar(40)]);
    store.beginReplay();
    store.showReplayed([bar(10), bar(20)]);
    return { store, changes };
  };

  it('tells every change to the live series that is not at its end', () => {
    const { store, changes } = replaying();
    store.load([bar(10), bar(20), bar(30), bar(40), bar(50)]);
    expect(store.prepend([bar(5)])).toEqual({ added: 0, taken: 1 });
    store.mergeSnapshot([bar(30, 12), bar(40), bar(50), bar(60)]);
    store.refilter();
    store.replace(bar(20, 11));
    expect(changes).toEqual([{ kind: 'series' }, { kind: 'older', taken: 1 }, { kind: 'series' }, { kind: 'hours' }, { kind: 'bar', time: 20 }]);
    // None of them touched the bars replayed.
    expect(times(store.bars())).toEqual([10, 20]);
  });

  it('says nothing of bars at the end, nor of a correction that changes nothing', () => {
    const { store, changes } = replaying();
    store.append(bar(50));
    store.updateLast(bar(50, 11));
    store.placeStreamBar(bar(60));
    store.replace(bar(20));
    expect(changes).toEqual([]);
  });

  it('merges a reconnect into the live series, keeping the older bars', () => {
    const { store } = replaying();
    store.prepend([bar(1), bar(5)]);
    store.mergeSnapshot([bar(30, 12), bar(40)]);
    expect(times(store.endReplay()!)).toEqual([1, 5, 10, 20, 30, 40]);
  });
});
