import { describe, it, expect } from 'vitest';
import type { DataSeries } from '@tradecanvas/commons';
import { resampleOHLCV, inferTimeframeMs, canResample } from '../resampleOHLCV.js';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Build a contiguous 1-minute series starting at a UTC anchor. */
function minuteSeries(startMs: number, count: number): DataSeries {
  return Array.from({ length: count }, (_, i) => {
    const base = 100 + i;
    return {
      time: startMs + i * MIN,
      open: base,
      high: base + 2,
      low: base - 2,
      close: base + 1,
      volume: 10,
    };
  });
}

describe('resampleOHLCV', () => {
  it('returns empty for empty input', () => {
    expect(resampleOHLCV([], '5m')).toEqual([]);
  });

  it('aggregates 1m bars into 5m buckets with correct OHLCV', () => {
    // Anchor on a clean UTC 5-minute boundary.
    const start = Date.UTC(2023, 0, 2, 0, 0, 0); // Mon 2023-01-02 00:00 UTC
    const bars = minuteSeries(start, 10);
    const out = resampleOHLCV(bars, '5m');

    expect(out).toHaveLength(2);
    // First bucket = bars 0..4
    expect(out[0].time).toBe(start);
    expect(out[0].open).toBe(bars[0].open);
    expect(out[0].close).toBe(bars[4].close);
    expect(out[0].high).toBe(Math.max(...bars.slice(0, 5).map((b) => b.high)));
    expect(out[0].low).toBe(Math.min(...bars.slice(0, 5).map((b) => b.low)));
    expect(out[0].volume).toBe(50);
    // Second bucket = bars 5..9
    expect(out[1].time).toBe(start + 5 * MIN);
    expect(out[1].close).toBe(bars[9].close);
  });

  it('does not mutate the input bars', () => {
    const start = Date.UTC(2023, 0, 2, 0, 0, 0);
    const bars = minuteSeries(start, 5);
    const snapshot = JSON.parse(JSON.stringify(bars));
    resampleOHLCV(bars, '5m');
    expect(bars).toEqual(snapshot);
  });

  it('aligns hourly buckets to UTC hour boundaries', () => {
    // Start mid-hour: 00:30 — first bucket should still anchor to 00:00.
    const start = Date.UTC(2023, 0, 2, 0, 30, 0);
    const bars = minuteSeries(start, 60);
    const out = resampleOHLCV(bars, '1h');

    expect(out[0].time).toBe(Date.UTC(2023, 0, 2, 0, 0, 0));
    expect(out[1].time).toBe(Date.UTC(2023, 0, 2, 1, 0, 0));
  });

  it('anchors weekly buckets to Monday', () => {
    // 2023-01-04 is a Wednesday; its week (Mon start) begins 2023-01-02.
    const wednesday = Date.UTC(2023, 0, 4, 12, 0, 0);
    const bars: DataSeries = [
      { time: wednesday, open: 1, high: 5, low: 0, close: 3, volume: 1 },
      { time: wednesday + DAY, open: 3, high: 6, low: 2, close: 4, volume: 1 },
    ];
    const out = resampleOHLCV(bars, '1w');
    expect(out).toHaveLength(1);
    expect(out[0].time).toBe(Date.UTC(2023, 0, 2, 0, 0, 0));
  });

  it('respects weekStartsOn = 0 (Sunday)', () => {
    const wednesday = Date.UTC(2023, 0, 4, 12, 0, 0);
    const bars: DataSeries = [{ time: wednesday, open: 1, high: 5, low: 0, close: 3, volume: 1 }];
    const out = resampleOHLCV(bars, '1w', { weekStartsOn: 0 });
    // Sunday before 2023-01-04 is 2023-01-01.
    expect(out[0].time).toBe(Date.UTC(2023, 0, 1, 0, 0, 0));
  });

  it('aligns monthly buckets to the 1st of the calendar month', () => {
    const mid = Date.UTC(2023, 2, 15, 0, 0, 0); // 2023-03-15
    const bars: DataSeries = [{ time: mid, open: 1, high: 5, low: 0, close: 3, volume: 1 }];
    const out = resampleOHLCV(bars, '1M');
    expect(out[0].time).toBe(Date.UTC(2023, 2, 1, 0, 0, 0));
  });

  it('aligns quarterly (3M) buckets to quarter starts', () => {
    const may = Date.UTC(2023, 4, 10, 0, 0, 0); // 2023-05 → Q2 starts April
    const bars: DataSeries = [{ time: may, open: 1, high: 5, low: 0, close: 3, volume: 1 }];
    const out = resampleOHLCV(bars, '3M');
    expect(out[0].time).toBe(Date.UTC(2023, 3, 1, 0, 0, 0));
  });
});

describe('inferTimeframeMs', () => {
  it('returns 0 for series shorter than two bars', () => {
    expect(inferTimeframeMs([])).toBe(0);
    expect(inferTimeframeMs(minuteSeries(0, 1))).toBe(0);
  });

  it('detects the median spacing, ignoring gaps', () => {
    const bars = minuteSeries(Date.UTC(2023, 0, 2), 20);
    // Inject a weekend-style gap; median should stay 1m.
    bars[10] = { ...bars[10], time: bars[9].time + 2 * DAY };
    expect(inferTimeframeMs(bars)).toBe(MIN);
  });
});

describe('canResample', () => {
  it('allows coarser targets', () => {
    expect(canResample(MIN, '5m')).toBe(true);
    expect(canResample(MIN, '1h')).toBe(true);
  });

  it('rejects finer targets', () => {
    expect(canResample(HOUR, '5m')).toBe(false);
  });

  it('treats unknown source spacing as valid', () => {
    expect(canResample(0, '5m')).toBe(true);
  });
});
