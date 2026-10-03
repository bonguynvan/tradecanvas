import { describe, it, expect, vi } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { fillTag } from '../shapes.js';

function ctx() {
  return { fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(), fill: vi.fn() };
}

describe('fillTag', () => {
  it('fills a square box by default', () => {
    const c = ctx();
    fillTag(c as unknown as CanvasRenderingContext2D, 10, 20, 60, 18, DARK_THEME);
    expect(c.fillRect).toHaveBeenCalledWith(10, 20, 60, 18);
    expect(c.arcTo).not.toHaveBeenCalled();
  });

  it('rounds its corners by the theme, a pill at most', () => {
    const c = ctx();
    fillTag(c as unknown as CanvasRenderingContext2D, 0, 0, 60, 18, { ...DARK_THEME, shape: { tagRadius: 999 } });
    expect(c.fillRect).not.toHaveBeenCalled();
    expect(c.arcTo).toHaveBeenCalledTimes(4);
    expect(c.arcTo.mock.calls.every((call) => call[4] === 9)).toBe(true); // half the height
    expect(c.fill).toHaveBeenCalled();
  });
});
