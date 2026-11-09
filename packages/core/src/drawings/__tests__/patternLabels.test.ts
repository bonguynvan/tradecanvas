import { describe, it, expect, afterEach } from 'vitest';
import type { AnchorPoint, DrawingState, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { XABCDPatternTool, ABCDPatternTool, HeadAndShouldersTool, CypherPatternTool } from '../tools/patterns.js';
import { ElliottWaveTool, ElliottImpulseTool } from '../tools/ElliottWave.js';
import { drawingLook, handleRadius, setDrawingLook } from '../drawingLook.js';
import { drawing, recordingCtx, textCtx, unitViewport, type DrawnText } from './fixtures.js';

// A 1000 × 400 plot: bar i at x = 10i + 5, price p at y = 400 − 4p.
const vp: ViewportState = { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 400 } };
const at = (bar: number, price: number): AnchorPoint => ({ time: bar, price });
const px = (a: AnchorPoint) => ({ x: a.time * 10 + 5, y: 400 - a.price * 4 });

/** A text drawn, with the font it was drawn in and its box (CSS px). */
interface Placed extends DrawnText {
  font: string;
  top: number;
  bottom: number;
  right: number;
}

/** `textCtx`, noting each text's font and its box from its baseline. */
function fontCtx() {
  const { ctx, drawn } = textCtx();
  const fonts: string[] = [];
  const arcs: number[][] = [];
  const probe = new Proxy(ctx as unknown as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k === 'fillText') return (text: string, x: number, y: number) => { fonts.push(String(t.font)); (t.fillText as (...a: unknown[]) => void)(text, x, y); };
      if (k === 'arc') return (...a: number[]) => arcs.push(a);
      return t[k];
    },
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const placed = (): Placed[] => drawn.map((d, i) => {
    const font = fonts[i];
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 0);
    const top = d.baseline === 'top' ? d.y : d.baseline === 'bottom' ? d.y - size : d.y - size / 2;
    return { ...d, font, top, bottom: top + size, right: d.left + d.width };
  });
  return { ctx: probe, placed, arcs };
}

/** How near a box comes to a point (0 inside it). */
function boxDistance(b: { left: number; right: number; top: number; bottom: number }, p: { x: number; y: number }): number {
  const dx = Math.max(b.left - p.x, 0, p.x - b.right);
  const dy = Math.max(b.top - p.y, 0, p.y - b.bottom);
  return Math.hypot(dx, dy);
}

function overlaps(a: Placed, b: Placed): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** The ring a handle grows to under the pointer, px. */
const reach = (state: DrawingState) => handleRadius(state.style.lineWidth) + 1.5;

afterEach(() => setDrawingLook(null));

describe('pattern point letters', () => {
  // X low, A high, B low, C high, D low.
  const anchors = [at(10, 20), at(20, 70), at(30, 45), at(40, 60), at(50, 25)];

  it('sit outside their point, clear of its handle, above a peak and below a trough, centred on it', () => {
    const state = drawing('xabcdPattern', anchors);
    const { ctx, placed } = fontCtx();
    new XABCDPatternTool().render(ctx, state, vp, true);
    const letters = placed().filter((t) => /^[XABCD]$/.test(t.text));
    expect(letters.map((t) => t.text)).toEqual(['X', 'A', 'B', 'C', 'D']);
    letters.forEach((t, i) => {
      const p = px(anchors[i]);
      expect(t.x).toBeCloseTo(p.x);
      expect(t.align).toBe('center');
      expect(boxDistance(t, p)).toBeGreaterThan(reach(state));
      const peak = i % 2 === 1;
      if (peak) expect(t.bottom).toBeLessThan(p.y);
      else expect(t.top).toBeGreaterThan(p.y);
      expect(t.font).toContain(`${drawingLook().sizes.letter}px`);
    });
  });

  it('keep the same place unselected, so they don’t jump when the drawing is picked', () => {
    const state = drawing('xabcdPattern', anchors);
    const off = fontCtx();
    const on = fontCtx();
    new XABCDPatternTool().render(off.ctx, state, vp, false);
    new XABCDPatternTool().render(on.ctx, state, vp, true);
    const where = (list: Placed[]) => list.filter((t) => /^[XABCD]$/.test(t.text)).map((t) => [t.x, t.top]);
    expect(where(on.placed())).toEqual(where(off.placed()));
  });

  it('clear a thick line’s bigger handle too', () => {
    const state = drawing('xabcdPattern', anchors, { style: { color: '#4c8dff', lineWidth: 4, lineStyle: 'solid' } });
    const { ctx, placed } = fontCtx();
    new XABCDPatternTool().render(ctx, state, vp, true);
    const c = placed().find((t) => t.text === 'C')!;
    expect(boxDistance(c, px(anchors[3]))).toBeGreaterThan(reach(state));
  });
});

describe('pattern ratios', () => {
  it('sit on their dashed guide in the mark size, clear of every handle and point letter', () => {
    const anchors = [at(10, 20), at(20, 70), at(30, 45), at(40, 60), at(50, 25)];
    const state = drawing('xabcdPattern', anchors);
    const { ctx, placed } = fontCtx();
    new XABCDPatternTool().render(ctx, state, vp, true);
    const all = placed();
    const ratios = all.filter((t) => /^\d\.\d{3}$/.test(t.text));
    const letters = all.filter((t) => /^[XABCD]$/.test(t.text));
    expect(ratios.length).toBeGreaterThan(0);
    for (const r of ratios) {
      expect(r.font).toContain(`${drawingLook().sizes.mark}px`);
      for (const a of anchors) expect(boxDistance(r, px(a))).toBeGreaterThan(reach(state));
      for (const l of letters) expect(overlaps(r, l)).toBe(false);
    }
    for (let i = 0; i < ratios.length; i++) {
      for (let j = i + 1; j < ratios.length; j++) expect(overlaps(ratios[i], ratios[j])).toBe(false);
    }
  });

  it('moves a ratio whose guide’s middle is on a handle along its guide, off the handle', () => {
    // B halfway between A and C in time and price: the AC guide's middle is B itself.
    const anchors = [at(10, 30), at(30, 70), at(40, 60), at(50, 50), at(70, 80)];
    const state = drawing('abcdPattern', anchors);
    const { ctx, placed } = fontCtx();
    new ABCDPatternTool().render(ctx, state, vp, true);
    const ratios = placed().filter((t) => /^\d\.\d{3}$/.test(t.text));
    for (const r of ratios) {
      for (const a of anchors) expect(boxDistance(r, px(a))).toBeGreaterThan(reach(state));
    }
  });

  it('are haloed, and their guides drawn as a tool’s guides: 1 px, dashed, lighter', () => {
    const anchors = [at(10, 20), at(20, 70), at(30, 45), at(40, 60), at(50, 25)];
    const { ctx, calls } = recordingCtx();
    new CypherPatternTool().render(ctx, drawing('cypherPattern', anchors), vp, false);
    const ratioTexts = calls.filter((c) => c.name === 'fillText' && /^\d\.\d{3}$/.test(String(c.args[0])));
    const halos = calls.filter((c) => c.name === 'strokeText').map((c) => c.args[0]);
    for (const r of ratioTexts) expect(halos).toContain(r.args[0]);
    expect(calls.some((c) => c.name === 'setLineDash' && JSON.stringify(c.args[0]) === '[3,3]')).toBe(true);
  });
});

describe('head and shoulders names', () => {
  /** Shoulders `shoulder` high and the head 80, their pivots `spread` bars apart. */
  const pattern = (spread: number, shoulder = 60) => [
    at(10, 30),
    at(10 + spread, shoulder),
    at(10 + 2 * spread, 40),
    at(10 + 3 * spread, 80),
    at(10 + 4 * spread, 42),
    at(10 + 5 * spread, shoulder + 2),
    at(10 + 6 * spread, 30),
  ];

  it('are set in the prose face above their peaks, clear of the handles', () => {
    setDrawingLook(DARK_THEME);
    const anchors = pattern(12);
    const state = drawing('headAndShoulders', anchors);
    const { ctx, placed } = fontCtx();
    new HeadAndShouldersTool().render(ctx, state, vp, true);
    const names = placed().filter((t) => /Shoulder|Head/.test(t.text));
    expect(names.map((t) => t.text)).toEqual(['Left Shoulder', 'Head', 'Right Shoulder']);
    [1, 3, 5].forEach((anchor, i) => {
      const p = px(anchors[anchor]);
      expect(names[i].font).toContain(drawingLook().prose);
      expect(names[i].bottom).toBeLessThan(p.y);
      expect(boxDistance(names[i], p)).toBeGreaterThan(reach(state));
    });
  });

  it('turn to short forms rather than print over each other when the peaks are close', () => {
    // Shoulders nearly as high as the head, peaks 40 px apart: the full names would meet.
    const anchors = pattern(2, 77);
    const { ctx, placed } = fontCtx();
    new HeadAndShouldersTool().render(ctx, drawing('headAndShoulders', anchors), vp, false);
    const names = placed().filter((t) => t.text.length > 0 && !/^\d/.test(t.text));
    expect(names.map((t) => t.text)).toEqual(['LS', 'H', 'RS']);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) expect(overlaps(names[i], names[j])).toBe(false);
    }
  });

  it('never print over each other, however close the peaks', () => {
    const anchors = pattern(1, 78);
    const { ctx, placed } = fontCtx();
    new HeadAndShouldersTool().render(ctx, drawing('headAndShoulders', anchors), vp, false);
    const names = placed();
    expect(names.some((t) => t.text === 'H' || t.text === 'Head')).toBe(true);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) expect(overlaps(names[i], names[j])).toBe(false);
    }
  });

  it('fill their triangles with the line’s colour, faint, in both themes', () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      setDrawingLook(theme);
      const { ctx, calls } = recordingCtx();
      const fills: unknown[] = [];
      const probe = new Proxy(ctx as unknown as Record<string, unknown>, {
        get: (t, k: string) => (k === 'fill' ? () => fills.push(t.fillStyle) : t[k]),
        set: (t, k: string, v) => { t[k] = v; return true; },
      }) as unknown as CanvasRenderingContext2D;
      new HeadAndShouldersTool().render(probe, drawing('headAndShoulders', pattern(12)), vp, false);
      expect(fills).toHaveLength(3);
      for (const f of fills) expect(String(f)).toMatch(/rgba\(76, 141, 255, 0\.1\d*\)/);
      expect(calls.length).toBeGreaterThan(0);
    }
  });
});

describe('Elliott wave labels', () => {
  const impulse = [at(10, 20), at(20, 50), at(30, 35), at(40, 75), at(50, 55), at(60, 85)];

  it('sit outside each turning point, clear of its handle, above a high and below a low', () => {
    const state = drawing('elliottImpulse', impulse);
    const { ctx, placed } = fontCtx();
    new ElliottImpulseTool().render(ctx, state, vp, true);
    const labels = placed();
    expect(labels.map((t) => t.text)).toEqual(['0', '1', '2', '3', '4', '5']);
    labels.forEach((t, i) => {
      const p = px(impulse[i]);
      expect(t.x).toBeCloseTo(p.x);
      expect(boxDistance(t, p)).toBeGreaterThan(reach(state));
      if (i % 2 === 1) expect(t.bottom).toBeLessThan(p.y);
      else expect(t.top).toBeGreaterThan(p.y);
    });
  });

  it('draws a primary degree’s ring itself round a plain figure, not a circled glyph too small to read', () => {
    const state = drawing('elliottImpulse', impulse, { options: { degree: 'primary' } });
    const { ctx, placed, arcs } = fontCtx();
    new ElliottImpulseTool().render(ctx, state, vp, false);
    expect(placed().map((t) => t.text)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(arcs).toHaveLength(6);
    // Each ring round its figure, and clear of its point.
    arcs.forEach(([cx, cy, r], i) => {
      const p = px(impulse[i]);
      expect(cx).toBeCloseTo(p.x);
      expect(Math.abs(cy - p.y) - r).toBeGreaterThan(handleRadius(1));
      expect(r).toBeGreaterThanOrEqual(drawingLook().sizes.letter / 2);
    });
  });

  it('labels a full cycle’s letters too', () => {
    const cycle = [...impulse.slice(1), at(70, 60), at(80, 70), at(90, 40)];
    const { ctx, placed } = fontCtx();
    new ElliottWaveTool().render(ctx, drawing('elliottWave', cycle), vp, false);
    expect(placed().map((t) => t.text)).toEqual(['1', '2', '3', '4', '5', 'A', 'B', 'C']);
  });
});

describe('ratios side by side', () => {
  it('two ratios on near-collinear guides keep a word’s gap, so they read as two', async () => {
    const { drawGuideRatio } = await import('../tools/patternLabels.js');
    const { ctx } = textCtx();
    const first = drawGuideRatio(ctx, '0.915', { x: 0, y: 200 }, { x: 200, y: 200 }, [])!;
    const second = drawGuideRatio(ctx, '0.830', { x: 0, y: 201 }, { x: 260, y: 201 }, [first])!;
    expect(second).not.toBeNull();
    const [a, b] = [first, second].sort((p, q) => p.left - q.left);
    const gap = b.left - a.right;
    expect(gap).toBeGreaterThanOrEqual(6);
  });
});

describe('ratios on one line', () => {
  it('a ratio whose guide is taken all along moves just off it rather than being left out', async () => {
    const { drawGuideRatio } = await import('../tools/patternLabels.js');
    const { ctx } = textCtx();
    // Two guides over the same stretch: the second finds every spot on its line taken by the first's room.
    const first = drawGuideRatio(ctx, '0.915', { x: 0, y: 200 }, { x: 80, y: 200 }, [])!;
    const second = drawGuideRatio(ctx, '0.830', { x: 0, y: 200 }, { x: 80, y: 200 }, [first]);
    expect(second).not.toBeNull();
    expect(second!.top >= first.bottom || second!.bottom <= first.top).toBe(true);
  });
});
