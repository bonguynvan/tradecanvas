import { describe, it, expect } from 'vitest';
import { readWidgetLayout } from '../widgetLayout.js';

describe('readWidgetLayout, after review', () => {
  it('takes a tick timeframe', () => {
    expect(readWidgetLayout({ v: 1, symbol: 'BTCUSDT', timeframe: '100T', chart: {} } as never)?.timeframe).toBe('100T');
  });
});
