import { describe, it, expect, vi } from 'vitest';
import { buildSymbolInfoView, sessionDay, SymbolNews } from '../symbolInfoView.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { SymbolInfoNews } from '../WidgetSymbolInfo.js';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5);
const bars = [
  { time: T0 - DAY + 3_600_000, open: 9, high: 10, low: 8, close: 9.5, volume: 100 },
  { time: T0 + 3_600_000, open: 9.5, high: 11, low: 9, close: 10, volume: 200 },
  { time: T0 + 7_200_000, open: 10, high: 12, low: 9.8, close: 11, volume: 300 },
];

describe('the symbol info view', () => {
  it('takes the day’s numbers from the bars when there is no quote', () => {
    const view = buildSymbolInfoView({
      symbol: 'AAA',
      info: { symbol: 'AAA', exchange: 'NASDAQ', type: 'stock' },
      quote: undefined,
      bars,
      formatPrice: (p) => p.toFixed(2),
      t: EN_TRANSLATOR,
      textLocale: 'en',
      numberLocale: 'en-US',
      now: T0 + 8_000_000,
    });
    expect(view.price).toBe('11.00');
    expect(view.change).toEqual({ text: '+1.50 (+15.79%)', up: true });
    expect(view.meta).toBe('NASDAQ · stock');
    expect(view.stats.find((s) => s.label === 'High')?.value).toBe('12.00');
  });

  it('writes the change’s percentage in the number locale, as its price', () => {
    const german = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const view = (quote: { last: number; prevClose: number }) => buildSymbolInfoView({
      symbol: 'AAA', info: null, quote: { symbol: 'AAA', ...quote }, bars, formatPrice: (p) => german.format(p),
      t: EN_TRANSLATOR, textLocale: 'de', numberLocale: 'de-DE', now: T0 + 8_000_000,
    }).change?.text;
    expect(view({ last: 2_334.5, prevClose: 100 })).toBe('+2.234,50 (+2.234,50%)');
    expect(view({ last: 9.5, prevClose: 11 })).toBe('-1,50 (-13,64%)');
  });

  it('writes the percentage in plain digits when its number locale is a tag Intl refuses', () => {
    // A defensive fallback, as for the volume beside it: the view takes its locale as any
    // string, and Intl throws a RangeError for 'pt_BR'.
    const view = buildSymbolInfoView({
      symbol: 'AAA', info: null, quote: { symbol: 'AAA', last: 11, prevClose: 9.5 }, bars, formatPrice: (p) => p.toFixed(2),
      t: EN_TRANSLATOR, textLocale: 'en', numberLocale: 'pt_BR', now: T0 + 8_000_000,
    });
    expect(view.change).toEqual({ text: '+1.50 (+15.79%)', up: true });
  });

  it('names the symbol’s zone, in either spelling', () => {
    const zoneOf = (info: { symbol: string; timeZone?: string; timezone?: string }) => buildSymbolInfoView({
      symbol: 'AAA', info, quote: undefined, bars, formatPrice: (p) => p.toFixed(2),
      t: EN_TRANSLATOR, textLocale: 'en', numberLocale: 'en-US', now: T0 + 8_000_000,
    }).stats.find((s) => s.label === 'Time zone')?.value;
    expect(zoneOf({ symbol: 'AAA', timeZone: 'America/New_York' })).toBe('America/New_York');
    expect(zoneOf({ symbol: 'AAA', timezone: 'America/New_York' })).toBe('America/New_York');
  });

  it('finds the latest day in the exchange’s zone', () => {
    expect(sessionDay(bars, 'UTC')).toMatchObject({ open: 9.5, high: 12, low: 9, close: 11, volume: 500, prevClose: 9.5 });
    expect(sessionDay([], 'UTC')).toBeNull();
  });
});

describe('the news loader', () => {
  it('caches a symbol’s headlines and drops an answer that comes too late', async () => {
    const news = new SymbolNews();
    const shown: SymbolInfoNews[] = [];
    const source = vi.fn(async () => [{ id: '1', title: 'Up', time: Date.now() - 60_000 }]);
    news.load('AAA', source, (n) => shown.push(n), 'en', () => false);
    await vi.waitFor(() => expect(shown.at(-1)?.kind).toBe('items'));
    news.load('AAA', source, (n) => shown.push(n), 'en', () => false);
    expect(source).toHaveBeenCalledTimes(1);

    const slow = vi.fn(() => new Promise<unknown[]>((resolve) => setTimeout(() => resolve([{ id: '2', title: 'Late', time: Date.now() }]), 10)));
    const late: SymbolInfoNews[] = [];
    news.load('BBB', slow, (n) => late.push(n), 'en', () => false);
    news.load('CCC', null, (n) => late.push(n), 'en', () => false);
    await new Promise((r) => setTimeout(r, 20));
    expect(late.map((n) => n.kind)).toEqual(['loading', 'none']);
  });
});
