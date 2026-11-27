import { describe, it, expect } from 'vitest';
import { fadeBy, withAlpha } from '@tradecanvas/commons';

describe('fadeBy: a colour at a strength of its own alpha', () => {
  it('reads an opaque colour as withAlpha does, so fills in plain colours look as before', () => {
    expect(fadeBy('#2962ff', 0.08)).toBe(withAlpha('#2962ff', 0.08));
    expect(fadeBy('#2962ff', 0.08)).toBe('rgba(41, 98, 255, 0.08)');
    expect(fadeBy('rgb(41, 98, 255)', 0.5)).toBe('rgba(41, 98, 255, 0.5)');
  });

  it('keeps a colour see-through of its own so, times the strength', () => {
    expect(fadeBy('#2962ff80', 0.5)).toBe('rgba(41, 98, 255, 0.251)');
    expect(fadeBy('rgba(41, 98, 255, 0.4)', 0.5)).toBe('rgba(41, 98, 255, 0.2)');
    expect(fadeBy('rgb(41 98 255 / 40%)', 0.5)).toBe('rgba(41, 98, 255, 0.2)');
  });

  it('keeps the strength within 0 and 1', () => {
    expect(fadeBy('#2962ff', 3)).toBe('rgba(41, 98, 255, 1)');
    expect(fadeBy('#2962ff', -1)).toBe('rgba(41, 98, 255, 0)');
  });

  it('gives a colour it cannot read (a name, hsl()) back as withAlpha does', () => {
    expect(fadeBy('red', 0.5)).toBe(withAlpha('red', 0.5));
    expect(fadeBy('hsl(200 50% 50%)', 0.5)).toBe('hsl(200 50% 50%)');
  });
});
