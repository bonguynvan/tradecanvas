import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { PriceAxis } from '../PriceAxis.js';

function recorder() {
  const texts: { text: string; x: number; align: string }[] = [];
  const lines: number[] = [];
  let align = 'left';
  const ctx = {
    set textAlign(v: string) { align = v; },
    get textAlign() { return align; },
    fillText: (text: string, x: number) => texts.push({ text, x, align }),
    moveTo: (x: number) => lines.push(x),
    lineTo: () => {}, beginPath: () => {}, stroke: () => {},
    set strokeStyle(_v: string) {}, set fillStyle(_v: string) {}, set lineWidth(_v: number) {},
    set globalAlpha(_v: number) {}, set font(_v: string) {}, set textBaseline(_v: string) {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, texts, lines };
}

const viewport = {
  chartRect: { x: 70, y: 0, width: 500, height: 300 },
  priceRange: { min: 0, max: 100 },
  visibleRange: { from: 0, to: 10 }, barWidth: 8, barSpacing: 2, offset: 0,
} as ViewportState;

describe('PriceAxis on the left', () => {
  it('draws its labels left of the plot, right-aligned against it', () => {
    const { ctx, texts, lines } = recorder();
    new PriceAxis().render(ctx, viewport, DARK_THEME, 'left');
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every((t) => t.x < 70 && t.align === 'right')).toBe(true);
    expect(lines.every((x) => x <= 70.5)).toBe(true);
  });

  it('still draws on the right by default', () => {
    const { ctx, texts } = recorder();
    new PriceAxis().render(ctx, viewport, DARK_THEME);
    expect(texts.every((t) => t.x > 570 && t.align === 'left')).toBe(true);
  });
});
