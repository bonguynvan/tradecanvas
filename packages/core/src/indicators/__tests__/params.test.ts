import { describe, it, expect } from 'vitest';
import { getNumberParam, getIntParam } from '../params.js';

const cfg = (params: Record<string, unknown>) => ({
  id: 't',
  instanceId: 't',
  params: params as Record<string, number | string | boolean>,
});

describe('getNumberParam', () => {
  it('returns the value when it is a finite number', () => {
    expect(getNumberParam(cfg({ p: 14 }), 'p', 99)).toBe(14);
    expect(getNumberParam(cfg({ p: -3.5 }), 'p', 99)).toBe(-3.5);
  });

  it('parses numeric strings', () => {
    expect(getNumberParam(cfg({ p: '21' }), 'p', 99)).toBe(21);
  });

  it('falls back when missing, NaN, Infinity, boolean, or non-numeric string', () => {
    expect(getNumberParam(cfg({}), 'p', 99)).toBe(99);
    expect(getNumberParam(cfg({ p: NaN }), 'p', 99)).toBe(99);
    expect(getNumberParam(cfg({ p: Infinity }), 'p', 99)).toBe(99);
    expect(getNumberParam(cfg({ p: true }), 'p', 99)).toBe(99);
    expect(getNumberParam(cfg({ p: 'abc' }), 'p', 99)).toBe(99);
  });
});

describe('getIntParam', () => {
  it('floors the value and clamps to min', () => {
    expect(getIntParam(cfg({ p: 14.9 }), 'p', 1, 1)).toBe(14);
    expect(getIntParam(cfg({ p: 0 }), 'p', 1, 2)).toBe(2);
    expect(getIntParam(cfg({ p: -5 }), 'p', 1, 1)).toBe(1);
  });
});
