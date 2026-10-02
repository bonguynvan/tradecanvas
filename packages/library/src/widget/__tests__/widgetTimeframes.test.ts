import { describe, it, expect } from 'vitest';
import {
  availableTimeframes,
  initialTimeframeFavorites,
  timeframeLabel,
  WIDGET_TIMEFRAMES,
  WIDGET_TIMEFRAME_FAVORITES,
} from '../widgetTimeframes.js';

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

  it('drops unknown values', () => {
    expect(availableTimeframes(['1m', '7m' as never])).toEqual(['1m']);
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
