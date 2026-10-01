import { describe, it, expect } from 'vitest';
import { EnvelopeIndicator } from '../overlay/Envelope.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('EnvelopeIndicator', () => {
  const envelope = new EnvelopeIndicator();

  it('bands the SMA basis by the configured percentage', () => {
    const data = bars([100, 100, 100]);
    const { series } = envelope.calculate(data, indicatorConfig('envelope', { period: 3, percent: 5 }));

    expect(series![2]?.basis).toBeCloseTo(100);
    expect(series![2]?.upper).toBeCloseTo(105);
    expect(series![2]?.lower).toBeCloseTo(95);
  });

  it('emits null until the period is filled', () => {
    const data = bars([1, 2]);
    const { series } = envelope.calculate(data, indicatorConfig('envelope', { period: 5 }));
    expect(series!.every((v) => v === null)).toBe(true);
  });

  it('defaults to a 2.5% band', () => {
    const data = bars([200, 200]);
    const { series } = envelope.calculate(data, indicatorConfig('envelope', { period: 2 }));
    expect(series![1]?.upper).toBeCloseTo(205);
    expect(series![1]?.lower).toBeCloseTo(195);
  });
});
