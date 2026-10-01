import { describe, it, expect } from 'vitest';
import { HorizontalRayTool } from '../tools/HorizontalRay.js';
import { drawing, unitViewport } from './fixtures.js';

describe('HorizontalRayTool.hitTest', () => {
  const tool = new HorizontalRayTool();

  it('hits points at the configured price, forward of the anchor in time', () => {
    // anchor (time 5, price 30) -> pixel (55, 70).
    const state = drawing('horizontalRay', [{ time: 5, price: 30 }]);
    expect(tool.hitTest({ x: 55, y: 70 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 800, y: 70 }, state, unitViewport, 2)).toBe(true);
  });

  it('does not extend backward past the anchor, unlike horizontalLine', () => {
    const state = drawing('horizontalRay', [{ time: 5, price: 30 }]);
    expect(tool.hitTest({ x: 5, y: 70 }, state, unitViewport, 2)).toBe(false);
  });

  it('misses when the y is outside tolerance', () => {
    const state = drawing('horizontalRay', [{ time: 5, price: 30 }]);
    expect(tool.hitTest({ x: 100, y: 50 }, state, unitViewport, 2)).toBe(false);
  });

  it('returns false with no anchors', () => {
    const state = drawing('horizontalRay', []);
    expect(tool.hitTest({ x: 5, y: 70 }, state, unitViewport, 2)).toBe(false);
  });
});
