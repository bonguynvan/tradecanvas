// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mergeBar, resampleBars, type DataAdapter, type DataAdapterListener, type OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { regularHoursFilter } from '../regularHours.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

/**
 * Every way bars reach a chart leaves it as loading them all at once would:
 * after any run of appends, updates, corrections, ticks, older pages, new
 * series and the extended hours shown or hidden, the chart's bars and its
 * indicators are those of a chart given the same whole series with `setData`.
 */
const NYSE = { symbol: 'AAA', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] };
const HALF_HOUR = 30 * 60_000;
const T0 = Date.UTC(2026, 0, 5, 5); // Monday, midnight in New York

describe('Chart: every write path agrees with setData', () => {
  const charts: Chart[] = [];
  afterEach(() => {
    for (const chart of charts.splice(0)) chart.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function make(): { chart: Chart; ema: string; rsi: string; vwap: string; zz: string } {
    const chart = new Chart(sizedHost(), {});
    charts.push(chart);
    chart.setSymbolInfo(NYSE);
    const ema = chart.addIndicator('ema', { period: 5 })!;
    const rsi = chart.addIndicator('rsi', { period: 4 }, 'bottom')!;
    // Two that compute in full, from the session's start or a swing back.
    const vwap = chart.addIndicator('svwap')!;
    const zz = chart.addIndicator('zigzag')!;
    return { chart, ema, rsi, vwap, zz };
  }
  const LINES = ['ema', 'rsi', 'vwap', 'zz'] as const;

  it.each([3, 11, 29])('after a seeded run of writes (seed %i)', (start) => {
    installChartStubs();
    const live = make();
    const oracle = make();
    let seed = start;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const price = () => 5 + Math.round(random() * 100) / 10;
    const at = (slot: number): OHLCBar => {
      const close = price();
      const open = price();
      return { time: T0 + slot * HALF_HOUR, open, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, close, volume: 1 + Math.round(random() * 9) };
    };
    const series = (from: number, count: number) => Array.from({ length: count }, (_, i) => at(from + i));

    let whole = series(0, 20);
    // Hidden from the start, where most of the trouble lies.
    let hoursShown = false;
    live.chart.setExtendedHours(false);
    live.chart.setData(whole.slice());

    let hidden = 0;
    let corrected = 0;
    for (let step = 0; step < 250; step++) {
      const last = whole[whole.length - 1];
      const lastSlot = Math.round((last.time - T0) / HALF_HOUR);
      const roll = random();
      let what: string;
      if (roll < 0.22) {
        what = 'appendBar';
        const bar = at(lastSlot + 1);
        live.chart.appendBar(bar);
        whole.push(bar);
      } else if (roll < 0.32) {
        what = 'appendBars';
        const bars = series(lastSlot + 1, 2 + Math.floor(random() * 3));
        live.chart.appendBars(bars);
        whole.push(...bars);
      } else if (roll < 0.45) {
        what = 'updateLastBar';
        const bar = { ...at(lastSlot), time: last.time };
        live.chart.updateLastBar(bar);
        whole[whole.length - 1] = bar;
      } else if (roll < 0.53) {
        what = 'updateBar';
        // Mostly one of the last bars, as a feed corrects them; now and then one far back.
        const reach = random() < 0.7 ? 6 : 60;
        const k = whole.length - 1 - Math.floor(random() * Math.min(whole.length, reach));
        const bar = { ...at(0), time: whole[k].time };
        expect(live.chart.updateBar(bar), `seed ${start}, step ${step}`).toBe(true);
        whole[k] = bar;
        corrected++;
      } else if (roll < 0.55) {
        what = 'updateBar: no such time';
        expect(live.chart.updateBar({ ...at(0), time: last.time + 7 })).toBe(false);
      } else if (roll < 0.72) {
        what = 'tick';
        const tick = { time: last.time + (1 + Math.floor(random() * 29)) * 60_000, price: price(), volume: 1 };
        live.chart.updateLastBarFromTick(tick);
        // A tick outside the hours shown moves the price, not a bar.
        const keep = hoursShown ? null : regularHoursFilter(NYSE, whole);
        if (!keep || keep(tick.time)) whole[whole.length - 1] = mergeBar(last, tick);
      } else if (roll < 0.82) {
        what = 'prependBars';
        const firstSlot = Math.round((whole[0].time - T0) / HALF_HOUR);
        const count = 1 + Math.floor(random() * 6);
        const older = series(firstSlot - count, count);
        live.chart.prependBars(older);
        whole = [...older, ...whole];
      } else if (roll < 0.86) {
        what = 'setData';
        whole = series(lastSlot + 3, 10 + Math.floor(random() * 20));
        live.chart.setData(whole.slice());
      } else {
        what = 'extendedHours';
        hoursShown = !hoursShown;
        live.chart.setExtendedHours(hoursShown);
      }
      oracle.chart.setExtendedHours(hoursShown);
      oracle.chart.setData(whole.slice());
      const where = `seed ${start}, step ${step} (${what})`;
      expect(live.chart.getData(), where).toEqual(oracle.chart.getData());
      for (const key of LINES) {
        expect(live.chart.getIndicatorOutput(live[key])?.series, `${where}, ${key}`)
          .toEqual(oracle.chart.getIndicatorOutput(oracle[key])?.series);
      }
      if (live.chart.getData().length < whole.length) hidden++;
    }
    // Not by luck: most steps had bars hidden, and many bars were corrected.
    expect(hidden).toBeGreaterThan(100);
    expect(corrected).toBeGreaterThan(10);
  });

  /** A feed whose bars the test sends, as an adapter's `bar` events. */
  async function connectFeed(chart: Chart, history: OHLCBar[]): Promise<(bar: OHLCBar, closed: boolean) => void> {
    return (await connectTrades(chart, history, false)).send;
  }

  /** A feed whose bars and trades the test sends, as an adapter's `bar` and `tick` events. */
  async function connectTrades(chart: Chart, history: OHLCBar[], aggregateTicks = true) {
    const handlers = new Map<string, (e: { data: unknown }) => void>();
    const adapter = {
      name: 'fake',
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => history.map((b) => ({ ...b })),
      on: (type: string, cb: (e: { data: unknown }) => void) => { handlers.set(type, cb); },
      off: () => {},
      dispose: () => {},
    };
    await chart.connect({ adapter: adapter as never, symbol: 'AAA', timeframe: '30m', historyLimit: history.length, aggregateTicks });
    return {
      send: (bar: OHLCBar, closed: boolean) => handlers.get('bar')?.({ data: { bar: { ...bar }, closed } }),
      trade: (time: number, price: number, volume: number) => handlers.get('tick')?.({ data: { time, price, volume } }),
    };
  }

  describe('when a bar first tells the interval, hiding the bars before it', () => {
    const at = (slot: number): OHLCBar => ({ time: T0 + slot * HALF_HOUR, open: 10, high: 11, low: 9, close: 10, volume: 1 });
    type Inside = { getDisplayData(): unknown[]; followLivePrice(price: number): void };

    it.each([
      ['appendBar', (chart: Chart) => chart.appendBar(at(17))],
      ['appendBars', (chart: Chart) => chart.appendBars([at(17), at(18)])],
    ] as const)('%s follows the price on the bars shown now, not a stale copy', (_, write) => {
      installChartStubs();
      const { chart } = make();
      chart.setExtendedHours(false);
      chart.setData([at(16)]); // 08:00 in New York: one bar tells no interval, so it shows
      const inside = chart as unknown as Inside;
      inside.getDisplayData();
      const seen: number[] = [];
      const follow = inside.followLivePrice.bind(chart);
      inside.followLivePrice = (price) => {
        seen.push(inside.getDisplayData().length);
        follow(price);
      };
      write(chart);
      expect(chart.getData()).toEqual([]);
      expect(seen).toEqual([0]);
    });
  });

  describe('a stream during a replay', () => {
    const hourly = (from: number, count: number): OHLCBar[] =>
      Array.from({ length: count }, (_, i) => ({ time: T0 + (from + i) * HALF_HOUR, open: 10, high: 11, low: 9, close: 10, volume: 1 }));

    it('keeps a new forming bar as a new bar, not over the last', async () => {
      installChartStubs();
      const { chart } = make();
      chart.setExtendedHours(true);
      const send = await connectFeed(chart, hourly(0, 20));
      chart.replayStart({ startIndex: 10, paused: true });
      send(hourly(20, 1)[0], false);
      chart.replayStop();
      expect(chart.getData().map((b) => b.time)).toEqual(hourly(0, 21).map((b) => b.time));
    });

    it('closes the forming bar in place, not as a second one', async () => {
      installChartStubs();
      const { chart } = make();
      chart.setExtendedHours(true);
      const send = await connectFeed(chart, hourly(0, 20));
      chart.replayStart({ startIndex: 10, paused: true });
      const forming = hourly(20, 1)[0];
      send(forming, false);
      send({ ...forming, close: 10.5 }, true);
      chart.replayStop();
      const data = chart.getData();
      expect(data.map((b) => b.time)).toEqual(hourly(0, 21).map((b) => b.time));
      expect(data[20].close).toBe(10.5);
    });
  });

  describe('a reconnect and a replay, with hours hidden', () => {
    const at = (slot: number, close = 10, unit = 1): OHLCBar =>
      ({ time: (T0 + slot * HALF_HOUR) / unit, open: 10, high: Math.max(10, close), low: Math.min(10, close), close, volume: 1 });
    const slots = (from: number, count: number, close = 10, unit = 1) => Array.from({ length: count }, (_, i) => at(from + i, close, unit));
    type Inside = { streamManager: { emit(event: string, data: unknown): void } };

    it('merges a reconnect snapshot as setData would show the merged series', async () => {
      installChartStubs();
      const live = make();
      const oracle = make();
      live.chart.setExtendedHours(false);
      oracle.chart.setExtendedHours(false);
      const history = slots(0, 40);
      await connectFeed(live.chart, history);
      const snapshot = slots(20, 30, 12);
      (live.chart as unknown as Inside).streamManager.emit('snapshot', snapshot.map((b) => ({ ...b })));
      oracle.chart.setData([...history.slice(0, 20), ...snapshot]);
      expect(plain(live.chart.getData())).toEqual(plain(oracle.chart.getData()));
      expect(live.chart.getData().length).toBeLessThan(50); // some hours hidden
    });

    it('filters the replayed bars again when the hours change, at the same time, and shows the live ones in the new hours after', async () => {
      installChartStubs();
      const live = make();
      const oracle = make();
      live.chart.setExtendedHours(false);
      const whole = slots(0, 60);
      live.chart.setData(whole);
      live.chart.replayStart({ startIndex: 5, paused: true });
      const until = live.chart.getReplayProgress().until!;
      const regular = live.chart.getData().length;
      live.chart.setExtendedHours(true);
      // The extended hours come in up to the same time: the last slot before it.
      expect(live.chart.getData().at(-1)!.time + HALF_HOUR).toBe(until);
      expect(live.chart.getData().length).toBeGreaterThan(regular);
      expect(live.chart.getReplayProgress().until).toBe(until);
      live.chart.replayStop();
      oracle.chart.setExtendedHours(true);
      oracle.chart.setData(whole);
      expect(live.chart.getData()).toEqual(oracle.chart.getData());
    });

    it('keeps a host batch and a stream snapshot aside during a replay', async () => {
      installChartStubs();
      const { chart } = make();
      chart.setExtendedHours(true);
      await connectFeed(chart, slots(0, 20));
      chart.replayStart({ startIndex: 5, paused: true });
      chart.appendBars(slots(20, 2));
      chart.replayStop();
      expect(chart.getData().map((b) => b.time)).toEqual(slots(0, 22).map((b) => b.time));
      chart.replayStart({ startIndex: 5, paused: true });
      (chart as unknown as Inside).streamManager.emit('snapshot', slots(0, 25, 13));
      chart.replayStop();
      expect(plain(chart.getData())).toEqual(plain(slots(0, 25, 13)));
    });

    it('takes a stream in milliseconds onto a series in seconds', async () => {
      installChartStubs();
      const live = make();
      const oracle = make();
      live.chart.setExtendedHours(false);
      oracle.chart.setExtendedHours(false);
      const send = await connectFeed(live.chart, slots(0, 40, 10, 1000));
      send(at(40, 11), false);
      send(at(40, 12), true);
      send(at(41, 13), false);
      oracle.chart.setData([...slots(0, 40, 10, 1000), at(40, 12, 1000), at(41, 13, 1000)]);
      expect(plain(live.chart.getData())).toEqual(plain(oracle.chart.getData()));
      live.chart.setExtendedHours(true);
      oracle.chart.setExtendedHours(true);
      expect(plain(live.chart.getData())).toEqual(plain(oracle.chart.getData()));
    });
  });

  /** The six fields: a stream's bars carry more (`closed`, `tickCount`). */
  const plain = (bars: readonly OHLCBar[]) => bars.map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume }));

  it.each([5, 17])('with a stream and the host both writing, a replay in between (seed %i)', async (start) => {
    installChartStubs();
    const live = make();
    const oracle = make();
    let seed = start;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const price = () => 5 + Math.round(random() * 100) / 10;
    const at = (slot: number): OHLCBar => {
      const close = price();
      const open = price();
      return { time: T0 + slot * HALF_HOUR, open, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, close, volume: 1 + Math.round(random() * 9) };
    };
    let hoursShown = false;
    live.chart.setExtendedHours(false);
    let whole = Array.from({ length: 30 }, (_, i) => at(i));
    const send = await connectFeed(live.chart, whole);
    let replaying = false;

    for (let step = 0; step < 200; step++) {
      const last = whole[whole.length - 1];
      const lastSlot = Math.round((last.time - T0) / HALF_HOUR);
      const roll = random();
      let what: string;
      if (roll < 0.25) {
        what = 'stream: the forming bar';
        const bar = { ...at(lastSlot), time: last.time };
        send(bar, false);
        whole[whole.length - 1] = bar;
      } else if (roll < 0.45) {
        what = 'stream: a new bar';
        const bar = at(lastSlot + 1);
        send(bar, random() < 0.5);
        whole.push(bar);
      } else if (roll < 0.5) {
        // Closed, it is the feed's last word on that bar; still forming, a stale frame.
        const bar = at(lastSlot - 3);
        const closed = random() < 0.5;
        what = closed ? 'stream: an older bar, closed' : 'stream: an older bar, forming, left out';
        send(bar, closed);
        const k = whole.length - 4;
        expect(whole[k].time).toBe(bar.time);
        if (closed) whole[k] = bar;
      } else if (roll < 0.62) {
        what = 'host: appendBar';
        const bar = at(lastSlot + 1);
        live.chart.appendBar(bar);
        whole.push(bar);
      } else if (roll < 0.68) {
        what = 'host: updateLastBar';
        const bar = { ...at(lastSlot), time: last.time };
        live.chart.updateLastBar(bar);
        whole[whole.length - 1] = bar;
      } else if (roll < 0.74) {
        what = replaying ? 'host: updateBar, in a replay' : 'host: updateBar';
        const k = whole.length - 1 - Math.floor(random() * Math.min(whole.length, 12));
        const bar = { ...at(0), time: whole[k].time };
        expect(live.chart.updateBar(bar)).toBe(true);
        whole[k] = bar;
      } else if (roll < 0.82) {
        what = 'host: tick';
        const tick = { time: last.time + (1 + Math.floor(random() * 29)) * 60_000, price: price(), volume: 1 };
        live.chart.updateLastBarFromTick(tick);
        const keep = hoursShown ? null : regularHoursFilter(NYSE, whole);
        if (replaying || !keep || keep(tick.time)) whole[whole.length - 1] = mergeBar(last, tick);
      } else if (roll < 0.9) {
        what = replaying ? 'replay stop' : 'replay start';
        if (replaying) live.chart.replayStop();
        else live.chart.replayStart({ startIndex: Math.max(1, live.chart.getData().length - 8), paused: true });
        replaying = !replaying;
      } else if (!replaying) {
        what = 'extendedHours';
        hoursShown = !hoursShown;
        live.chart.setExtendedHours(hoursShown);
      } else {
        continue;
      }
      // The replayed bars are another view: the live ones show once it stops.
      if (replaying) continue;
      oracle.chart.setExtendedHours(hoursShown);
      oracle.chart.setData(whole.slice());
      const where = `seed ${start}, step ${step} (${what})`;
      expect(plain(live.chart.getData()), where).toEqual(plain(oracle.chart.getData()));
      for (const key of LINES) {
        expect(live.chart.getIndicatorOutput(live[key])?.series, `${where}, ${key}`)
          .toEqual(oracle.chart.getIndicatorOutput(oracle[key])?.series);
      }
    }
  });

  it.each([7, 23])('with bars built from trades, late trades and late closes in between (seed %i)', async (start) => {
    installChartStubs();
    const live = make();
    const oracle = make();
    let seed = start;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const price = () => 5 + Math.round(random() * 100) / 10;
    const at = (slot: number): OHLCBar => {
      const close = price();
      const open = price();
      return { time: T0 + slot * HALF_HOUR, open, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, close, volume: 1 + Math.round(random() * 9) };
    };
    let hoursShown = false;
    live.chart.setExtendedHours(false);
    const whole = Array.from({ length: 30 }, (_, i) => at(i));
    // The history's last bar is still forming: the first trades build on it.
    const { send, trade } = await connectTrades(live.chart, whole);
    let replaying = false;
    let corrections = 0;
    for (let step = 0; step < 250; step++) {
      const last = whole[whole.length - 1];
      const lastSlot = Math.round((last.time - T0) / HALF_HOUR);
      const roll = random();
      let what: string;
      if (roll < 0.3) {
        what = 'trade: the forming bar';
        const tick = { time: last.time + (1 + Math.floor(random() * 29)) * 60_000, price: price(), volume: 1 + Math.floor(random() * 3) };
        trade(tick.time, tick.price, tick.volume);
        whole[whole.length - 1] = mergeBar(last, tick);
      } else if (roll < 0.45) {
        what = 'trade: a new bar';
        const p = price();
        const volume = 1 + Math.floor(random() * 3);
        trade(T0 + (lastSlot + 1) * HALF_HOUR + 1000, p, volume);
        whole.push({ time: T0 + (lastSlot + 1) * HALF_HOUR, open: p, high: p, low: p, close: p, volume });
      } else if (roll < 0.55) {
        what = 'trade: late, for a bar before';
        const back = 1 + Math.floor(random() * 3);
        trade(T0 + (lastSlot - back) * HALF_HOUR + 5000, price(), 1);
      } else if (roll < 0.7) {
        const back = 1 + Math.floor(random() * 3);
        const bar = at(lastSlot - back);
        const closed = random() < 0.6;
        what = closed ? 'stream: a late close' : 'stream: a late forming frame, left out';
        send(bar, closed);
        if (closed) {
          whole[whole.length - 1 - back] = bar;
          corrections++;
        }
      } else if (roll < 0.8) {
        what = 'host: updateBar';
        // Not the forming bar: the trades build that one.
        const k = whole.length - 2 - Math.floor(random() * Math.min(whole.length - 1, 10));
        const bar = { ...at(0), time: whole[k].time };
        expect(live.chart.updateBar(bar)).toBe(true);
        whole[k] = bar;
      } else if (roll < 0.9) {
        what = replaying ? 'replay stop' : 'replay start';
        if (replaying) live.chart.replayStop();
        else live.chart.replayStart({ startIndex: Math.max(1, live.chart.getData().length - 8), paused: true });
        replaying = !replaying;
      } else if (!replaying) {
        what = 'extendedHours';
        hoursShown = !hoursShown;
        live.chart.setExtendedHours(hoursShown);
      } else {
        continue;
      }
      if (replaying) continue;
      oracle.chart.setExtendedHours(hoursShown);
      oracle.chart.setData(whole.slice());
      const where = `seed ${start}, step ${step} (${what})`;
      expect(plain(live.chart.getData()), where).toEqual(plain(oracle.chart.getData()));
      for (const key of LINES) {
        expect(live.chart.getIndicatorOutput(live[key])?.series, `${where}, ${key}`)
          .toEqual(oracle.chart.getIndicatorOutput(oracle[key])?.series);
      }
    }
    expect(corrections).toBeGreaterThan(10);
  });

  it('corrects a timeframe built from a finer one: the feed, the stream and the chart together', async () => {
    installChartStubs();
    const live = make();
    live.chart.setExtendedHours(true);
    const MIN = 60_000;
    const minute = (m: number, close = 10 + (m % 7) / 2, volume = 1): OHLCBar =>
      ({ time: T0 + m * MIN, open: 10, high: Math.max(10, close) + 0.25, low: Math.min(10, close) - 0.25, close, volume });
    const listeners = new Map<string, Set<DataAdapterListener>>();
    const feed: DataAdapter = {
      name: 'minutes',
      supportedTimeframes: ['1m'],
      connect: () => {},
      disconnect: () => {},
      getConnectionState: () => 'connected',
      fetchHistory: async () => Array.from({ length: 40 }, (_, m) => minute(m)),
      on: (type, cb) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(cb as DataAdapterListener);
      },
      off: (type, cb) => { listeners.get(type)?.delete(cb as DataAdapterListener); },
      dispose: () => {},
    };
    const minutes = Array.from({ length: 40 }, (_, m) => minute(m));
    const send = (bar: OHLCBar, closed: boolean) => {
      for (const cb of listeners.get('bar') ?? []) cb({ type: 'bar', data: { bar: { ...bar }, closed }, timestamp: 0 });
      minutes[(bar.time - T0) / MIN] = bar;
    };
    await live.chart.connect({ adapter: feed, symbol: 'AAA', timeframe: '5m' });
    for (let m = 40; m < 45; m++) send(minute(m), true);
    send(minute(45), false);
    // Minute 42 of the 40–44 bar was off, and so was minute 37, of the history's last bar.
    send(minute(42, 3, 4), true);
    send(minute(37, 18, 2), true);
    const oracle = make();
    oracle.chart.setExtendedHours(true);
    oracle.chart.setData(resampleBars(minutes, '5m'));
    expect(plain(live.chart.getData())).toEqual(plain(oracle.chart.getData()));
    expect(live.chart.getData()[8]).toMatchObject({ low: 2.75, volume: 8 });
    expect(live.chart.getData()[7]).toMatchObject({ high: 18.25, volume: 6 });
    for (const key of LINES) {
      expect(live.chart.getIndicatorOutput(live[key])?.series, key).toEqual(oracle.chart.getIndicatorOutput(oracle[key])?.series);
    }
  });
});
