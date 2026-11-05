import { describe, it, expect } from 'vitest';
import type { IndicatorDescriptor } from '@tradecanvas/commons';
import { describeInputs } from '../inputs.js';

const descriptor = (defaultConfig: Record<string, unknown>, inputs?: IndicatorDescriptor['inputs']): IndicatorDescriptor => ({
  id: 'x', name: 'X', placement: 'panel', defaultConfig, inputs,
});

describe('describeInputs', () => {
  it('lists the inputs in the order of the defaults, each with its kind read from the default', () => {
    const inputs = describeInputs(descriptor({ period: 14, mult: 2.5, on: true, color: '#ff0000', label: 'hi' }));
    expect(inputs.map((i) => [i.name, i.kind, i.default])).toEqual([
      // Not rounded unless declared 'int': a plugin's whole default may still take fractions.
      ['period', 'number', 14],
      ['mult', 'number', 2.5],
      ['on', 'boolean', true],
      ['color', 'color', '#ff0000'],
      ['label', 'text', 'hi'],
    ]);
  });

  it('steps a whole number by 1 and another number by 0.1, unless the spec says', () => {
    const inputs = describeInputs(descriptor({ period: 14, mult: 2.5, step: 0.02 }, { step: { kind: 'number', step: 0.01, min: 0 } }));
    expect(inputs.map((i) => i.step)).toEqual([1, 0.1, 0.01]);
    expect(inputs[2]).toMatchObject({ kind: 'number', min: 0 });
  });

  it('reads a source and a choice from the spec, before the default', () => {
    const inputs = describeInputs(descriptor({ source: 'close', type: 'sma' }, { source: { source: true }, type: { options: ['sma', 'ema'] } }));
    expect(inputs.map((i) => i.kind)).toEqual(['source', 'choice']);
    expect(inputs[1].options).toEqual(['sma', 'ema']);
  });

  it('takes a declared kind over the default, and keeps the label and limits', () => {
    const [input] = describeInputs(descriptor({ period: 20 }, { period: { kind: 'int', label: 'Length', min: 2, max: 500 } }));
    expect(input).toEqual({ name: 'period', kind: 'int', default: 20, label: 'Length', min: 2, max: 500, step: 1 });
  });

  it('leaves out a spec with no default, as the settings dialog does', () => {
    expect(describeInputs(descriptor({ period: 5 }, { other: { min: 1 } })).map((i) => i.name)).toEqual(['period']);
  });

  it('reads a declared int whose default is not whole as an int still', () => {
    expect(describeInputs(descriptor({ n: 1.5 }, { n: { kind: 'int' } }))[0].step).toBe(1);
  });
});
