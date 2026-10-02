import { describe, it, expect } from 'vitest';
import type { DrawingOptionDefs } from '@tradecanvas/commons';
import { drawingOption, resolveDrawingOptions, sanitizeDrawingOptions } from '@tradecanvas/commons';

const DEFS: DrawingOptionDefs = {
  extendRight: { kind: 'boolean', label: 'Extend right', default: false },
  deviation: { kind: 'number', label: 'Deviation', default: 2, min: 0.5, max: 5 },
  labels: {
    kind: 'choice',
    label: 'Labels',
    default: 'left',
    choices: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }],
  },
  levels: {
    kind: 'levels',
    label: 'Levels',
    default: [{ value: 0.5, visible: true }, { value: 1.618, visible: false, color: '#f00' }],
  },
  note: { kind: 'text', label: 'Note', default: '' },
};

describe('sanitizeDrawingOptions', () => {
  it('keeps valid values and drops unknown keys and wrong types', () => {
    expect(sanitizeDrawingOptions(DEFS, {
      extendRight: true,
      deviation: 'wide',
      labels: 'top',
      bogus: 1,
      note: 'hello',
    })).toEqual({ extendRight: true, note: 'hello' });
  });

  it('clamps numbers to their range', () => {
    expect(sanitizeDrawingOptions(DEFS, { deviation: 9 })).toEqual({ deviation: 5 });
    expect(sanitizeDrawingOptions(DEFS, { deviation: 0 })).toEqual({ deviation: 0.5 });
    expect(sanitizeDrawingOptions(DEFS, { deviation: Number.NaN })).toEqual({});
  });

  it('keeps well-formed levels and drops the rest', () => {
    const levels = [
      { value: 0.382, visible: true, color: '#0f0' },
      { value: 'x', visible: true },
      { value: 0.618, visible: 'yes' },
      { value: 2.618 },
    ];
    expect(sanitizeDrawingOptions(DEFS, { levels })).toEqual({
      levels: [{ value: 0.382, visible: true, color: '#0f0' }, { value: 2.618, visible: true }],
    });
  });

  it('caps the number of levels and the length of text', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ value: i, visible: true }));
    const out = sanitizeDrawingOptions(DEFS, { levels: many, note: 'x'.repeat(5000) });
    expect((out.levels as unknown[]).length).toBe(48);
    expect((out.note as string).length).toBe(2000);
  });

  it('returns nothing for a tool without options', () => {
    expect(sanitizeDrawingOptions(undefined, { extendRight: true })).toEqual({});
  });
});

describe('drawingOption and resolveDrawingOptions', () => {
  it('reads a value or falls back to the default', () => {
    expect(drawingOption(DEFS, { extendRight: true }, 'extendRight')).toBe(true);
    expect(drawingOption(DEFS, undefined, 'deviation')).toBe(2);
    expect(drawingOption(DEFS, { deviation: 'x' } as never, 'deviation')).toBe(2);
  });

  it('gives every option, defaults filled in, without sharing the default arrays', () => {
    const resolved = resolveDrawingOptions(DEFS, { labels: 'right' });
    expect(resolved).toEqual({
      extendRight: false,
      deviation: 2,
      labels: 'right',
      levels: [{ value: 0.5, visible: true }, { value: 1.618, visible: false, color: '#f00' }],
      note: '',
    });
    (resolved.levels as { value: number }[])[0].value = 9;
    expect(DEFS.levels.default[0].value).toBe(0.5);
  });
});
