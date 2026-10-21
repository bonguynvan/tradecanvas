import { describe, it, expect } from 'vitest';
import type { TimeFrame } from '@tradecanvas/commons';
import { availableTimeframes, initialTimeframeFavorites, timeframeForRange, timeframeLabel, WIDGET_TIMEFRAMES, WIDGET_TIMEFRAME_FAVORITES, parseTimeframeInput, withExtraTimeframes } from '../widgetTimeframes.js';

describe('timeframeLabel', () => {
  it('upper-cases hours, days and weeks, and keeps minutes apart from months', () => {
    expect(['1m', '15m', '1h', '4h', '1d', '1w', '1M', '30s'].map((tf) => timeframeLabel(tf as never)))
      .toEqual(['1m', '15m', '1H', '4H', '1D', '1W', '1M', '30s']);
  });
});

describe('availableTimeframes', () => {
  it('offers the default menu when the host chooses nothing', () => {
    expect(availableTimeframes()).toEqual(WIDGET_TIMEFRAMES);
  });

  it('sorts and de-duplicates the host list', () => {
    expect(availableTimeframes(['1d', '1m', '1h', '1m'])).toEqual(['1m', '1h', '1d']);
  });

  it('applies the chart whitelist to either list', () => {
    expect(availableTimeframes(undefined, ['4h', '1h'])).toEqual(['1h', '4h']);
    expect(availableTimeframes(['1m', '5m', '1h'], ['1h', '1d'])).toEqual(['1h']);
  });

  it('drops values that are not timeframes', () => {
    expect(availableTimeframes(['1m', '7x' as never, '1.5m' as never])).toEqual(['1m']);
  });

  it('keeps custom intervals, in order of length', () => {
    expect(availableTimeframes(['1h', '90m', '7m', '1m'])).toEqual(['1m', '7m', '1h', '90m']);
  });
});

describe('initialTimeframeFavorites', () => {
  it('uses the standard set when the host chose nothing', () => {
    expect(initialTimeframeFavorites(WIDGET_TIMEFRAMES)).toEqual(WIDGET_TIMEFRAME_FAVORITES);
  });

  it('prefers the host defaults, limited to what is offered', () => {
    expect(initialTimeframeFavorites(['1m', '5m', '1h'], ['5m', '1w'])).toEqual(['5m']);
  });

  it('pins a host-chosen list in full, as the toolbar showed it before', () => {
    expect(initialTimeframeFavorites(['3m', '30m'], undefined, true)).toEqual(['3m', '30m']);
  });

  it('falls back to the first few offered', () => {
    expect(initialTimeframeFavorites(['1s', '5s', '15s', '30s', '3m', '30m', '2h']))
      .toEqual(['1s', '5s', '15s', '30s', '3m', '30m']);
  });
});

describe('parseTimeframeInput', () => {
  it.each([
    ['7', '7m'],
    ['7m', '7m'],
    ['90', '90m'],
    [' 2h ', '2h'],
    ['2H', '2h'],
    ['3d', '3d'],
    ['3D', '3d'],
    ['1W', '1w'],
    ['2M', '2M'],
    ['30s', '30s'],
    ['90S', '90s'],
    ['100T', '100T'],
    ['100t', '100T'],
  ])('reads %j as %s', (text, tf) => {
    expect(parseTimeframeInput(text)).toBe(tf);
  });

  it.each([
    ['60', '1h'],
    ['120m', '2h'],
    ['120s', '2m'],
    ['1440', '1d'],
    ['48h', '2d'],
  ])('writes %j in its largest whole unit, %s', (text, tf) => {
    expect(parseTimeframeInput(text)).toBe(tf);
  });

  it.each(['', 'abc', '0', '0m', '1.5h', '-5m', '7x', 'm', '10000m', '0T', '10000T'])('rejects %j', (text) => {
    expect(parseTimeframeInput(text)).toBeNull();
  });
});

describe('withExtraTimeframes', () => {
  it('takes tick timeframes, before the time ones, fewest trades first', () => {
    expect(withExtraTimeframes(['1m', '1h'], ['100T', '10T', '5m'])).toEqual(['10T', '100T', '1m', '5m', '1h']);
  });
});

describe('timeframeForRange', () => {
  const DAY = 86_400_000;
  const YEAR = 365.25 * DAY;
  const all: TimeFrame[] = ['1m', '5m', '15m', '1h', '2h', '4h', '1d', '1w', '1M'];
  const pick = (spanMs: number, barsInSpan: number, current: TimeFrame, chosen: TimeFrame = current) =>
    timeframeForRange({ spanMs, barsInSpan, width: 1100, current, chosen, available: all });

  it('keeps the timeframe when the range fits it', () => {
    expect(pick(YEAR, 252, '1d')).toBe('1d');
    expect(pick(30 * DAY, 154, '1h')).toBe('1h');
  });

  it('goes to weeks for five years of days, months for decades', () => {
    expect(pick(5 * YEAR, 1260, '1d')).toBe('1w');
    expect(pick(26 * YEAR, 6800, '1d')).toBe('1M');
  });

  it('goes as coarse as it has to on intraday bars, and no further', () => {
    expect(pick(182 * DAY, 900, '1h')).toBe('2h');
    expect(pick(5 * YEAR, 9100, '1h')).toBe('1w');
  });

  it('comes back to the timeframe the user chose once the range is short again', () => {
    // On weeks after 5Y, 1Y shows days again; never finer than the user's days.
    expect(pick(YEAR, 52, '1w', '1d')).toBe('1d');
    expect(pick(DAY, 1, '1w', '1d')).toBe('1d');
  });

  it('keeps timeframes it can’t reason about', () => {
    expect(pick(5 * YEAR, 99_999, '100T' as TimeFrame)).toBe('100T');
    expect(timeframeForRange({ spanMs: 5 * YEAR, barsInSpan: 1260, width: 0, current: '1d', chosen: '1d', available: all })).toBe('1d');
  });

  it('takes the coarsest it has when none fits', () => {
    expect(timeframeForRange({ spanMs: 26 * YEAR, barsInSpan: 6800, width: 1100, current: '1d', chosen: '1d', available: ['1d', '1w'] })).toBe('1w');
  });

  it('counts trading days, not calendar days, when it comes back to days', () => {
    // Two years: about 520 weekdays fit at 2 px; 730 calendar days wouldn't.
    expect(timeframeForRange({ spanMs: 2 * YEAR, barsInSpan: 104, width: 1100, current: '1w', chosen: '1d', available: all })).toBe('1d');
    // A market open every day keeps its weekends in the count.
    expect(timeframeForRange({ spanMs: 2 * YEAR, barsInSpan: 104, width: 1100, current: '1w', chosen: '1d', available: all, dayShare: 1 })).toBe('1w');
  });
});

