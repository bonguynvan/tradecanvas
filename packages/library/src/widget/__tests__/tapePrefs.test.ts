import { describe, it, expect } from 'vitest';
import { TAPE_PREFS_KEY, TAPE_SYMBOLS_KEPT, minSizeFor, readTapePrefs, withMinSize, writeTapePrefs, type TapePrefs } from '../tapePrefs.js';

/** A storage that keeps what it is given, as a browser's does. */
function memory(start: Record<string, string> = {}): Storage & { kept: Record<string, string> } {
  const kept = { ...start };
  return {
    kept,
    getItem: (key: string) => kept[key] ?? null,
    setItem: (key: string, value: string) => { kept[key] = value; },
  } as unknown as Storage & { kept: Record<string, string> };
}

const prefs = (over: Partial<TapePrefs> = {}): TapePrefs => ({ minSizes: [], ...over });
const holding = (kept: unknown) => memory({ [TAPE_PREFS_KEY]: JSON.stringify(kept) });

describe('what a reader chose on the tape, kept in the browser', () => {
  it('is read back as it was written', () => {
    const storage = memory();
    writeTapePrefs(storage, prefs({ side: 'sell', group: true, minSizes: [['BTCUSDT', 0.5]] }));
    expect(readTapePrefs(storage)).toEqual({ side: 'sell', group: true, minSizes: [['BTCUSDT', 0.5]] });
  });

  it('holds only what was chosen: a reader who chose a side has chosen no grouping', () => {
    const storage = memory();
    writeTapePrefs(storage, prefs({ side: 'all' }));
    const kept = readTapePrefs(storage);
    expect(kept).toEqual({ side: 'all', minSizes: [] });
    expect('group' in kept).toBe(false);
  });

  it('is nothing chosen where nothing was kept, where there is no storage, and where what is kept is no choice at all', () => {
    for (const storage of [memory(), null, memory({ [TAPE_PREFS_KEY]: 'not json' }), holding([1, 2]), holding('text'), holding(null)]) {
      expect(readTapePrefs(storage)).toEqual({ minSizes: [] });
    }
  });

  it('takes of what is kept only what can be a choice: a side, a switch, sizes that are sizes', () => {
    const sizes = [['A', 2], ['B', -1], ['C', 'x'], ['D', 0], ['E'], 'F', [7, 7], ['', 3], ['G', 1, 'more']];
    expect(readTapePrefs(holding({ side: 'up', group: 'yes', minSizes: sizes }))).toEqual({ minSizes: [['A', 2], ['D', 0], ['G', 1]] });
    expect(readTapePrefs(holding({ side: 'buy', group: false, minSizes: { A: 2 } }))).toEqual({ side: 'buy', group: false, minSizes: [] });
  });

  it('reads no more symbols than it keeps, and none with a name longer than a symbol’s', () => {
    const many = Array.from({ length: TAPE_SYMBOLS_KEPT + 50 }, (_, i) => [`S${i}`, 1]);
    const kept = readTapePrefs(holding({ minSizes: [...many, ['x'.repeat(5000), 1]] }));
    expect(kept.minSizes).toHaveLength(TAPE_SYMBOLS_KEPT);
    expect(kept.minSizes.at(-1)).toEqual([`S${TAPE_SYMBOLS_KEPT + 49}`, 1]);
  });

  it('keeps a symbol by its name whatever the name is: one that an object would take for its own part is a symbol too', () => {
    const storage = memory();
    writeTapePrefs(storage, withMinSize(withMinSize(prefs(), '__proto__', 3), 'constructor', 4));
    const kept = readTapePrefs(storage);
    expect(minSizeFor(kept, '__proto__')).toBe(3);
    expect(minSizeFor(kept, 'constructor')).toBe(4);
    expect(minSizeFor(kept, 'toString')).toBeUndefined();
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it('says nothing and keeps nothing when the storage refuses', () => {
    const refusing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } } as unknown as Storage;
    expect(readTapePrefs(refusing)).toEqual({ minSizes: [] });
    expect(() => writeTapePrefs(refusing, prefs())).not.toThrow();
    expect(() => writeTapePrefs(null, prefs())).not.toThrow();
  });
});

describe('a least size, each symbol’s own', () => {
  it('is kept for its symbol without touching the choices it was added to', () => {
    const before = prefs({ side: 'buy', minSizes: [['BTCUSDT', 0.5]] });
    const after = withMinSize(before, 'ETHUSDT', 10);
    expect(after).toEqual({ side: 'buy', minSizes: [['BTCUSDT', 0.5], ['ETHUSDT', 10]] });
    expect(before.minSizes).toEqual([['BTCUSDT', 0.5]]);
  });

  it('keeps none as a choice too: a reader who cleared the field has it stay clear', () => {
    const cleared = withMinSize(prefs({ minSizes: [['BTCUSDT', 0.5]] }), 'BTCUSDT', 0);
    expect(cleared.minSizes).toEqual([['BTCUSDT', 0]]);
    expect(minSizeFor(cleared, 'BTCUSDT')).toBe(0);
    expect(minSizeFor(cleared, 'ETHUSDT')).toBeUndefined();
  });

  it('remembers so many symbols and no more: the one chosen longest ago gives way, whatever its name', () => {
    let kept = prefs();
    // Names that are whole numbers, as many exchanges' are: they are kept in the order they were chosen in.
    for (let i = 0; i < TAPE_SYMBOLS_KEPT; i++) kept = withMinSize(kept, String(600000 - i), i + 1);
    // Chosen again, the first is the newest.
    kept = withMinSize(kept, '600000', 99);
    kept = withMinSize(kept, '5', 5);
    expect(kept.minSizes).toHaveLength(TAPE_SYMBOLS_KEPT);
    expect(minSizeFor(kept, '599999')).toBeUndefined();
    expect(minSizeFor(kept, '600000')).toBe(99);
    expect(minSizeFor(kept, '5')).toBe(5);
    const storage = memory();
    writeTapePrefs(storage, kept);
    expect(readTapePrefs(storage).minSizes.at(-1)).toEqual(['5', 5]);
  });

  it('is not kept for no symbol, nor as what is no size', () => {
    expect(withMinSize(prefs(), '', 3).minSizes).toEqual([]);
    expect(withMinSize(prefs(), 'A', Number.NaN).minSizes).toEqual([]);
    expect(withMinSize(prefs(), 'A', -2).minSizes).toEqual([]);
  });
});
