import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingTemplateStore, type KeyValueStorage } from '../DrawingTemplateStore.js';

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('DrawingTemplateStore', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('starts empty', () => {
    const store = new DrawingTemplateStore('k', storage);
    expect(store.list()).toEqual([]);
  });

  it('saves and retrieves a template', () => {
    const store = new DrawingTemplateStore('k', storage);
    store.save('Red dashed', { color: '#f00', lineStyle: 'dashed', lineWidth: 2 });
    expect(store.list()).toHaveLength(1);
    expect(store.get('Red dashed')).toEqual({
      name: 'Red dashed',
      style: { color: '#f00', lineStyle: 'dashed', lineWidth: 2 },
    });
  });

  it('upserts by name instead of duplicating', () => {
    const store = new DrawingTemplateStore('k', storage);
    store.save('T', { color: '#f00' });
    store.save('T', { color: '#0f0' });
    expect(store.list()).toHaveLength(1);
    expect(store.get('T')?.style.color).toBe('#0f0');
  });

  it('ignores blank names and strips unknown style keys', () => {
    const store = new DrawingTemplateStore('k', storage);
    store.save('   ', { color: '#f00' });
    expect(store.list()).toHaveLength(0);
    store.save('T', { color: '#f00', bogus: 1 } as never);
    expect(store.get('T')?.style).toEqual({ color: '#f00' });
  });

  it('removes a template', () => {
    const store = new DrawingTemplateStore('k', storage);
    store.save('A', { color: '#f00' });
    store.save('B', { color: '#0f0' });
    store.remove('A');
    expect(store.list().map((t) => t.name)).toEqual(['B']);
  });

  it('persists across instances via storage', () => {
    const a = new DrawingTemplateStore('k', storage);
    a.save('Persisted', { lineWidth: 3 });
    const b = new DrawingTemplateStore('k', storage);
    expect(b.get('Persisted')?.style.lineWidth).toBe(3);
  });

  it('survives corrupt storage', () => {
    storage.setItem('k', '{not json');
    const store = new DrawingTemplateStore('k', storage);
    expect(store.list()).toEqual([]);
  });

  it('tolerates a null storage (SSR / blocked)', () => {
    const store = new DrawingTemplateStore('k', null);
    store.save('T', { color: '#f00' });
    expect(store.get('T')?.style.color).toBe('#f00'); // in-memory still works
  });
});
