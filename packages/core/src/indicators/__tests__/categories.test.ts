import { describe, it, expect } from 'vitest';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { INDICATOR_CATEGORIES, indicatorCategory, indicatorGroup } from '../categories.js';

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

  it('keep a group of the app’s own apart from the kinds', () => {
    const tdk = { id: 'tradingdek', label: 'TradingDek' };
    expect(indicatorGroup({ id: 'tdkFlow', category: tdk })).toEqual(tdk);
    // Code that knows only the kinds gets the built-in's, else "other".
    expect(indicatorCategory({ id: 'tdkFlow', category: tdk })).toBe('other');
    expect(indicatorCategory({ id: 'rsi', category: tdk })).toBe('oscillators');
    expect(indicatorGroup({ id: 'myOsc', category: 'oscillators' })).toBeNull();
    expect(indicatorGroup({ id: 'rsi' })).toBeNull();
  });

  it('take a group with no id or no name for none', () => {
    expect(indicatorGroup({ id: 'x', category: { id: '', label: 'X' } })).toBeNull();
    expect(indicatorGroup({ id: 'x', category: { id: 'x', label: '  ' } })).toBeNull();
    expect(indicatorCategory({ id: 'x', category: { id: '', label: 'X' } })).toBe('other');
    expect(indicatorGroup({ id: 'x', category: { id: 'x', label: ' Desk ' } })).toEqual({ id: 'x', label: 'Desk' });
  });

  it('take a kind they do not know, from code without types, for none: the dialog would list it nowhere', () => {
    expect(indicatorCategory({ id: 'x', category: 'foo' as never })).toBe('other');
    expect(indicatorCategory({ id: 'rsi', category: 'foo' as never })).toBe('oscillators');
  });
});
