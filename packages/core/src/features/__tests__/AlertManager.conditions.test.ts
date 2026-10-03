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

describe('alerts fed several lines at once', () => {
  it('compares the price with the line as of the same moment', () => {
    alerts.addAlert(Number.NaN, 'crossingUp', 'above EMA', false, 'price', undefined, { target: 'ema:value' });
    alerts.checkChannels({ price: 9, 'ema:value': 10 });
    // The price passes the old line value, but the line moved above it too.
    alerts.checkChannels({ price: 11, 'ema:value': 12 });
    expect(fired).toEqual([]);
    alerts.checkChannels({ price: 13, 'ema:value': 12 });
    expect(fired).toEqual(['above EMA']);
  });

  it('measures a move over two bars at least', () => {
    expect(() => alerts.addAlert(Number.NaN, 'movesUp', '', false, 'price', undefined, { percent: 1, bars: 1 })).toThrow(/2 to 500/);
    expect(() => alerts.addAlert(Number.NaN, 'movesUp', '', false, 'price', undefined, { percent: 1, bars: 2 })).not.toThrow();
  });

  it('starts a line’s bars again from a time that goes back, with no bar closing', () => {
    alerts.addAlert(100, 'greaterThan', 'closed above', false, 'price', undefined, { onBarClose: true });
    tick(1000, 90);
    tick(2000, 95);
    tick(1500, 120); // back in time (a reload): no bar closed on 120
    expect(fired).toEqual([]);
    tick(2500, 99); // the 1500 bar closes, at 120
    expect(fired).toEqual(['closed above']);
  });
});

describe('alert expiry', () => {
  it('expires on time with no price coming in, and not once it has fired', () => {
    vi.useFakeTimers();
    try {
      const expired: string[] = [];
      alerts.on('expired', (a) => expired.push(a.message ?? a.id));
      const now = Date.now();
      alerts.addAlert(100, 'crossing', 'quiet', false, 'price', undefined, { expiresAt: now + 60_000 });
      alerts.addAlert(100, 'crossing', 'fired', false, 'price', undefined, { expiresAt: now + 30_000 });
      tick(1, 99);
      tick(1, 101);
      expect(fired).toEqual(['quiet', 'fired']);
      alerts.addAlert(200, 'crossing', 'waiting', false, 'price', undefined, { expiresAt: now + 90_000 });
      vi.advanceTimersByTime(90_000);
      expect(expired).toEqual(['waiting']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops its timer when disposed', () => {
    vi.useFakeTimers();
    try {
      const expired: string[] = [];
      alerts.on('expired', (a) => expired.push(a.id));
      alerts.addAlert(100, 'crossing', 'x', false, 'price', undefined, { expiresAt: Date.now() + 1000 });
      alerts.dispose();
      vi.advanceTimersByTime(5000);
      expect(expired).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('alerts on two lines given together', () => {
  it('wait for both lines when asked to', () => {
    alerts.addAlert(Number.NaN, 'crossingUp', 'above EMA', false, 'price', undefined, { target: 'ema:value' });
    alerts.checkChannels({ price: 9, 'ema:value': 10 }, { together: true });
    // The price alone (the line not given, e.g. during a replay): no comparison with an old line value.
    alerts.checkChannels({ price: 11 }, { together: true });
    expect(fired).toEqual([]);
    alerts.checkChannels({ price: 11, 'ema:value': 10 }, { together: true });
    expect(fired).toEqual(['above EMA']);
  });
});

describe('alert expiry, more', () => {
  it('keeps the timer going when an expiry listener throws', () => {
    vi.useFakeTimers();
    try {
      const expired: string[] = [];
      let first = true;
      alerts.on('expired', (a) => {
        expired.push(a.message ?? '');
        if (first) { first = false; throw new Error('listener'); }
      });
      const now = Date.now();
      alerts.addAlert(100, 'crossing', 'one', false, 'price', undefined, { expiresAt: now + 1000 });
      alerts.addAlert(100, 'crossing', 'two', false, 'price', undefined, { expiresAt: now + 5000 });
      expect(() => vi.advanceTimersByTime(1000)).toThrow('listener');
      vi.advanceTimersByTime(4000);
      expect(expired).toEqual(['one', 'two']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('can expire again once a fired alert is moved (armed again)', () => {
    vi.useFakeTimers();
    try {
      const expired: string[] = [];
      alerts.on('expired', (a) => expired.push(a.message ?? ''));
      const id = alerts.addAlert(100, 'crossing', 'moved', false, 'price', undefined, { expiresAt: Date.now() + 10_000 });
      tick(1, 99);
      tick(1, 101); // fired: done, not expiring
      alerts.addAlert(500, 'crossing', 'other', false, 'price', undefined, { expiresAt: Date.now() + 1000 });
      vi.advanceTimersByTime(1000);
      alerts.updateAlertPrice(id, 120);
      vi.advanceTimersByTime(9000);
      expect(expired).toEqual(['other', 'moved']);
    } finally {
      vi.useRealTimers();
    }
  });
});
