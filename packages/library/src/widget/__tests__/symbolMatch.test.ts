import { describe, it, expect } from 'vitest';
import { foldMarks, scoreSymbol, symbolQuery } from '../symbolMatch.js';

describe('symbolQuery', () => {
  it('holds what was typed in upper case for a ticker and without its marks for a name', () => {
    expect(symbolQuery('vcb')).toEqual({ upper: 'VCB', folded: 'VCB' });
    expect(symbolQuery('ngân đ')).toEqual({ upper: 'NGÂN Đ', folded: 'NGAN D' });
  });
});

describe('scoreSymbol', () => {
  it('ranks a ticker that starts with what was typed over a name that does', () => {
    const name = foldMarks('Vietcombank');
    expect(scoreSymbol('VCB', name, symbolQuery('vc'))).toBeGreaterThan(scoreSymbol('XYZ', foldMarks('VCB holdings'), symbolQuery('vc')));
  });

  it('finds a name typed without its marks, and nothing for no match', () => {
    expect(scoreSymbol('VCB', foldMarks('Ngân hàng Ngoại thương'), symbolQuery('ngoai'))).toBeGreaterThan(0);
    expect(scoreSymbol('VCB', foldMarks('Ngân hàng'), symbolQuery('milk'))).toBe(0);
    expect(scoreSymbol('VCB', '', symbolQuery('milk'))).toBe(0);
  });
});
