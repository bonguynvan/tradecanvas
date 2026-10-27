// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { PinnedTooltip } from '../PinnedTooltip.js';
import { unitViewport } from '../../drawings/__tests__/fixtures.js';

describe('PinnedTooltip', () => {
  it('draws its text without the page’s OpenType features, as the chart’s canvases do', () => {
    const host = document.createElement('div');
    host.style.fontFeatureSettings = "'ss01', 'ss03'";
    new PinnedTooltip().create(host);
    expect((host.firstElementChild as HTMLElement).style.fontFeatureSettings).toBe('normal');
  });

  it('shows the bar time in the chart’s time zone', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setTimezone('Asia/Tokyo');
    // 2026-03-04 23:30 UTC is 08:30 on March 5 in Tokyo.
    tooltip.pin({ time: Date.UTC(2026, 2, 4, 23, 30), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME);
    expect(host.textContent).toContain('3/5 08:30');
  });

  it('dates a daily bar as the axis does, whatever zone is shown', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setTimezone('UTC');
    tooltip.setExchangeTimeZone('Asia/Ho_Chi_Minh');
    // 23 October 2026 in Ho Chi Minh City, built at its midnight: 17:00 UTC the day before.
    tooltip.pin({ time: Date.UTC(2026, 9, 22, 17), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME, undefined, true);
    expect(host.textContent).toContain('10/23/2026');
    // A day stamped at 00:00 UTC is the date it names, in New York too.
    tooltip.setTimezone('America/New_York');
    tooltip.pin({ time: Date.UTC(2026, 9, 23), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME, undefined, true);
    expect(host.textContent).toContain('10/23/2026');
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

  it('fades the move’s percentage without a style attribute in markup, which a strict style-src refuses', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    const pinned = { time: Date.UTC(2026, 2, 4), open: 100, high: 100, low: 100, close: 100 };
    tooltip.pin(pinned, 0, DARK_THEME);
    // jsdom applies no Content-Security-Policy, so the test looks at the markup written instead.
    const innerHtml = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    let markup: string[];
    try {
      tooltip.reposition(unitViewport, { ...pinned, time: pinned.time + 2, close: 101 }, 2, DARK_THEME);
    } finally {
      markup = innerHtml.mock.calls.map(([html]) => String(html));
      innerHtml.mockRestore();
    }
    expect(markup.filter((html) => /style\s*=/i.test(html))).toEqual([]);
    const percent = [...host.querySelectorAll('span')].find((span) => span.textContent === '(+1.00%)');
    expect(percent?.style.opacity).toBe('0.7');
    expect(host.textContent).toContain('Δ +1.00 (+1.00%) · +2 bars');
  });

  it('shows a formatter’s price as it wrote it, quotes and ampersands too', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setPriceFormatter((price) => `${price.toFixed(0)}'000 & <up>`);
    const pinned = { time: Date.UTC(2026, 2, 4), open: 1, high: 1, low: 1, close: 1 };
    tooltip.pin(pinned, 0, DARK_THEME);
    expect(host.textContent).toContain("C 1'000 & <up>");
    tooltip.reposition(unitViewport, { ...pinned, time: pinned.time + 1, close: 3 }, 1, DARK_THEME);
    expect(host.textContent).toContain("Δ +2'000 & <up>");
    expect(host.querySelector('up')).toBeNull();
  });
});
