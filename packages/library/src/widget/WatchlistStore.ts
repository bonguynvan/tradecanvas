import type { KeyValueStorage } from './DrawingTemplateStore.js';
import { MAX_SYMBOL_LENGTH, cleanSymbol } from './symbolCatalog.js';

/** One watchlist: a name and its symbols, in order. */
export interface WatchlistList {
  id: string;
  name: string;
  symbols: string[];
}

export interface WatchlistStoreOptions {
  /** Lists to start with; when none, one list of `symbols`. */
  lists?: WatchlistList[];
  /** The list shown first, by id. */
  activeList?: string;
  symbols?: string[];
  /** The first list's name when the store makes it. */
  defaultName?: string;
  /** Where the lists are kept between visits; none keeps them in memory only. */
  storage?: KeyValueStorage | null;
  storageKey?: string;
}

const MAX_LISTS = 50;
/** The most host list ids kept as offered: a host's lists, many times over. */
const MAX_OFFERED = 200;
const MAX_SYMBOLS = 500;
const MAX_NAME = 60;

const cleanName = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const name = v.trim().slice(0, MAX_NAME);
  return name || null;
};

function cleanSymbols(raw: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const v of raw) {
    const symbol = cleanSymbol(v);
    if (symbol && !out.includes(symbol)) out.push(symbol);
    if (out.length === MAX_SYMBOLS) break;
  }
  return out;
}

/**
 * Watchlists from untrusted input (storage, a host): lists need an id and a
 * name; repeated ids, symbols that aren't strings and repeats are dropped;
 * at most 50 lists of 500 symbols. The active id falls back to the first
 * list. Null when no list is left.
 */
export function readWatchlists(raw: unknown): { lists: WatchlistList[]; active: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { lists?: unknown; active?: unknown };
  if (!Array.isArray(r.lists)) return null;
  const lists: WatchlistList[] = [];
  for (const item of r.lists) {
    if (lists.length === MAX_LISTS) break;
    if (!item || typeof item !== 'object') continue;
    const l = item as Record<string, unknown>;
    const id = typeof l.id === 'string' && l.id && l.id.length <= MAX_SYMBOL_LENGTH ? l.id : null;
    const name = cleanName(l.name);
    if (!id || !name || lists.some((x) => x.id === id)) continue;
    lists.push({ id, name, symbols: Array.isArray(l.symbols) ? cleanSymbols(l.symbols) : [] });
  }
  if (lists.length === 0) return null;
  const active = typeof r.active === 'string' && lists.some((l) => l.id === r.active) ? r.active : lists[0].id;
  return { lists, active };
}

const copy = (list: WatchlistList): WatchlistList => ({ ...list, symbols: [...list.symbols] });

/** The lists as kept between visits, and the host's list ids the user has had (null: kept before that was noted). */
interface SavedWatchlists {
  lists: WatchlistList[];
  active: string;
  offered: string[] | null;
}

/** The host's list ids noted as had, from storage: the strings that can be list ids, or null when none were noted. */
function readOffered(value: unknown): string[] | null {
  const offered = (value as { offered?: unknown } | null)?.offered;
  if (!Array.isArray(offered)) return null;
  return offered.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= MAX_SYMBOL_LENGTH).slice(-MAX_OFFERED);
}

/**
 * The widget's watchlists: which one is shown, and their symbols. Every
 * change is kept in storage (when it has one) and told to its listeners;
 * readers get copies.
 */
export class WatchlistStore {
  private lists!: WatchlistList[];
  private active!: string;
  private readonly listeners = new Set<() => void>();
  private readonly storage: KeyValueStorage | null;
  private readonly storageKey: string;
  /**
   * The host's lists, by id, that the user has had: one they removed stays
   * removed, and one the host adds later is added to the lists they kept.
   */
  private offered: Set<string>;

  constructor(options: WatchlistStoreOptions) {
    this.storage = options.storage ?? null;
    this.storageKey = options.storageKey ?? 'tcw:watchlists';
    const saved = this.load();
    const given = options.lists ? readWatchlists({ lists: options.lists, active: options.activeList }) : null;
    const start = given ?? {
      lists: [{ id: 'default', name: cleanName(options.defaultName) ?? 'Watchlist', symbols: cleanSymbols(options.symbols ?? []) }],
      active: 'default',
    };
    this.offered = new Set(given?.lists.map((l) => l.id));
    if (!saved) {
      this.lists = start.lists;
      this.active = start.active;
      return;
    }
    const fresh = this.keepWithHostLists(saved, given?.lists ?? []);
    if (fresh) this.save();
  }

  /**
   * The lists kept, as the user left them, and after them the host's lists
   * the user has never had (lists kept before the store noted what it
   * offered count their own as had). True when it added any.
   */
  private keepWithHostLists(saved: SavedWatchlists, host: readonly WatchlistList[]): boolean {
    const had = new Set(saved.offered ?? saved.lists.map((l) => l.id));
    const fresh = host.filter((l) => !had.has(l.id) && !saved.lists.some((k) => k.id === l.id));
    this.lists = [...saved.lists, ...fresh].slice(0, MAX_LISTS);
    this.active = saved.active;
    this.offered = new Set([...had, ...host.map((l) => l.id)]);
    return fresh.length > 0;
  }

  getLists(): WatchlistList[] {
    return this.lists.map(copy);
  }

  getActive(): WatchlistList {
    return copy(this.activeList());
  }

  setActive(id: string): void {
    if (id === this.active || !this.lists.some((l) => l.id === id)) return;
    this.active = id;
    this.changed();
  }

  /** Replace every list (untrusted input is read as `readWatchlists` does). */
  replace(lists: WatchlistList[], active?: string): void {
    const read = readWatchlists({ lists, active: active ?? this.active });
    if (!read) return;
    this.lists = read.lists;
    this.active = read.active;
    this.changed();
  }

  /** A new list, shown at once; null for a name it can't use or one list too many. */
  create(name: string): WatchlistList | null {
    const clean = cleanName(name);
    if (!clean || this.lists.length >= MAX_LISTS) return null;
    let n = this.lists.length + 1;
    while (this.lists.some((l) => l.id === `list-${n}`)) n++;
    const list = { id: `list-${n}`, name: clean, symbols: [] };
    this.lists = [...this.lists, list];
    this.active = list.id;
    this.changed();
    return copy(list);
  }

  rename(id: string, name: string): void {
    const clean = cleanName(name);
    if (!clean) return;
    this.update(id, (list) => ({ ...list, name: clean }));
  }

  /** Delete a list; the last one stays. */
  remove(id: string): void {
    if (this.lists.length <= 1 || !this.lists.some((l) => l.id === id)) return;
    this.lists = this.lists.filter((l) => l.id !== id);
    if (this.active === id) this.active = this.lists[0].id;
    this.changed();
  }

  /** Add a symbol to the end of a list (the shown one by default); false when it's there or unusable. */
  add(symbol: string, id = this.active): boolean {
    const clean = cleanSymbol(symbol);
    const list = this.lists.find((l) => l.id === id);
    if (!clean || !list || list.symbols.includes(clean) || list.symbols.length >= MAX_SYMBOLS) return false;
    this.update(id, (l) => ({ ...l, symbols: [...l.symbols, clean] }));
    return true;
  }

  removeSymbol(symbol: string, id = this.active): void {
    const list = this.lists.find((l) => l.id === id);
    if (!list?.symbols.includes(symbol)) return;
    this.update(id, (l) => ({ ...l, symbols: l.symbols.filter((s) => s !== symbol) }));
  }

  /** Move a symbol to `index` in its list. */
  move(symbol: string, index: number, id = this.active): void {
    const list = this.lists.find((l) => l.id === id);
    if (!list) return;
    const from = list.symbols.indexOf(symbol);
    if (from < 0) return;
    const rest = list.symbols.filter((s) => s !== symbol);
    const to = Math.max(0, Math.min(Math.round(index), rest.length));
    if (to === from) return;
    this.update(id, (l) => ({ ...l, symbols: [...rest.slice(0, to), symbol, ...rest.slice(to)] }));
  }

  /** Called after every change; returns a function that stops it. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private activeList(): WatchlistList {
    return this.lists.find((l) => l.id === this.active) ?? this.lists[0];
  }

  private update(id: string, change: (list: WatchlistList) => WatchlistList): void {
    this.lists = this.lists.map((l) => (l.id === id ? change(l) : l));
    this.changed();
  }

  private changed(): void {
    this.save();
    for (const listener of this.listeners) listener();
  }

  private load(): SavedWatchlists | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      const read = readWatchlists(parsed);
      return read ? { ...read, offered: readOffered(parsed) } : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    if (!this.storage) return;
    try {
      const offered = [...this.offered].slice(-MAX_OFFERED);
      this.storage.setItem(this.storageKey, JSON.stringify({ lists: this.lists, active: this.active, offered }));
    } catch { /* storage full or unavailable: the lists stay in memory */ }
  }
}
