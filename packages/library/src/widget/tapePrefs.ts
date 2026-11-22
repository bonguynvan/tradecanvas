import type { TapeSide } from './tapeRows.js';

/** Where a reader's choices on the tape are kept in the browser. */
export const TAPE_PREFS_KEY = 'tcw:tape';
/**
 * How many symbols' least sizes are remembered: past it, the one chosen
 * longest ago gives way (a symbol that is a whole number, `600519`, before
 * the others: an object lists such names first).
 */
export const TAPE_SYMBOLS_KEPT = 100;

/** What a reader chose on the tape, as it is kept in the browser. */
export interface TapePrefs {
  /** Which side's trades it lists. */
  side: TapeSide;
  /** Whether trades made together are one row. */
  group: boolean;
  /** The least size listed, by symbol (a size means one thing on one instrument and another on the next); 0 is none, chosen. The newest chosen last. */
  minSizes: Record<string, number>;
}

/** The choices kept in `storage`; null where none were kept, where there is no storage, or where it refuses. */
export function readTapePrefs(storage: Pick<Storage, 'getItem'> | null): TapePrefs | null {
  let kept: unknown;
  try {
    kept = JSON.parse(storage?.getItem(TAPE_PREFS_KEY) ?? 'null');
  } catch {
    return null; // refused, or not what was written: as with nothing kept
  }
  if (typeof kept !== 'object' || kept === null || Array.isArray(kept)) return null;
  const { side, group, minSizes } = kept as { side?: unknown; group?: unknown; minSizes?: unknown };
  const sizes: Record<string, number> = {};
  if (typeof minSizes === 'object' && minSizes !== null && !Array.isArray(minSizes)) {
    for (const [symbol, size] of Object.entries(minSizes)) {
      if (typeof size === 'number' && Number.isFinite(size) && size >= 0) sizes[symbol] = size;
    }
  }
  return { side: side === 'buy' || side === 'sell' ? side : 'all', group: group === true, minSizes: sizes };
}

/** Keep `prefs` in `storage`. A storage that is full or refuses keeps nothing: the choices last this visit. */
export function writeTapePrefs(storage: Pick<Storage, 'setItem'> | null, prefs: TapePrefs): void {
  try {
    storage?.setItem(TAPE_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* full or refused: the choices last this visit */ }
}

/** The least size a reader chose for `symbol`; undefined where they chose none for it. */
export function minSizeFor(prefs: TapePrefs | null, symbol: string): number | undefined {
  return prefs && Object.prototype.hasOwnProperty.call(prefs.minSizes, symbol) ? prefs.minSizes[symbol] : undefined;
}

/**
 * `prefs` with `size` as `symbol`'s least size, the newest chosen: 0 is kept
 * too, as a field the reader cleared. No more symbols than
 * `TAPE_SYMBOLS_KEPT` are remembered.
 */
export function withMinSize(prefs: TapePrefs, symbol: string, size: number): TapePrefs {
  if (!symbol || !Number.isFinite(size) || size < 0) return prefs;
  const others = Object.entries(prefs.minSizes).filter(([name]) => name !== symbol);
  const kept = [...others, [symbol, size] as [string, number]].slice(-TAPE_SYMBOLS_KEPT);
  return { ...prefs, minSizes: Object.fromEntries(kept) };
}
