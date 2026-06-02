import { describe, expect, it, vi } from 'vitest';
import { AxisDragHandler } from '../AxisDragHandler.js';

describe('AxisDragHandler', () => {
  it('does not emit before crossing the drag threshold', () => {
    const onPrice = vi.fn();
    const onTime = vi.fn();
    const h = new AxisDragHandler(onPrice, onTime);

    h.begin('price', { x: 100, y: 100 });
    h.move({ x: 100, y: 102 }); // 2px — under threshold (3)

    expect(onPrice).not.toHaveBeenCalled();
  });

  it('drag down on price axis emits factor > 1 (expand range)', () => {
    const onPrice = vi.fn();
    const h = new AxisDragHandler(onPrice, vi.fn());

    h.begin('price', { x: 100, y: 100 });
    h.move({ x: 100, y: 130 }); // drag DOWN 30px

    expect(onPrice).toHaveBeenCalledTimes(1);
    const factor = onPrice.mock.calls[0][0];
    expect(factor).toBeGreaterThan(1);
  });

  it('drag up on price axis emits factor < 1 (compress range)', () => {
    const onPrice = vi.fn();
    const h = new AxisDragHandler(onPrice, vi.fn());

    h.begin('price', { x: 100, y: 100 });
    h.move({ x: 100, y: 70 }); // drag UP 30px

    const factor = onPrice.mock.calls[0][0];
    expect(factor).toBeLessThan(1);
  });

  it('drag right on time axis emits factor > 1 (zoom out)', () => {
    const onTime = vi.fn();
    const h = new AxisDragHandler(vi.fn(), onTime);

    h.begin('time', { x: 100, y: 100 });
    h.move({ x: 130, y: 100 });

    const factor = onTime.mock.calls[0][0];
    expect(factor).toBeGreaterThan(1);
  });

  it('end() returns true only when a real drag occurred', () => {
    const h = new AxisDragHandler(vi.fn(), vi.fn());
    h.begin('price', { x: 100, y: 100 });
    expect(h.end()).toBe(false); // no movement → click, not drag

    h.begin('price', { x: 100, y: 100 });
    h.move({ x: 100, y: 130 });
    expect(h.end()).toBe(true);
  });
});
