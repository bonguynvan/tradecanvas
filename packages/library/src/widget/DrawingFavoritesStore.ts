import type { KeyValueStorage } from './DrawingTemplateStore.js';

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * An ordered, de-duplicated set of pinned drawing-tool ids, persisted to a
 * key-value store. Order is insertion order (most-recently-pinned last).
 */
export class DrawingFavoritesStore {
  private favorites: string[] = [];

  constructor(
    private storageKey = 'tcw:draw-favorites',
    private storage: KeyValueStorage | null = defaultStorage(),
  ) {
    this.load();
  }

  list(): string[] {
    return [...this.favorites];
  }

  has(tool: string): boolean {
    return this.favorites.includes(tool);
  }

  add(tool: string): void {
    if (!tool || this.favorites.includes(tool)) return;
    this.favorites = [...this.favorites, tool];
    this.persist();
  }

  remove(tool: string): void {
    if (!this.favorites.includes(tool)) return;
    this.favorites = this.favorites.filter((t) => t !== tool);
    this.persist();
  }

  /** Toggle a tool's pinned state. Returns the new state (true = pinned). */
  toggle(tool: string): boolean {
    if (this.has(tool)) {
      this.remove(tool);
      return false;
    }
    this.add(tool);
    return true;
  }

  /** Seed the favorites only when none are stored yet (first run). */
  seedDefaults(tools: string[]): void {
    if (this.favorites.length > 0) return;
    this.favorites = [...new Set(tools.filter(Boolean))];
    this.persist();
  }

  private load(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.favorites = [...new Set(parsed.filter((t) => typeof t === 'string'))];
      }
    } catch {
      // Corrupt or unavailable — start empty.
    }
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.favorites));
    } catch {
      // Storage full or blocked — keep the in-memory copy.
    }
  }
}
