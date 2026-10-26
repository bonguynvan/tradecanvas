import { describe, it, expect } from 'vitest';
import type { OHLCBar, Theme, ViewportState } from '@tradecanvas/commons';
import { CompareRenderer } from '../CompareRenderer.js';
import { barIndexToX } from '../../viewport/ScaleMapping.js';

const HOUR = 3_600_000;
const bar = (i: number, close: number): OHLCBar => ({ time: i * HOUR, open: close, high: close, low: close, close, volume: 1 });
/** The main series climbs 100 → 109. */
const main = Array.from({ length: 10 }, (_, i) => bar(i, 100 + i));
/** Bars `from` to `to` on screen, the % scale's baseline at `baseline` when given. */
const view = (from: number, to: number, baseline?: number): ViewportState => ({
  visibleRange: { from, to },
  priceRange: { min: 50, max: 150 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 100, height: 200 },
  scaleBaseline: baseline,
});
/** Another symbol with bars from main bar `start` on, at `closeAt(i)`. */
const other = (start: number, closeAt: (i: number) => number): OHLCBar[] =>
  main.slice(start).map((_, k) => bar(start + k, closeAt(start + k)));

function renderer(...symbols: { id: string; data: OHLCBar[] }[]): CompareRenderer {
  const r = new CompareRenderer();
  for (const s of symbols) r.addSymbol({ id: s.id, label: s.id.toUpperCase(), color: '#f00', visible: true, data: s.data });
  return r;
}

describe('a percent compare line on the % scale', () => {
  it('starts a symbol whose bars begin later at the first main close on screen (0% of the % scale)', () => {
    const r = renderer({ id: 'b', data: other(5, () => 10) });
    expect(r.getPriceRange(main, view(0, 9))).toEqual({ min: 100, max: 100 });
  });

  it('rebases on the first bar on screen after a pan', () => {
    const r = renderer({ id: 'b', data: other(5, () => 10) });
    expect(r.getPriceRange(main, view(3, 9))).toEqual({ min: 103, max: 103 });
  });

  it('starts on exactly the baseline the scale reads 0% at', () => {
    const r = renderer({ id: 'b', data: other(5, () => 10) });
    expect(r.getPriceRange(main, view(0, 9, 100.5))).toEqual({ min: 100.5, max: 100.5 });
  });

  it('maps a symbol on screen from the first bar as before', () => {
    const r = renderer({ id: 'c', data: other(0, (i) => 10 * (1 + i / 100)) });
    const range = r.getPriceRange(main, view(0, 9))!;
    expect(range.min).toBeCloseTo(100);
    expect(range.max).toBeCloseTo(109);
  });
});

describe('a compare’s values at a bar', () => {
  it('gives its close and its change since the first bar on screen it has a close for', () => {
    const r = renderer({ id: 'b', data: other(2, (i) => 10 + i) });
    const [at] = r.valuesAt(main, view(0, 9), 7);
    // Its line starts at bar 2 (12) and reaches 17 at bar 7.
    expect(at).toMatchObject({ id: 'b', label: 'B', color: '#f00', visible: true, close: 17, stale: false });
    expect(at.change).toBeCloseTo((17 / 12 - 1) * 100);
  });

  it('reads what the line reads on the % scale', () => {
    const r = renderer({ id: 'b', data: other(2, (i) => 10 + i) });
    const vp = view(1, 9, 101);
    const [at] = r.valuesAt(main, vp, 9);
    const line = r.getPriceRange(main, vp)!;
    expect(at.change).toBeCloseTo((line.max / 101 - 1) * 100);
  });

  it('gives no close before its first bar', () => {
    const r = renderer({ id: 'b', data: other(5, () => 10) });
    expect(r.valuesAt(main, view(0, 9), 3)[0]).toMatchObject({ close: null, change: null, stale: false });
  });

  it('gives its last close past its last bar, marked stale', () => {
    const r = renderer({ id: 'b', data: main.slice(0, 6).map((b, i) => bar(i, 20 + i)) });
    const [at] = r.valuesAt(main, view(0, 9), 9);
    expect(at).toMatchObject({ close: 25, stale: true });
    expect(at.change).toBeCloseTo(25);
  });

  it('gives nothing for a bar the main series hasn’t got', () => {
    const r = renderer({ id: 'b', data: other(0, () => 10) });
    expect(r.valuesAt(main, view(0, 9), 42)[0]).toMatchObject({ close: null, change: null });
  });
});

describe('a compare line’s label', () => {
  it('sits at the line’s last point on screen, so labels of lines from one 0% start don’t stack', () => {
    const r = renderer({ id: 'b', data: other(0, () => 10) });
    const texts: { text: string; x: number; align: string }[] = [];
    const ctx = new Proxy({ textAlign: 'start' } as Record<string, unknown>, {
      get: (t, k) => (k in t ? t[k as string] : k === 'fillText'
        ? (text: string, x: number) => texts.push({ text, x, align: String(t.textAlign) })
        : k === 'measureText' ? (text: string) => ({ width: text.length * 10 }) : () => {}),
      set: (t, k, v) => { t[k as string] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const vp = view(0, 7);
    r.render(ctx, main, vp, { background: '#fff' } as Theme);
    expect(texts).toHaveLength(1);
    expect(texts[0].text).toBe('B');
    expect(texts[0].align).toBe('right');
    expect(texts[0].x).toBeLessThanOrEqual(barIndexToX(7, vp));
    expect(texts[0].x).toBeGreaterThan(barIndexToX(6, vp));
  });

  /** A canvas that keeps each text's box (10 px a letter, 12 px high, from where it is aligned), each box filled and each text's halo. */
  function recorder() {
    const texts: { text: string; left: number; top: number; right: number; bottom: number; fill: string }[] = [];
    const chips: { x: number; y: number; w: number; h: number; fill: string }[] = [];
    const halos: { text: string; stroke: string }[] = [];
    /** Each path stroked: its points and its colour. */
    const strokes: { points: { x: number; y: number }[]; color: string }[] = [];
    let path: { x: number; y: number }[] = [];
    const state: Record<string, unknown> = { textAlign: 'start', textBaseline: 'alphabetic', fillStyle: '' };
    const ctx = new Proxy(state, {
      get: (t, k) => {
        if (k in t) return t[k as string];
        if (k === 'measureText') return (text: string) => ({ width: text.length * 10 });
        if (k === 'fillText') {
          return (text: string, x: number, y: number) => {
            const w = text.length * 10;
            const left = t.textAlign === 'right' ? x - w : x;
            const top = t.textBaseline === 'bottom' ? y - 12 : t.textBaseline === 'top' ? y : y - 6;
            texts.push({ text, left, top, right: left + w, bottom: top + 12, fill: String(t.fillStyle) });
          };
        }
        if (k === 'beginPath') return () => { path = []; };
        if (k === 'moveTo' || k === 'lineTo') return (x: number, y: number) => { path.push({ x, y }); };
        if (k === 'stroke') return () => strokes.push({ points: path, color: String(t.strokeStyle) });
        if (k === 'fillRect') return (x: number, y: number, w: number, h: number) => chips.push({ x, y, w, h, fill: String(t.fillStyle) });
        if (k === 'strokeText') return (text: string) => halos.push({ text, stroke: String(t.strokeStyle) });
        return () => {};
      },
      set: (t, k, v) => { t[k as string] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, texts, chips, halos, strokes };
  }
  const overlaps = (a: { top: number; bottom: number }, b: { top: number; bottom: number }) => a.top < b.bottom && b.top < a.bottom;
  const THEME = { background: '#fbfaf6', text: '#1d1f22' } as Theme;

  it('reads over what is under it by a halo of the chart’s ground around its letters, with no box hiding the candles', () => {
    const { ctx, chips, halos } = recorder();
    renderer({ id: 'b', data: other(0, () => 10) }).render(ctx, main, view(0, 7), THEME);
    expect(chips).toEqual([]);
    expect(halos).toEqual([{ text: 'B', stroke: '#fbfaf6' }]);
  });

  it('is written in the text colour, which reads on either theme, after a stroke of its line’s colour', () => {
    const { ctx, texts, strokes } = recorder();
    renderer({ id: 'b', data: other(0, () => 10) }).render(ctx, main, view(0, 7), THEME);
    expect(texts[0].fill).toBe('#1d1f22');
    const middle = (texts[0].top + texts[0].bottom) / 2;
    const mark = strokes.find((s) => s.color === '#f00' && s.points.length === 2 && s.points.every((p) => p.y === middle));
    expect(mark).toBeDefined();
    expect(Math.max(...mark!.points.map((p) => p.x))).toBeLessThan(texts[0].left);
  });

  it('keeps clear of an alert’s label at the plot’s right edge', () => {
    const { ctx, texts } = recorder();
    const r = renderer({ id: 'b', data: other(0, () => 10) });
    const vp = view(0, 7);
    // The line ends at 107 (y 86), the alert's label sits just above its line at the same price.
    r.setReservedLevels(() => [107]);
    r.render(ctx, main, vp, THEME);
    const alertLabel = { top: 86 - 2 - 14, bottom: 86 - 2 };
    expect(overlaps(texts[0], alertLabel)).toBe(false);
  });

  it('keeps two lines’ labels clear of each other where the lines end together', () => {
    const { ctx, texts } = recorder();
    renderer({ id: 'b', data: other(0, () => 10) }, { id: 'c', data: other(0, () => 20) }).render(ctx, main, view(0, 7), THEME);
    expect(texts).toHaveLength(2);
    expect(overlaps(texts[0], texts[1])).toBe(false);
  });
});

