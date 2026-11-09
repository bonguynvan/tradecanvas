import { describe, it, expect, afterEach } from 'vitest';
import { DARK_THEME, LIGHT_THEME, SANS_FONT_FAMILY, contrastRatio } from '@tradecanvas/commons';
import {
  dashFor,
  drawingFill,
  drawingLook,
  handleRadius,
  labelInk,
  setDrawingLook,
  textSize,
} from '../drawingLook.js';

afterEach(() => setDrawingLook(null));

describe('the drawings’ type', () => {
  it('sets labels, letters and text a step or more over the axis type, never smaller than it reads', () => {
    setDrawingLook(DARK_THEME);
    const s = drawingLook().sizes;
    expect(s.label).toBeGreaterThanOrEqual(12);
    expect(s.text).toBeGreaterThanOrEqual(14);
    expect(s.mark).toBeGreaterThanOrEqual(11);
    expect(s.mark).toBeLessThan(s.label);
    expect(s.label).toBeLessThan(s.letter);
    expect(s.letter).toBeLessThan(s.text);
  });

  it('grows with the chart’s type, as the widget grows it on a wide screen', () => {
    setDrawingLook(DARK_THEME);
    const base = drawingLook().sizes;
    setDrawingLook({ ...DARK_THEME, font: { ...DARK_THEME.font, sizeSmall: 14, sizeMedium: 16, sizeLarge: 18 } });
    const wide = drawingLook().sizes;
    expect(wide.label).toBeGreaterThan(base.label);
    expect(wide.text).toBeGreaterThan(base.text);
  });

  it('writes text people type in a sans face, numbers in the chart’s', () => {
    setDrawingLook({ ...DARK_THEME, font: { ...DARK_THEME.font, family: 'Plex Mono' } });
    expect(drawingLook().figures).toBe('Plex Mono');
    expect(drawingLook().prose).toBe(SANS_FONT_FAMILY);
    setDrawingLook({ ...DARK_THEME, font: { ...DARK_THEME.font, family: 'Plex Mono', textFamily: 'Inter' } });
    expect(drawingLook().prose).toBe('Inter');
  });

  it('takes a size of yours, and reads the old default 12 as none', () => {
    setDrawingLook(DARK_THEME);
    const text = drawingLook().sizes.text;
    expect(textSize({ fontSize: undefined })).toBe(text);
    expect(textSize({ fontSize: 12 })).toBe(text);
    expect(textSize({ fontSize: 20 })).toBe(20);
    expect(textSize({ fontSize: 12 }, 'letter')).toBe(drawingLook().sizes.letter);
  });
});

describe('the drawings’ handles', () => {
  it('are rings that grow with the line, so a thick line keeps a handle bigger than it', () => {
    const thin = handleRadius(1);
    const thick = handleRadius(4);
    expect(thin).toBeGreaterThanOrEqual(4);
    expect(thick).toBeGreaterThan(thin);
    expect(thick * 2).toBeGreaterThan(4 * 2.5);
    expect(handleRadius(40)).toBeLessThanOrEqual(9);
  });

  it('fill with the chart’s background unless the handle key gives a colour', () => {
    setDrawingLook(LIGHT_THEME);
    expect(drawingLook().handleFill).toBe(LIGHT_THEME.background);
    setDrawingLook({ ...DARK_THEME, style: { drawings: { handle: '#ff0000' } } as never });
    expect(drawingLook().handleFill).toBe('#ff0000');
  });
});

describe('the drawings’ lines', () => {
  it('dash and dot in proportion to the line, dots round', () => {
    expect(dashFor('solid', 1)).toEqual([]);
    const [d1] = dashFor('dashed', 1);
    const [d3] = dashFor('dashed', 3);
    expect(d3).toBeGreaterThan(d1);
    const dots = dashFor('dotted', 3);
    expect(dots[0]).toBe(0);
    expect(dots[1]).toBeGreaterThan(3);
  });
});

describe('the drawings’ fills and label ink', () => {
  it('tint the line’s colour, and read the old blue default as none', () => {
    expect(drawingFill({ color: '#e8505b', fillColor: undefined })).toContain('232');
    expect(drawingFill({ color: '#e8505b', fillColor: 'rgba(76, 141, 255, 0.1)' })).toContain('232');
    expect(drawingFill({ color: '#e8505b', fillColor: 'rgba(0, 0, 0, 0.3)' })).toBe('rgba(0, 0, 0, 0.3)');
  });

  it('writes on a coloured tag in black or white, whichever reads', () => {
    for (const fill of ['#4c8dff', '#f2a93b', '#ffffff', '#1fa874', '#131416']) {
      const ink = labelInk(fill);
      expect(contrastRatio(ink, fill)!, fill).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('a fill of a drawing’s own', () => {
  it('is none for the default however it is written, and kept when it is another colour', async () => {
    const { ownFillColor } = await import('@tradecanvas/commons');
    for (const fill of [undefined, 'rgba(76, 141, 255, 0.1)', 'rgba(76,141,255,0.1)', ' rgba( 76 , 141 , 255 , 0.1 ) ']) {
      expect(ownFillColor({ fillColor: fill }), String(fill)).toBeUndefined();
    }
    expect(ownFillColor({ fillColor: 'rgba(76,141,255,0.3)' })).toBe('rgba(76,141,255,0.3)');
    expect(ownFillColor({ fillColor: '#ff000033' })).toBe('#ff000033');
  });
});

describe('a stats box by the plot’s edge', () => {
  it('stays on the plot instead of running under the price axis', async () => {
    const { drawLabelBox } = await import('../tools/labels.js');
    const { setDrawingPlot } = await import('../drawingLook.js');
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, key: string) => (key in t ? t[key] : key === 'measureText' ? (s: string) => ({ width: s.length * 7 }) : () => undefined),
    }) as unknown as CanvasRenderingContext2D;
    setDrawingPlot({ x: 0, y: 0, width: 300, height: 200 });
    try {
      const box = drawLabelBox(ctx, ['+8.21 (+7.81%)', '60 bars, 2d 12h'], 290, 20, 'left', false);
      expect(box.x + box.width).toBeLessThanOrEqual(300);
      expect(box.x).toBeGreaterThanOrEqual(0);
      const low = drawLabelBox(ctx, ['a'], 100, 195, 'left', false);
      expect(low.y + low.height).toBeLessThanOrEqual(200);
    } finally {
      setDrawingPlot(null);
    }
  });
});
