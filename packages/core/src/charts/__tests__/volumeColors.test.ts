import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME, withAlpha, volumeColor, resolveVolumeColors } from '@tradecanvas/commons';

describe('withAlpha', () => {
  it('reads the usual colour forms', () => {
    expect(withAlpha('#1fa874', 0.5)).toBe('rgba(31, 168, 116, 0.5)');
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(withAlpha('#ffffff80', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(withAlpha('#f008', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
    expect(withAlpha('rgb(1 2 3)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
    expect(withAlpha('rgba(1, 2, 3, 0.9)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });

  it('leaves a colour it cannot read as it is', () => {
    expect(withAlpha('teal', 0.5)).toBe('teal');
  });
});

describe('resolveVolumeColors', () => {
  it('keeps a theme’s own volume colours', () => {
    const theme = { ...DARK_THEME, volumeUp: 'rgba(1, 2, 3, 0.4)', volumeDown: 'rgba(4, 5, 6, 0.4)' };
    expect(resolveVolumeColors(theme)).toEqual({ up: 'rgba(1, 2, 3, 0.4)', down: 'rgba(4, 5, 6, 0.4)' });
  });

  it('follows the candles when a theme changes them but keeps a preset’s volume', () => {
    const theme = { ...DARK_THEME, candleUp: '#26a69a', candleDown: '#ef5350' };
    expect(resolveVolumeColors(theme)).toEqual({ up: volumeColor('#26a69a'), down: volumeColor('#ef5350') });
    expect(resolveVolumeColors(LIGHT_THEME)).toEqual({ up: LIGHT_THEME.volumeUp, down: LIGHT_THEME.volumeDown });
  });

  it('keeps the preset volume when the candle colour cannot take an alpha', () => {
    const theme = { ...DARK_THEME, candleUp: 'teal' };
    expect(resolveVolumeColors(theme).up).toBe(DARK_THEME.volumeUp);
  });
});
