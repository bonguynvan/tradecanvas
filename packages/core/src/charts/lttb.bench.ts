import { bench, describe } from 'vitest';
import { lttbDownsample } from './downsample.js';

function series(n: number): (i: number) => number {
  const data = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    data[i] = 50 + Math.sin(i / 100) * 10 + (i % 13) * 0.1;
  }
  return (i) => data[i];
}

// Downsampling cost to ~1600 points (2 points/pixel on an 800px chart).
describe('LTTB downsample → 1600 points', () => {
  const g10k = series(10_000);
  const g100k = series(100_000);
  const g1m = series(1_000_000);

  bench('10k points', () => {
    lttbDownsample(10_000, 1600, g10k);
  });
  bench('100k points', () => {
    lttbDownsample(100_000, 1600, g100k);
  });
  bench('1M points', () => {
    lttbDownsample(1_000_000, 1600, g1m);
  });
});
