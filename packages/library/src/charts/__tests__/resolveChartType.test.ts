import { describe, it, expect } from 'vitest';
import { resolveRenderer, resolveDisplayData } from '../ChartTypeStrategy.js';
import type { ChartTypePlugin } from '../../plugins/contracts.js';
import type { ChartRendererInterface } from '@tradecanvas/core';
import type { DataSeries } from '@tradecanvas/commons';

const sentinelRenderer = { sentinel: true } as unknown as ChartRendererInterface;

function fakePlugin(type: string, withTransform = false): ChartTypePlugin {
  return {
    descriptor: { type, name: type },
    createRenderer: () => sentinelRenderer,
    transform: withTransform ? (raw) => raw.map((b) => ({ ...b, close: -1 })) : undefined,
  };
}

const bars: DataSeries = [{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('resolveRenderer', () => {
  it('uses a registered plugin renderer for a custom type', () => {
    const lookup = (t: string) => (t === 'myType' ? fakePlugin('myType') : undefined);
    expect(resolveRenderer('myType', lookup)).toBe(sentinelRenderer);
  });

  it('falls back to a built-in renderer when no plugin matches', () => {
    const renderer = resolveRenderer('candlestick', () => undefined);
    expect(renderer).not.toBe(sentinelRenderer);
    expect(renderer).toBeDefined();
  });

  it('falls back when no lookup is provided', () => {
    expect(resolveRenderer('line')).toBeDefined();
  });
});

describe('resolveDisplayData', () => {
  it('uses a plugin transform when present', () => {
    const lookup = (t: string) => (t === 'myType' ? fakePlugin('myType', true) : undefined);
    expect(resolveDisplayData('myType', bars, lookup)[0].close).toBe(-1);
  });

  it('falls back to the built-in transform (raw passthrough for plain types)', () => {
    expect(resolveDisplayData('candlestick', bars, () => undefined)).toEqual(bars);
  });

  it('returns empty input unchanged', () => {
    expect(resolveDisplayData('myType', [], () => fakePlugin('myType', true))).toEqual([]);
  });
});
