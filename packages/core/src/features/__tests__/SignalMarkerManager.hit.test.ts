import { describe, it, expect } from 'vitest';
import { SignalMarkerManager } from '../SignalMarkerManager.js';
import { unitViewport } from '../../drawings/__tests__/fixtures.js';

const data = Array.from({ length: 100 }, (_, i) => ({ time: i, open: 50, high: 50, low: 50, close: 50, volume: 0 }));

describe('signal markers under the pointer', () => {
  const manager = new SignalMarkerManager();
  manager.setDataGetter(() => data);
  // unitViewport: bar i at x = 10 i + 5, price p at y = 100 − p.
  const long = manager.addMarker({ time: 20, price: 40, direction: 'long', confidence: 1, source: 'bot' });
  const short = manager.addMarker({ time: 50, price: 70, direction: 'short', confidence: 1, source: 'bot' });

  it('finds a long by its arrow, which points up from its price', () => {
    expect(manager.markerAt({ x: 205, y: 55 }, unitViewport)?.id).toBe(long); // inside the arrow, above y 60
    expect(manager.markerAt({ x: 205, y: 70 }, unitViewport)).toBeNull(); // well below it
  });

  it('finds a short by its arrow, which points down', () => {
    expect(manager.markerAt({ x: 505, y: 38 }, unitViewport)?.id).toBe(short);
    expect(manager.markerAt({ x: 530, y: 38 }, unitViewport)).toBeNull();
  });

  it('finds nothing outside the plot', () => {
    expect(manager.markerAt({ x: -5, y: 50 }, unitViewport)).toBeNull();
  });
});
