import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LayoutSession, cleanLayoutName, type LayoutSessionHost } from '../LayoutSession.js';
import { memoryLayouts, type LayoutStorage, type SavedLayout } from '../layoutStorage.js';

let storage: LayoutStorage;
let content: string;
let applied: SavedLayout[];
let session: LayoutSession;
let changes: number;
let clock: number;
let ids: number;

const host: LayoutSessionHost = {
  capture: () => ({ content, symbol: 'BTCUSDT', timeframe: '1h' }),
  apply: (layout) => {
    applied.push(layout);
    content = layout.content;
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  storage = memoryLayouts();
  content = '{"v":1}';
  applied = [];
  changes = 0;
  clock = 1000;
  ids = 0;
  session = new LayoutSession(storage, host, {
    debounceMs: 100,
    onChange: () => changes++,
    now: () => clock,
    newId: () => `id${++ids}`,
  });
});

afterEach(() => {
  session.destroy();
  vi.useRealTimers();
});

describe('cleanLayoutName', () => {
  it('trims, folds spaces and caps the length; nothing left is no name', () => {
    expect(cleanLayoutName('  My   layout ')).toBe('My layout');
    expect(cleanLayoutName('x'.repeat(200))).toHaveLength(80);
    expect(cleanLayoutName('   ')).toBeNull();
  });
});

describe('LayoutSession', () => {
  it('saves under a new name and makes it the current layout', async () => {
    const saved = await session.saveAs('  Swing ');
    expect(saved).toEqual({ id: 'id1', name: 'Swing', symbol: 'BTCUSDT', timeframe: '1h', updatedAt: 1000, kind: 'chart' });
    expect(session.current()).toEqual(saved);
    expect(await storage.load('id1')).toMatchObject({ content: '{"v":1}' });
    expect(changes).toBeGreaterThan(0);
  });

  it('will not save without a name', async () => {
    await expect(session.saveAs('  ')).rejects.toThrow(/name/);
  });

  it('saves the current layout again, or says there is none', async () => {
    expect(await session.save()).toBeNull();
    await session.saveAs('A');
    content = '{"v":2}';
    clock = 2000;
    expect(await session.save()).toMatchObject({ id: 'id1', updatedAt: 2000 });
    expect((await storage.load('id1'))?.content).toBe('{"v":2}');
  });

  it('auto-saves the current layout once things settle, only when it changed', async () => {
    await session.saveAs('A');
    const save = vi.spyOn(storage, 'save');
    session.changed();
    await vi.advanceTimersByTimeAsync(150);
    expect(save).not.toHaveBeenCalled(); // nothing differs from what was saved

    content = '{"v":2}';
    session.changed();
    session.changed();
    expect(session.isDirty()).toBe(false); // not until it settles
    await vi.advanceTimersByTimeAsync(150);
    expect(save).toHaveBeenCalledTimes(1);
    expect(session.isDirty()).toBe(false);
  });

  it('with auto-save off, marks the layout changed instead', async () => {
    await session.saveAs('A');
    session.setAutoSave(false);
    const save = vi.spyOn(storage, 'save');
    content = '{"v":2}';
    session.changed();
    await vi.advanceTimersByTimeAsync(150);
    expect(save).not.toHaveBeenCalled();
    expect(session.isDirty()).toBe(true);
    await session.save();
    expect(session.isDirty()).toBe(false);
  });

  it('opens a layout and treats what it shows as saved', async () => {
    await storage.save({ id: 'x', name: 'X', updatedAt: 5, content: '{"x":1}' });
    expect(await session.open('x')).toBe(true);
    expect(applied.map((l) => l.id)).toEqual(['x']);
    expect(session.current()?.name).toBe('X');
    expect(session.isDirty()).toBe(false);
    expect(await session.open('missing')).toBe(false);
    expect(session.current()?.id).toBe('x');
  });

  it('ignores changes made while a layout is being opened', async () => {
    await storage.save({ id: 'x', name: 'X', updatedAt: 5, content: '{"x":1}' });
    const save = vi.spyOn(storage, 'save');
    const slowHost: LayoutSessionHost = {
      capture: host.capture,
      apply: async (layout) => {
        content = layout.content;
        slow.changed();
        await Promise.resolve();
        content = '{"x":1,"ids":"new"}'; // ids differ once restored
      },
    };
    const slow = new LayoutSession(storage, slowHost, { debounceMs: 100 });
    await slow.open('x');
    slow.changed();
    await vi.advanceTimersByTimeAsync(150);
    expect(save).not.toHaveBeenCalled();
    slow.destroy();
  });

  it('renames and removes; removing the current layout leaves none', async () => {
    await session.saveAs('A');
    await session.rename('id1', ' B ');
    expect(session.current()?.name).toBe('B');
    expect((await storage.load('id1'))?.name).toBe('B');
    await session.remove('id1');
    expect(session.current()).toBeNull();
    expect(await session.list()).toEqual([]);
  });

  it('lists newest first', async () => {
    await session.saveAs('Old');
    clock = 5000;
    await session.saveAs('New');
    expect((await session.list()).map((l) => l.name)).toEqual(['New', 'Old']);
  });

  it('reports a failed auto-save instead of throwing', async () => {
    const errors: unknown[] = [];
    let full = false;
    const inner = memoryLayouts();
    const failing: LayoutStorage = {
      ...inner,
      save: (layout) => {
        if (full) throw new Error('full');
        return inner.save(layout);
      },
    };
    const s = new LayoutSession(failing, host, { debounceMs: 10, onError: (e) => errors.push(e) });
    await s.saveAs('A');
    full = true;
    await expect(s.saveAs('B')).rejects.toThrow('full');
    content = '{"v":9}';
    s.changed();
    await vi.advanceTimersByTimeAsync(20);
    expect(errors).toEqual([new Error('full')]);
    // A failed write does not hold up the next one.
    full = false;
    expect(await s.save()).toMatchObject({ name: 'A' });
    s.destroy();
  });

  it('saves a change still waiting when it stops, then nothing more', async () => {
    const saved = await session.saveAs('A');
    content = '{"v":3}';
    session.changed();
    session.destroy();
    await vi.advanceTimersByTimeAsync(150);
    expect((await storage.load(saved.id))?.content).toBe('{"v":3}');
    const save = vi.spyOn(storage, 'save');
    content = '{"v":4}';
    session.changed();
    await vi.advanceTimersByTimeAsync(150);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves into the layout open when its turn comes, not one opened after', async () => {
    let release!: () => void;
    const slow: LayoutStorage = {
      ...storage,
      save: async (layout) => {
        await new Promise<void>((r) => { release = r; });
        return storage.save(layout);
      },
    };
    await storage.save({ id: 'x', name: 'X', updatedAt: 1, content: '{"x":1}', kind: 'chart' });
    await storage.save({ id: 'y', name: 'Y', updatedAt: 2, content: '{"y":1}', kind: 'chart' });
    const s = new LayoutSession(slow, host, { debounceMs: 10 });
    expect(await s.open('x')).toBe(true);
    content = '{"x":2}';
    const saving = s.save();
    const opening = s.open('y');
    await vi.advanceTimersByTimeAsync(0);
    release();
    await saving;
    await opening;
    expect(s.current()?.id).toBe('y');
    expect((await storage.load('x'))?.content).toBe('{"x":2}');
    expect((await storage.load('y'))?.content).toBe('{"y":1}');
    s.destroy();
  });

  it('forgets the current layout when one fails to open', async () => {
    await storage.save({ id: 'bad', name: 'Bad', updatedAt: 1, content: '{}' });
    const failing = new LayoutSession(storage, { capture: host.capture, apply: () => { throw new Error('not a layout'); } });
    await failing.saveAs('A');
    await expect(failing.open('bad')).rejects.toThrow('not a layout');
    expect(failing.current()).toBeNull();
    failing.destroy();
  });

  it('marks the layout changed when an auto-save fails', async () => {
    let full = false;
    const inner = memoryLayouts();
    const flaky: LayoutStorage = { ...inner, save: (l) => { if (full) throw new Error('full'); return inner.save(l); } };
    const s = new LayoutSession(flaky, host, { debounceMs: 10, onError: () => {} });
    await s.saveAs('A');
    full = true;
    content = '{"v":5}';
    s.changed();
    await vi.advanceTimersByTimeAsync(20);
    expect(s.isDirty()).toBe(true);
    s.destroy();
  });

  it('lists and opens only its own kind, and skips what is not a layout', async () => {
    const shared: LayoutStorage = {
      list: () => [
        { id: 'c', name: 'Chart', updatedAt: 3 },
        { id: 'g', name: 'Grid', updatedAt: 2, kind: 'grid' },
        { id: 7, name: 'junk' } as never,
      ],
      load: (id) => (id === 'g' ? { id: 'g', name: 'Grid', updatedAt: 2, kind: 'grid', content: '{}' } : { id: 'other', name: 'x', updatedAt: 1, content: '{}' }),
      save: () => {},
      remove: () => {},
    };
    const charts = new LayoutSession(shared, host);
    const grids = new LayoutSession(shared, host, { kind: 'grid' });
    expect((await charts.list()).map((l) => l.id)).toEqual(['c']);
    expect((await grids.list()).map((l) => l.id)).toEqual(['g']);
    expect(await charts.open('g')).toBe(false); // a grid's layout
    expect(await charts.open('c')).toBe(false); // storage answered with another id
    charts.destroy();
    grids.destroy();
  });
});
