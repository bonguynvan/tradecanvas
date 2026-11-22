import { MAX_SYMBOL_LENGTH } from '@tradecanvas/commons';
import type { TapeSide } from './tapeRows.js';

/** Where a reader's choices on the tape are kept in the browser. */
export const TAPE_PREFS_KEY = 'tcw:tape';
/** How many symbols' least sizes are remembered: past it, the one chosen longest ago gives way. */
export const TAPE_SYMBOLS_KEPT = 100;

/** A least size and the symbol it was chosen on. */
type SymbolSize = readonly [symbol: string, size: number];

/**
 * What a reader chose on the tape, as it is kept in the browser: only what
 * they chose. A choice they never made is not here, and stays the host's to
 * start the tape with.
 */
export interface TapePrefs {
  /** Which side's trades it lists. */
  side?: TapeSide;
  /** Whether trades made together are one row. */
  group?: boolean;
  /**
   * The least size listed, by symbol (a size means one thing on one
   * instrument and another on the next), the newest chosen last; 0 is none,
   * chosen. A list, not an object: it keeps the order symbols were chosen
   * in whatever their names are, and no name is anything but a name.
   */
  minSizes: readonly SymbolSize[];
}

const isSymbolSize = (pair: unknown): pair is [string, number] =>
  Array.isArray(pair)
  && typeof pair[0] === 'string' && pair[0] !== '' && pair[0].length <= MAX_SYMBOL_LENGTH
  && typeof pair[1] === 'number' && Number.isFinite(pair[1]) && pair[1] >= 0;

/** The choices kept in `storage`: nothing chosen where none were kept, where there is no storage, or where it refuses. */
export function readTapePrefs(storage: Pick<Storage, 'getItem'> | null): TapePrefs {
  let kept: unknown;
  try {
    kept = JSON.parse(storage?.getItem(TAPE_PREFS_KEY) ?? 'null');
  } catch {
    kept = null; // refused, or not what was written: as with nothing kept
  }
  if (typeof kept !== 'object' || kept === null || Array.isArray(kept)) return { minSizes: [] };
  const { side, group, minSizes } = kept as { side?: unknown; group?: unknown; minSizes?: unknown };
  const sizes = Array.isArray(minSizes) ? minSizes.filter(isSymbolSize).map(([symbol, size]): SymbolSize => [symbol, size]) : [];
  return {
    ...(side === 'all' || side === 'buy' || side === 'sell' ? { side } : {}),
    ...(typeof group === 'boolean' ? { group } : {}),
    minSizes: sizes.slice(-TAPE_SYMBOLS_KEPT),
  };
}

/** Keep `prefs` in `storage`. A storage that is full or refuses keeps nothing: the choices last this visit. */
export function writeTapePrefs(storage: Pick<Storage, 'setItem'> | null, prefs: TapePrefs): void {
  try {
    storage?.setItem(TAPE_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* full or refused: the choices last this visit */ }
}

/** The least size a reader chose for `symbol`; undefined where they chose none for it. */
export function minSizeFor(prefs: TapePrefs, symbol: string): number | undefined {
  return prefs.minSizes.find(([name]) => name === symbol)?.[1];
}

/**
 * `prefs` with `size` as `symbol`'s least size, the newest chosen: 0 is kept
 * too, as a field the reader cleared. No more symbols than
 * `TAPE_SYMBOLS_KEPT` are remembered.
 */
export function withMinSize(prefs: TapePrefs, symbol: string, size: number): TapePrefs {
  if (!isSymbolSize([symbol, size])) return prefs;
  const others = prefs.minSizes.filter(([name]) => name !== symbol);
  return { ...prefs, minSizes: [...others, [symbol, size] as const].slice(-TAPE_SYMBOLS_KEPT) };
}
