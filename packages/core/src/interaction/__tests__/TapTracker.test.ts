import { describe, it, expect } from 'vitest';
import { TapTracker, DOUBLE_TAP_MS, DOUBLE_TAP_PX } from '../TapTracker.js';

describe('TapTracker', () => {
  it('takes two quick taps in one place for a double tap, and a third for a new first', () => {
    const t = new TapTracker();
    expect(t.tap({ x: 10, y: 10 }, 0)).toBe(false);
    expect(t.tap({ x: 14, y: 12 }, 200)).toBe(true);
    expect(t.tap({ x: 14, y: 12 }, 300)).toBe(false);
  });

  it('not when slow or apart', () => {
    const t = new TapTracker();
    t.tap({ x: 10, y: 10 }, 0);
    expect(t.tap({ x: 10, y: 10 }, DOUBLE_TAP_MS + 1)).toBe(false);
    expect(t.tap({ x: 10 + DOUBLE_TAP_PX + 1, y: 10 }, DOUBLE_TAP_MS + 50)).toBe(false);
  });

  it('forgets the first tap on reset', () => {
    const t = new TapTracker();
    t.tap({ x: 10, y: 10 }, 0);
    t.reset();
    expect(t.tap({ x: 10, y: 10 }, 100)).toBe(false);
  });
});
