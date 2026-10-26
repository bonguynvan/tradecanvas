// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { VWAPIndicator } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const HALF_HOUR = HOUR / 2;
/** Monday 19 October 2026, 00:00 UTC. */
const D1 = Date.UTC(2026, 9, 19);
const SYDNEY = 'Australia/Sydney';
const NEW_YORK = 'America/New_York';

const flat = (time: number, price: number): OHLCBar => ({ time, open: price, high: price, low: price, close: price, volume: 100 });

/** `days` days of hourly bars from `start`, day d at 100 × (d + 1). */
const hourlyDays = (start: number, days: number): OHLCBar[] =>
  Array.from({ length: days * 24 }, (_, i) => flat(start + i * HOUR, 100 * (Math.floor(i / 24) + 1)));

/** An ASX session, 10:00–15:00 in Sydney (23:00–04:00 UTC): its first bar at 10, the rest at 20. */
const asxSession = (): OHLCBar[] => Array.from({ length: 6 }, (_, h) => flat(Date.UTC(2026, 9, 25, 23) + h * HOUR, h === 0 ? 10 : 20));

/** A seeded random walk of hourly bars from `start`. */
function walk(n: number, start: number, seed = 7): OHLCBar[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let close = 100;
  return Array.from({ length: n }, (_, i) => {
    const open = close;
    close = Math.max(1, open + (rand() - 0.5) * 3);
    return { time: start + i * HOUR, open, high: Math.max(open, close) + rand(), low: Math.min(open, close) - rand(), close, volume: 100 + Math.round(rand() * 900) };
  });
}

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const vwapAt = (id: string, i: number) => chart.getIndicatorOutput(id)!.series![i]?.value;
const byTime = (c: Chart, id: string): Map<number, number> => new Map([...c.getIndicatorOutput(id)!.values].map(([t, v]) => [t, v.value!]));

describe('Chart gives indicators the exchange’s zone', () => {
  it('from the symbol’s info', () => {
    chart.setData(asxSession());
    const id = chart.addIndicator('vwap')!;
    expect(vwapAt(id, 1)).toBe(20); // UTC's day: the 10:00 bar is the day before
    chart.setSymbolInfo({ symbol: 'BHP', timeZone: SYDNEY });
    expect(vwapAt(id, 1)).toBe(15);
  });

  it('from the market, when the symbol names none', () => {
    chart.setData(asxSession());
    const id = chart.addIndicator('vwap')!;
    chart.setMarket({ type: 'stock', timeZone: SYDNEY });
    expect(vwapAt(id, 1)).toBe(15);
  });

  it('and none for a zone the browser does not know', () => {
    chart.setData(asxSession());
    const id = chart.addIndicator('vwap')!;
    chart.setSymbolInfo({ symbol: 'BHP', timeZone: 'Mars/Olympus_Mons' });
    expect(vwapAt(id, 1)).toBe(20);
  });

  it('not the zone the chart shows', () => {
    chart.setData(asxSession());
    const id = chart.addIndicator('vwap')!;
    chart.setTimeZone(SYDNEY);
    expect(vwapAt(id, 1)).toBe(20);
  });

  it('and to its prior-day lines and market profile', () => {
    type Parts = Record<'periodLevels' | 'marketProfile', { exchangeZone: string | null }>;
    const parts = chart as unknown as Parts;
    chart.setSymbolInfo({ symbol: 'BHP', timeZone: SYDNEY });
    expect([parts.periodLevels.exchangeZone, parts.marketProfile.exchangeZone]).toEqual([SYDNEY, SYDNEY]);
    chart.setSymbolInfo(null);
    expect(parts.periodLevels.exchangeZone).toBeNull();
  });
});

describe('Chart computes a VWAP once for a new zone', () => {
  // Monday 5 January 2026, 00:00 in New York (UTC−5): half-hour bars for two days, priced by their number.
  const NY_MIDNIGHT = Date.UTC(2026, 0, 5, 5);
  const bars = Array.from({ length: 96 }, (_, i) => flat(NY_MIDNIGHT + i * HALF_HOUR, 100 + i));
  /** Hours to 20:00: the last hour (00:00–01:00 UTC in winter) is the New York day, not the next UTC one. */
  const hours = [{ start: '09:30', end: '20:00' }];

  it('with its hours, its extended hours hidden', () => {
    chart.setExtendedHours(false);
    chart.setData(bars);
    const id = chart.addIndicator('vwap')!;
    const calculate = vi.spyOn(VWAPIndicator.prototype, 'calculate');
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK, sessions: hours });
    // Tuesday's 19:30 bar: Tuesday's hours from 09:30 on, and nothing of Monday.
    const data = chart.getData();
    const open = data.findIndex((b) => b.time === NY_MIDNIGHT + (48 + 19) * HALF_HOUR);
    const at1930 = data.findIndex((b) => b.time === NY_MIDNIGHT + (48 + 39) * HALF_HOUR);
    const day = data.slice(open, at1930 + 1);
    expect(day).toHaveLength(21);
    expect(vwapAt(id, at1930)).toBeCloseTo(day.reduce((sum, b) => sum + b.close, 0) / day.length, 9);
    expect(calculate).toHaveBeenCalledTimes(1);
  });

  it('with the bars on the chart', () => {
    chart.setData(bars);
    const id = chart.addIndicator('vwap')!;
    const calculate = vi.spyOn(VWAPIndicator.prototype, 'calculate');
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK });
    chart.getIndicatorOutput(id);
    expect(calculate).toHaveBeenCalledTimes(1);
  });

  it('on the bars alone, when the zone comes before them', () => {
    const id = chart.addIndicator('vwap')!;
    const calculate = vi.spyOn(VWAPIndicator.prototype, 'calculate');
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK });
    chart.setData(bars);
    chart.getIndicatorOutput(id);
    expect(calculate).toHaveBeenCalledTimes(1);
  });

  it('on the new bars alone, when the next symbol trades on the same market', () => {
    chart.setMarket({ type: 'stock', timeZone: NEW_YORK });
    chart.setData(bars);
    chart.setSymbolInfo({ symbol: 'AAA', timeZone: NEW_YORK });
    const id = chart.addIndicator('vwap')!;
    const calculate = vi.spyOn(VWAPIndicator.prototype, 'calculate');
    // A symbol switch: the old symbol's info goes, its bars come, then its info.
    chart.setSymbolInfo(null);
    chart.setData(bars.map((b) => ({ ...b, close: b.close + 1 })));
    chart.setSymbolInfo({ symbol: 'BBB', timeZone: NEW_YORK });
    chart.getIndicatorOutput(id);
    expect(calculate).toHaveBeenCalledTimes(1);
  });
});

describe('Chart VWAP', () => {
  it('starts again at 00:00 UTC in the export, under the column VWAP', () => {
    chart.setData(hourlyDays(D1, 3));
    chart.addIndicator('vwap');
    const { bars, columns } = chart.getExportData({ range: 'all' });
    const col = columns.find((c) => c.name === 'VWAP')!;
    expect(col).toBeDefined();
    expect(col.values[bars.findIndex((b) => b.time === D1 + DAY)]).toBe(200);
    expect(chart.getExportText('csv', { range: 'all' }).split('\n')[0].split(',')).toContain('VWAP');
  });

  it('keeps every day as it was when older days are paged in', () => {
    const all = walk(24 * 5, D1);
    chart.setData(all.slice(24 * 2));
    const id = chart.addIndicator('vwap')!;
    const before = byTime(chart, id);
    chart.prependBars(all.slice(0, 24 * 2));
    const after = byTime(chart, id);
    for (const [t, v] of before) expect(after.get(t)).toBeCloseTo(v, 9);
  });

  it('streamed bar by bar and tick by tick, gives what a full computation gives', () => {
    const all = walk(24 * 4, D1);
    chart.setData(all.slice(0, 30));
    const id = chart.addIndicator('vwap')!;
    for (let i = 30; i < all.length; i++) {
      chart.appendBar({ ...all[i], close: all[i].open, volume: 1 });
      chart.updateLastBar(all[i]);
    }
    const live = byTime(chart, id);
    const fresh = new Chart(sizedHost(), { chartType: 'candlestick' });
    fresh.setData(all);
    const full = byTime(fresh, fresh.addIndicator('vwap')!);
    fresh.destroy();
    expect(live.size).toBe(full.size);
    for (const [t, v] of full) expect(live.get(t)).toBeCloseTo(v, 9);
  });

  it('in a replay, shows at the bar it stops on the value the whole series has there', () => {
    const all = walk(24 * 4, D1);
    chart.setData(all);
    const id = chart.addIndicator('vwap')!;
    const full = byTime(chart, id);
    chart.replayStart();
    chart.replaySeekToBar(24 * 2 + 5);
    const t = all[24 * 2 + 5].time;
    expect(byTime(chart, id).get(t)).toBeCloseTo(full.get(t)!, 9);
    chart.replayStop();
  });

  it('saved by 1.50 with no anchor, comes back starting each day', () => {
    chart.setData(hourlyDays(D1, 2));
    chart.applyIndicatorSetup([{ id: 'vwap', instanceId: 'vwap-0', params: {} }]);
    const [ind] = chart.getIndicatorSetup();
    expect(ind.params).toEqual({ anchor: 'session' });
    expect(vwapAt(ind.instanceId, 24)).toBe(200);
  });

  it("over every bar loaded with 'all', which a layout keeps", () => {
    chart.setData(hourlyDays(D1, 2));
    const id = chart.addIndicator('vwap')!;
    chart.updateIndicator(id, { anchor: 'all' });
    expect(chart.getIndicatorSetup()[0].params).toEqual({ anchor: 'all' });
    expect(vwapAt(id, 24)).toBeCloseTo((24 * 100 + 200) / 25, 9);
  });
});
