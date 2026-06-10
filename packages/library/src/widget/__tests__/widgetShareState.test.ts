import { describe, it, expect } from 'vitest';
import {
  encodeWidgetState,
  decodeWidgetState,
  readShareHash,
  buildShareUrl,
  type ShareableWidgetState,
} from '../widgetShareState.js';

const sample: ShareableWidgetState = {
  v: 1,
  symbol: 'BTCUSDT',
  timeframe: '1h',
  chartType: 'candlestick',
  scaleMode: 'logarithmic',
  indicators: [{ id: 'ema', params: { period: 21 } }],
  drawings: [],
};

describe('encode/decodeWidgetState', () => {
  it('round-trips a state through a URL-safe string', () => {
    const encoded = encodeWidgetState(sample);
    expect(encoded).not.toMatch(/[+/=]/); // URL-safe, no padding
    expect(decodeWidgetState(encoded)).toEqual(sample);
  });

  it('round-trips unicode symbols', () => {
    const s = { ...sample, symbol: 'BTC€/￥' };
    expect(decodeWidgetState(encodeWidgetState(s))?.symbol).toBe('BTC€/￥');
  });

  it('returns null for garbage or wrong version', () => {
    expect(decodeWidgetState('')).toBeNull();
    expect(decodeWidgetState('not-base64!!')).toBeNull();
    const v2 = encodeWidgetState({ ...sample, v: 2 as unknown as 1 });
    expect(decodeWidgetState(v2)).toBeNull();
  });

  it('defaults scaleMode and arrays when absent', () => {
    const encoded = encodeWidgetState({ ...sample, scaleMode: undefined as never, indicators: undefined as never, drawings: undefined as never });
    const decoded = decodeWidgetState(encoded)!;
    expect(decoded.scaleMode).toBe('regular');
    expect(decoded.indicators).toEqual([]);
    expect(decoded.drawings).toEqual([]);
  });
});

describe('readShareHash', () => {
  it('extracts the tcw param from a hash', () => {
    expect(readShareHash('#tcw=abc123')).toBe('abc123');
    expect(readShareHash('foo=1&tcw=xyz')).toBe('xyz');
    expect(readShareHash('#other=1')).toBeNull();
    expect(readShareHash('')).toBeNull();
  });
});

describe('buildShareUrl', () => {
  it('replaces any existing hash with the tcw fragment', () => {
    expect(buildShareUrl('https://x.io/chart', 'ENC')).toBe('https://x.io/chart#tcw=ENC');
    expect(buildShareUrl('https://x.io/chart#tcw=OLD', 'NEW')).toBe('https://x.io/chart#tcw=NEW');
  });
});
