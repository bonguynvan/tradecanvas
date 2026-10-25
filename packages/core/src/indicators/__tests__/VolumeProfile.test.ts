import { describe, expect, it } from 'vitest';
import type { OHLCBar, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { TC_PALETTE } from '@tradecanvas/commons';
import { VolumeProfileIndicator } from '../panel/VolumeProfile.js';
import { paletteFrom } from '../palette.js';
import { strokeRecorder } from '../../__tests__/strokeRecorder.js';

const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => {
  const p = 100 + Math.sin(i / 4) * 5;
  return { time: i * 60_000, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 10 };
});

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 59 },
  priceRange: { min: 80, max: 120 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 600, height: 400 },
};

/** The opaque series palette the engine hands a new indicator, at full strength. */
const engineStyle: ResolvedIndicatorStyle = { colors: paletteFrom(0), lineWidths: [1.5], opacity: 1 };

/** How strongly the chart-level volume profile shows; the indicator's rows match it. */
const PROFILE_ALPHA = 0.32;

function draw(style: ResolvedIndicatorStyle) {
  const indicator = new VolumeProfileIndicator();
  const output = indicator.calculate(bars, { id: 'volumeProfile', instanceId: 'vp', params: { ...indicator.descriptor.defaultConfig }, visible: true });
  const rec = strokeRecorder();
  indicator.render(rec.ctx, output, viewport, style);
  const bins = (output.meta as { bins: number[] }).bins;
  return { ...rec, bins };
}

describe('the Volume Profile indicator', () => {
  it('draws see-through rows in the opaque palette colours it is given', () => {
    const { fills } = draw(engineStyle);
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) expect(fill.alpha).toBeCloseTo(PROFILE_ALPHA);
  });

  it('marks its busiest rows by colour, at the same strength as the others', () => {
    const { fills } = draw(engineStyle);
    const colors = new Set(fills.map((f) => f.color));
    expect(colors).toEqual(new Set([engineStyle.colors[0], engineStyle.colors[1]]));
    expect(new Set(fills.map((f) => f.alpha)).size).toBe(1);
  });

  it("scales its rows' alpha by the instance opacity", () => {
    const { fills } = draw({ ...engineStyle, opacity: 0.5 });
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) expect(fill.alpha).toBeCloseTo(PROFILE_ALPHA * 0.5);
  });

  it('leaves the context at full strength after it has drawn', () => {
    const { ctx, fills } = draw(engineStyle);
    ctx.fillRect(0, 0, 1, 1);
    expect(fills[fills.length - 1].alpha).toBe(1);
  });

  it('draws nothing for a price row nobody traded at', () => {
    const { fills, bins } = draw(engineStyle);
    expect(bins.some((v) => v === 0)).toBe(true);
    expect(fills).toHaveLength(bins.filter((v) => v > 0).length);
    for (const fill of fills) expect(fill.rect[2]).toBeGreaterThan(0);
  });

  it('falls back to opaque palette colours when it is given too few', () => {
    const { fills } = draw({ ...engineStyle, colors: [] });
    const colors = new Set(fills.map((f) => f.color));
    expect(colors).toEqual(new Set([TC_PALETTE.blue, TC_PALETTE.amber]));
  });

  it('keeps its rows at the left edge of the plot', () => {
    const { fills } = draw(engineStyle);
    for (const fill of fills) expect(fill.rect[0]).toBe(viewport.chartRect.x);
  });
});
