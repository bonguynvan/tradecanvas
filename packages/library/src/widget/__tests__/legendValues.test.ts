import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatIndicatorValue, legendLineColor, legendNumbers } from '../legendValues.js';

const COLORS = ['#up', '#down', '#third'];

describe('legendNumbers', () => {
  it('keeps the line values in output order', () => {
    expect(legendNumbers('bb', { upper: 105, middle: 101, lower: 97 })).toEqual([105, 101, 97]);
  });

  it('leaves out flags and running state', () => {
    expect(legendNumbers('psar', { value: 99.5, trend: -1 })).toEqual([99.5]);
    expect(legendNumbers('svwap', { value: 101, session: 20_250_101 })).toEqual([101]);
    expect(legendNumbers('chaikinOsc', { value: 12, adl: 3400 })).toEqual([12]);
  });

  it('leaves out intermediate values that are not drawn', () => {
    expect(legendNumbers('adx', { plusDI: 25, minusDI: 18, dx: 16, adx: 22 })).toEqual([25, 18, 22]);
    expect(legendNumbers('lrc', { middle: 101, upper: 104, lower: 98, slope: 0.4 })).toEqual([101, 104, 98]);
    expect(legendNumbers('ichimoku', { tenkan: 100, kijun: 99, senkouA: 99.5, senkouB: 98, chikou: 101 }))
      .toEqual([100, 99, 99.5, 98]);
  });

  it('keeps a field that is a line elsewhere (Aroon Up)', () => {
    expect(legendNumbers('aroon', { up: 71.4, down: 14.3 })).toEqual([71.4, 14.3]);
  });

  it('skips missing and non-finite values', () => {
    expect(legendNumbers('macd', { macd: 0.5, signal: undefined, histogram: Number.NaN })).toEqual([0.5]);
    expect(legendNumbers('ema', null)).toEqual([]);
  });
});

describe('legendLineColor', () => {
  it('uses the line colour of a one-colour indicator', () => {
    expect(legendLineColor('ema', COLORS, { value: 1 })).toBe('#up');
  });

  it('follows the up or down colour a two-tone indicator is drawn in', () => {
    expect(legendLineColor('supertrend', COLORS, { value: 1, trend: 1 })).toBe('#up');
    expect(legendLineColor('supertrend', COLORS, { value: 1, trend: -1 })).toBe('#down');
    expect(legendLineColor('ao', COLORS, { value: -2, up: 1 })).toBe('#up');
    expect(legendLineColor('cmf', COLORS, { value: -0.1 })).toBe('#down');
  });

  it('stays neutral when the colour is not known', () => {
    expect(legendLineColor('ac', COLORS, { value: 1 })).toBeNull(); // draws in its own colours
    expect(legendLineColor('psar', COLORS, null)).toBeNull();
    expect(legendLineColor('psar', ['#up'], { value: 1, trend: -1 })).toBeNull();
    expect(legendLineColor('ema', [], { value: 1 })).toBeNull();
  });
});

describe('formatIndicatorValue', () => {
  it('fits the decimals to the size and shortens big values', () => {
    expect(formatIndicatorValue(54.321)).toBe('54.32');
    expect(formatIndicatorValue(0.001234)).toBe('0.001234');
    expect(formatIndicatorValue(0.5)).toBe('0.5000');
    expect(formatIndicatorValue(12345.67)).toBe('12,345.7');
    expect(formatIndicatorValue(-2_345_678)).toBe('-2.35M');
    expect(formatIndicatorValue(54.321, 'vi-VN')).toBe('54,32');
  });

  afterEach(() => vi.restoreAllMocks());

  it('builds a number format once per locale and shape, not per value', () => {
    formatIndicatorValue(-7_654_321, 'fr-FR');
    formatIndicatorValue(1.5, 'fr-FR');
    const built = vi.spyOn(Intl, 'NumberFormat');
    expect(formatIndicatorValue(-8_765_432, 'fr-FR')).toBe(formatIndicatorValue(-8_765_432, 'fr-FR'));
    expect(formatIndicatorValue(2.25, 'fr-FR')).toBe('2,25');
    expect(built).not.toHaveBeenCalled();
  });
});
