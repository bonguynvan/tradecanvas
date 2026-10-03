import { describe, it, expect } from 'vitest';
import { marketStatus, readNews, type SymbolInfo } from '@tradecanvas/commons';

const utc = (iso: string) => Date.parse(iso);
const NYSE: SymbolInfo = {
  symbol: 'AAPL',
  timezone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
};

describe('marketStatus', () => {
  it('is open around the clock without hours or a zone it knows', () => {
    expect(marketStatus(null, Date.now())).toEqual({ state: 'always', next: null });
    expect(marketStatus({ symbol: 'BTCUSDT', timezone: 'UTC' }, Date.now())).toEqual({ state: 'always', next: null });
    expect(marketStatus({ ...NYSE, timezone: 'Mars/Olympus' }, Date.now()).state).toBe('always');
  });

  it('is open in a session, until it closes', () => {
    // Monday 5 Oct 2026, 10:00 in New York (EDT, UTC−4).
    expect(marketStatus(NYSE, utc('2026-10-05T14:00:00Z'))).toEqual({ state: 'open', next: utc('2026-10-05T20:00:00Z') });
  });

  it('is closed after the close, until the next open', () => {
    expect(marketStatus(NYSE, utc('2026-10-05T21:00:00Z'))).toEqual({ state: 'closed', next: utc('2026-10-06T13:30:00Z') });
  });

  it('skips the days the session doesn’t run', () => {
    // Saturday: the next open is Monday's.
    expect(marketStatus(NYSE, utc('2026-10-10T15:00:00Z'))).toEqual({ state: 'closed', next: utc('2026-10-12T13:30:00Z') });
  });

  it('follows the clocks changing', () => {
    // The Monday after New York leaves daylight time (1 Nov 2026): 09:30 EST is 14:30 UTC.
    expect(marketStatus(NYSE, utc('2026-10-31T12:00:00Z')).next).toBe(utc('2026-11-02T14:30:00Z'));
  });

  it('runs a session past midnight, and joins sessions that meet', () => {
    const night: SymbolInfo = { symbol: 'X', timezone: 'UTC', sessions: [{ start: '22:00', end: '02:00' }] };
    expect(marketStatus(night, utc('2026-10-05T23:00:00Z'))).toEqual({ state: 'open', next: utc('2026-10-06T02:00:00Z') });
    expect(marketStatus(night, utc('2026-10-06T01:00:00Z'))).toEqual({ state: 'open', next: utc('2026-10-06T02:00:00Z') });
    expect(marketStatus(night, utc('2026-10-06T03:00:00Z'))).toEqual({ state: 'closed', next: utc('2026-10-06T22:00:00Z') });

    const split: SymbolInfo = { symbol: 'Y', timezone: 'UTC', sessions: [{ start: '09:30', end: '12:00' }, { start: '12:00', end: '16:00' }] };
    expect(marketStatus(split, utc('2026-10-05T11:00:00Z')).next).toBe(utc('2026-10-05T16:00:00Z'));
  });

  it('ignores sessions it can’t read', () => {
    const broken: SymbolInfo = { symbol: 'Z', timezone: 'UTC', sessions: [{ start: '9am', end: '16:00' }] };
    expect(marketStatus(broken, utc('2026-10-05T11:00:00Z')).state).toBe('always');
  });
});

describe('readNews', () => {
  it('keeps the items it can use, newest first, linking only to web pages', () => {
    const news = readNews([
      { title: 'Old', time: 1000, url: 'https://a.example/old', source: 'A' },
      { title: '  New  ', time: 3000, url: 'javascript:alert(1)' },
      { title: '', time: 2000 },
      { title: 'No time' },
      'junk',
      { title: 'Mid', time: 2000, url: 'http://b.example/mid', summary: 'S', id: 'm' },
    ]);
    expect(news).toEqual([
      { title: 'New', time: 3000 },
      { title: 'Mid', time: 2000, url: 'http://b.example/mid', summary: 'S', id: 'm' },
      { title: 'Old', time: 1000, url: 'https://a.example/old', source: 'A' },
    ]);
    expect(readNews('nope')).toEqual([]);
    expect(readNews(Array.from({ length: 50 }, (_, i) => ({ title: `T${i}`, time: i })), 5)).toHaveLength(5);
  });
});
