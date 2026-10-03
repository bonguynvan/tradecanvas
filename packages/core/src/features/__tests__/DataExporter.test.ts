import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { DataExporter } from '../DataExporter.js';

const T0 = Date.UTC(2026, 0, 5, 14, 30);
const bars: OHLCBar[] = [
  { time: T0, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
  { time: T0 + 60_000, open: 1.5, high: 2.5, low: 1, close: 2, volume: 12 },
];

describe('DataExporter', () => {
  it('writes bars timed in seconds at their real date', () => {
    const csv = DataExporter.toCSV(bars.map((b) => ({ ...b, time: b.time / 1000 })));
    expect(csv.split('\n')[1]).toBe('2026-01-05T14:30:00.000Z,1,2,0.5,1.5,10');
  });

  it('adds a column per indicator line, empty where it has no value', () => {
    const csv = DataExporter.toCSV(bars, [
      { name: 'SMA 20', values: [null, 1.75] },
      { name: 'RSI 14', values: [55.5, undefined] },
    ]);
    expect(csv.split('\n')).toEqual([
      'Time,Open,High,Low,Close,Volume,SMA 20,RSI 14',
      '2026-01-05T14:30:00.000Z,1,2,0.5,1.5,10,,55.5',
      '2026-01-05T14:31:00.000Z,1.5,2.5,1,2,12,1.75,',
    ]);
  });

  it('quotes names with commas or quotes, and never starts a cell with a formula', () => {
    const csv = DataExporter.toCSV(bars, [
      { name: 'BB 20, 2 "upper"', values: [1, 2] },
      { name: '=HYPERLINK("x")', values: [1, 2] },
    ]);
    expect(csv.split('\n')[0]).toBe(`Time,Open,High,Low,Close,Volume,"BB 20, 2 ""upper""","'=HYPERLINK(""x"")"`);
  });

  it('puts the columns in each JSON row', () => {
    const rows = JSON.parse(DataExporter.toJSON(bars, [{ name: 'SMA 20', values: [null, 1.75] }]));
    expect(rows[0]).toEqual({ time: '2026-01-05T14:30:00.000Z', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10, 'SMA 20': null });
    expect(rows[1]['SMA 20']).toBe(1.75);
  });
});
