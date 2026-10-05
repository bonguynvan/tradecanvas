import { describe, expect, it } from 'vitest';
import type { OHLCBar, ResolvedIndicatorStyle, ViewportState } from '@tradecanvas/commons';
import { EMAIndicator } from '../overlay/EMA.js';
import { BollingerBandsIndicator } from '../overlay/BollingerBands.js';
import { IchimokuIndicator } from '../overlay/Ichimoku.js';
import { PivotPointsIndicator } from '../overlay/PivotPoints.js';
import { SupertrendIndicator } from '../overlay/Supertrend.js';
import type { IndicatorBase } from '../IndicatorBase.js';
import { plotLook } from '../plots.js';
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

const base: ResolvedIndicatorStyle = { colors: ['#111111', '#222222'], lineWidths: [2], opacity: 1 };

function draw(indicator: IndicatorBase, style: ResolvedIndicatorStyle) {
  const output = indicator.calculate(bars, { id: indicator.descriptor.id, instanceId: 'x', params: { ...indicator.descriptor.defaultConfig }, visible: true });
  const rec = strokeRecorder();
  indicator.render(rec.ctx, output, viewport, style);
  return rec.strokes;
}

describe('plot looks of indicators that draw themselves', () => {
  it('reads a plot style into whether it shows and its dashes', () => {
    expect(plotLook(base, 'value', 2)).toEqual({ visible: true, dash: [] });
    expect(plotLook({ plots: { value: { lineStyle: 'dotted' } } }, 'value', 2)).toEqual({ visible: true, dash: [2, 4] });
    expect(plotLook({ plots: { value: { visible: false } } }, 'value', 2).visible).toBe(false);
  });

  it('dashes or hides a moving average as its plot style says', () => {
    expect(draw(new EMAIndicator(), base)[0].dash).toEqual([]);
    expect(draw(new EMAIndicator(), { ...base, plots: { value: { lineStyle: 'dashed' } } })[0].dash.length).toBeGreaterThan(0);
    expect(draw(new EMAIndicator(), { ...base, plots: { value: { visible: false } } })).toEqual([]);
  });

  it('hides one band of the Bollinger Bands and keeps the others', () => {
    const all = draw(new BollingerBandsIndicator(), base);
    const without = draw(new BollingerBandsIndicator(), { ...base, plots: { middle: { visible: false } } });
    expect(without).toHaveLength(all.length - 1);
    expect(without.some((s) => s.color === '#222222')).toBe(false);
  });

  it("leaves out one of Ichimoku's lines and dashes another", () => {
    const style: ResolvedIndicatorStyle = { colors: ['#111111', '#222222', '#333333', '#444444'], lineWidths: [1], opacity: 1 };
    const all = draw(new IchimokuIndicator(), style).filter((s) => s.segments.length > 0);
    const looked = draw(new IchimokuIndicator(), { ...style, plots: { kijun: { visible: false }, tenkan: { lineStyle: 'dashed' } } })
      .filter((s) => s.segments.length > 0);
    expect(looked).toHaveLength(all.length - 1);
    expect(looked.some((s) => s.color === '#222222')).toBe(false);
    expect(looked.find((s) => s.color === '#111111')!.dash.length).toBeGreaterThan(0);
  });

  it('hides a pivot level and draws a support solid when its plot says so', () => {
    const style: ResolvedIndicatorStyle = { colors: ['#111111', '#222222', '#333333'], lineWidths: [2], opacity: 1 };
    const all = draw(new PivotPointsIndicator(), style);
    const looked = draw(new PivotPointsIndicator(), { ...style, plots: { r1: { visible: false }, s1: { lineStyle: 'solid' } } });
    expect(looked).toHaveLength(all.length - 1);
    expect(all.filter((s) => s.dash.length === 0)).toHaveLength(1);
    expect(looked.filter((s) => s.dash.length === 0)).toHaveLength(2);
  });

  it('draws nothing of a hidden Supertrend', () => {
    expect(draw(new SupertrendIndicator(), base).length).toBeGreaterThan(0);
    expect(draw(new SupertrendIndicator(), { ...base, plots: { value: { visible: false } } })).toEqual([]);
  });
});
