import { describe, it, expect } from 'vitest';
import type { IndicatorParamValues, OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { describeInputs, type IndicatorInputInfo } from '../inputs.js';

/**
 * Every built-in's inputs, checked against what its code does with them. The
 * settings dialog, the docs and the MCP catalog read the declared kind and
 * limits, so a number must say what it is, and the limits it offers must be
 * values the code takes as they are, not ones it quietly changes.
 */

/** Numbers that may go below zero, or whose lower end is the code's to judge: no `min` required. */
const NO_MIN: Record<string, readonly string[]> = {
  lsma: ['offset'],
  avwap: ['anchorTime'],
};

/**
 * Limits a run on these bars cannot tell from the next value (the output is
 * the same at both), though the code takes them as they are.
 */
const SAME_AT_LIMIT: Record<string, Record<string, readonly ('min' | 'max')[]>> = {
  // Longer than the bars: no value at either length.
  alma: { period: ['max'] },
  lsma: { period: ['max'] },
  hamming: { period: ['max'] },
  // A shift of 500 bars either way leaves none of 400 on the chart.
  machannel: { upperOffset: ['min', 'max'], lowerOffset: ['min', 'max'] },
  // Hourly moves are wider than 0.1% and 0.2% alike: the same swings at both.
  zigzag: { deviation: ['min'] },
};

/** Parameters that give these a value within 400 hourly bars. */
const PARAMS: Record<string, IndicatorParamValues> = { mtfma: { period: 3 } };

const HOUR = 3_600_000;

/** A seeded random walk: the same bars every run. */
function walk(n: number): OHLCBar[] {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let close = 100;
  return Array.from({ length: n }, (_, i) => {
    const open = close;
    close = Math.max(1, open + (rand() - 0.5) * 3);
    const high = Math.max(open, close) + rand();
    const low = Math.min(open, close) - rand();
    return { time: Date.UTC(2025, 0, 1) + i * HOUR, open, high, low, close, volume: 100 + Math.round(rand() * 900) };
  });
}

const BARS = walk(400);
const engine = new IndicatorEngine();
registerBuiltInIndicators(engine);
const descriptors = engine.getAvailableIndicators();

/** What the indicator computes with one input set to a value, the others at their defaults. */
function run(id: string, name: string, value: number): string {
  const instance = engine.addIndicator(id, { ...PARAMS[id], [name]: value }, BARS);
  const output = engine.getOutput(instance);
  engine.removeIndicator(instance);
  return JSON.stringify({ series: output?.series, meta: output?.meta });
}

const isNumeric = (input: IndicatorInputInfo) => input.kind === 'int' || input.kind === 'number';

describe('built-in inputs keep to their declarations', () => {
  for (const descriptor of descriptors) {
    const inputs = describeInputs(descriptor).filter(isNumeric);
    if (inputs.length === 0) continue;
    describe(descriptor.id, () => {
      for (const input of inputs) {
        const spec = descriptor.inputs?.[input.name];
        const same = SAME_AT_LIMIT[descriptor.id]?.[input.name] ?? [];

        it(`${input.name}: says what kind of number it is, and its lowest value`, () => {
          expect(spec?.kind, 'kind').toMatch(/^(int|number)$/);
          if (!NO_MIN[descriptor.id]?.includes(input.name)) expect(input.min, 'min').toBeTypeOf('number');
        });

        if (input.kind === 'int') {
          it(`${input.name}: is read as a whole number`, () => {
            const d = Number(input.default);
            // Floored or rounded, a part of a step is dropped.
            expect(run(descriptor.id, input.name, d + 0.4)).toBe(run(descriptor.id, input.name, d));
          });
        }

        if (input.min !== undefined && !same.includes('min')) {
          it(`${input.name}: takes its lowest value as it is`, () => {
            const min = input.min!;
            expect(run(descriptor.id, input.name, min)).not.toBe(run(descriptor.id, input.name, min + input.step!));
          });
        }

        if (input.max !== undefined && !same.includes('max')) {
          it(`${input.name}: takes its highest value as it is`, () => {
            const max = input.max!;
            expect(run(descriptor.id, input.name, max)).not.toBe(run(descriptor.id, input.name, max - input.step!));
          });
        }
      }
    });
  }
});
