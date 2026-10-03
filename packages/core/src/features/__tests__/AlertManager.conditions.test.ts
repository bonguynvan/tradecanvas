import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertManager } from '../AlertManager.js';

let alerts: AlertManager;
let fired: string[];

beforeEach(() => {
  alerts = new AlertManager();
  fired = [];
  alerts.on('triggered', (a) => fired.push(a.message ?? a.id));
});

/** A tick on bar `time` (ms): the price and, optionally, other channels. */
function tick(time: number, price: number, channels: Record<string, number> = {}): void {
  alerts.setBarTime(time);
  alerts.checkPrice(price);
  for (const [channel, value] of Object.entries(channels)) alerts.checkChannel(channel, value);
}

describe('alerts on one line crossing another', () => {
  it('fires when the price crosses an indicator line, either side', () => {
    alerts.addAlert(Number.NaN, 'crossingUp', 'above EMA', false, 'price', undefined, { target: 'ema:value' });
    tick(1, 99, { 'ema:value': 100 });
    tick(1, 99.5, { 'ema:value': 100 });
    expect(fired).toEqual([]);
    tick(1, 100.5, { 'ema:value': 100 });
    expect(fired).toEqual(['above EMA']);
  });

  it('fires when one indicator line crosses another (the line moving, not the price)', () => {
    alerts.addAlert(Number.NaN, 'crossingDown', 'macd under signal', false, 'macd:macd', undefined, { target: 'macd:signal' });
    tick(1, 50, { 'macd:macd': 2, 'macd:signal': 1 });
    tick(1, 50, { 'macd:macd': 2, 'macd:signal': 1.5 });
    tick(1, 50, { 'macd:macd': 2, 'macd:signal': 2.5 });
    expect(fired).toEqual(['macd under signal']);
  });

  it('takes no movement condition and not its own line as the target', () => {
    expect(() => alerts.addAlert(0, 'movesUp', '', false, 'price', undefined, { target: 'ema:value', percent: 1, bars: 2 })).toThrow(RangeError);
    expect(() => alerts.addAlert(0, 'crossing', '', false, 'price', undefined, { target: 'price' })).toThrow(RangeError);
  });
});

describe('alerts on a move within some bars', () => {
  it('fires when the price rises the percent within the bars', () => {
    alerts.addAlert(Number.NaN, 'movesUp', 'pump', false, 'price', undefined, { percent: 5, bars: 3 });
    tick(1, 100);
    tick(2, 102);
    tick(3, 104);
    expect(fired).toEqual([]);
    tick(4, 106); // 106 is 5% above the lowest of bars 2–4? No: 102 → 3.9%. Within 3 bars (2, 3, 4).
    expect(fired).toEqual([]);
    tick(4, 107.2); // 107.2 / 102 = +5.1%
    expect(fired).toEqual(['pump']);
  });

  it('fires on a fall, and needs a percent and a number of bars', () => {
    alerts.addAlert(Number.NaN, 'movesDown', 'dump', false, 'price', undefined, { percent: 10, bars: 2 });
    tick(1, 100);
    tick(2, 89.5);
    expect(fired).toEqual(['dump']);
    expect(() => alerts.addAlert(0, 'movesUp', '', false, 'price', undefined, { bars: 3 })).toThrow(RangeError);
    expect(() => alerts.addAlert(0, 'movesUp', '', false, 'price', undefined, { percent: 2, bars: 0 })).toThrow(RangeError);
  });
});

describe('alerts on bar close', () => {
  it('waits for the bar to close, and goes by its closing price', () => {
    alerts.addAlert(100, 'greaterThan', 'closed above', false, 'price', undefined, { onBarClose: true });
    tick(1, 99);
    tick(1, 101); // above, but the bar is still forming
    tick(1, 99.5);
    expect(fired).toEqual([]);
    tick(2, 101); // bar 1 closed at 99.5: no
    expect(fired).toEqual([]);
    tick(3, 100.2); // bar 2 closed at 101: yes
    expect(fired).toEqual(['closed above']);
  });

  it('crosses between closes', () => {
    alerts.addAlert(100, 'crossingUp', 'close crossed', false, 'price', undefined, { onBarClose: true });
    tick(1, 99);
    tick(2, 101);
    tick(2, 99); // a wick above, closing below
    tick(3, 99);
    expect(fired).toEqual([]);
    tick(3, 101);
    tick(4, 100);
    expect(fired).toEqual(['close crossed']);
  });
});

describe('alerts that expire', () => {
  it('stop at their time, say so, and fire no more', () => {
    const expired: string[] = [];
    alerts.on('expired', (a) => expired.push(a.id));
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const id = alerts.addAlert(100, 'crossing', 'late', false, 'price', undefined, { expiresAt: 2_000 });
    tick(1, 99);
    now.mockReturnValue(2_500);
    tick(1, 101);
    expect(fired).toEqual([]);
    expect(expired).toEqual([id]);
    expect(alerts.getAlerts()[0]).toMatchObject({ expired: true });
    now.mockRestore();
  });
});

describe('alert storage', () => {
  it('keeps the new settings', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    alerts.addAlert(Number.NaN, 'movesUp', 'm', true, 'price', 'Price', { percent: 3, bars: 5, onBarClose: true, expiresAt: 9e12 });
    alerts.addAlert(Number.NaN, 'crossing', 't', false, 'price', undefined, { target: 'ema:value' });
    alerts.saveToStorage('k');
    const back = new AlertManager();
    back.loadFromStorage('k');
    expect(back.getAlerts().map(({ id: _id, ...a }) => a)).toEqual(alerts.getAlerts().map(({ id: _id, ...a }) => a));
    vi.unstubAllGlobals();
  });
});
