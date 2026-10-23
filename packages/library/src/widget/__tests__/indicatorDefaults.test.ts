import { describe, it, expect } from 'vitest';
import { IndicatorDefaultsStore } from '../indicatorDefaults.js';

const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};

describe('the indicators’ saved defaults', () => {
  it('keep the inputs and the look of a kind, one per kind', () => {
    const storage = memory();
    const store = new IndicatorDefaultsStore('k', storage);
    store.save('rsi', { params: { period: 21, source: 'close' }, style: { colors: ['#7e57c2'], lineWidths: [2], plots: { value: { lineStyle: 'dotted' } } } });
    store.save('rsi', { params: { period: 9 }, style: { colors: ['#000000'] } });
    const again = new IndicatorDefaultsStore('k', storage);
    expect(again.get('rsi')).toEqual({ params: { period: 9 }, style: { colors: ['#000000'] } });
    expect([...again.all().keys()]).toEqual(['rsi']);
  });

  it('read back only what they could have saved', () => {
    const storage = memory({
      k: JSON.stringify({
        rsi: { params: { period: 14, bad: { x: 1 }, n: Number.NaN, source: 'ind:tc_ema_2:value' }, style: { colors: ['#fff', 3], lineWidths: [1, -2, 'x'], plots: { value: { lineStyle: 'wavy', visible: false } } } },
        junk: 'yes',
        ema: { style: {} },
      }),
    });
    const store = new IndicatorDefaultsStore('k', storage);
    expect(store.get('rsi')).toEqual({ params: { period: 14 }, style: { colors: ['#fff'], lineWidths: [1], plots: { value: { visible: false } } } });
    expect(store.get('junk')).toBeNull();
    expect(store.get('ema')).toEqual({ params: {}, style: {} });
  });

  it('come back empty from storage that is broken or missing', () => {
    expect(new IndicatorDefaultsStore('k', memory({ k: '{oops' })).all().size).toBe(0);
    const none = new IndicatorDefaultsStore('k', null);
    none.save('rsi', { params: { period: 3 }, style: {} });
    expect(none.get('rsi')).toBeNull();
  });
});
