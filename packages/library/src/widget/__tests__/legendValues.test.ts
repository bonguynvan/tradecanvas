import { describe, it, expect, vi, afterEach } from 'vitest';
import type { IndicatorPlot } from '@tradecanvas/commons';
import { formatIndicatorValue, legendValues } from '../legendValues.js';

const COLORS = ['#first', '#second', '#third', '#fourth'];
const plots = (...list: IndicatorPlot[]) => ({ plots: list });

describe('legendValues', () => {
  it('lists the drawn plots in order, each in its own colour', () => {
    const bb = plots(
      { key: 'upper', title: 'Upper', color: 0 },
      { key: 'middle', title: 'Basis', color: 1 },
      { key: 'lower', title: 'Lower', color: 0 },
    );
    expect(legendValues(bb, { lower: 97, middle: 101, upper: 105 }, COLORS)).toEqual([
      { value: 105, color: '#first' },
      { value: 101, color: '#second' },
      { value: 97, color: '#first' },
    ]);
  });

  it('leaves out fields that are not drawn, and missing values', () => {
    const adx = plots({ key: 'adx', title: 'ADX', color: 0 }, { key: 'plusDI', title: '+DI', color: 1 });
    expect(legendValues(adx, { plusDI: 25, dx: 16, adx: Number.NaN }, COLORS)).toEqual([{ value: 25, color: '#second' }]);
    expect(legendValues(adx, null, COLORS)).toEqual([]);
  });

  it('follows the up or down colour of a two-tone plot', () => {
    const st = plots({ key: 'value', title: 'ST', color: 0, tone: { field: 'trend' }, downColor: 1 });
    expect(legendValues(st, { value: 101, trend: -1 }, COLORS)).toEqual([{ value: 101, color: '#second' }]);
    const hist = plots({ key: 'h', title: 'H', color: 2, kind: 'histogram', tone: 'sign', downColor: 3 });
    expect(legendValues(hist, { h: -0.5 }, COLORS)).toEqual([{ value: -0.5, color: '#fourth' }]);
  });

  it('shows every value of an indicator that declares no plots, coloured only when alone', () => {
    expect(legendValues({}, { a: 1, b: 2 }, COLORS)).toEqual([{ value: 1, color: null }, { value: 2, color: null }]);
    expect(legendValues({}, { a: 1 }, COLORS)).toEqual([{ value: 1, color: '#first' }]);
    expect(legendValues({}, { a: 1 }, [])).toEqual([{ value: 1, color: null }]);
  });
});

describe('formatIndicatorValue', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fits the decimals to the size and shortens big values', () => {
    expect(formatIndicatorValue(54.321)).toBe('54.32');
    expect(formatIndicatorValue(0.001234)).toBe('0.001234');
    expect(formatIndicatorValue(0.5)).toBe('0.5000');
    expect(formatIndicatorValue(12345.67)).toBe('12,345.7');
    expect(formatIndicatorValue(-2_345_678)).toBe('-2.35M');
    expect(formatIndicatorValue(54.321, 'vi-VN')).toBe('54,32');
  });

  it('builds a number format once per locale and shape, not per value', () => {
    formatIndicatorValue(-7_654_321, 'fr-FR');
    formatIndicatorValue(1.5, 'fr-FR');
    const built = vi.spyOn(Intl, 'NumberFormat');
    expect(formatIndicatorValue(-8_765_432, 'fr-FR')).toBe(formatIndicatorValue(-8_765_432, 'fr-FR'));
    expect(formatIndicatorValue(2.25, 'fr-FR')).toBe('2,25');
    expect(built).not.toHaveBeenCalled();
  });
});
