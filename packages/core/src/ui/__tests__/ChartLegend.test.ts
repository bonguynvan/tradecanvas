import { describe, it, expect, vi } from 'vitest';
import type { ViewportState, OHLCBar, DataSeries } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ChartLegend } from '../ChartLegend.js';

function viewport(min: number, max: number): ViewportState {
  return {
    visibleRange: { from: 0, to: 10 },
    priceRange: { min, max },
    barWidth: 6,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 200, height: 100 },
  };
}

function bar(overrides: Partial<OHLCBar> = {}): OHLCBar {
  return { time: 0, open: 0.336, high: 0.339, low: 0.335, close: 0.337, volume: 1000, ...overrides };
}

function mockCtx() {
  const fillTextCalls: string[] = [];
  return {
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn((text: string) => fillTextCalls.push(text)),
      measureText: vi.fn(() => ({ width: 10 })),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      set font(_v: string) {},
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
      set globalAlpha(_v: number) {},
      set lineWidth(_v: number) {},
    } as unknown as CanvasRenderingContext2D,
    fillTextCalls,
  };
}

describe('ChartLegend — OHLC precision and locale', () => {
  it('derives decimals from the price range instead of a hardcoded 2, so sub-$1 assets are legible', () => {
    const legend = new ChartLegend();
    const data: DataSeries = [bar({ close: 0.337 }), bar({ close: 0.341 })];
    const { ctx, fillTextCalls } = mockCtx();

    // A tight price range around ~0.34 needs 4 decimals, not 2.
    legend.render(ctx, viewport(0.335, 0.342), DARK_THEME, data);

    const ohlcLine = fillTextCalls.find((t) => /^0[.,]\d+$/.test(t));
    expect(ohlcLine).toBeDefined();
    expect(ohlcLine).not.toBe('0.34');
  });

  it('formats OHLC and change values using the configured locale', () => {
    const legend = new ChartLegend();
    legend.setLocale('vi-VN');
    const data: DataSeries = [bar({ close: 0.336 }), bar({ close: 0.341 })];
    const { ctx, fillTextCalls } = mockCtx();

    legend.render(ctx, viewport(0.335, 0.342), DARK_THEME, data);

    // vi-VN uses a comma decimal separator.
    expect(fillTextCalls.some((t) => t.includes(','))).toBe(true);
    expect(fillTextCalls.some((t) => /^\d+\.\d+$/.test(t))).toBe(false);
  });
});

describe('ChartLegend — sub-cent assets', () => {
  // PEPE-like prices: ~0.0000043 with a range of ~3e-7.
  const pepe = (close: number): OHLCBar => ({ time: 0, open: 0.000004343, high: 0.000004401, low: 0.000004311, close, volume: 1 });

  it('follows the axis precision instead of rounding to 0.00', () => {
    const legend = new ChartLegend();
    const { ctx, fillTextCalls } = mockCtx();
    legend.render(ctx, viewport(0.0000042, 0.0000045), DARK_THEME, [pepe(0.000004343), pepe(0.000004349)]);
    expect(fillTextCalls).not.toContain('0.00');
    expect(fillTextCalls).toContain('0.00000434'); // open, at the axis's 8 decimals
  });

  it("uses a market's explicit precision and the number locale when set", () => {
    const legend = new ChartLegend();
    legend.setLocale('vi-VN');
    legend.setPricePrecision(10);
    const { ctx, fillTextCalls } = mockCtx();
    legend.render(ctx, viewport(0.0000042, 0.0000045), DARK_THEME, [pepe(0.000004343), pepe(0.000004349)]);
    expect(fillTextCalls).toContain('0,0000043430');
  });
});

describe('ChartLegend.getHeight', () => {
  it('covers the rows it draws, and nothing when hidden', () => {
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false, showOHLC: true, showVolume: true, fontSize: 12 });
    expect(legend.getHeight()).toBe(6 + 15 + 14);
    legend.setConfig({ showVolume: false });
    expect(legend.getHeight()).toBe(6 + 15);
    legend.setConfig({ visible: false });
    expect(legend.getHeight()).toBe(0);
  });

  it('takes no room at the top left when drawn in the top-right corner', () => {
    const legend = new ChartLegend();
    legend.setConfig({ showSymbol: false, showOHLC: true, showVolume: false, fontSize: 12, position: 'top-right' });
    expect(legend.getHeight()).toBe(0);
  });
});
