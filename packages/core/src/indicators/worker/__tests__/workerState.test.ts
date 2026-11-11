import { describe, it, expect, vi } from 'vitest';
import { isWorkerStateful, packWorkerState, unpackWorkerState } from '../workerState.js';
import { workerPlugins } from '../workerHandler.js';
import { walkBars } from './workerFixtures.js';
import { TrueRangeIndicator } from '../../panel/TrueRange.js';
import { MomentumIndicator } from '../../panel/Momentum.js';

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

describe('what a plugin may keep for the worker to send', () => {
  it.each([
    ['a Map', new Map([[1, 2]])],
    ['a Set', new Set([1])],
    ['a typed array', new Float64Array(4)],
    ['an instance of a class', new (class Sums { total = 1; })()],
  ])('is refused when it holds %s, which would travel changed', (_name, value) => {
    expect(() => packWorkerState({ nested: [value] }, [])).toThrow(/plain/);
  });

  const BARS = walkBars(1500);
  const stateful = [...workerPlugins().values()].filter(isWorkerStateful);

  it('is kept by some built-ins', () => {
    expect(stateful.length).toBeGreaterThan(5);
  });

  it.each(stateful.map((p) => [p.descriptor.id, p] as const))('%s: its state travels intact', (id, plugin) => {
    const config = { id, instanceId: id, params: { ...plugin.descriptor.defaultConfig } as Record<string, number | string | boolean>, exchangeTimeZone: 'America/New_York' };
    const state = plugin.workerState(plugin.calculate(BARS, config));
    const transfer: ArrayBuffer[] = [];
    expect(unpackWorkerState(structuredClone(packWorkerState(state, transfer)))).toEqual(state);
  });
});

describe('the bar times a pointwise indicator keeps for an output from the worker', () => {
  it('are made once for every output of one computation, and each still ticks on them', () => {
    const bars = walkBars(300);
    const times = Float64Array.from(bars.map((b) => b.time));
    const from = vi.spyOn(Array, 'from');
    const plugins = [new TrueRangeIndicator(), new MomentumIndicator(), new MomentumIndicator()];
    const configs = plugins.map((p) => ({ id: p.descriptor.id, instanceId: p.descriptor.id, params: { ...p.descriptor.defaultConfig } as Record<string, number | string | boolean> }));
    const outputs = plugins.map((p, i) => p.calculate(bars, configs[i]));
    from.mockClear();
    plugins.forEach((p, i) => p.adoptWorkerState(outputs[i], undefined, times));
    expect(from.mock.calls.filter(([arg]) => arg === times)).toHaveLength(1);
    from.mockRestore();
    const ticked = bars.slice();
    const last = ticked[ticked.length - 1];
    ticked[ticked.length - 1] = { ...last, close: last.close * 1.02, high: last.high * 1.02 };
    plugins.forEach((p, i) => {
      const updated = p.update(ticked, configs[i], outputs[i], ticked.length - 1);
      expect(updated?.series?.at(-1)).toEqual(p.calculate(ticked, configs[i]).series?.at(-1));
    });
  });
});
