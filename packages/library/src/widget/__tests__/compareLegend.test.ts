import { describe, it, expect } from 'vitest';
import type { CompareValue } from '@tradecanvas/core';
import { compareLegendRows, formatChangePercent, formatComparePrice } from '../compareLegend.js';

const value = (patch: Partial<CompareValue>): CompareValue => ({
  id: 'cmp_DOGEUSDT', label: 'DOGEUSDT', color: '#f7931a', visible: true, close: 0.1002, change: -7.6912, stale: false, ...patch,
});

describe('a percent compare’s legend row', () => {
  it('gives the symbol, its own price and its signed change in its colour', () => {
    expect(compareLegendRows([value({})])).toEqual([{
      instanceId: 'cmp_DOGEUSDT',
      kind: 'compare',
      label: 'DOGEUSDT',
      visible: true,
      values: [{ text: '0.1002', color: null }, { text: '-7.69%', color: '#f7931a' }],
      pane: null,
    }]);
  });

  it('shows nothing before the symbol’s first bar, and a hidden one as hidden', () => {
    const [row] = compareLegendRows([value({ close: null, change: null, visible: false })]);
    expect(row.values).toEqual([]);
    expect(row.visible).toBe(false);
  });

  it('dims the row, with no figures, where the chart draws no compare lines', () => {
    const [row] = compareLegendRows([value({})], 'en-US', false);
    expect(row).toMatchObject({ kind: 'compare', label: 'DOGEUSDT', visible: true, offChartType: true, values: [] });
  });

  it('writes a price in decimals of its own size, in the number locale', () => {
    expect(formatComparePrice(65432.1234)).toBe('65,432.12');
    expect(formatComparePrice(152.3)).toBe('152.30');
    expect(formatComparePrice(0.1002)).toBe('0.1002');
    expect(formatComparePrice(65432.1234, 'de-DE')).toBe('65.432,12');
  });

  it('writes a change with its sign, none for nothing, in the number locale', () => {
    expect(formatChangePercent(8.4512)).toBe('+8.45%');
    expect(formatChangePercent(-7.6912)).toBe('-7.69%');
    expect(formatChangePercent(0.001)).toBe('0.00%');
    expect(formatChangePercent(1234.5, 'de-DE')).toBe('+1.234,50%');
  });
});
