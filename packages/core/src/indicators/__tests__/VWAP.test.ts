import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { resampleBars } from '@tradecanvas/commons';
import { VWAPIndicator } from '../overlay/VWAP.js';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('VWAPIndicator', () => {
  const vwap = new VWAPIndicator();

  it('returns no values for an empty series', () => {
    const { values } = vwap.calculate([], indicatorConfig('vwap', {}));
    expect(values.size).toBe(0);
  });

  it('skips bars with zero cumulative volume', () => {
    const data = ohlcBars([{ o: 100, h: 102, l: 98, c: 100, v: 0 }]);
    const { values } = vwap.calculate(data, indicatorConfig('vwap', {}));
    expect(values.size).toBe(0);
  });

  it('matches the manual VWAP calculation across the full history', () => {
    const rows = [
      { o: 10, h: 11, l: 9, c: 10, v: 100 },
      { o: 10, h: 12, l: 10, c: 11, v: 200 },
      { o: 11, h: 13, l: 10, c: 12, v: 300 },
      { o: 12, h: 14, l: 11, c: 13, v: 400 },
    ];
    const data = ohlcBars(rows);
    const { series } = vwap.calculate(data, indicatorConfig('vwap', { anchor: 'all' }));

    let cumPV = 0;
    let cumV = 0;
    for (let i = 0; i < rows.length; i++) {
      const tp = (rows[i].h + rows[i].l + rows[i].c) / 3;
      cumPV += tp * rows[i].v;
      cumV += rows[i].v;
      expect(series![i]!.value!).toBeCloseTo(cumPV / cumV);
    }
  });

  it('converges to the typical price on a flat repeated bar with non-zero volume', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, () => ({ o: 100, h: 102, l: 98, c: 100, v: 50 })),
    );
    const { series } = vwap.calculate(data, indicatorConfig('vwap', {}));
    const expected = (102 + 98 + 100) / 3;
    expect(series![data.length - 1]!.value!).toBeCloseTo(expected);
  });
});

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Monday 2026-10-19, 00:00 UTC. */
const MON = Date.UTC(2026, 9, 19);

/** A flat bar: its typical price is `price`. */
const bar = (time: number, price: number, volume = 100): OHLCBar => ({ time, open: price, high: price, low: price, close: price, volume });

/** `days` days of hourly bars from `start`, day d at 100 × (d + 1). */
function hourlyDays(start: number, days: number): DataSeries {
  const out: OHLCBar[] = [];
  for (let d = 0; d < days; d++) for (let h = 0; h < 24; h++) out.push(bar(start + d * DAY + h * HOUR, 100 * (d + 1)));
  return out;
}

/** A seeded random walk of `n` bars `step` apart: the same bars every run. */
function walk(n: number, step: number, seed = 7): OHLCBar[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let close = 100;
  return Array.from({ length: n }, (_, i) => {
    const open = close;
    close = Math.max(1, open + (rand() - 0.5) * 3);
    return { time: MON + i * step, open, high: Math.max(open, close) + rand(), low: Math.min(open, close) - rand(), close, volume: 100 + Math.round(rand() * 900) };
  });
}

const cfg = (params: Record<string, string | number | boolean> = {}, exchangeTimeZone?: string): IndicatorConfig =>
  ({ id: 'vwap', instanceId: 'vwap-1', params, visible: true, ...(exchangeTimeZone ? { exchangeTimeZone } : {}) });

/** A context that counts the pieces of a path (each starts with moveTo) and its segments. */
function recorder() {
  const counts = { moves: 0, lines: 0 };
  const ctx = new Proxy({}, {
    get: (_t, k) => (k === 'moveTo' ? () => { counts.moves++; } : k === 'lineTo' ? () => { counts.lines++; } : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, counts };
}

const viewport = (from: number, to: number, min = 0, max = 400) => ({
  visibleRange: { from, to }, priceRange: { min, max }, barWidth: 6, barSpacing: 2, offset: 0,
  chartRect: { x: 0, y: 0, width: 1200, height: 300 },
}) as unknown as ViewportState;

const style = { colors: ['#000'], lineWidths: [1], opacity: 1 };

describe('VWAPIndicator anchors', () => {
  const vwap = new VWAPIndicator();

  it('starts again each trading day by default', () => {
    expect(vwap.descriptor.defaultConfig).toEqual({ anchor: 'session' });
    const s = vwap.calculate(hourlyDays(MON, 3), cfg()).series!;
    expect(s[23]?.value).toBe(100);
    expect(s[24]?.value).toBe(200); // 00:00 UTC: day 1 left out
    expect(s[71]?.value).toBe(300);
  });

  it('keeps each whole day as it was when older bars come in front', () => {
    const all = hourlyDays(MON, 3);
    const later = vwap.calculate(all.slice(24), cfg()).series!;
    const full = vwap.calculate(all, cfg()).series!;
    for (let i = 0; i < later.length; i++) expect(full[i + 24]?.value).toBe(later[i]?.value);
  });

  it("'all' averages every bar loaded, as it did before", () => {
    const s = vwap.calculate(hourlyDays(MON, 3), cfg({ anchor: 'all' })).series!;
    expect(s[24]?.value).toBeCloseTo((24 * 100 + 200) / 25, 9);
    expect(s[71]?.value).toBeCloseTo(200, 9);
    expect(s[71]?.session).toBeUndefined();
  });

  it('starts the day at midnight in the exchange zone (config.exchangeTimeZone), not UTC', () => {
    // An ASX session, 10:00–15:00 in Sydney (UTC+11 on 2026-10-26): 23:00–04:00 UTC.
    const open = Date.UTC(2026, 9, 25, 23);
    const session = Array.from({ length: 6 }, (_, h) => bar(open + h * HOUR, h === 0 ? 10 : 20));
    const zoned = vwap.calculate(session, cfg({}, 'Australia/Sydney')).series!;
    expect(zoned[1]?.value).toBe(15); // the 10:00 bar still counts
    expect(new Set(zoned.map((v) => v?.session)).size).toBe(1);
    // Without a zone, the UTC day.
    const utc = vwap.calculate(session, cfg()).series!;
    expect(utc[1]?.value).toBe(20);
  });

  it('a Vietnamese trading day is the exchange date', () => {
    // HOSE 09:00–14:45 in Asia/Ho_Chi_Minh (UTC+7): 02:00–07:45 UTC, hourly, two days.
    const day = (d: number, price: number) => Array.from({ length: 6 }, (_, h) => bar(MON + d * DAY + (2 + h) * HOUR, price));
    const s = vwap.calculate([...day(0, 10), ...day(1, 20)], cfg({}, 'Asia/Ho_Chi_Minh')).series!;
    expect(s[5]?.value).toBe(10);
    expect(s[6]?.value).toBe(20);
  });

  it("'week' starts again on Monday, 'month' on the 1st", () => {
    // Daily bars Thu 2026-10-15 … Wed 2026-11-04.
    const start = Date.UTC(2026, 9, 15);
    const daily = Array.from({ length: 21 }, (_, d) => bar(start + d * DAY, d + 1));
    const week = vwap.calculate(daily, cfg({ anchor: 'week' })).series!;
    const monday = daily.findIndex((b) => new Date(b.time).getUTCDay() === 1);
    expect(week[monday]?.value).toBe(daily[monday].close);
    expect(week[monday - 1]?.value).not.toBe(daily[monday - 1].close);
    const month = vwap.calculate(daily, cfg({ anchor: 'month' })).series!;
    const first = daily.findIndex((b) => new Date(b.time).getUTCDate() === 1);
    expect(month[first]?.value).toBe(daily[first].close);
    expect(month[first + 1]?.value).toBeCloseTo((daily[first].close + daily[first + 1].close) / 2, 9);
  });

  it('puts a daily bar stamped at the exchange midnight in its own month', () => {
    // VN daily bars stamped 00:00 in Asia/Ho_Chi_Minh: 17:00 UTC the day before.
    const local = (y: number, m: number, d: number) => Date.UTC(y, m, d) - 7 * HOUR;
    // Fri 27 Nov, Mon 30 Nov, Tue 1 Dec, Wed 2 Dec 2026.
    const days = [local(2026, 10, 27), local(2026, 10, 30), local(2026, 11, 1), local(2026, 11, 2)];
    const daily = days.map((t, i) => bar(t, (i + 1) * 10));
    const zoned = vwap.calculate(daily, cfg({ anchor: 'month' }, 'Asia/Ho_Chi_Minh')).series!;
    expect(zoned[2]?.value).toBe(30); // 1 Dec starts December
    // Read in UTC, 1 Dec's bar is 30 Nov 17:00: December starts a bar late.
    const utc = vwap.calculate(daily, cfg({ anchor: 'month' })).series!;
    expect(utc[2]?.value).toBe(20);
    expect(utc[3]?.value).toBe(40);
  });

  it('reads bar times given in seconds', () => {
    const secs = hourlyDays(MON, 2).map((b) => ({ ...b, time: b.time / 1000 }));
    expect(vwap.calculate(secs, cfg()).series![24]?.value).toBe(200);
  });

  it('takes an anchor it does not know as the session', () => {
    expect(vwap.calculate(hourlyDays(MON, 2), cfg({ anchor: 'decade' })).series![24]?.value).toBe(200);
  });

  it('breaks its line where it starts again', () => {
    const data = hourlyDays(MON, 3);
    const { ctx, counts } = recorder();
    vwap.render(ctx, vwap.calculate(data, cfg()), viewport(0, data.length - 1), style);
    expect(counts.moves).toBe(3);
  });

  it('on daily bars, joins each day’s typical price into one line', () => {
    const daily = Array.from({ length: 30 }, (_, i) => ({ time: Date.UTC(2026, 8, 1) + i * DAY, open: 100 + i, high: 102 + i, low: 98 + i, close: 101 + i, volume: 1000 }));
    const out = vwap.calculate(daily, cfg());
    expect(out.series![5]?.value).toBeCloseTo((107 + 103 + 106) / 3, 9);
    const { ctx, counts } = recorder();
    vwap.render(ctx, out, viewport(0, daily.length - 1, 90, 140), style);
    expect(counts.lines).toBe(daily.length - 1);
  });
});

describe('VWAPIndicator joins its line from the bars around, not from what is on screen', () => {
  const vwap = new VWAPIndicator();

  it('breaks between days when only the last bar of the first one is on screen', () => {
    const data = hourlyDays(MON, 3);
    const { ctx, counts } = recorder();
    vwap.render(ctx, vwap.calculate(data, cfg()), viewport(23, 71), style);
    expect(counts.moves).toBe(3);
  });

  it('breaks either side of a day with one bar between two full days', () => {
    const data = [...hourlyDays(MON, 1), bar(MON + DAY, 200), ...hourlyDays(MON + 2 * DAY, 1).map((b) => ({ ...b, open: 300, high: 300, low: 300, close: 300 }))];
    const { ctx, counts } = recorder();
    vwap.render(ctx, vwap.calculate(data, cfg()), viewport(0, data.length - 1), style);
    expect(counts.moves).toBe(3);
  });
});

describe('VWAPIndicator on the daily bars the library builds, in a zone west of UTC', () => {
  const vwap = new VWAPIndicator();
  // US regular hours, 09:30–16:00 EDT = 13:30–20:00 UTC, every weekday for 8 weeks from Monday 19 October.
  const intraday: OHLCBar[] = [];
  for (let d = 0; d < 56; d++) {
    const dow = new Date(MON + d * DAY).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (let m = 0; m < 13; m++) intraday.push(bar(MON + d * DAY + 13.5 * HOUR + m * 30 * 60_000, 10 + d));
  }
  // Resampled without a zone, as a feed or the widget without a market stamps them: 00:00 UTC.
  const daily = resampleBars(intraday, '1d');

  it('sit at 00:00 UTC', () => {
    expect(daily.every((b) => b.time % DAY === 0)).toBe(true);
  });

  it("'week' in America/New_York starts again on Monday’s bar", () => {
    const s = vwap.calculate(daily, cfg({ anchor: 'week' }, 'America/New_York')).series!;
    const monday = daily.findIndex((b, i) => i > 0 && new Date(b.time).getUTCDay() === 1);
    expect(s[monday]?.value).toBe(daily[monday].close);
  });

  it("'month' in America/New_York starts again on the 1st’s bar", () => {
    const s = vwap.calculate(daily, cfg({ anchor: 'month' }, 'America/New_York')).series!;
    const first = daily.findIndex((b) => new Date(b.time).getUTCDate() === 1 && new Date(b.time).getUTCMonth() === 11); // Tue 1 Dec
    expect(s[first]?.value).toBe(daily[first].close);
  });
});

describe('VWAPIndicator.update', () => {
  const vwap = new VWAPIndicator();
  const cases = [['session', undefined], ['session', 'America/New_York'], ['week', 'Asia/Ho_Chi_Minh'], ['month', 'Australia/Sydney']] as const;

  for (const [anchor, zone] of cases) {
    it(`gives what calculate gives on a new bar and a tick (${anchor}, ${zone ?? 'UTC'})`, () => {
      const data = walk(24 * 50, HOUR);
      const c = cfg({ anchor }, zone);
      for (const k of [70, 24 * 7, 24 * 31 + 5, data.length - 1]) {
        const next = vwap.update(data, c, vwap.calculate(data.slice(0, k), c), k);
        expect(next).not.toBeNull();
        const full = vwap.calculate(data, c);
        for (let i = 0; i < data.length; i++) {
          expect(next!.series![i]?.value).toBeCloseTo(full.series![i]!.value!, 9);
          expect(next!.series![i]?.session).toBe(full.series![i]?.session);
        }
        expect(next!.values.size).toBe(full.values.size);
      }
      // A tick: the last bar changes in place.
      const last = data.length - 1;
      const ticked = data.map((b, i) => (i === last ? { ...b, close: b.close + 5, high: b.high + 5, volume: b.volume + 50 } : b));
      const next = vwap.update(ticked, c, vwap.calculate(data, c), last)!;
      expect(next.series![last]?.value).toBeCloseTo(vwap.calculate(ticked, c).series![last]!.value!, 9);
    });
  }

  it('adds a tick and a new bar to the sums it kept, without reading the period’s earlier bars again', () => {
    // A month of minute bars is 40,000 bars to sum again on every tick.
    const data = walk(24 * 40, HOUR);
    const c = cfg({ anchor: 'month' }, 'America/New_York');
    const last = data.length - 1;
    for (const from of [last, last - 1]) {
      const read = new Set<number>();
      const watched = new Proxy(data, {
        get(target, key, receiver) {
          if (typeof key === 'string' && /^\d+$/.test(key)) read.add(Number(key));
          return Reflect.get(target, key, receiver);
        },
      });
      const prev = vwap.calculate(data.slice(0, from + 1), c);
      expect(vwap.update(watched, c, prev, from)).not.toBeNull();
      // Whether the bars are daily is read from the first 64; nothing else before the bar it resumes from.
      expect([...read].filter((i) => i >= 64 && i < from - 1)).toEqual([]);
    }
  });

  it('resumes where a period starts at the bar it is given, and where one starts just before', () => {
    const data = hourlyDays(MON, 5);
    const c = cfg();
    const full = vwap.calculate(data, c).series!;
    for (const from of [72, 73]) {
      const next = vwap.update(data, c, vwap.calculate(data.slice(0, from), c), from)!;
      expect(next.series!.map((v) => v?.value)).toEqual(full.map((v) => v?.value));
    }
  });

  it("leaves 'all' to a full calculate", () => {
    const data = walk(200, HOUR);
    const c = cfg({ anchor: 'all' });
    expect(vwap.update(data, c, vwap.calculate(data.slice(0, 150), c), 150)).toBeNull();
  });

  it('leaves the first 64 bars to a full calculate, while they may still change whether the bars are daily', () => {
    const data = walk(80, HOUR);
    const c = cfg();
    expect(vwap.update(data, c, vwap.calculate(data.slice(0, 40), c), 40)).toBeNull();
    expect(vwap.update(data, c, vwap.calculate(data.slice(0, 70), c), 70)).not.toBeNull();
  });

  it('streamed bar by bar through the engine, matches a full recompute', () => {
    const engine = new IndicatorEngine();
    engine.register(new VWAPIndicator());
    const data = walk(24 * 10, HOUR);
    const live = data.slice(0, 100);
    const id = engine.addIndicator('vwap', {}, live);
    for (let i = 100; i < data.length; i++) {
      live.push(data[i]);
      engine.recalculateFrom(live, live.length - 2);
    }
    const full = vwap.calculate(data, cfg());
    const got = engine.getOutput(id)!;
    for (let i = 0; i < data.length; i++) {
      expect(got.series![i]?.value).toBeCloseTo(full.series![i]!.value!, 9);
      expect(got.series![i]?.session).toBe(full.series![i]?.session);
    }
  });
});
