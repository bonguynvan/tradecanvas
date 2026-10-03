import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME, formatFraction, fractionTick, priceFormatterFor } from '@tradecanvas/commons';
import { PriceAxis } from '../PriceAxis.js';
import { TimeAxis } from '../TimeAxis.js';
import { CrosshairHandler } from '../../interaction/CrosshairHandler.js';
import { CurrentPriceLine } from '../../realtime/CurrentPriceLine.js';
import { HorizontalLineTool } from '../../drawings/tools/HorizontalLine.js';
import { drawing, unitViewport } from '../../drawings/__tests__/fixtures.js';

describe('formatFraction', () => {
  it('prints whole points and 32nds', () => {
    expect(formatFraction(101.5, 32)).toBe("101'16");
    expect(formatFraction(101.03125, 32)).toBe("101'01");
    expect(formatFraction(99, 32)).toBe("99'00");
  });

  it('rounds to the nearest fraction', () => {
    expect(formatFraction(101.51, 32)).toBe("101'16");
    expect(formatFraction(101.99, 32)).toBe("102'00");
  });

  it('prints halves and quarters of a 32nd the way futures quotes do', () => {
    expect(formatFraction(101 + 16.5 / 32, 32, 2)).toBe("101'165");
    expect(formatFraction(110 + 16.25 / 32, 32, 4)).toBe("110'162");
    expect(formatFraction(110 + 16.75 / 32, 32, 4)).toBe("110'167");
    expect(formatFraction(110 + 16 / 32, 32, 4)).toBe("110'160");
  });

  it('keeps the sign, and pads the numerator to the denominator’s digits', () => {
    expect(formatFraction(-2.25, 4)).toBe("-2'1");
    expect(formatFraction(-0.5, 32)).toBe("-0'16");
    expect(formatFraction(-0.0001, 32)).toBe("0'00");
    expect(formatFraction(5.0078125, 128)).toBe("5'001");
  });

  it('falls back to plain digits for a denominator it can’t use, or no number', () => {
    expect(formatFraction(1.5, 0)).toBe('1.5');
    expect(formatFraction(1.5, 2.5)).toBe('1.5');
    expect(formatFraction(Number.NaN, 32)).toBe('NaN');
  });

  it('knows the smallest step of a fraction', () => {
    expect(fractionTick({ denominator: 32 })).toBe(1 / 32);
    expect(fractionTick({ denominator: 32, subDenominator: 4 })).toBe(1 / 128);
  });
});

describe('priceFormatterFor', () => {
  it('takes a function, a fraction, or nothing', () => {
    expect(priceFormatterFor((p) => `$${p}`)?.(3)).toBe('$3');
    expect(priceFormatterFor({ denominator: 32 })?.(1.5)).toBe("1'16");
    expect(priceFormatterFor(null)).toBeNull();
    expect(priceFormatterFor(undefined)).toBeNull();
  });
});

/** Records filled text. */
function textCtx(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const state: Record<string, unknown> = { font: '', textAlign: 'start' };
  const ctx = new Proxy(state, {
    get: (t, key) => {
      if (key === 'fillText') return (text: string) => texts.push(text);
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (key in t) return t[key as string];
      return vi.fn();
    },
    set: (t, key, v) => { t[key as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

const bonds: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 100, max: 102 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 500, height: 400 },
  formatPrice: (p) => formatFraction(p, 32),
};

describe('the chart’s price format on its scale', () => {
  it('labels the price axis with it', () => {
    const { ctx, texts } = textCtx();
    new PriceAxis().render(ctx, bonds, DARK_THEME);
    expect(texts).toContain("101'00");
    expect(texts.every((t) => t.includes("'"))).toBe(true);
  });

  it('keeps percent labels on a percent scale', () => {
    const { ctx, texts } = textCtx();
    new PriceAxis().render(ctx, { ...bonds, scaleMode: 'percentage', scaleBaseline: 100 }, DARK_THEME);
    expect(texts.some((t) => t.endsWith('%'))).toBe(true);
  });

  it('labels the crosshair’s price with it, and with the percent on a percent scale', () => {
    const handler = new CrosshairHandler();
    const one: DataSeries = [{ time: Date.UTC(2026, 0, 1), open: 1, high: 1, low: 1, close: 1, volume: 1 }];
    handler.setData(one);
    handler.onPointerMove({ x: 50, y: 200 }); // 101 on this scale
    const fraction = textCtx();
    handler.renderAxisLabels(fraction.ctx, bonds, DARK_THEME as Theme, one);
    expect(fraction.texts).toContain("101'00");
    const percent = textCtx();
    handler.renderAxisLabels(percent.ctx, { ...bonds, scaleMode: 'percentage', scaleBaseline: 100 }, DARK_THEME as Theme, one);
    expect(percent.texts).toContain('+1.00%');
  });

  it('labels the last-price tag with it', () => {
    const line = new CurrentPriceLine();
    line.setPrice(101.5);
    const { ctx, texts } = textCtx();
    line.render(ctx, bonds, DARK_THEME);
    expect(texts).toContain("101'16");
  });

  it('labels a horizontal line drawing with it', () => {
    const { ctx, texts } = textCtx();
    new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 1, price: 50.5 }]), { ...unitViewport, formatPrice: (p) => formatFraction(p, 32) }, false);
    expect(texts).toContain("50'16");
  });
});

describe('the chart’s time format', () => {
  const HOUR = 3_600_000;
  const data: DataSeries = Array.from({ length: 60 }, (_, i) => ({
    time: Date.UTC(2026, 9, 1) + i * HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1,
  }));
  const vp = {
    chartRect: { x: 0, y: 0, width: 400, height: 300 },
    barWidth: 8, barSpacing: 2, offset: 0,
    priceRange: { min: 0, max: 2 }, visibleRange: { from: 0, to: 59 },
  } as ViewportState;

  it('labels the time axis with it, saying what each label is', () => {
    const axis = new TimeAxis();
    const kinds = new Set<string>();
    axis.setTimeFormatter((time, { kind }) => { kinds.add(kind); return `T${new Date(time).getUTCHours()}`; });
    axis.setTimezoneOffset(0);
    const { ctx, texts } = textCtx();
    axis.render(ctx, vp, DARK_THEME, data);
    expect(texts).toContain('T0');
    expect(kinds).toContain('day');
    expect(kinds).toContain('time');
  });

  it('labels the crosshair’s time with it', () => {
    const handler = new CrosshairHandler();
    handler.setData(data);
    handler.setTimeFormatter((time, { kind, timeZone }) => `${kind}:${timeZone}:${time}`);
    handler.setTimezoneOffset('Asia/Tokyo');
    handler.onPointerMove({ x: 34, y: 100 }); // bar 3
    const { ctx, texts } = textCtx();
    handler.renderAxisLabels(ctx, vp, DARK_THEME as Theme, data);
    expect(texts).toContain(`crosshair:Asia/Tokyo:${data[3].time}`);
  });
});
