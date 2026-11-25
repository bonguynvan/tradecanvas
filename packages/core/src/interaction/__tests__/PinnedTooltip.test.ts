// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { DARK_THEME, resolveChartTheme } from '@tradecanvas/commons';
import { PinnedTooltip } from '../PinnedTooltip.js';
import { unitViewport } from '../../drawings/__tests__/fixtures.js';

describe('PinnedTooltip', () => {
  it('draws its text without the page’s OpenType features, as the chart’s canvases do', () => {
    const host = document.createElement('div');
    host.style.fontFeatureSettings = "'ss01', 'ss03'";
    new PinnedTooltip().create(host);
    expect((host.firstElementChild as HTMLElement).style.fontFeatureSettings).toBe('normal');
  });

  it('is set in the theme’s small size and face, its figures of one width', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    const theme = { ...DARK_THEME, font: { ...DARK_THEME.font, family: 'Figures, sans-serif', sizeSmall: 12 } };
    tooltip.pin({ time: Date.UTC(2026, 2, 4, 23, 30), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, theme);
    const card = host.firstElementChild as HTMLElement;
    expect(card.style.fontSize).toBe('12px');
    expect(card.style.fontFamily).toContain('Figures');
    expect(card.style.fontVariantNumeric).toBe('tabular-nums');
    const own = [...card.querySelectorAll<HTMLElement>('*')].map((el) => el.style.fontSize).filter(Boolean);
    expect(own).toEqual([]);
    // A size set while the bar is pinned (a widget grown for a wide screen) is taken when the card is next placed.
    const grown = { ...theme, font: { ...theme.font, sizeSmall: 14 } };
    tooltip.reposition(unitViewport, null, null, grown);
    expect(card.style.fontSize).toBe('14px');
  });

  it('writes its figures and its move at 4.5:1 on the chart’s ground, at full strength', async () => {
    const { GRAPHITE_LIGHT_THEME, contrastRatio } = await import('@tradecanvas/commons');
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    const pinned = { time: Date.UTC(2026, 2, 4), open: 2, high: 2, low: 1, close: 1 };
    tooltip.pin(pinned, 0, GRAPHITE_LIGHT_THEME);
    for (const hover of [3, 0.5]) {
      tooltip.reposition(unitViewport, { ...pinned, close: hover }, 2, GRAPHITE_LIGHT_THEME);
      const card = host.firstElementChild as HTMLElement;
      const coloured = [...card.querySelectorAll<HTMLElement>('*')].filter((el) => el.style.color && el.textContent && /\d/.test(el.textContent));
      expect(coloured.length).toBeGreaterThan(4);
      for (const el of coloured) expect(contrastRatio(el.style.color, GRAPHITE_LIGHT_THEME.background)!, el.textContent!).toBeGreaterThanOrEqual(4.5);
      // Nothing that carries a figure is faded.
      for (const el of card.querySelectorAll<HTMLElement>('*')) if (/\d/.test(el.textContent ?? '')) expect(el.style.opacity || '1', el.textContent!).toBe('1');
    }
  });

  it('takes the ground and the edge of the theme it is placed in, not of the one it was pinned in', async () => {
    const { LIGHT_THEME } = await import('@tradecanvas/commons');
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.pin({ time: Date.UTC(2026, 2, 4), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME);
    const card = host.firstElementChild as HTMLElement;
    const night = { color: card.style.color, time: (card.children[1] as HTMLElement).style.color, figure: card.querySelector<HTMLElement>('[data-figure]')!.style.color, name: card.querySelector<HTMLElement>('[data-name]')!.style.color };
    tooltip.reposition(unitViewport, null, null, LIGHT_THEME);
    const day = { color: card.style.color, time: (card.children[1] as HTMLElement).style.color, figure: card.querySelector<HTMLElement>('[data-figure]')!.style.color, name: card.querySelector<HTMLElement>('[data-name]')!.style.color };
    for (const key of ['color', 'time', 'figure', 'name'] as const) expect(day[key], key).not.toBe(night[key]);
    // A price's name is the theme's quieter text, not the text faded.
    expect(card.querySelector<HTMLElement>('[data-name]')!.style.opacity).toBe('');
  });

  it('shows the bar time in the chart’s time zone', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setTimezone('Asia/Tokyo');
    // 2026-03-04 23:30 UTC is 08:30 on March 5 in Tokyo.
    tooltip.pin({ time: Date.UTC(2026, 2, 4, 23, 30), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME);
    expect(host.textContent).toContain('Mar 5 08:30');
  });

  it('dates a daily bar as the axis does, whatever zone is shown', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setTimezone('UTC');
    tooltip.setExchangeTimeZone('Asia/Ho_Chi_Minh');
    // 23 October 2026 in Ho Chi Minh City, built at its midnight: 17:00 UTC the day before.
    tooltip.pin({ time: Date.UTC(2026, 9, 22, 17), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME, undefined, true);
    expect(host.textContent).toContain('Oct 23, 2026');
    // A day stamped at 00:00 UTC is the date it names, in New York too.
    tooltip.setTimezone('America/New_York');
    tooltip.pin({ time: Date.UTC(2026, 9, 23), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME, undefined, true);
    expect(host.textContent).toContain('Oct 23, 2026');
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

  it('writes the move’s percentage at full strength, with no style attribute in markup, which a strict style-src refuses', () => {
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
    expect(percent?.style.opacity ?? '').toBe('');
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

describe('PinnedTooltip — up and down colours', () => {
  it('colours the close by the legend’s keys when the candles are hidden', () => {
    const hidden = 'rgba(0, 0, 0, 0)';
    const theme = resolveChartTheme(DARK_THEME, 'candlestick', {
      'series.candlestick.upColor': hidden,
      'series.candlestick.downColor': hidden,
      'legend.upColor': '#00ff00',
      'legend.downColor': '#ff0000',
    });
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.pin({ time: Date.UTC(2026, 2, 4), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, theme);
    const colours = [...host.querySelectorAll<HTMLElement>('*')].map((el) => el.style.color).filter(Boolean);
    expect(colours).toContain('rgb(0, 255, 0)');
    expect(colours).not.toContain(hidden);
  });
});
