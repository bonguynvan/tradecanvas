import { describe, it, expect } from 'vitest';
import { parseColor, premultiplied } from '../glColor.js';

describe('parseColor', () => {
  it('reads hex in all four lengths', () => {
    expect(parseColor('#ff0000')).toEqual([1, 0, 0, 1]);
    expect(parseColor('#f00')).toEqual([1, 0, 0, 1]);
    expect(parseColor('#ff000080')).toEqual([1, 0, 0, 128 / 255]);
    expect(parseColor('#f008')).toEqual([1, 0, 0, 136 / 255]);
  });

  it('reads rgb() and rgba(), with commas, spaces or a slash', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1]);
    expect(parseColor('rgba(0, 255, 0, 0.5)')).toEqual([0, 1, 0, 0.5]);
    expect(parseColor('rgb(0 0 255 / 0.25)')).toEqual([0, 0, 1, 0.25]);
    expect(parseColor('rgba(0, 0, 255, 50%)')).toEqual([0, 0, 1, 0.5]);
  });

  it('gives transparent black for what it cannot read without a browser', () => {
    expect(parseColor('not a colour')).toEqual([0, 0, 0, 0]);
  });
});

describe('premultiplied', () => {
  it('scales the colour by its alpha, as the canvas blends', () => {
    expect(premultiplied([1, 0.5, 0, 0.5])).toEqual([0.5, 0.25, 0, 0.5]);
  });
});
