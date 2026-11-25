import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig } from '@tradecanvas/commons';
import { VolumeDeltaIndicator } from '../panel/VolumeDelta.js';

function bar(open: number, close: number, volume: number): DataSeries[number] {
  return { time: 0, open, high: Math.max(open, close), low: Math.min(open, close), close, volume };
}

function cfg(params: Record<string, number>): IndicatorConfig {
  return { id: 'voldelta', instanceId: 'vd-1', params, visible: true } as IndicatorConfig;
}

describe('VolumeDeltaIndicator', () => {
  const ind = new VolumeDeltaIndicator();
  const data: DataSeries = [
    bar(10, 12, 100), // up   → +100
    bar(12, 11, 50),  // down → -50
    bar(11, 11, 30),  // flat (close==open) → counts as up → +30
  ];

  it('signs per-bar volume by close vs open (mode 0)', () => {
    const out = ind.calculate(data, cfg({ mode: 0 }));
    const s = out.series!;
    expect(s[0]?.value).toBe(100);
    expect(s[1]?.value).toBe(-50);
    expect(s[2]?.value).toBe(30); // close==open treated as up
    expect(s[0]?.up).toBe(1);
    expect(s[1]?.up).toBe(0);
  });

  it('accumulates a running delta in cumulative mode (mode 1)', () => {
    const out = ind.calculate(data, cfg({ mode: 1 }));
    const s = out.series!;
    expect(s[0]?.value).toBe(100);
    expect(s[1]?.value).toBe(50);  // 100 - 50
    expect(s[2]?.value).toBe(80);  // 50 + 30
  });

  it('handles empty data', () => {
    const out = ind.calculate([], cfg({ mode: 0 }));
    expect(out.series).toEqual([]);
  });
});

describe('VolumeDeltaIndicator: bars that say who took their trades', () => {
  const ind = new VolumeDeltaIndicator();
  const HOUR = 3_600_000;
  const day1 = Date.UTC(2023, 0, 2);
  const day2 = Date.UTC(2023, 0, 3);
  const told = (time: number, open: number, close: number, volume: number, buyVolume?: number): DataSeries[number] => ({
    time, open, high: Math.max(open, close), low: Math.min(open, close), close, volume, ...(buyVolume === undefined ? {} : { buyVolume }),
  });

  it('is what was bought less what was sold, whatever way the bar closed', () => {
    // An up bar the sellers took most of, and a down bar the buyers did.
    const s = ind.calculate([told(day1, 10, 12, 100, 30), told(day1 + HOUR, 12, 11, 50, 40)], cfg({ mode: 0 })).series!;
    expect(s[0]).toEqual(expect.objectContaining({ value: -40, up: 0 }));
    expect(s[1]).toEqual(expect.objectContaining({ value: 30, up: 1 }));
  });

  it('is read from the way the bar closed for a bar that does not say, beside bars that do', () => {
    const s = ind.calculate([told(day1, 10, 12, 100, 30), told(day1 + HOUR, 12, 11, 50), told(day1 + 2 * HOUR, 11, 13, 20)], cfg({ mode: 0 })).series!;
    expect(s.map((v) => v?.value)).toEqual([-40, -50, 20]);
  });

  it('adds up to the cumulative delta', () => {
    const s = ind.calculate([told(day1, 10, 12, 100, 30), told(day1 + HOUR, 12, 11, 50, 40), told(day1 + 2 * HOUR, 11, 11, 10, 5)], cfg({ mode: 1 })).series!;
    expect(s.map((v) => v?.value)).toEqual([-40, -10, -10]);
    // Its colour is the way it went: down, up, and as it was.
    expect(s.map((v) => v?.up)).toEqual([0, 1, 1]);
  });

  it('starts the sum again with each session, week or month when told to, and never by itself', () => {
    const data = [told(day1, 10, 12, 100, 80), told(day1 + HOUR, 12, 11, 50, 10), told(day2, 11, 12, 20, 15), told(day2 + HOUR, 12, 13, 10, 10)];
    const all = ind.calculate(data, cfg({ mode: 1 })).series!;
    expect(all.map((v) => v?.value)).toEqual([60, 30, 40, 50]);
    const bySession = ind.calculate(data, { ...cfg({ mode: 1 }), params: { mode: 1, anchor: 'session' } } as IndicatorConfig).series!;
    expect(bySession.map((v) => v?.value)).toEqual([60, 30, 10, 20]);
    // The bars' own delta is the same either way.
    const each = ind.calculate(data, { ...cfg({ mode: 0 }), params: { mode: 0, anchor: 'session' } } as IndicatorConfig).series!;
    expect(each.map((v) => v?.value)).toEqual([60, -30, 10, 10]);
  });
});
