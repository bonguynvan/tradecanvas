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

const prefs = (over: Partial<TapePrefs> = {}): TapePrefs => ({ side: 'all', group: false, minSizes: {}, ...over });

describe('what a reader chose on the tape, kept in the browser', () => {
  it('is read back as it was written', () => {
    const storage = memory();
    writeTapePrefs(storage, prefs({ side: 'sell', group: true, minSizes: { BTCUSDT: 0.5 } }));
    expect(readTapePrefs(storage)).toEqual({ side: 'sell', group: true, minSizes: { BTCUSDT: 0.5 } });
  });

  it('is none where nothing was kept, where there is no storage, and where what is kept is no choice at all', () => {
    expect(readTapePrefs(memory())).toBeNull();
    expect(readTapePrefs(null)).toBeNull();
    expect(readTapePrefs(memory({ [TAPE_PREFS_KEY]: 'not json' }))).toBeNull();
    expect(readTapePrefs(memory({ [TAPE_PREFS_KEY]: '[1,2]' }))).toBeNull();
  });

  it('takes of what is kept only what can be a choice: a side, a switch, sizes that are sizes', () => {
    const storage = memory({ [TAPE_PREFS_KEY]: JSON.stringify({ side: 'up', group: 'yes', minSizes: { A: 2, B: -1, C: 'x', D: 0, E: Number.MAX_VALUE * 2 } }) });
    expect(readTapePrefs(storage)).toEqual({ side: 'all', group: false, minSizes: { A: 2, D: 0 } });
    expect(readTapePrefs(memory({ [TAPE_PREFS_KEY]: JSON.stringify({ side: 'buy', minSizes: [1, 2] }) }))).toEqual({ side: 'buy', group: false, minSizes: {} });
  });

  it('says nothing and keeps nothing when the storage refuses', () => {
    const refusing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } } as unknown as Storage;
    expect(readTapePrefs(refusing)).toBeNull();
    expect(() => writeTapePrefs(refusing, prefs())).not.toThrow();
    expect(() => writeTapePrefs(null, prefs())).not.toThrow();
  });
});

describe('a least size, each symbol’s own', () => {
  it('is kept for its symbol without touching the choices it was added to', () => {
    const before = prefs({ minSizes: { BTCUSDT: 0.5 } });
    const after = withMinSize(before, 'ETHUSDT', 10);
    expect(after.minSizes).toEqual({ BTCUSDT: 0.5, ETHUSDT: 10 });
    expect(before.minSizes).toEqual({ BTCUSDT: 0.5 });
  });

  it('keeps none as a choice too: a reader who cleared the field has it stay clear', () => {
    const cleared = withMinSize(prefs({ minSizes: { BTCUSDT: 0.5 } }), 'BTCUSDT', 0);
    expect(cleared.minSizes).toEqual({ BTCUSDT: 0 });
    expect(minSizeFor(cleared, 'BTCUSDT')).toBe(0);
    expect(minSizeFor(cleared, 'ETHUSDT')).toBeUndefined();
    expect(minSizeFor(null, 'BTCUSDT')).toBeUndefined();
  });

  it('remembers so many symbols and no more: the one chosen longest ago gives way', () => {
    let kept = prefs();
    for (let i = 0; i < TAPE_SYMBOLS_KEPT; i++) kept = withMinSize(kept, `S${i}`, i + 1);
    // Chosen again, the first is the newest.
    kept = withMinSize(kept, 'S0', 99);
    kept = withMinSize(kept, 'NEW', 5);
    expect(Object.keys(kept.minSizes)).toHaveLength(TAPE_SYMBOLS_KEPT);
    expect(minSizeFor(kept, 'S1')).toBeUndefined();
    expect(minSizeFor(kept, 'S0')).toBe(99);
    expect(minSizeFor(kept, 'NEW')).toBe(5);
  });

  it('is not kept for no symbol, nor as what is no size', () => {
    expect(withMinSize(prefs(), '', 3).minSizes).toEqual({});
    expect(withMinSize(prefs(), 'A', Number.NaN).minSizes).toEqual({});
    expect(withMinSize(prefs(), 'A', -2).minSizes).toEqual({});
  });
});
