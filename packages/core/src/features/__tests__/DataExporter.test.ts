import { describe, it, expect } from 'vitest';
import { resampleBars, type OHLCBar } from '@tradecanvas/commons';
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

describe('DataExporter numbers', () => {
  const bar = (fields: Partial<OHLCBar>): OHLCBar => ({ time: T0, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10, ...fields });
  const row = (csv: string): string => csv.split('\n')[1];

  it('writes a summed volume without float dust', () => {
    const csv = DataExporter.toCSV([bar({ volume: 20.17 + 20.2 })]);
    expect(row(csv)).toBe('2026-01-05T14:30:00.000Z,1,2,0.5,1.5,40.37');
  });

  it('keeps every decimal a crypto volume has', () => {
    expect(row(DataExporter.toCSV([bar({ volume: 23456.78901234 })])).endsWith(',23456.78901234')).toBe(true);
  });

  it('keeps a whole volume past 15 digits', () => {
    expect(row(DataExporter.toCSV([bar({ volume: 1503456789012345 })])).endsWith(',1503456789012345')).toBe(true);
    expect(JSON.parse(DataExporter.toJSON([bar({ volume: 1503456789012345 })]))[0].volume).toBe(1503456789012345);
  });

  it('keeps a fraction on a value of 1e15 or more, where the 16th digit is real', () => {
    // A double this large holds its quarters exactly; cut to 15 digits it would read 1234567890123460.
    const huge = 1234567890123456.5;
    expect(row(DataExporter.toCSV([bar({ volume: huge })])).endsWith(',1234567890123456.5')).toBe(true);
    expect(JSON.parse(DataExporter.toJSON([bar({ volume: huge })]))[0].volume).toBe(huge);
  });

  it('writes prices and indicator values without float dust', () => {
    const csv = DataExporter.toCSV(
      [bar({ open: 0.1 + 0.2, high: (25.35 * 3) / 3, low: 25.3, close: 1.1 * 3, volume: 100 })],
      [{ name: 'SMA 5', values: [66973.86000000002] }],
    );
    expect(row(csv)).toBe('2026-01-05T14:30:00.000Z,0.3,25.35,25.3,3.3,100,66973.86');
  });

  it('writes bars resampled from 1m with the volume they add up to', () => {
    const minute = [20.17, 20.2, 0.1, 0.2, 12.34567].map((volume, i) => bar({ time: T0 + i * 60_000, volume }));
    const csv = DataExporter.toCSV(resampleBars(minute, '5m'));
    expect(row(csv).split(',')[5]).toBe('53.01567');
  });

  it('writes a negative zero as 0', () => {
    expect(row(DataExporter.toCSV([bar({ open: -0, volume: -0 })]))).toBe('2026-01-05T14:30:00.000Z,0,2,0.5,1.5,0');
    expect(DataExporter.toJSON([bar({ volume: -0 })])).toContain('"volume": 0');
  });

  it('leaves a cell empty for a value that is no number', () => {
    const csv = DataExporter.toCSV([bar({ volume: NaN })], [{ name: 'SMA 5', values: [null] }]);
    expect(row(csv)).toBe('2026-01-05T14:30:00.000Z,1,2,0.5,1.5,,');
    const [json] = JSON.parse(DataExporter.toJSON([bar({ volume: NaN })], [{ name: 'SMA 5', values: [NaN] }]));
    expect(json.volume).toBeNull();
    expect(json['SMA 5']).toBeNull();
  });

  it('puts clean numbers in the JSON', () => {
    const [json] = JSON.parse(DataExporter.toJSON(
      [bar({ open: 0.1 + 0.2, volume: 20.17 + 20.2 })],
      [{ name: 'SMA 5', values: [66973.86000000002] }],
    ));
    expect(json.open).toBe(0.3);
    expect(json.volume).toBe(40.37);
    expect(json['SMA 5']).toBe(66973.86);
  });
});
