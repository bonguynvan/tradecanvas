import { describe, it, expect } from 'vitest';
import { parseOHLCV } from '../parseOHLCV.js';

describe('parseOHLCV', () => {
  it('parses standard CSV with header', () => {
    const csv = [
      'time,open,high,low,close,volume',
      '1700000000,100,110,95,105,1234',
      '1700000060,105,112,100,108,2345',
    ].join('\n');
    const r = parseOHLCV(csv);
    expect(r.data).toHaveLength(2);
    expect(r.data[0]).toEqual({
      time: 1700000000 * 1000,
      open: 100, high: 110, low: 95, close: 105, volume: 1234,
    });
  });

  it('upgrades unix-second timestamps to ms', () => {
    const csv = 'time,open,high,low,close,volume\n1700000000,1,2,0,1,0';
    expect(parseOHLCV(csv).data[0].time).toBe(1700000000 * 1000);
  });

  it('keeps ms timestamps as-is', () => {
    const csv = 'time,open,high,low,close,volume\n1700000000000,1,2,0,1,0';
    expect(parseOHLCV(csv).data[0].time).toBe(1700000000000);
  });

  it('parses ISO 8601 timestamps', () => {
    const csv = 'time,open,high,low,close,volume\n2023-11-14T22:13:20Z,1,2,0,1,0';
    expect(parseOHLCV(csv).data[0].time).toBe(Date.parse('2023-11-14T22:13:20Z'));
  });

  it('detects semicolon delimiter', () => {
    const csv = 'time;open;high;low;close;volume\n1700000000;1;2;0;1;100';
    const r = parseOHLCV(csv);
    expect(r.data).toHaveLength(1);
    expect(r.data[0].volume).toBe(100);
  });

  it('handles headerless CSV in canonical order', () => {
    const csv = '1700000000,1,2,0,1,100';
    const r = parseOHLCV(csv);
    expect(r.data).toHaveLength(1);
  });

  it('parses JSON array of objects', () => {
    const json = JSON.stringify([
      { time: 1700000000, open: 1, high: 2, low: 0, close: 1, volume: 50 },
      { time: 1700000060, open: 1, high: 2, low: 0, close: 1, volume: 60 },
    ]);
    expect(parseOHLCV(json).data).toHaveLength(2);
  });

  it('parses JSON array of arrays', () => {
    const json = JSON.stringify([
      [1700000000, 1, 2, 0, 1, 50],
      [1700000060, 1, 2, 0, 1, 60],
    ]);
    expect(parseOHLCV(json).data).toHaveLength(2);
  });

  it('sorts ascending and de-dups same timestamps', () => {
    const csv = [
      'time,open,high,low,close,volume',
      '1700000060,2,3,1,2,200',
      '1700000000,1,2,0,1,100',
      '1700000000,1.5,2.5,0.5,1.5,150', // dup → last wins
    ].join('\n');
    const r = parseOHLCV(csv);
    expect(r.data).toHaveLength(2);
    expect(r.data[0].time).toBe(1700000000 * 1000);
    expect(r.data[0].open).toBe(1.5); // last write wins
  });

  it('skips rows with missing OHLC values', () => {
    const csv = [
      'time,open,high,low,close,volume',
      '1700000000,1,2,0,1,100',
      '1700000060,,,,,', // broken
    ].join('\n');
    const r = parseOHLCV(csv);
    expect(r.data).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });

  it('throws on CSV missing required columns', () => {
    expect(() => parseOHLCV('time,open\n1,1')).toThrow();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseOHLCV('{ not json')).toThrow();
  });
});
