import { describe, expect, it } from 'vitest';
import { ta as series } from '@tradecanvas/core';
import type { OHLCBar } from '@tradecanvas/commons';
import { defineScript, ScriptRun, ta } from '../index.js';
import type { ScriptBar } from '../index.js';
import { difference, seededBars } from './bars.js';

const BARS = seededBars(1500);
const closes = BARS.map((b) => b.close);
/** The closes with gaps: a run of missing values early, single ones later. */
const gappy = closes.map((c, i) => ((i >= 40 && i < 46) || i % 97 === 0 ? Number.NaN : c));
const TOLERANCE = 1e-9;

/** One line, made in setup by `make` and fed each bar. */
function runLine(bars: readonly OHLCBar[], make: () => (bar: ScriptBar) => number): Float64Array {
  const script = defineScript({
    id: 'line',
    name: 'Line',
    setup({ plot }) {
      const fn = make();
      const line = plot('value');
      return (bar) => line.set(fn(bar));
    },
  });
  const run = new ScriptRun(script);
  run.load(bars);
  return run.output.plots[0].values;
}

function expectSame(got: ArrayLike<number>, want: readonly (number | undefined)[]): void {
  const { worst, mismatched } = difference(got, want);
  expect(mismatched.slice(0, 5)).toEqual([]);
  expect(worst).toBeLessThan(TOLERANCE);
}

const onCloses = (fn: (v: number) => number) => (bar: ScriptBar) => fn(bar.close);
const onGaps = (fn: (v: number) => number) => (bar: ScriptBar) => fn(gappy[bar.index]);

describe('ta, a bar at a time, gives the values of the sums over the whole series', () => {
  const averages = [
    ['sma', ta.sma, series.sma],
    ['ema', ta.ema, series.ema],
    ['rma', ta.rma, series.rma],
    ['wma', ta.wma, series.wma],
    ['stdev', ta.stdev, series.stdev],
    ['highest', ta.highest, series.highest],
    ['lowest', ta.lowest, series.lowest],
  ] as const;

  for (const [name, node, whole] of averages) {
    it(`${name} on the closes`, () => {
      expectSame(runLine(BARS, () => onCloses(node(14))), whole(closes, 14));
    });
    it(`${name} across gaps`, () => {
      expectSame(runLine(BARS, () => onGaps(node(9))), whole(gappy, 9));
    });
  }

  it('rsi, bb, hma, roc and mom across gaps: a gap is computed over as the last value and has none', () => {
    expectSame(runLine(BARS, () => onGaps(ta.rsi(14))), series.rsi(gappy, 14));
    const bands = series.bollinger(gappy, 20, 2);
    expectSame(runLine(BARS, () => { const f = ta.bb(20, 2); return (bar) => f(gappy[bar.index]).upper; }), bands.upper);
    expectSame(runLine(BARS, () => onGaps(ta.hma(21))), series.indicator('hma', gappy, { period: 21 }).value);
    expectSame(runLine(BARS, () => onGaps(ta.roc(12))), series.indicator('roc', gappy, { period: 12 }).value);
    expectSame(runLine(BARS, () => onGaps(ta.mom(10))), series.indicator('mom', gappy, { period: 10 }).value);
  });

  it('atr and tr read a missing close as the one before, as the built-ins are given bars', () => {
    const holed = BARS.map((b, i) => (i % 113 === 50 ? { ...b, close: Number.NaN, high: Number.NaN } : b));
    let last = 0;
    const filled = holed.map((b) => {
      const close = Number.isFinite(b.close) ? b.close : last;
      last = close;
      return { ...b, close, high: Number.isFinite(b.high) ? b.high : close };
    });
    const bars = { close: filled.map((b) => b.close), high: filled.map((b) => b.high), low: filled.map((b) => b.low) };
    expectSame(runLine(holed, () => ta.atr(14)), series.atr(bars, 14));
  });

  it('change across gaps', () => {
    expectSame(runLine(BARS, () => onGaps(ta.change(3))), series.change(gappy, 3));
  });

  it('rsi', () => {
    expectSame(runLine(BARS, () => onCloses(ta.rsi(14))), series.rsi(closes, 14));
  });

  it('atr', () => {
    const bars = { close: closes, high: BARS.map((b) => b.high), low: BARS.map((b) => b.low) };
    expectSame(runLine(BARS, () => ta.atr(14)), series.atr(bars, 14));
  });

  it('macd is built of averages started as simple ones', () => {
    const fast = series.ema(closes, 12);
    const slow = series.ema(closes, 26);
    const macd = fast.map((f, i) => (f === undefined || slow[i] === undefined ? undefined : f - slow[i]!));
    const signal = series.ema(macd, 9);
    const histogram = macd.map((m, i) => (m === undefined || signal[i] === undefined ? undefined : m - signal[i]!));
    expectSame(runLine(BARS, () => { const f = ta.macd(12, 26, 9); return (bar) => f(bar.close).macd; }), macd);
    expectSame(runLine(BARS, () => { const f = ta.macd(12, 26, 9); return (bar) => f(bar.close).signal; }), signal);
    expectSame(runLine(BARS, () => { const f = ta.macd(12, 26, 9); return (bar) => f(bar.close).histogram; }), histogram);
  });

  it('bb', () => {
    const want = series.bollinger(closes, 20, 2);
    expectSame(runLine(BARS, () => { const f = ta.bb(20, 2); return (bar) => f(bar.close).upper; }), want.upper);
    expectSame(runLine(BARS, () => { const f = ta.bb(20, 2); return (bar) => f(bar.close).basis; }), want.middle);
    expectSame(runLine(BARS, () => { const f = ta.bb(20, 2); return (bar) => f(bar.close).lower; }), want.lower);
  });

  const columns = { close: closes, open: BARS.map((b) => b.open), high: BARS.map((b) => b.high), low: BARS.map((b) => b.low), volume: BARS.map((b) => b.volume ?? 0), time: BARS.map((b) => b.time) };

  it('supertrend, its line and its trend', () => {
    const want = series.indicator('supertrend', columns, { period: 10, multiplier: 3 });
    expectSame(runLine(BARS, () => { const f = ta.supertrend(3, 10); return (bar) => f(bar).value; }), want.value);
    expectSame(runLine(BARS, () => { const f = ta.supertrend(3, 10); return (bar) => f(bar).trend; }), want.trend);
  });

  it('hma, vwma, roc and mom, as the built-in indicators', () => {
    expectSame(runLine(BARS, () => onCloses(ta.hma(21))), series.indicator('hma', columns, { period: 21 }).value);
    expectSame(runLine(BARS, () => { const f = ta.vwma(20); return (bar) => f(bar.close, bar.volume); }), series.indicator('vwma', columns, { period: 20 }).value);
    expectSame(runLine(BARS, () => onCloses(ta.roc(12))), series.indicator('roc', columns, { period: 12 }).value);
    expectSame(runLine(BARS, () => onCloses(ta.mom(10))), series.indicator('mom', columns, { period: 10 }).value);
  });

  it('tr is the range stretched to the close before, the first bar its own range', () => {
    const want = BARS.map((b, i) => (i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - BARS[i - 1].close), Math.abs(b.low - BARS[i - 1].close))));
    expectSame(runLine(BARS, () => ta.tr()), want);
  });
});

describe('ta events, a bar at a time', () => {
  const fast = series.ema(closes, 9);
  const slow = series.ema(closes, 21);
  const asNumber = (flags: boolean[]) => flags.map((f) => (f ? 1 : 0));

  it('crossover, crossunder and cross', () => {
    const both = () => { const e9 = ta.ema(9); const e21 = ta.ema(21); return (bar: ScriptBar) => [e9(bar.close), e21(bar.close)] as const; };
    const line = (pick: () => (a: number, b: number) => boolean) => runLine(BARS, () => { const read = both(); const f = pick(); return (bar) => { const [a, b] = read(bar); return f(a, b) ? 1 : 0; }; });
    const up = series.crossover(fast, slow);
    const down = series.crossunder(fast, slow);
    expect(Array.from(line(ta.crossover))).toEqual(asNumber(up));
    expect(Array.from(line(ta.crossunder))).toEqual(asNumber(down));
    expect(Array.from(line(ta.cross))).toEqual(up.map((u, i) => (u || down[i] ? 1 : 0)));
    expect(up.filter(Boolean).length).toBeGreaterThan(10);
  });

  it('pivothigh and pivotlow give the pivot right bars after it, strictly beyond its neighbours', () => {
    const highs = BARS.map((b) => b.high);
    const lows = BARS.map((b) => b.low);
    const pivot = (src: number[], left: number, right: number, higher: boolean) => src.map((_, i) => {
      const at = i - right;
      if (at - left < 0) return undefined;
      for (let j = at - left; j <= i; j++) {
        if (j !== at && (higher ? src[j] >= src[at] : src[j] <= src[at])) return undefined;
      }
      return src[at];
    });
    expectSame(runLine(BARS, () => { const f = ta.pivothigh(5, 5); return (bar) => f(bar.high); }), pivot(highs, 5, 5, true));
    expectSame(runLine(BARS, () => { const f = ta.pivotlow(3, 2); return (bar) => f(bar.low); }), pivot(lows, 3, 2, false));
  });

  it('barssince counts from the last true, none before the first', () => {
    const up = series.crossover(fast, slow);
    let since: number | undefined;
    const want = up.map((u) => (since = u ? 0 : since === undefined ? undefined : since + 1));
    expectSame(runLine(BARS, () => { const e9 = ta.ema(9); const e21 = ta.ema(21); const x = ta.crossover(); const f = ta.barssince(); return (bar) => f(x(e9(bar.close), e21(bar.close))); }), want);
  });

  it('valuewhen gives the value at the nth last true', () => {
    const up = series.crossover(fast, slow);
    const seen: number[] = [];
    const want = up.map((u, i) => {
      if (u) seen.push(closes[i]);
      return seen.length > 1 ? seen[seen.length - 2] : undefined;
    });
    expectSame(runLine(BARS, () => { const e9 = ta.ema(9); const e21 = ta.ema(21); const x = ta.crossover(); const f = ta.valuewhen(1); return (bar) => f(x(e9(bar.close), e21(bar.close)), bar.close); }), want);
  });
});

describe('ta outside setup', () => {
  it('is refused: its state belongs to a script', () => {
    expect(() => ta.ema(9)).toThrow(/setup/);
  });
});
