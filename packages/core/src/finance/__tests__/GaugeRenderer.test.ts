import { describe, it, expect } from 'vitest';
import type { GaugeOptions, Theme } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import {
  computeGaugeLayout,
  gaugeRingBands,
  gaugeValueToAngle,
  gaugeZoneAt,
  renderGauge,
} from '../GaugeRenderer.js';

const base: GaugeOptions = { value: 50 };

type Layout = ReturnType<typeof computeGaugeLayout>;

/** Points sampled along the ring's outer edge. */
function outerEdge(layout: Layout): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const r = layout.radius + layout.thickness / 2;
  for (let i = 0; i <= 64; i++) {
    const a = layout.startAngle + ((layout.endAngle - layout.startAngle) * i) / 64;
    pts.push({ x: layout.cx + Math.cos(a) * r, y: layout.cy + Math.sin(a) * r });
  }
  return pts;
}

function expectRingInside(layout: Layout, w: number, h: number): void {
  for (const p of outerEdge(layout)) {
    expect(p.x).toBeGreaterThanOrEqual(-0.5);
    expect(p.x).toBeLessThanOrEqual(w + 0.5);
    expect(p.y).toBeGreaterThanOrEqual(-0.5);
    expect(p.y).toBeLessThanOrEqual(h + 0.5);
  }
}

/**
 * Canvas stand-in: records save/restore depth and the text drawn, measures
 * text as 0.6 em per character so fitting logic runs.
 */
function fakeCtx(): { ctx: CanvasRenderingContext2D; depth: () => number; texts: string[] } {
  let depth = 0;
  const texts: string[] = [];
  const state: Record<string, unknown> = { font: '10px sans-serif' };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop === 'save') return () => { depth++; };
      if (prop === 'restore') return () => { depth--; };
      if (prop === 'fillText') return (t: string) => { texts.push(t); };
      if (prop === 'measureText') {
        return (t: string) => {
          const size = Number(/(\d+(?:\.\d+)?)px/.exec(String(target.font))?.[1] ?? 10);
          return { width: t.length * size * 0.6 };
        };
      }
      if (prop in target) return target[prop as string];
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, depth: () => depth, texts };
}

const theme: Theme = DARK_THEME;

describe('computeGaugeLayout', () => {
  it.each([
    ['wide panel', 480, 220],
    ['tall panel', 220, 420],
    ['square tile', 260, 260],
    ['small card', 120, 90],
  ])('keeps the whole ring inside a %s', (_name, w, h) => {
    expectRingInside(computeGaugeLayout(w, h, base), w, h);
  });

  it('fills the limiting dimension instead of leaving a small dial', () => {
    const layout = computeGaugeLayout(480, 220, base);
    const ys = outerEdge(layout).map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(220 * 0.7);
  });

  it('keeps a half-circle gauge number above the chord', () => {
    const layout = computeGaugeLayout(320, 200, { ...base, startAngle: 180, endAngle: 360 });
    expect(layout.valueY).toBeLessThan(layout.cy);
  });

  it('reserves room for zone labels drawn outside the ring', () => {
    const zones = [{ from: 0, to: 50, color: 'red', label: 'Extreme fear' }, { from: 50, to: 100, color: 'green' }];
    const plain = computeGaugeLayout(300, 200, { ...base, zones });
    const labelled = computeGaugeLayout(300, 200, { ...base, zones, showZoneLabels: true });
    expect(labelled.radius).toBeLessThan(plain.radius);
    // "Extreme fear" (≈ 80 px) fits between the ring and the edge.
    expect(labelled.cx - labelled.radius - labelled.thickness / 2 - 8).toBeGreaterThanOrEqual(12 * 6.5);
  });

  describe('normalises odd input', () => {
    it.each([
      ['an end below the start', { startAngle: 150, endAngle: 30 }, 240],
      ['angles beyond a turn', { startAngle: 720, endAngle: 0 }, 360],
      ['a sweep over 360°', { startAngle: 0, endAngle: 500 }, 360],
      ['a needle-thin sweep', { startAngle: 0, endAngle: 5 }, 90],
    ])('%s', (_name, angles, sweepDeg) => {
      const layout = computeGaugeLayout(300, 300, { ...base, ...angles });
      expect(layout.endAngle - layout.startAngle).toBeCloseTo((sweepDeg * Math.PI) / 180);
      expectRingInside(layout, 300, 300);
    });

    it('survives an absurd end angle', () => {
      const layout = computeGaugeLayout(300, 300, { ...base, endAngle: 1e8 });
      expect(Number.isFinite(layout.radius)).toBe(true);
    });

    it('gives a collapsed range a usable span, even at large magnitudes', () => {
      for (const v of [0, 50, 3e9]) {
        const layout = computeGaugeLayout(300, 300, { value: v, min: v, max: v });
        expect(layout.max).toBeGreaterThan(layout.min);
        expect(Number.isFinite(gaugeValueToAngle(v, layout))).toBe(true);
      }
    });
  });
});

describe('gaugeValueToAngle', () => {
  it('maps min, max and the middle onto the sweep, clamping outside it', () => {
    const layout = computeGaugeLayout(300, 300, { value: 0, min: 0, max: 200 });
    expect(gaugeValueToAngle(0, layout)).toBeCloseTo(layout.startAngle);
    expect(gaugeValueToAngle(200, layout)).toBeCloseTo(layout.endAngle);
    expect(gaugeValueToAngle(100, layout)).toBeCloseTo((layout.startAngle + layout.endAngle) / 2);
    expect(gaugeValueToAngle(-50, layout)).toBeCloseTo(layout.startAngle);
    expect(gaugeValueToAngle(999, layout)).toBeCloseTo(layout.endAngle);
  });

  it('puts a missing value at the start instead of NaN', () => {
    const layout = computeGaugeLayout(300, 300, base);
    expect(gaugeValueToAngle(Number.NaN, layout)).toBe(layout.startAngle);
  });
});

describe('gaugeZoneAt', () => {
  const zones = [
    { from: 75, to: 100, color: 'green', label: 'Greed' },
    { from: 0, to: 25, color: 'red', label: 'Fear' },
    { from: 25, to: 75, color: 'grey', label: 'Neutral' },
  ];

  it('finds the zone holding the value, in any order; a shared edge goes to the later zone', () => {
    expect(gaugeZoneAt(10, zones)?.label).toBe('Fear');
    expect(gaugeZoneAt(25, zones)?.label).toBe('Neutral');
    expect(gaugeZoneAt(90, zones)?.label).toBe('Greed');
  });

  it('returns undefined outside every zone, without zones, or for NaN', () => {
    expect(gaugeZoneAt(120, zones)).toBeUndefined();
    expect(gaugeZoneAt(10, undefined)).toBeUndefined();
    expect(gaugeZoneAt(Number.NaN, zones)).toBeUndefined();
  });
});

describe('gaugeRingBands', () => {
  const layout = computeGaugeLayout(300, 300, base);

  it('fills the ring between partial zones with track', () => {
    const bands = gaugeRingBands(layout, [
      { from: 75, to: 100, color: 'green' },
      { from: 0, to: 25, color: 'red' },
    ], 'track');
    expect(bands.map((b) => (b.track ? 'track' : b.color))).toEqual(['red', 'track', 'green']);
    expect(bands[0].a0).toBeCloseTo(layout.startAngle);
    expect(bands[2].a1).toBeCloseTo(layout.endAngle);
  });

  it('paints overlapping zones once each, in order', () => {
    const bands = gaugeRingBands(layout, [
      { from: 0, to: 60, color: 'a' },
      { from: 40, to: 80, color: 'b' },
      { from: 10, to: 30, color: 'c' }, // inside a: dropped
    ], 'track');
    expect(bands.map((b) => (b.track ? 'track' : b.color))).toEqual(['a', 'b', 'track']);
    expect(bands[1].a0).toBeCloseTo(bands[0].a1);
  });

  it('is one track band without zones', () => {
    expect(gaugeRingBands(layout, undefined, 'track')).toHaveLength(1);
  });
});

describe('renderGauge', () => {
  const zones = [
    { from: 0, to: 25, color: '#e8505b', label: 'Extreme fear' },
    { from: 75, to: 100, color: '#1fa874', label: 'Extreme greed' },
  ];

  it.each([
    ['marker', { value: 90, zones, label: 'Fear & Greed' }],
    ['needle', { value: 90, zones, label: 'Fear & Greed', pointer: 'needle' as const }],
    ['missing value', { value: Number.NaN, zones }],
    ['collapsed range', { value: 5, min: 5, max: 5 }],
  ])('draws %s without leaking canvas state', (_name, options) => {
    const { ctx, depth } = fakeCtx();
    expect(() => renderGauge(ctx, 300, 220, options as GaugeOptions, theme, options.value)).not.toThrow();
    expect(depth()).toBe(0);
  });

  it('shows a dash, not "NaN", for a missing value', () => {
    const { ctx, texts } = fakeCtx();
    renderGauge(ctx, 300, 220, { value: Number.NaN }, theme, Number.NaN);
    expect(texts).toContain('—');
    expect(texts.some((t) => t.includes('NaN'))).toBe(false);
  });

  it('drops the zone label when it cannot fit a small dial', () => {
    const { ctx, texts } = fakeCtx();
    renderGauge(ctx, 120, 90, { value: 90, zones }, theme, 90);
    expect(texts).toContain('90');
    expect(texts).not.toContain('EXTREME GREED');
  });

  it('keeps the needle-mode label above the end labels', () => {
    const layout = computeGaugeLayout(300, 200, { value: 50, label: 'Index', pointer: 'needle' });
    expect(layout.textBottom).toBeLessThanOrEqual(200);
    const endY = layout.cy + Math.sin(layout.startAngle) * layout.radius;
    expect(layout.textBottom).toBeGreaterThan(endY);
  });
});
