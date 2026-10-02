import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { IndicatorOutput } from '@tradecanvas/commons';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { priceToY } from '../../viewport/ScaleMapping.js';

/**
 * Every built-in indicator, checked against what it declares: the fields it
 * draws (`plots`), the scale it is drawn on and the colours it uses. Legends,
 * pane scales, axis labels and the settings dialog all trust these
 * declarations, so a renderer and its declaration must not drift apart.
 */

/** Output fields that are computed but not drawn. A new one must be added here on purpose. */
const NOT_DRAWN: Record<string, readonly string[]> = {
  psar: ['trend'],
  supertrend: ['trend'],
  svwap: ['session'],
  ao: ['up'],
  ac: ['up'],
  voldelta: ['up'],
  chaikinOsc: ['adl'],
  adx: ['dx'],
  lrc: ['slope'],
  ichimoku: ['chikou'],
};

/** Parameters that give these a value within 400 hourly bars. */
const PARAMS: Record<string, Record<string, number>> = { mtfma: { period: 3 } };

/** Not drawn bar by bar: a profile over price. */
const NOT_PER_BAR = new Set(['volumeProfile']);

const HOUR = 3_600_000;

/** A seeded random walk: the same bars every run. */
function walk(n: number): OHLCBar[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let close = 100;
  return Array.from({ length: n }, (_, i) => {
    const open = close;
    close = Math.max(1, open + (rand() - 0.5) * 3);
    const high = Math.max(open, close) + rand();
    const low = Math.min(open, close) - rand();
    return { time: Date.UTC(2025, 0, 1) + i * HOUR, open, high, low, close, volume: 100 + Math.round(rand() * 900) };
  });
}

const BARS = walk(400);
const COLORS = ['#110000', '#220000', '#330000', '#440000', '#550000'];

/** Records the y of every point drawn, and the colours used. */
function recorder() {
  const ys: number[] = [];
  const colors = new Set<string>();
  let stroke = '';
  let fill = '';
  const ctx = new Proxy({
    set strokeStyle(c: string) { stroke = c; }, get strokeStyle() { return stroke; },
    set fillStyle(c: string) { fill = c; }, get fillStyle() { return fill; },
    moveTo(_x: number, y: number) { ys.push(y); },
    lineTo(_x: number, y: number) { ys.push(y); },
    arc(_x: number, y: number) { ys.push(y); },
    rect(_x: number, y: number, _w: number, h: number) { ys.push(y, y + h); },
    fillRect(_x: number, y: number, _w: number, h: number) { ys.push(y, y + h); colors.add(fill); },
    stroke() { colors.add(stroke); },
    fill() { colors.add(fill); },
  } as Record<string, unknown>, {
    get: (t, k) => (k in t ? t[k as string] : () => undefined),
    set: (t, k, v) => { t[k as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, ys, colors };
}

const engine = new IndicatorEngine();
registerBuiltInIndicators(engine);
const descriptors = engine.getAvailableIndicators();

describe('built-in indicators keep to their declarations', () => {
  it('registers them all', () => {
    expect(descriptors.length).toBeGreaterThanOrEqual(70);
  });

  for (const descriptor of descriptors) {
    describe(descriptor.id, () => {
      let id = '';
      let output: IndicatorOutput;
      const plots = descriptor.plots;
      beforeAll(() => {
        id = engine.addIndicator(descriptor.id, PARAMS[descriptor.id] ?? {}, BARS);
        engine.updateIndicatorStyle(id, { colors: [...COLORS], lineWidths: [1] });
        output = engine.getOutput(id)!;
      });
      afterAll(() => engine.removeIndicator(id));

      it('declares what it draws, and draws nothing else', () => {
        expect(plots, 'plots').toBeDefined();
        if (NOT_PER_BAR.has(descriptor.id)) return;
        const drawn = new Set(plots!.map((p) => p.key));
        const extra = new Set<string>();
        for (const val of output.series ?? []) {
          for (const key in val ?? {}) if (!drawn.has(key)) extra.add(key);
        }
        expect([...extra].sort()).toEqual([...(NOT_DRAWN[descriptor.id] ?? [])].sort());
        const hasValues = plots!.some((p) => output.series?.some((v) => Number.isFinite(v?.[p.key])));
        expect(hasValues).toBe(true);
      });

      if (NOT_PER_BAR.has(descriptor.id)) return;

      it('draws on the scale the axis shows, in its declared colours', () => {
        const from = 250;
        const to = BARS.length - 1;
        let priceRange: { min: number; max: number };
        if (descriptor.placement === 'panel') {
          priceRange = engine.getPaneValueRange(id, from, to)!;
        } else {
          let min = Infinity;
          let max = -Infinity;
          for (const bar of BARS.slice(from)) { min = Math.min(min, bar.low); max = Math.max(max, bar.high); }
          const overlay = engine.getOverlayPriceRange(from, to);
          priceRange = { min: Math.min(min, overlay?.min ?? min), max: Math.max(max, overlay?.max ?? max) };
        }
        const viewport = {
          visibleRange: { from, to }, priceRange, barWidth: 6, barSpacing: 2, offset: 0,
          chartRect: { x: 0, y: 0, width: 1200, height: 300 },
        } as ViewportState;

        const { ctx, ys, colors } = recorder();
        if (descriptor.placement === 'panel') engine.renderPanel(ctx, id, viewport);
        else engine.renderOverlays(ctx, viewport);

        // Every point drawn sits on a value of a plot (any bar: lines may start
        // off screen), or on zero (histogram bases).
        const expected = [priceToY(0, viewport)];
        for (const val of output.series ?? []) {
          for (const plot of plots!) {
            const v = val?.[plot.key];
            if (v !== undefined && Number.isFinite(v)) expected.push(priceToY(v, viewport));
          }
        }
        expected.sort((a, b) => a - b);
        const near = (y: number) => {
          let lo = 0;
          let hi = expected.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (expected[mid] < y) lo = mid + 1; else hi = mid;
          }
          return Math.min(Math.abs(expected[lo] - y), lo > 0 ? Math.abs(expected[lo - 1] - y) : Infinity) <= 1.01;
        };
        const off = ys.filter((y) => !near(y));
        expect(off.length, `points off the scale, e.g. ${off.slice(0, 3).join(', ')}`).toBe(0);
        expect(ys.length).toBeGreaterThan(0);

        for (const plot of plots!) {
          const visible = output.series?.slice(from).some((v) => Number.isFinite(v?.[plot.key]));
          if (visible) expect(colors, `${plot.key} in colours[${plot.color}]`).toContain(COLORS[plot.color]);
        }
      });
    });
  }
});
