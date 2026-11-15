import { readQuote, stepDecimals } from '@tradecanvas/commons';
import type { Quote, SymbolInfo, SymbolSession } from '@tradecanvas/commons';
import type { JsApiQuoteData, JsApiSearchResult, JsApiSymbolInfo } from './jsApiTypes.js';

/** Weekdays, 0 Sunday … 6 Saturday. */
const DAYS_IN_WEEK = 7;
/** The days a schedule with no days of its own covers, less those another schedule names. */
const WEEKDAYS = [1, 2, 3, 4, 5];
const ROUND_THE_CLOCK = '24x7';
const RANGE = /^(\d{2})(\d{2})(F\d?)?-(\d{2})(\d{2})(F\d?)?$/;
const MINUTES_PER_DAY = 1440;

const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const shiftDays = (days: number[], by: number): number[] => days.map((d) => (d + by + DAYS_IN_WEEK) % DAYS_IN_WEEK);

/** One `HHMM-HHMM` range on `days`, as sessions; null when it isn't one. */
function rangeSessions(range: string, days: number[]): SymbolSession[] | null {
  const m = RANGE.exec(range);
  if (!m || Number(m[2]) >= 60 || Number(m[5]) >= 60) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  let end = Number(m[4]) * 60 + Number(m[5]);
  if (start >= MINUTES_PER_DAY || end > 2 * MINUTES_PER_DAY) return null;
  // `F` on the start: it opens the day before the day it trades for, which is the day it starts on here.
  const opens = m[3] ? shiftDays(days, -1) : days;
  if (end > MINUTES_PER_DAY) end -= MINUTES_PER_DAY;
  if (start === 0 && end === 0) return [{ start: '00:00', end: '24:00', days: opens }];
  if (start === end) {
    // A whole day from `start` to the same time the next day: to midnight, then on from it.
    return [
      { start: clock(start), end: '24:00', days: opens },
      { start: '00:00', end: clock(end), days: shiftDays(opens, 1) },
    ];
  }
  if (end === 0) end = MINUTES_PER_DAY;
  return [{ start: clock(start), end: clock(end), days: opens }];
}

/**
 * A session string's trading hours (`'0930-1600'`, `'0930-1400,1430-1700'`,
 * `'0900-1400:23|0900-1200:4'`, `'1700F-1600'`), or undefined for around
 * the clock (`'24x7'`, none, or one this can't read). Days in the string
 * count 1 for Sunday; a schedule without days covers Monday to Friday, less
 * the days another one names. Of a session's history only the current
 * schedule is read.
 */
export function sessionsFromJsApi(session: string | undefined): SymbolSession[] | undefined {
  if (!session) return undefined;
  const current = session.split('/').pop()!.split(';')[0].trim();
  if (!current || current === ROUND_THE_CLOCK) return undefined;
  const schedules = current.split('|').map((part) => {
    const [ranges, dayDigits] = part.split(':');
    const days = dayDigits ? [...new Set([...dayDigits].map((d) => Number(d) - 1))] : null;
    return { ranges: ranges.split(','), days };
  });
  if (schedules.some((s) => s.days?.some((d) => !Number.isInteger(d) || d < 0 || d >= DAYS_IN_WEEK))) return undefined;
  const named = new Set(schedules.flatMap((s) => s.days ?? []));
  const rest = WEEKDAYS.filter((d) => !named.has(d));
  const sessions: SymbolSession[] = [];
  for (const schedule of schedules) {
    const days = schedule.days ?? rest;
    if (days.length === 0) continue;
    for (const range of schedule.ranges) {
      const parts = rangeSessions(range.trim(), days);
      if (!parts) return undefined;
      sessions.push(...parts);
    }
  }
  return sessions.length ? sessions : undefined;
}

const firstLogo = (urls: readonly string[] | undefined): string | undefined =>
  Array.isArray(urls) && typeof urls[0] === 'string' ? urls[0] : undefined;

const text = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);
const positive = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** What TradeCanvas knows of a symbol a JS API datafeed resolved. */
export function symbolInfoFromJsApi(info: JsApiSymbolInfo): SymbolInfo {
  const symbol: SymbolInfo = { symbol: text(info.ticker) ?? info.name };
  const description = text(info.description);
  if (description) symbol.description = description;
  const exchange = text(info.listed_exchange) ?? text(info.exchange);
  if (exchange) symbol.exchange = exchange;
  const type = text(info.type);
  if (type) symbol.type = type;
  const timeZone = text(info.timezone);
  if (timeZone) symbol.timeZone = timeZone;
  const sessions = sessionsFromJsApi(text(info.session));
  if (sessions) symbol.sessions = sessions;
  const scale = positive(info.pricescale);
  if (scale) {
    symbol.minTick = (positive(info.minmov) ?? 1) / scale;
    symbol.pricePrecision = stepDecimals(1 / scale);
  }
  const currency = text(info.currency_code);
  if (currency) symbol.currency = currency;
  const logo = firstLogo(info.logo_urls);
  if (logo) symbol.logo = logo;
  return symbol;
}

/** A symbol search's row, as TradeCanvas lists it. */
export function symbolFromSearchResult(item: JsApiSearchResult): SymbolInfo {
  const symbol: SymbolInfo = { symbol: text(item.ticker) ?? text(item.full_name) ?? item.symbol };
  const description = text(item.description);
  if (description) symbol.description = description;
  const exchange = text(item.exchange);
  if (exchange) symbol.exchange = exchange;
  const type = text(item.type);
  if (type) symbol.type = type;
  const logo = firstLogo(item.logo_urls);
  if (logo) symbol.logo = logo;
  return symbol;
}

/** The quotes of a JS API answer that carry a symbol and a last price. */
export function quotesFromJsApi(data: readonly JsApiQuoteData[]): Quote[] {
  const quotes: Quote[] = [];
  for (const item of data) {
    if (!item || item.s !== 'ok' || !item.v) continue;
    const v = item.v;
    const quote = readQuote({
      symbol: item.n,
      last: v.lp,
      change: v.ch,
      changePercent: v.chp,
      open: v.open_price,
      high: v.high_price,
      low: v.low_price,
      prevClose: v.prev_close_price,
      volume: v.volume,
      bid: v.bid,
      ask: v.ask,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}
