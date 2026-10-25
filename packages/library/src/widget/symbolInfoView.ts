import type { NewsItem, Quote, SymbolInfo } from '@tradecanvas/commons';
import { barTimeUnit, isValidTimeZone, marketStatus, readNews, symbolTimeZone, zoneOffsetMinutes } from '@tradecanvas/commons';
import { fill, type Translator } from './i18n.js';
import type { SymbolInfoNews, SymbolInfoView } from './WidgetSymbolInfo.js';

/** Headlines asked for at once, and how long a symbol's stay fresh. */
const NEWS_LIMIT = 10;
const NEWS_TTL_MS = 5 * 60_000;
const DAY_MS = 86_400_000;

type DayBar = { time: number; open: number; high: number; low: number; close: number; volume?: number };

/** What the symbol info panel is drawn from. */
export interface SymbolInfoInput {
  symbol: string;
  info: SymbolInfo | null;
  /** The live quote, when a source gives one. */
  quote: Quote | undefined;
  /** The chart's bars: the day's numbers come from them when there's no quote. */
  bars: readonly DayBar[];
  /** A price as the chart writes it. */
  formatPrice: (price: number) => string;
  t: Translator;
  /** The language words are written in ("in 3 hours"), and the one numbers are. */
  textLocale: string;
  numberLocale: string;
  now: number;
}

/** The symbol info panel's content: price and change, market status, the day's numbers. */
export function buildSymbolInfoView(input: SymbolInfoInput): SymbolInfoView {
  const { info, quote, t, textLocale } = input;
  const zone = symbolTimeZone(info);
  const day = sessionDay(input.bars, zone);
  const fp = input.formatPrice;

  const last = quote?.last ?? day?.close;
  const prevClose = quote?.prevClose ?? day?.prevClose;
  const change = quote?.change ?? (last !== undefined && prevClose !== undefined ? last - prevClose : undefined);
  const base = last !== undefined && change !== undefined ? last - change : undefined;
  const percent = quote?.changePercent ?? (change !== undefined && base ? (change / base) * 100 : undefined);

  const status = marketStatus(info, input.now);
  let statusText = t(status.state === 'open' ? 'symbolInfo.open' : status.state === 'closed' ? 'symbolInfo.closed' : 'symbolInfo.always');
  if (status.state !== 'always' && status.next !== null) {
    const when = relativeTime(status.next - input.now, textLocale);
    statusText += ` · ${fill(t(status.state === 'open' ? 'symbolInfo.closesIn' : 'symbolInfo.opensIn'), { when })}`;
  }

  const stats: { label: string; value: string }[] = [];
  const add = (label: string, value: string | undefined) => {
    if (value) stats.push({ label, value });
  };
  const price = (v: number | undefined) => (v !== undefined ? fp(v) : undefined);
  add(t('dataWindow.open'), price(quote?.open ?? day?.open));
  add(t('dataWindow.high'), price(quote?.high ?? day?.high));
  add(t('dataWindow.low'), price(quote?.low ?? day?.low));
  add(t('symbolInfo.prevClose'), price(prevClose));
  const volume = quote?.volume ?? day?.volume;
  add(t('dataWindow.volume'), volume !== undefined ? compactNumber(volume, input.numberLocale) : undefined);
  add(t('symbolInfo.bid'), price(quote?.bid));
  add(t('symbolInfo.ask'), price(quote?.ask));
  add(t('symbolInfo.tick'), info?.minTick !== undefined ? String(info.minTick) : undefined);
  add(t('symbolInfo.currency'), info?.currency);
  add(t('symbolInfo.timezone'), zone);
  add(t('symbolInfo.hours'), sessionsText(info, textLocale));

  const sign = (change ?? 0) >= 0 ? '+' : '-';
  return {
    symbol: input.symbol,
    description: info?.description,
    meta: [info?.exchange, info?.type].filter(Boolean).join(' · ') || undefined,
    price: last !== undefined ? fp(last) : undefined,
    change: change !== undefined
      ? { text: `${sign}${fp(Math.abs(change))}${percent !== undefined ? ` (${sign}${Math.abs(percent).toFixed(2)}%)` : ''}`, up: change >= 0 }
      : undefined,
    status: { state: status.state, text: statusText },
    stats,
  };
}

type NewsSource = (symbol: string, limit: number) => unknown;

/**
 * Headlines for a symbol, cached a few minutes. Only the latest request
 * reaches the panel: an older one that answers late is dropped.
 */
export class SymbolNews {
  private request = 0;
  private cache = new Map<string, { at: number; items: NewsItem[] }>();

  /**
   * Load `symbol`'s headlines from `source` (null: none to show) into
   * `render`; `stale` says the panel has gone (the widget destroyed).
   */
  load(symbol: string, source: NewsSource | null, render: (news: SymbolInfoNews) => void, locale: string, stale: () => boolean): void {
    // Every load is the latest: one still on its way answers to nobody.
    const request = ++this.request;
    if (!source) {
      render({ kind: 'none' });
      return;
    }
    const show = (items: NewsItem[]) => {
      const now = Date.now();
      render({
        kind: 'items',
        items: items.map((item) => ({
          title: item.title,
          url: item.url,
          meta: [item.source, relativeTime(item.time - now, locale)].filter(Boolean).join(' · '),
        })),
      });
    };
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.at < NEWS_TTL_MS) {
      show(cached.items);
      return;
    }
    render({ kind: 'loading' });
    Promise.resolve()
      .then(() => source(symbol, NEWS_LIMIT))
      .then((raw) => {
        if (request !== this.request || stale()) return;
        const items = readNews(raw, NEWS_LIMIT);
        this.cache.set(symbol, { at: Date.now(), items });
        show(items);
      })
      .catch(() => {
        if (request === this.request && !stale()) render({ kind: 'failed' });
      });
  }
}

/**
 * The latest day in the bars, in the exchange's zone (UTC when it has none):
 * its open, range, volume and last close, and the close before it.
 */
export function sessionDay(
  bars: readonly DayBar[],
  zone: string | undefined,
): { open: number; high: number; low: number; close: number; volume: number; prevClose?: number } | null {
  if (bars.length === 0) return null;
  const tz = zone && isValidTimeZone(zone) ? zone : null;
  const unit = barTimeUnit(bars);
  const dayOf = (t: number) => {
    const ms = t * unit;
    return Math.floor((ms + (tz ? zoneOffsetMinutes(tz, ms) * 60_000 : 0)) / DAY_MS);
  };
  const last = bars[bars.length - 1];
  const today = dayOf(last.time);
  let first = bars.length - 1;
  while (first > 0 && dayOf(bars[first - 1].time) === today) first--;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  for (let i = first; i < bars.length; i++) {
    high = Math.max(high, bars[i].high);
    low = Math.min(low, bars[i].low);
    volume += bars[i].volume ?? 0;
  }
  return { open: bars[first].open, high, low, close: last.close, volume, prevClose: first > 0 ? bars[first - 1].close : undefined };
}

/** "in 3 hours", "5 minutes ago": the nearest whole minutes, hours or days. */
export function relativeTime(deltaMs: number, locale: string): string {
  const minutes = deltaMs / 60_000;
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] = Math.abs(minutes) < 60
    ? [Math.round(minutes) || Math.sign(minutes) || 1, 'minute']
    : Math.abs(minutes) < 24 * 60
      ? [Math.round(minutes / 60), 'hour']
      : [Math.round(minutes / 1440), 'day'];
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
  } catch {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(value, unit);
  }
}

function compactNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
}

/** "09:30–16:00 Mon–Fri", from a symbol's sessions; undefined without any. */
function sessionsText(info: SymbolInfo | null, locale: string): string | undefined {
  const sessions = info?.sessions ?? [];
  if (sessions.length === 0) return undefined;
  let names: string[];
  try {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    names = Array.from({ length: 7 }, (_, d) => format.format(Date.UTC(1970, 0, 4 + d))); // 4 Jan 1970 was a Sunday
  } catch {
    names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
  const daysText = (days: number[] | undefined): string => {
    const list = [...new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
    if (list.length === 0 || list.length === 7) return '';
    const contiguous = list.every((d, i) => i === 0 || d === list[i - 1] + 1);
    return contiguous && list.length > 2 ? `${names[list[0]]}–${names[list[list.length - 1]]}` : list.map((d) => names[d]).join(', ');
  };
  // The times read left to right in any language (isolated, so a right-to-left line keeps 09:30–16:00).
  return sessions.map((s) => [`⁦${s.start}–${s.end}⁩`, daysText(s.days)].filter(Boolean).join(' ')).join(', ');
}
