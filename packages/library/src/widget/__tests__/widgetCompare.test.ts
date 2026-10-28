import { describe, it, expect } from 'vitest';
import { EN_TRANSLATOR } from '../i18n.js';
import { barsBefore, comparedEntries, compareWayOptions, isCompareWay, withOlderBars } from '../widgetCompare.js';

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
        { instanceId: 'p', id: 'compareSymbolPane', params: { symbol: 'LTC' } },
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
      { id: 'p', symbol: 'LTC', way: 'Price, in a pane of its own' },
      { id: 'c', symbol: 'XRP', way: 'Ratio' },
      { id: 'd', symbol: 'ADA', way: 'Spread' },
      { id: 'e', symbol: 'DOT', way: 'Correlation of returns' },
    ]);
  });
});

describe('a percent compare’s older stretch', () => {
  const at = (time: number) => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 });

  it('counts the chart’s bars before a time', () => {
    const chart = [at(1), at(2), at(3), at(4)];
    expect(barsBefore(chart, 3)).toBe(2);
    expect(barsBefore(chart, 1)).toBe(0);
    expect(barsBefore(chart, 9)).toBe(4);
  });

  it('puts the older bars in front, leaving out any not older, and gives null when none is', () => {
    const own = [at(5), at(6)];
    expect(withOlderBars(own, [at(3), at(4), at(5)])).toEqual([at(3), at(4), at(5), at(6)]);
    expect(withOlderBars(own, [at(5)])).toBeNull();
    expect(withOlderBars(own, [])).toBeNull();
  });
});
