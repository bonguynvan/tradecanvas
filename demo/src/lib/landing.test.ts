import { describe, expect, it } from 'vitest';
import { aroundFigure, parseFigures, tapeChange, tapePrice } from './landing';

describe('tapePrice', () => {
  it('shows cents for big prices and more digits for small ones', () => {
    expect(tapePrice(86044.012)).toBe('86,044.01');
    expect(tapePrice(120.6789)).toBe('120.679');
    expect(tapePrice(0.27341)).toBe('0.2734');
    expect(tapePrice(0.0000123)).toBe('0.000012');
  });
});

describe('tapeChange', () => {
  it('signs the change with a real minus and two decimals', () => {
    expect(tapeChange(0.917)).toBe('+0.92%');
    expect(tapeChange(-0.4)).toBe('−0.40%');
    expect(tapeChange(0)).toBe('+0.00%');
  });

  it('shows nothing without a change', () => {
    expect(tapeChange(null)).toBe('');
  });
});

describe('aroundFigure', () => {
  it('splits a template around its figure', () => {
    expect(aroundFigure('{n} npm downloads a month')).toEqual(['', ' npm downloads a month']);
    expect(aroundFigure('giấy phép {n}')).toEqual(['giấy phép ', '']);
    expect(aroundFigure('ayda {n} npm indirmesi')).toEqual(['ayda ', ' npm indirmesi']);
  });

  it('puts the figure first when a template has no place for it', () => {
    expect(aroundFigure('licensed')).toEqual(['', ' licensed']);
  });
});

describe('parseFigures', () => {
  it('reads figures stored as numbers', () => {
    expect(parseFigures('{"stars":20,"downloads":1923}')).toEqual({ stars: 20, downloads: 1923 });
  });

  it('rejects anything else, so a bad entry is fetched again', () => {
    expect(parseFigures(null)).toBeNull();
    expect(parseFigures('not json')).toBeNull();
    expect(parseFigures('{"stars":null,"downloads":1923}')).toBeNull();
    expect(parseFigures('{"stars":"20","downloads":1923}')).toBeNull();
    expect(parseFigures('{"stars":1e999,"downloads":1}')).toBeNull();
    expect(parseFigures('[]')).toBeNull();
  });
});
