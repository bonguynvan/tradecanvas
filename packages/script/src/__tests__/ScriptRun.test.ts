import { describe, expect, it } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { defineScript, ScriptRun, ta } from '../index.js';
import { seededBars } from './bars.js';

const BARS = seededBars(400);

/** Many kinds of state at once: sums, a kept value, a list, a line read back, marks. */
const busy = defineScript({
  id: 'busy',
  name: 'Busy',
  overlay: true,
  inputs: { length: { default: 14, kind: 'int', min: 1 } },
  setup({ inputs, plot, shape, state, prices }) {
    const fast = ta.ema(9);
    const slow = ta.rsi(inputs.length);
    const band = ta.bb(20, 2);
    const trend = ta.supertrend(3, 10);
    const up = ta.crossover();
    const since = ta.barssince();
    const pivot = ta.pivothigh(3, 3);
    const lastCross = ta.valuewhen(0);
    const hull = ta.hma(21);
    const volumeAverage = ta.vwma(20);
    const rate = ta.roc(12);
    const momentum = ta.mom(10);
    const range = ta.atr(14);
    const convergence = ta.macd();
    const kept = state.array();
    const highest = state.var(Number.NaN);
    const streak = state.var(0);
    const window = state.array();
    const diff = state.series();
    const a = plot('ema');
    const b = plot('rsi');
    const c = plot('upper');
    const d = plot('supertrend');
    const e = plot('running high');
    const f = plot('streak');
    const g = plot('median');
    const h = plot('since');
    const k = plot('diff back');
    const m = plot('pivot');
    const n = plot('last cross');
    const more = ['hma', 'vwma', 'roc', 'mom', 'atr', 'macd', 'kept'].map((title) => plot(title));
    const mark = shape('cross', { shape: 'triangleUp', position: 'belowBar' });
    return (bar) => {
      const ema = fast(bar.close);
      a.set(ema, bar.close > ema ? '#00ff00' : '#ff0000');
      b.set(slow(bar.close));
      c.set(band(bar.close).upper);
      d.set(trend(bar).value);
      highest.value = Number.isNaN(highest.value) ? bar.high : Math.max(highest.value, bar.high);
      e.set(highest.value);
      streak.value = bar.close > prices.close.at(1) ? streak.value + 1 : 0;
      f.set(streak.value);
      window.push(bar.close);
      if (window.size() > 20) window.shift();
      g.set(window.median());
      const crossed = up(bar.close, ema);
      mark.set(crossed);
      h.set(since(crossed));
      diff.set(bar.close - bar.open);
      k.set(diff.at(2));
      m.set(pivot(bar.high));
      n.set(lastCross(crossed, bar.close));
      // The list changed the ways a tick has to undo: emptied, written over, taken from.
      if (bar.close > ema) kept.push(bar.close);
      if (kept.size() > 5) kept.shift();
      if (kept.size() > 0) kept.set(0, kept.get(0) + 0.5);
      if (bar.close < ema - 1) kept.clear();
      [hull(bar.close), volumeAverage(bar.close, bar.volume), rate(bar.close), momentum(bar.close), range(bar), convergence(bar.close).histogram, kept.sum()]
        .forEach((value, i) => more[i].set(value));
    };
  },
});

/** A bar as a tick moves it: its close somewhere in its range, the range stretched to it. */
function tickOf(bar: OHLCBar, fraction: number): OHLCBar {
  const close = bar.low + (bar.high - bar.low) * fraction;
  return { ...bar, close, high: Math.max(bar.high, close), low: Math.min(bar.low, close) };
}

function snapshot(run: ScriptRun) {
  const { plots, shapes } = run.output;
  return {
    plots: plots.map((p) => Array.from(p.values)),
    colors: plots.map((p) => Array.from(p.colors)),
    shapes: shapes.map((s) => Array.from(s.on)),
  };
}

describe('ScriptRun: a live bar run again on each tick', () => {
  it('ends where a run over the final bars from the start ends, whatever ticks came between', () => {
    let seed = 3;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const start = 300;
    const live = new ScriptRun(busy);
    live.load(BARS.slice(0, start));
    const final: OHLCBar[] = BARS.slice(0, start);
    for (let i = start; i < BARS.length; i++) {
      // A few ticks that wander, then the bar as it closed.
      const ticks = Math.floor(rand() * 4);
      for (let t = 0; t < ticks; t++) live.tick(tickOf(final[final.length - 1], rand()));
      live.tick(final[final.length - 1]);
      live.next(BARS[i]);
      final.push(BARS[i]);
    }
    for (let t = 0; t < 3; t++) live.tick(tickOf(BARS[BARS.length - 1], rand()));
    const lastTick = tickOf(BARS[BARS.length - 1], 0.25);
    live.tick(lastTick);
    final[final.length - 1] = lastTick;

    const fresh = new ScriptRun(busy);
    fresh.load(final);
    expect(snapshot(live)).toEqual(snapshot(fresh));
    expect(live.output.errors).toEqual([]);
  });

  it('update tells a tick from a new bar by its time, and an older bar asks for a reload', () => {
    const run = new ScriptRun(busy);
    run.load(BARS.slice(0, 10));
    expect(run.update(tickOf(BARS[9], 0.5))).toBe('tick');
    expect(run.update(BARS[10])).toBe('bar');
    expect(run.length).toBe(11);
    expect(run.update(BARS[3])).toBe('reload');
  });
});

describe('ScriptRun: a sum fed on some ticks only', () => {
  it('reads what the bars before left after a tick that fed it and a tick that did not', () => {
    const script = defineScript({
      id: 'when',
      name: 'When',
      setup({ plot }) {
        const second = ta.valuewhen(1);
        const line = plot('second last');
        return (bar) => line.set(second(bar.close > 100, bar.close));
      },
    });
    const bars = BARS.slice(0, 3).map((b, i) => ({ ...b, close: 101 + i }));
    const run = new ScriptRun(script);
    run.load(bars);
    expect(run.output.plots[0].values[2]).toBe(102);
    run.tick({ ...bars[2], close: 99 });
    // Not fed this tick: the second last is the first bar's, as the bars before left it.
    expect(run.output.plots[0].values[2]).toBe(101);
    run.tick({ ...bars[2], close: 150 });
    expect(run.output.plots[0].values[2]).toBe(102);
  });
});

describe('ScriptRun: what a bar sees', () => {
  it('reads past values back, none before the first bar', () => {
    const script = defineScript({
      id: 'back',
      name: 'Back',
      setup({ plot, prices }) {
        const line = plot('two back');
        return () => line.set(prices.close.at(2));
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 5));
    const values = Array.from(run.output.plots[0].values);
    expect(values.slice(0, 2).every(Number.isNaN)).toBe(true);
    expect(values[4]).toBe(BARS[2].close);
  });

  it('leaves a plot not set on a bar empty there, also when a tick sets it no more', () => {
    const script = defineScript({
      id: 'some',
      name: 'Some',
      setup({ plot }) {
        const line = plot('over 100');
        return (bar) => { if (bar.close > 100) line.set(bar.close); };
      },
    });
    const run = new ScriptRun(script);
    const bars = BARS.slice(0, 3).map((b) => ({ ...b, close: 101 }));
    run.load(bars);
    expect(run.output.plots[0].values[2]).toBe(101);
    run.tick({ ...bars[2], close: 99 });
    expect(Number.isNaN(run.output.plots[0].values[2])).toBe(true);
  });

  it('gives inputs their defaults, and the values set kept within their bounds', () => {
    const script = defineScript({
      id: 'inputs',
      name: 'Inputs',
      inputs: { length: { default: 14, kind: 'int', min: 2, max: 50 }, mode: { default: 'fast', options: ['fast', 'slow'] } },
      setup({ inputs, plot }) {
        const a = plot('length');
        const b = plot('slow');
        return () => { a.set(inputs.length); b.set(inputs.mode === 'slow' ? 1 : 0); };
      },
    });
    const read = (params: Record<string, unknown>) => {
      const run = new ScriptRun(script, params);
      run.load(BARS.slice(0, 1));
      return run.output.plots.map((p) => p.values[0]);
    };
    expect(read({})).toEqual([14, 0]);
    expect(read({ length: 7.8, mode: 'slow' })).toEqual([7, 1]);
    expect(read({ length: 500, mode: 'other' })).toEqual([50, 0]);
  });

  it('stops at the bar that throws and says where; a tick that no longer throws runs on', () => {
    const script = defineScript({
      id: 'throws',
      name: 'Throws',
      setup({ plot }) {
        const line = plot('close');
        return (bar) => {
          if (bar.close < 0) throw new Error('below zero');
          line.set(bar.close);
        };
      },
    });
    const run = new ScriptRun(script);
    const bars = BARS.slice(0, 4);
    run.load([...bars.slice(0, 3), { ...bars[3], close: -1 }]);
    expect(run.output.errors).toEqual([{ bar: 3, message: 'below zero' }]);
    run.tick(bars[3]);
    expect(run.output.errors).toEqual([]);
    expect(run.output.plots[0].values[3]).toBe(bars[3].close);

    run.load([{ ...bars[0], close: -1 }, ...bars.slice(1)]);
    expect(run.output.errors).toEqual([{ bar: 0, message: 'below zero' }]);
    expect(Array.from(run.output.plots[0].values).every(Number.isNaN)).toBe(true);
  });

  it('stays stopped once the live bar that threw closes', () => {
    const script = defineScript({
      id: 'stops',
      name: 'Stops',
      setup({ plot }) {
        const line = plot('close');
        return (bar) => {
          if (bar.close < 0) throw new Error('below zero');
          line.set(bar.close);
        };
      },
    });
    const run = new ScriptRun(script);
    const bars = BARS.slice(0, 4);
    run.load(bars.slice(0, 3));
    run.tick({ ...bars[2], close: -1 });
    run.next(bars[3]);
    expect(run.output.errors).toEqual([{ bar: 2, message: 'below zero' }]);
    expect(Number.isNaN(run.output.plots[0].values[3])).toBe(true);
  });

  it('refuses a sum or a kept value made on a bar: it would be made again each bar', () => {
    const script = defineScript({
      id: 'late',
      name: 'Late',
      setup({ plot }) {
        const line = plot('late');
        return (bar) => line.set(ta.ema(9)(bar.close));
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 2));
    expect(run.output.errors[0]).toMatchObject({ bar: 0, message: expect.stringMatching(/setup/) });
  });

  it('runs the setup once for a load', () => {
    let setups = 0;
    const script = defineScript({
      id: 'once',
      name: 'Once',
      setup({ plot }) {
        setups++;
        const line = plot('close');
        return (bar) => line.set(bar.close);
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 5));
    expect(setups).toBe(1);
    run.load(BARS.slice(0, 6));
    expect(setups).toBe(2);
  });

  it('keeps one colour list for all plots, each colour once', () => {
    const run = new ScriptRun(busy);
    run.load(BARS.slice(0, 50));
    const { palette, plots } = run.output;
    expect(new Set(palette).size).toBe(palette.length);
    const used = new Set(Array.from(plots[0].colors));
    expect([...used].every((index) => index === 0 || palette[index - 1] !== undefined)).toBe(true);
    expect(used.size).toBeGreaterThan(1);
  });

  it('tells what it draws before it runs', () => {
    const run = new ScriptRun(busy);
    expect(run.declarations.plots.map((p) => p.title)).toContain('rsi');
    expect(run.declarations.shapes[0]).toMatchObject({ title: 'cross', shape: 'triangleUp', position: 'belowBar' });
    expect(run.declarations.overlay).toBe(true);
  });
});
