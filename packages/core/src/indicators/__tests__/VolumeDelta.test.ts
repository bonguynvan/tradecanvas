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
