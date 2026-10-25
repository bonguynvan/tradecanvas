// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { PinnedTooltip } from '../PinnedTooltip.js';
import { unitViewport } from '../../drawings/__tests__/fixtures.js';

describe('PinnedTooltip', () => {
  it('shows the bar time in the chart’s time zone', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setTimezone('Asia/Tokyo');
    // 2026-03-04 23:30 UTC is 08:30 on March 5 in Tokyo.
    tooltip.pin({ time: Date.UTC(2026, 2, 4, 23, 30), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME);
    expect(host.textContent).toContain('3/5 08:30');
  });

  it('puts the values in as text, whatever the theme colours hold', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    const hostile = { ...DARK_THEME, candleUp: 'red"><img src=x onerror=alert(1)>' };
    tooltip.pin({ time: Date.UTC(2026, 2, 4), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, hostile);
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('O');
    expect(host.textContent).toContain('1.50');
  });

  it('writes prices in the market’s decimals and the number locale', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    const bar = { time: Date.UTC(2026, 2, 4), open: 100_000, high: 100_085.3, low: 99_990.1, close: 100_018.7 };
    tooltip.pin(bar, 0, DARK_THEME);
    // No market decimals: two, grouped.
    expect(host.textContent).toContain('100,018.70');
    tooltip.setPricePrecision(1);
    tooltip.setLocale('de-DE');
    tooltip.pin(bar, 0, DARK_THEME);
    expect(host.textContent).toContain('100.018,7');
    expect(host.textContent).toContain('99.990,1');
  });

  it('writes the move to the bar under the crosshair, its percentage too, in the number locale', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setPricePrecision(1);
    tooltip.setLocale('de-DE');
    const pinned = { time: Date.UTC(2026, 2, 4), open: 100_000, high: 100_000, low: 100_000, close: 100_000 };
    tooltip.pin(pinned, 0, DARK_THEME);
    const viewport = { ...unitViewport, priceRange: { min: 99_000, max: 102_000 } };
    tooltip.reposition(viewport, { ...pinned, time: pinned.time + 5, close: 101_250 }, 5, DARK_THEME);
    expect(host.textContent).toContain('Δ +1.250,0 (+1,25%) · +5 bars');
  });
});
