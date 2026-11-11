import { describe, it, expect } from 'vitest';
import { packWorkerState, unpackWorkerState } from '../workerState.js';

describe('a plugin state on its way from the worker', () => {
  it('sends long arrays of numbers as buffers, and gives them back as arrays', () => {
    const gain = Array.from({ length: 2000 }, (_, i) => i * 0.5);
    const fast: (number | undefined)[] = Array.from({ length: 2000 }, (_, i) => (i < 9 ? undefined : i));
    const transfer: ArrayBuffer[] = [];
    const packed = packWorkerState({ gain, nested: { fast }, sums: [{ index: 3, volume: 2 }] }, transfer);
    // gain's values, fast's values and the mask of fast's missing ones
    expect(transfer).toHaveLength(3);
    const back = unpackWorkerState(structuredClone(packed)) as { gain: number[]; nested: { fast: (number | undefined)[] }; sums: unknown[] };
    expect(back.gain).toEqual(gain);
    expect(Array.isArray(back.nested.fast)).toBe(true);
    expect(back.nested.fast).toEqual(fast);
    expect(back.sums).toEqual([{ index: 3, volume: 2 }]);
  });

  it('leaves short arrays and anything else as they are', () => {
    const transfer: ArrayBuffer[] = [];
    const state = { short: [1, 2, 3], label: 'x', none: undefined };
    expect(unpackWorkerState(packWorkerState(state, transfer))).toEqual(state);
    expect(transfer).toHaveLength(0);
  });
});
