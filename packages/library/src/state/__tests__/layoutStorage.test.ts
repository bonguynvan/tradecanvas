// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { localStorageLayouts, memoryLayouts, type LayoutStorage, type SavedLayout } from '../layoutStorage.js';

const layout = (id: string, updatedAt: number, over: Partial<SavedLayout> = {}): SavedLayout => ({
  id, name: `Layout ${id}`, symbol: 'BTCUSDT', timeframe: '1h', updatedAt, content: `{"id":"${id}"}`, ...over,
});

function contract(make: () => LayoutStorage): void {
  it('saves, lists newest first and loads', async () => {
    const storage = make();
    await storage.save(layout('a', 1));
    await storage.save(layout('b', 2));
    expect((await storage.list()).map((l) => l.id)).toEqual(['b', 'a']);
    expect(await storage.load('a')).toEqual(layout('a', 1));
    expect(await storage.load('nope')).toBeNull();
  });

  it('replaces a layout saved again under its id', async () => {
    const storage = make();
    await storage.save(layout('a', 1));
    await storage.save(layout('a', 3, { name: 'Renamed', content: '{}' }));
    const list = await storage.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'a', name: 'Renamed', updatedAt: 3 });
    expect((await storage.load('a'))?.content).toBe('{}');
  });

  it('removes a layout', async () => {
    const storage = make();
    await storage.save(layout('a', 1));
    await storage.remove('a');
    expect(await storage.list()).toEqual([]);
    expect(await storage.load('a')).toBeNull();
  });

  it('lists summaries without the content', async () => {
    const storage = make();
    await storage.save(layout('a', 1));
    expect(Object.keys((await storage.list())[0]).sort()).toEqual(['id', 'name', 'symbol', 'timeframe', 'updatedAt']);
  });
}

describe('memoryLayouts', () => {
  contract(() => memoryLayouts());

  it('starts from the layouts given', async () => {
    const storage = memoryLayouts([layout('x', 5)]);
    expect(await storage.load('x')).toEqual(layout('x', 5));
  });
});

describe('localStorageLayouts', () => {
  beforeEach(() => localStorage.clear());

  contract(() => localStorageLayouts());

  it('keeps layouts apart by prefix', async () => {
    await localStorageLayouts('one:').save(layout('a', 1));
    expect(await localStorageLayouts('two:').list()).toEqual([]);
    expect(await localStorageLayouts('one:').list()).toHaveLength(1);
  });

  it('skips what it cannot read instead of failing', async () => {
    localStorage.setItem('tcw:layouts:index', JSON.stringify([
      { id: 'ok', name: 'Fine', updatedAt: 1 },
      { id: 7, name: 'Bad id', updatedAt: 1 },
      { id: 'no-name', updatedAt: 1 },
      'junk',
    ]));
    localStorage.setItem('tcw:layouts:item:ok', '{}');
    expect((await localStorageLayouts().list()).map((l) => l.id)).toEqual(['ok']);

    localStorage.setItem('tcw:layouts:index', '{not json');
    expect(await localStorageLayouts().list()).toEqual([]);
  });

  it('has nothing to load when the content is gone', async () => {
    const storage = localStorageLayouts();
    await storage.save(layout('a', 1));
    localStorage.removeItem('tcw:layouts:item:a');
    expect(await storage.load('a')).toBeNull();
  });
});
