import { describe, it, expect } from 'vitest';
import { lttbDownsample, lttbVisibleIndices } from '../downsample.js';

describe('lttbDownsample', () => {
  const ramp = (i: number) => i;

  it('returns all indices when threshold >= length', () => {
    expect(lttbDownsample(5, 10, ramp)).toEqual([0, 1, 2, 3, 4]);
    expect(lttbDownsample(5, 5, ramp)).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns just the endpoints when threshold <= 2', () => {
    expect(lttbDownsample(100, 2, ramp)).toEqual([0, 99]);
  });

  it('produces exactly `threshold` points, first/last kept, strictly increasing', () => {
    const out = lttbDownsample(1000, 50, (i) => Math.sin(i / 10));
    expect(out).toHaveLength(50);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]).toBeGreaterThan(out[i - 1]);
    }
  });

  it('preserves a sharp spike', () => {
    const spike = 500;
    const out = lttbDownsample(1000, 20, (i) => (i === spike ? 1000 : 0));
    expect(out).toContain(spike);
  });
});

describe('lttbVisibleIndices', () => {
  const getY = (i: number) => i;

  it('returns the full visible range when not oversampled', () => {
    expect(lttbVisibleIndices(10, 20, 1000, 800, getY)).toEqual(
      Array.from({ length: 11 }, (_, k) => 10 + k),
    );
  });

  it('downsamples an oversampled range to ~2 points/pixel, keeping endpoints', () => {
    const out = lttbVisibleIndices(0, 99_999, 100_000, 800, getY);
    expect(out.length).toBeLessThanOrEqual(1600);
    expect(out.length).toBeGreaterThan(800);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(99_999);
  });

  it('clamps to the data bounds', () => {
    expect(lttbVisibleIndices(-5, 1000, 10, 800, getY)).toEqual(
      Array.from({ length: 10 }, (_, k) => k),
    );
  });
});
