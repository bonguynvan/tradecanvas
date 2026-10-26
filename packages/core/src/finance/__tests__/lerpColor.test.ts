import { describe, it, expect } from 'vitest';
import { lerpColor } from '@tradecanvas/commons';

describe('lerpColor', () => {
  it('mixes two hex colours, short or long, as rgb()', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
    expect(lerpColor('#f00', '#00f', 0.25)).toBe('rgb(191,0,64)');
    expect(lerpColor('#1fa874', '#e8505b', 0)).toBe('rgb(31,168,116)');
    expect(lerpColor('#1fa874', '#e8505b', 1)).toBe('rgb(232,80,91)');
  });

  it('reads rgb() and rgba(), with commas or spaces', () => {
    expect(lerpColor('rgb(0, 0, 0)', 'rgb(200 100 50)', 0.5)).toBe('rgb(100,50,25)');
    expect(lerpColor('rgba(10, 20, 30, 1)', '#ffffff', 0)).toBe('rgb(10,20,30)');
  });

  // PerformanceDashboard's monthly heatmap fades to its panel's see-through surface at zero: read as
  // hex, that surface was NaN, and every month between -5% and +5% was painted the browser's guess.
  it('mixes toward a see-through colour by its alpha, keeping the hue of the other', () => {
    const surface = 'rgba(255,255,255,0.03)';
    expect(lerpColor('#e8505b', surface, 0)).toBe('rgb(232,80,91)');
    expect(lerpColor('#e8505b', surface, 1)).toBe('rgba(255,255,255,0.03)');
    const half = lerpColor('#e8505b', surface, 0.5);
    expect(half).not.toMatch(/NaN/);
    const [r, g, b, a] = half.match(/[\d.]+/g)!.map(Number);
    expect(a).toBeCloseTo(0.515, 3);
    // Still the red, fainter: not washed toward the surface's white, as mixing the channels alone would.
    expect([r, g, b]).toEqual([233, 85, 96]);
  });

  it('reads #rgba and #rrggbbaa alphas', () => {
    expect(lerpColor('#ff000080', '#ff0000', 0)).toBe('rgba(255,0,0,0.502)');
    expect(lerpColor('#f008', '#f00', 1)).toBe('rgb(255,0,0)');
  });

  it('gives a colour it cannot read back as it is, from the end it is nearer, never NaN', () => {
    expect(lerpColor('teal', '#ffffff', 0.2)).toBe('teal');
    expect(lerpColor('teal', '#ffffff', 0.8)).toBe('#ffffff');
    expect(lerpColor('#000000', 'hsl(0 0% 50%)', 0.3)).toBe('#000000');
  });
});
