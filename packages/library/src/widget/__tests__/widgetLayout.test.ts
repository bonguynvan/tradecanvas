import { describe, it, expect } from 'vitest';
import { readWidgetLayout } from '../widgetLayout.js';

describe('readWidgetLayout, after review', () => {
  it('takes a tick timeframe', () => {
    expect(readWidgetLayout({ v: 1, symbol: 'BTCUSDT', timeframe: '100T', chart: {} } as never)?.timeframe).toBe('100T');
  });

  it('keeps the settings it can read and drops the rest', () => {
    const layout = readWidgetLayout({
      v: 1, symbol: 'A', timeframe: '1h', chart: {},
      settings: { volumeProfileVisible: true, timezone: 'UTC', pivotStrength: 'x', bogus: 1 },
    });
    expect(layout?.settings).toEqual({ volumeProfileVisible: true });
  });

  it('has no settings when the layout was saved without them', () => {
    const layout = readWidgetLayout({ v: 1, symbol: 'A', timeframe: '1h', chart: {} });
    expect(layout).not.toBeNull();
    expect(layout?.settings).toBeUndefined();
  });
});
