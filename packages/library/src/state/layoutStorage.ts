/** A saved layout as a list shows it. */
export interface SavedLayoutSummary {
  id: string;
  name: string;
  /** The symbol it opens on. */
  symbol?: string;
  /** The interval it opens on. */
  timeframe?: string;
  /** When it was last saved, in ms since the epoch. */
  updatedAt: number;
  /** What saved it: `'chart'` (a widget, the default) or `'grid'` (a grid of charts). */
  kind?: string;
}

/** A saved layout: its summary and what it holds, as the widget wrote it (JSON). */
export interface SavedLayout extends SavedLayoutSummary {
  content: string;
}

type MaybePromise<T> = T | Promise<T>;

/**
 * Where named layouts live. The widget ships one for `localStorage` and one in
 * memory; a host keeps layouts on its server by implementing these four calls
 * (each may return a promise).
 */
export interface LayoutStorage {
  /** Every layout, newest first. */
  list(): MaybePromise<SavedLayoutSummary[]>;
  /** One layout, or `null` when there is no such layout. */
  load(id: string): MaybePromise<SavedLayout | null>;
  /** Save a layout, replacing one with the same id. */
  save(layout: SavedLayout): MaybePromise<void>;
  remove(id: string): MaybePromise<void>;
}

function summary(layout: SavedLayoutSummary): SavedLayoutSummary {
  const out: SavedLayoutSummary = { id: layout.id, name: layout.name, updatedAt: layout.updatedAt };
  if (layout.symbol !== undefined) out.symbol = layout.symbol;
  if (layout.timeframe !== undefined) out.timeframe = layout.timeframe;
  if (layout.kind !== undefined) out.kind = layout.kind;
  return out;
}

const newestFirst = (a: SavedLayoutSummary, b: SavedLayoutSummary): number => b.updatedAt - a.updatedAt;

/** A summary read back from storage (or a host's server), or null when it is not one. */
export function readLayoutSummary(value: unknown): SavedLayoutSummary | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id || typeof v.name !== 'string' || typeof v.updatedAt !== 'number' || !Number.isFinite(v.updatedAt)) return null;
  return summary({
    id: v.id,
    name: v.name,
    updatedAt: v.updatedAt,
    symbol: typeof v.symbol === 'string' ? v.symbol : undefined,
    timeframe: typeof v.timeframe === 'string' ? v.timeframe : undefined,
    kind: typeof v.kind === 'string' ? v.kind : undefined,
  });
}

/** A whole layout read back from storage, or null when it is not one. */
export function readSavedLayout(value: unknown): SavedLayout | null {
  const found = readLayoutSummary(value);
  const content = found ? (value as Record<string, unknown>).content : undefined;
  return found && typeof content === 'string' ? { ...found, content } : null;
}

/** Layouts kept in memory: for tests, or a page that does not keep them. */
export function memoryLayouts(initial: readonly SavedLayout[] = []): LayoutStorage {
  const layouts = new Map(initial.map((l) => [l.id, { ...l }]));
  return {
    list: () => [...layouts.values()].map(summary).sort(newestFirst),
    load: (id) => {
      const found = layouts.get(id);
      return found ? { ...found } : null;
    },
    save: (layout) => {
      layouts.set(layout.id, { ...layout });
    },
    remove: (id) => {
      layouts.delete(id);
    },
  };
}

/**
 * Layouts in the browser's `localStorage`: an index of summaries under
 * `<prefix>index` and each layout's content under `<prefix>item:<id>`.
 * Entries it cannot read are skipped.
 */
export function localStorageLayouts(prefix = 'tcw:layouts:'): LayoutStorage {
  const indexKey = `${prefix}index`;
  const itemKey = (id: string) => `${prefix}item:${id}`;

  const readIndex = (): SavedLayoutSummary[] => {
    let raw: unknown;
    try {
      raw = JSON.parse(localStorage.getItem(indexKey) ?? '[]');
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    return raw.map(readLayoutSummary).filter((s): s is SavedLayoutSummary => s !== null);
  };
  const writeIndex = (index: readonly SavedLayoutSummary[]) => localStorage.setItem(indexKey, JSON.stringify(index));

  return {
    list: () => readIndex().sort(newestFirst),
    load: (id) => {
      const found = readIndex().find((s) => s.id === id);
      const content = found ? localStorage.getItem(itemKey(id)) : null;
      return found && content !== null ? { ...found, content } : null;
    },
    save: (layout) => {
      // The content first: an index entry never points at nothing.
      localStorage.setItem(itemKey(layout.id), layout.content);
      writeIndex([...readIndex().filter((s) => s.id !== layout.id), summary(layout)]);
    },
    remove: (id) => {
      writeIndex(readIndex().filter((s) => s.id !== id));
      localStorage.removeItem(itemKey(id));
    },
  };
}
