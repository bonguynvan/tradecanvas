import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZoomHandler } from '../ZoomHandler.js';

let frames: FrameRequestCallback[];

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => vi.unstubAllGlobals());

const flush = () => frames.splice(0).forEach((cb) => cb(0));

describe('ZoomHandler', () => {
  it('zooms a pinch by the change in finger distance', () => {
    const zoom = vi.fn();
    const handler = new ZoomHandler(zoom);
    handler.onPinch(1.25, { x: 120, y: 50 });
    handler.onPinch(1.6, { x: 130, y: 50 });
    flush();
    expect(zoom).toHaveBeenCalledTimes(1);
    expect(zoom.mock.calls[0][0]).toBeCloseTo(1); // 1.25 × 1.6 = 2: twice the size
    expect(zoom.mock.calls[0][1]).toBe(130);
  });

  it('ignores a pinch scale that is not a positive number', () => {
    const zoom = vi.fn();
    const handler = new ZoomHandler(zoom);
    handler.onPinch(0, { x: 0, y: 0 });
    handler.onPinch(Number.NaN, { x: 0, y: 0 });
    flush();
    expect(zoom).not.toHaveBeenCalled();
  });

  it('keeps the wheel at its sensitivity', () => {
    const zoom = vi.fn();
    new ZoomHandler(zoom).onWheel(-100, { x: 10, y: 0 });
    flush();
    expect(zoom.mock.calls[0][0]).toBeCloseTo(0.1);
  });
});
