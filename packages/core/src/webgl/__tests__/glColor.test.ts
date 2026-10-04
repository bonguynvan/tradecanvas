import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('parseColor through the browser', () => {
  /** A 2D context stand-in: knows a few colours, paints oklch() as a fixed pixel. */
  class FakeOffscreenCanvas {
    getContext() {
      let style = '#000000';
      let painted = [0, 0, 0, 0];
      const known: Record<string, string> = { '#000': '#000000', '#fff': '#ffffff', teal: '#008080', 'oklch(0.7 0.1 200)': 'oklch(0.7 0.1 200)' };
      return {
        get fillStyle() { return style; },
        set fillStyle(v: string) { if (v in known) style = known[v]; },
        clearRect() { painted = [0, 0, 0, 0]; },
        fillRect() { painted = style.startsWith('oklch') ? [51, 153, 204, 255] : [0, 0, 0, 255]; },
        getImageData() { return { data: Uint8ClampedArray.from(painted) }; },
      };
    }
  }

  async function freshParse() {
    vi.resetModules();
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
    return (await import('../glColor.js')).parseColor;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('reads a named colour from the normalised style', async () => {
    const parse = await freshParse();
    expect(parse('teal')).toEqual([0, 128 / 255, 128 / 255, 1]);
  });

  it('reads oklch() and other modern colours from a painted pixel', async () => {
    const parse = await freshParse();
    expect(parse('oklch(0.7 0.1 200)')).toEqual([0.2, 0.6, 0.8, 1]);
  });

  it('gives transparent black for a colour the browser rejects', async () => {
    const parse = await freshParse();
    expect(parse('var(--up)')).toEqual([0, 0, 0, 0]);
  });
});
