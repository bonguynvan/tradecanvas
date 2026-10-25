// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mergeBar, type OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { regularHoursFilter } from '../regularHours.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

/**
 * Every way bars reach a chart leaves it as loading them all at once would:
 * after any run of appends, updates, ticks, older pages, new series and the
 * extended hours shown or hidden, the chart's bars and its indicators are
 * those of a chart given the same whole series with `setData`.
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

  function make(): { chart: Chart; ema: string; rsi: string } {
    const chart = new Chart(sizedHost(), {});
    charts.push(chart);
    chart.setSymbolInfo(NYSE);
    const ema = chart.addIndicator('ema', { period: 5 })!;
    const rsi = chart.addIndicator('rsi', { period: 4 }, 'bottom')!;
    return { chart, ema, rsi };
  }

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
      } else if (roll < 0.55) {
        what = 'updateLastBar';
        const bar = { ...at(lastSlot), time: last.time };
        live.chart.updateLastBar(bar);
        whole[whole.length - 1] = bar;
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
      for (const key of ['ema', 'rsi'] as const) {
        expect(live.chart.getIndicatorOutput(live[key])?.series, `${where}, ${key}`)
          .toEqual(oracle.chart.getIndicatorOutput(oracle[key])?.series);
      }
      if (live.chart.getData().length < whole.length) hidden++;
    }
    // Not by luck: most steps had bars hidden.
    expect(hidden).toBeGreaterThan(100);
  });

  /** A feed whose bars the test sends, as an adapter's `bar` events. */
  async function connectFeed(chart: Chart, history: OHLCBar[]): Promise<(bar: OHLCBar, closed: boolean) => void> {
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
    await chart.connect({ adapter: adapter as never, symbol: 'AAA', timeframe: '30m', historyLimit: history.length });
    return (bar, closed) => handlers.get('bar')?.({ data: { bar: { ...bar }, closed } });
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

    it('keeps the replayed bars while the hours change, and shows the live ones in the new hours after', async () => {
      installChartStubs();
      const live = make();
      const oracle = make();
      live.chart.setExtendedHours(false);
      const whole = slots(0, 60);
      live.chart.setData(whole);
      live.chart.replayStart({ startIndex: 5, paused: true });
      const replayed = live.chart.getData().length;
      live.chart.setExtendedHours(true);
      expect(live.chart.getData()).toHaveLength(replayed);
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
        what = 'stream: an older bar, left out';
        send(at(lastSlot - 3), random() < 0.5);
      } else if (roll < 0.62) {
        what = 'host: appendBar';
        const bar = at(lastSlot + 1);
        live.chart.appendBar(bar);
        whole.push(bar);
      } else if (roll < 0.74) {
        what = 'host: updateLastBar';
        const bar = { ...at(lastSlot), time: last.time };
        live.chart.updateLastBar(bar);
        whole[whole.length - 1] = bar;
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
      for (const key of ['ema', 'rsi'] as const) {
        expect(live.chart.getIndicatorOutput(live[key])?.series, `${where}, ${key}`)
          .toEqual(oracle.chart.getIndicatorOutput(oracle[key])?.series);
      }
    }
  });
});
