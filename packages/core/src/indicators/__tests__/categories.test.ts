import { describe, it, expect } from 'vitest';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { INDICATOR_CATEGORIES, indicatorCategory } from '../categories.js';

describe('indicator categories', () => {
  const engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
  const builtIns = engine.getAvailableIndicators();

  it('put every built-in indicator in one of the picker’s groups', () => {
    const uncategorised = builtIns.filter((d) => indicatorCategory(d) === 'other').map((d) => d.id);
    expect(uncategorised).toEqual([]);
  });

  it('list the groups in the picker’s order, other last', () => {
    expect(INDICATOR_CATEGORIES.at(-1)).toBe('other');
    expect(new Set(INDICATOR_CATEGORIES).size).toBe(INDICATOR_CATEGORIES.length);
    for (const d of builtIns) expect(INDICATOR_CATEGORIES).toContain(indicatorCategory(d));
  });

  it('sort a few well-known ones as a trader would', () => {
    const of = (id: string) => indicatorCategory({ id });
    expect(of('sma')).toBe('movingAverages');
    expect(of('rsi')).toBe('oscillators');
    expect(of('atr')).toBe('volatility');
    expect(of('obv')).toBe('volume');
    expect(of('bb')).toBe('bands');
    expect(of('supertrend')).toBe('trend');
    expect(of('pivots')).toBe('patterns');
  });

  it('take a custom indicator’s own category, and call one without any other', () => {
    expect(indicatorCategory({ id: 'myOsc', category: 'oscillators' })).toBe('oscillators');
    expect(indicatorCategory({ id: 'sma', category: 'trend' })).toBe('trend');
    expect(indicatorCategory({ id: 'myThing' })).toBe('other');
  });
});
