import { describe, it, expect } from 'vitest';
import type { IndicatorValue } from '@tradecanvas/commons';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { toCloneableOutput } from '../worker/messages.js';

const v = (value: number): IndicatorValue => ({ value });

/** Apply the same operation script to a plain Map and an IndicatorValueMap. */
function both(script: (m: Map<number, IndicatorValue>) => void): [Map<number, IndicatorValue>, IndicatorValueMap] {
  const plain = new Map<number, IndicatorValue>();
  const fast = new IndicatorValueMap();
  script(plain);
  script(fast);
  return [plain, fast];
}

function expectSameMap(plain: Map<number, IndicatorValue>, fast: IndicatorValueMap): void {
  expect(fast.size).toBe(plain.size);
  expect([...fast]).toEqual([...plain]);
  expect([...fast.keys()]).toEqual([...plain.keys()]);
  expect([...fast.values()]).toEqual([...plain.values()]);
}

describe('IndicatorValueMap', () => {
  it('is a Map', () => {
    expect(new IndicatorValueMap()).toBeInstanceOf(Map);
  });

  it('answers get/has/size for ascending writes without folding', () => {
    const m = new IndicatorValueMap();
    for (let i = 0; i < 100; i++) m.set(1000 + i * 60, v(i));
    expect(m.size).toBe(100);
    expect(m.get(1000)).toEqual(v(0));
    expect(m.get(1000 + 99 * 60)).toEqual(v(99));
    expect(m.get(1000 + 30)).toBeUndefined();
    expect(m.has(1000 + 50 * 60)).toBe(true);
    expect(m.has(999)).toBe(false);
  });

  it('overwrites an existing key in place, keeping its insertion position', () => {
    const [plain, fast] = both((m) => {
      m.set(1, v(1)).set(2, v(2)).set(3, v(3));
      m.set(2, v(20));
      m.set(3, v(30));
    });
    expectSameMap(plain, fast);
    expect(fast.get(2)).toEqual(v(20));
  });

  it('matches Map semantics when a write breaks ascending order', () => {
    const [plain, fast] = both((m) => {
      m.set(10, v(10)).set(20, v(20)).set(30, v(30));
      m.set(15, v(15)); // older than the newest key → appended at the end
      m.set(40, v(40));
      m.set(5, v(5));
    });
    expectSameMap(plain, fast);
    expect(fast.get(15)).toEqual(v(15));
  });

  it('deletes from the tail and the middle', () => {
    const [plain, fast] = both((m) => {
      for (let i = 0; i < 6; i++) m.set(i, v(i));
      m.delete(5);
      m.delete(2);
      m.delete(42);
      m.set(9, v(9));
    });
    expectSameMap(plain, fast);
    expect(fast.delete(42)).toBe(false);
    expect(fast.delete(9)).toBe(true);
    expect(fast.has(9)).toBe(false);
  });

  it('keeps working after iteration folds it into the Map', () => {
    const [plain, fast] = both((m) => {
      m.set(1, v(1)).set(2, v(2));
      [...m.entries()];
      m.set(3, v(3));
      m.set(0, v(0));
      m.delete(2);
    });
    expectSameMap(plain, fast);
    let count = 0;
    fast.forEach((val, key, map) => {
      expect(map.get(key)).toBe(val);
      count++;
    });
    expect(count).toBe(3);
  });

  it('clear() resets to an empty fast map', () => {
    const m = new IndicatorValueMap();
    m.set(3, v(3)).set(1, v(1));
    m.clear();
    expect(m.size).toBe(0);
    m.set(5, v(5)).set(6, v(6));
    expect([...m]).toEqual([[5, v(5)], [6, v(6)]]);
  });

  it('survives a copy into a plain Map', () => {
    const m = new IndicatorValueMap();
    m.set(1, v(1)).set(2, v(2));
    expect(new Map(m)).toEqual(new Map([[1, v(1)], [2, v(2)]]));
  });
});

describe('toCloneableOutput (worker → main thread)', () => {
  it('posts values intact even though structuredClone skips IndicatorValueMap entries', () => {
    const values = new IndicatorValueMap();
    values.set(1, v(1)).set(2, v(2));
    const output = { values, series: [v(1), v(2)] };

    // The pitfall this guards against: the raw map clones empty.
    expect(structuredClone(output).values.size).toBe(0);

    const cloned = structuredClone(toCloneableOutput(output));
    expect(cloned.values).toEqual(new Map([[1, v(1)], [2, v(2)]]));
    expect(cloned.series).toEqual(output.series);
  });

  it('passes plain-Map outputs through untouched', () => {
    const output = { values: new Map([[1, v(1)]]) };
    expect(toCloneableOutput(output)).toBe(output);
  });
});
