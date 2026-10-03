import { describe, it, expect, vi } from 'vitest';
import { WatchlistStore, readWatchlists } from '../WatchlistStore.js';

function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe('WatchlistStore', () => {
  it('starts from one list of the symbols it is given', () => {
    const store = new WatchlistStore({ symbols: ['BTCUSDT', 'ETHUSDT', 'BTCUSDT'], defaultName: 'Watchlist' });
    expect(store.getLists()).toEqual([{ id: 'default', name: 'Watchlist', symbols: ['BTCUSDT', 'ETHUSDT'] }]);
    expect(store.getActive().id).toBe('default');
  });

  it('takes lists and the one to show', () => {
    const store = new WatchlistStore({
      lists: [{ id: 'a', name: 'Crypto', symbols: ['BTCUSDT'] }, { id: 'b', name: 'Stocks', symbols: ['AAPL'] }],
      activeList: 'b',
    });
    expect(store.getActive().name).toBe('Stocks');
  });

  it('adds, removes and moves symbols in the shown list, without repeats', () => {
    const store = new WatchlistStore({ symbols: ['A', 'B'] });
    expect(store.add('C')).toBe(true);
    expect(store.add('A')).toBe(false);
    store.move('C', 0);
    expect(store.getActive().symbols).toEqual(['C', 'A', 'B']);
    store.removeSymbol('A');
    expect(store.getActive().symbols).toEqual(['C', 'B']);
    store.move('C', 99);
    expect(store.getActive().symbols).toEqual(['B', 'C']);
  });

  it('creates, renames and deletes lists; never the last one', () => {
    const store = new WatchlistStore({ symbols: ['A'] });
    const fx = store.create('  FX  ');
    expect(fx.name).toBe('FX');
    expect(store.getActive().id).toBe(fx.id);
    expect(store.create('FX').id).not.toBe(fx.id);
    store.rename(fx.id, 'Forex');
    expect(store.getLists().find((l) => l.id === fx.id)?.name).toBe('Forex');
    store.remove(fx.id);
    expect(store.getActive().id).not.toBe(fx.id);
    const left = store.getLists();
    for (const list of left.slice(1)) store.remove(list.id);
    store.remove(left[0].id);
    expect(store.getLists()).toHaveLength(1);
  });

  it('ignores names and symbols it can’t use', () => {
    const store = new WatchlistStore({ symbols: ['A'] });
    expect(store.add('')).toBe(false);
    expect(store.add('x'.repeat(65))).toBe(false);
    const before = store.getLists();
    store.rename('default', '   ');
    store.create('');
    expect(store.getLists()).toEqual(before);
  });

  it('hands out copies, and tells its listeners about each change', () => {
    const store = new WatchlistStore({ symbols: ['A'] });
    const seen = vi.fn();
    store.subscribe(seen);
    store.getActive().symbols.push('Z');
    expect(store.getActive().symbols).toEqual(['A']);
    store.add('B');
    store.setActive('default');
    expect(seen).toHaveBeenCalledTimes(1); // the shown list didn't change
  });

  it('keeps its lists in storage when asked, and reads them back', () => {
    const storage = memory();
    const store = new WatchlistStore({ symbols: ['A'], storage, storageKey: 'k' });
    store.create('Two');
    store.add('B');
    const again = new WatchlistStore({ symbols: ['ignored'], storage, storageKey: 'k' });
    expect(again.getLists().map((l) => l.name)).toEqual(['Watchlist', 'Two']);
    expect(again.getActive().symbols).toEqual(['B']);
  });

  it('starts over from its options when storage holds junk', () => {
    const store = new WatchlistStore({ symbols: ['A'], storage: memory({ k: '{"lists": 5}' }), storageKey: 'k' });
    expect(store.getActive().symbols).toEqual(['A']);
  });
});

describe('readWatchlists', () => {
  it('keeps what it can use and drops the rest', () => {
    expect(readWatchlists({
      lists: [
        { id: 'a', name: 'One', symbols: ['A', 5, 'A', 'B'] },
        { id: 'a', name: 'Dup id', symbols: [] },
        { id: 'b', name: '', symbols: ['C'] },
        'junk',
      ],
      active: 'zzz',
    })).toEqual({ lists: [{ id: 'a', name: 'One', symbols: ['A', 'B'] }], active: 'a' });
    expect(readWatchlists({ lists: [] })).toBeNull();
    expect(readWatchlists(null)).toBeNull();
  });

  it('caps the number of lists and symbols', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `l${i}`, name: `L${i}`, symbols: Array.from({ length: 600 }, (_, j) => `S${j}`) }));
    const read = readWatchlists({ lists: many })!;
    expect(read.lists.length).toBe(50);
    expect(read.lists[0].symbols.length).toBe(500);
  });
});
