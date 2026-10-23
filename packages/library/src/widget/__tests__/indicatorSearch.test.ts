import { describe, it, expect } from 'vitest';
import { searchIndicators } from '../indicatorSearch.js';

const items = [
  { id: 'atr', name: 'Average True Range', shortName: 'ATR' },
  { id: 'crsi', name: 'Connors RSI', shortName: 'CRSI' },
  { id: 'mom', name: 'Momentum', shortName: 'MOM' },
  { id: 'rsi', name: 'Relative Strength Index', shortName: 'RSI' },
  { id: 'sma', name: 'Simple Moving Average', shortName: 'SMA' },
  { id: 'stochrsi', name: 'Stochastic RSI', shortName: 'Stoch RSI' },
];
const ids = (query: string) => searchIndicators(items, query).map((i) => i.id);

describe('searching the indicators', () => {
  it('puts the short name typed in full first, then the others containing it', () => {
    expect(ids('rsi')).toEqual(['rsi', 'crsi', 'stochrsi']);
  });

  it('ranks a name that starts with the words over one that has them later', () => {
    expect(ids('average')).toEqual(['atr', 'sma']);
    expect(ids('moving av')).toEqual(['sma']);
  });

  it('ignores case, accents and the spaces around what is typed', () => {
    expect(ids('  MÔMENTUM ')).toEqual(['mom']);
  });

  it('finds nothing for nothing typed, or for what no indicator has', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
    expect(ids('zzz')).toEqual([]);
  });
});
