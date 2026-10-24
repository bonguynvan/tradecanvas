import { describe, it, expect } from 'vitest';
import { EN_TRANSLATOR } from '../i18n.js';
import { comparedEntries, compareWayOptions, isCompareWay } from '../widgetCompare.js';

describe('compareWayOptions', () => {
  it('offers every way, in words', () => {
    expect(compareWayOptions(EN_TRANSLATOR)).toEqual([
      { id: 'percent', label: 'Percent change, on this scale' },
      { id: 'scale', label: 'Price, on its own scale' },
      { id: 'pane', label: 'Price, in a pane of its own' },
      { id: 'spread', label: 'Spread' },
      { id: 'ratio', label: 'Ratio' },
      { id: 'correlation', label: 'Correlation' },
      { id: 'correlationLog', label: 'Correlation of returns' },
    ]);
    expect(isCompareWay('ratio')).toBe(true);
    expect(isCompareWay('sideways')).toBe(false);
  });
});

describe('comparedEntries', () => {
  it('lists the overlays, then the indicators that read another symbol, each with its way', () => {
    const entries = comparedEntries(
      [{ id: 'cmp_ETH', symbol: 'ETH', color: '#4c8dff' }],
      [
        { instanceId: 'a', id: 'compareSymbol', params: { symbol: 'SOL' } },
        { instanceId: 'b', id: 'compareSymbol', params: { symbol: 'BNB' } },
        { instanceId: 'c', id: 'spread', params: { symbol: 'XRP', mode: 'ratio' } },
        { instanceId: 'd', id: 'spread', params: { symbol: 'ADA', mode: 'spread' } },
        { instanceId: 'e', id: 'correlationlog', params: { symbol: 'DOT' } },
        { instanceId: 'f', id: 'rsi', params: { period: 14 } },
        { instanceId: 'g', id: 'correlation', params: {} },
      ],
      new Set(['b']),
      EN_TRANSLATOR,
    );
    expect(entries).toEqual([
      { id: 'cmp_ETH', symbol: 'ETH', way: 'Percent change, on this scale', color: '#4c8dff' },
      { id: 'a', symbol: 'SOL', way: 'Price, on its own scale' },
      { id: 'b', symbol: 'BNB', way: 'Price, in a pane of its own' },
      { id: 'c', symbol: 'XRP', way: 'Ratio' },
      { id: 'd', symbol: 'ADA', way: 'Spread' },
      { id: 'e', symbol: 'DOT', way: 'Correlation of returns' },
    ]);
  });
});
