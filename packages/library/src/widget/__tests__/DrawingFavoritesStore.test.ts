import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingFavoritesStore } from '../DrawingFavoritesStore.js';
import type { KeyValueStorage } from '../DrawingTemplateStore.js';

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('DrawingFavoritesStore', () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it('starts empty and adds without duplicates', () => {
    const s = new DrawingFavoritesStore('k', storage);
    expect(s.list()).toEqual([]);
    s.add('trendLine');
    s.add('trendLine');
    s.add('ray');
    expect(s.list()).toEqual(['trendLine', 'ray']);
  });

  it('toggles pinned state and reports it', () => {
    const s = new DrawingFavoritesStore('k', storage);
    expect(s.toggle('rectangle')).toBe(true);
    expect(s.has('rectangle')).toBe(true);
    expect(s.toggle('rectangle')).toBe(false);
    expect(s.has('rectangle')).toBe(false);
  });

  it('removes a tool', () => {
    const s = new DrawingFavoritesStore('k', storage);
    s.add('a'); s.add('b');
    s.remove('a');
    expect(s.list()).toEqual(['b']);
  });

  it('seeds defaults only when empty', () => {
    const s = new DrawingFavoritesStore('k', storage);
    s.seedDefaults(['trendLine', 'ray', 'ray']);
    expect(s.list()).toEqual(['trendLine', 'ray']);
    s.seedDefaults(['fibRetracement']); // ignored — already seeded
    expect(s.list()).toEqual(['trendLine', 'ray']);
  });

  it('persists across instances', () => {
    const a = new DrawingFavoritesStore('k', storage);
    a.add('measure');
    const b = new DrawingFavoritesStore('k', storage);
    expect(b.has('measure')).toBe(true);
  });

  it('survives corrupt storage', () => {
    storage.setItem('k', 'nope');
    const s = new DrawingFavoritesStore('k', storage);
    expect(s.list()).toEqual([]);
  });
});
