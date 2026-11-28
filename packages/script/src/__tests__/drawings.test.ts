import { describe, expect, it } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { defineScript, ScriptRun, scriptIndicator, ta } from '../index.js';
import { seededBars } from './bars.js';

const BARS = seededBars(300);

/** Pivots drawn as labels and lines, a box every 25 bars, the last pivot's line moved to the live bar. */
const pivots = defineScript({
  id: 'pivots',
  name: 'Pivots',
  overlay: true,
  setup({ drawings, state }) {
    const high = ta.pivothigh(3, 3);
    const shapes = drawings({ maxLabels: 5, maxLines: 4, maxBoxes: 2 });
    // Kept as Pine keeps one in a var: a tick puts the bar before's back.
    const last = state.var<ReturnType<typeof shapes.line> | null>(null);
    return (bar) => {
      const ph = high(bar.high);
      if (!Number.isNaN(ph)) {
        shapes.label({ at: { bar: bar.index - 3, value: ph }, text: 'PH', color: '#ef4444' });
        last.value = shapes.line({ from: { bar: bar.index - 3, value: ph }, to: { bar: bar.index, value: ph }, color: '#ef4444' });
      }
      if (bar.index % 25 === 0) shapes.box({ from: { bar: bar.index, value: bar.high }, to: { bar: bar.index + 10, value: bar.low }, fill: '#3b82f622' });
      // Moved each bar: an edit a tick has to undo.
      last.value?.set({ to: { bar: bar.index, value: bar.close } });
    };
  },
});

function tickOf(bar: OHLCBar, fraction: number): OHLCBar {
  const close = bar.low + (bar.high - bar.low) * fraction;
  return { ...bar, close, high: Math.max(bar.high, close + fraction), low: Math.min(bar.low, close) };
}

describe('drawings a script makes', () => {
  it('keeps the newest of each kind up to its limit, in the order made', () => {
    const run = new ScriptRun(pivots);
    run.load(BARS);
    const drawn = run.output.drawings;
    expect(drawn.filter((d) => d.kind === 'label')).toHaveLength(5);
    expect(drawn.filter((d) => d.kind === 'line')).toHaveLength(4);
    expect(drawn.filter((d) => d.kind === 'box')).toHaveLength(2);
    const labels = drawn.filter((d) => d.kind === 'label');
    const bars = labels.map((d) => (d.kind === 'label' ? d.at.bar : 0));
    expect(bars).toEqual([...bars].sort((a, b) => a - b));
    // The last line follows the last bar's close.
    const lastLine = drawn.filter((d) => d.kind === 'line').at(-1);
    expect(lastLine).toMatchObject({ to: { bar: BARS.length - 1, value: BARS.at(-1)!.close } });
  });

  it('end where a fresh run over the final bars ends, whatever ticks came between', () => {
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const live = new ScriptRun(pivots);
    live.load(BARS.slice(0, 200));
    const final = BARS.slice(0, 200);
    for (let i = 200; i < BARS.length; i++) {
      // A tick with a high that may make a pivot, then one that may take it back.
      for (let t = 0; t < 3; t++) live.tick(tickOf(final.at(-1)!, rand()));
      live.tick(final.at(-1)!);
      live.next(BARS[i]);
      final.push(BARS[i]);
    }
    const fresh = new ScriptRun(pivots);
    fresh.load(final);
    expect(live.output.drawings).toEqual(fresh.output.drawings);
  });

  it('can be taken away, and a taken one leaves the limit room', () => {
    const script = defineScript({
      id: 'gone',
      name: 'Gone',
      setup({ drawings }) {
        const shapes = drawings({ maxLabels: 2 });
        return (bar) => {
          const label = shapes.label({ at: { bar: bar.index, value: bar.close }, text: String(bar.index) });
          if (bar.index % 2 === 1) label.remove();
        };
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 7));
    expect(run.output.drawings.map((d) => (d.kind === 'label' ? d.text : ''))).toEqual(['4', '6']);
  });

  it('is refused on a bar: the list belongs to the setup', () => {
    const script = defineScript({
      id: 'late',
      name: 'Late',
      setup({ drawings }) {
        return () => { drawings(); };
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 2));
    expect(run.output.errors[0]?.message).toMatch(/setup/);
  });

  it('reach the chart as the indicator\'s own drawings, after a tick too', () => {
    const plugin = scriptIndicator(pivots);
    const config = { id: 'pivots', instanceId: 'p', params: {} };
    const data = BARS.slice(0, 150);
    const prev = plugin.calculate(data, config);
    expect(prev.drawings?.length).toBeGreaterThan(0);
    const ticked = [...data.slice(0, -1), tickOf(data[149], 0.9)];
    const after = plugin.update!(ticked, config, prev, 149)!;
    expect(after.drawings).toEqual(plugin.calculate(ticked, config).drawings);
  });

  it('stops the script at a shape that lacks a point, saying which', () => {
    const script = defineScript({
      id: 'broken',
      name: 'Broken',
      setup({ drawings }) {
        const shapes = drawings();
        return (bar) => {
          if (bar.index === 2) shapes.line({ from: { bar: 0, value: 1 } } as never);
        };
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 4));
    expect(run.output.errors).toEqual([{ bar: 2, message: 'a line needs to: { bar, value }' }]);
    expect(run.output.drawings).toEqual([]);
  });

  it('keeps a limit within 1 and 500, the default 50 when none is a number', () => {
    const count = (limits: Record<string, number>) => {
      const script = defineScript({
        id: 'many',
        name: 'Many',
        setup({ drawings }) {
          const shapes = drawings(limits);
          return (bar) => { shapes.label({ at: { bar: bar.index, value: 1 }, text: '.' }); };
        },
      });
      const run = new ScriptRun(script);
      run.load(seededBars(700));
      return run.output.drawings.length;
    };
    expect(count({ maxLabels: Infinity })).toBe(500);
    expect(count({ maxLabels: Number.NaN })).toBe(50);
    expect(count({ maxLabels: 0 })).toBe(1);
  });

  it('leaves a shape taken away as it is when set later', () => {
    const script = defineScript({
      id: 'after',
      name: 'After',
      setup({ drawings, state }) {
        const shapes = drawings();
        const kept = state.var<ReturnType<typeof shapes.label> | null>(null);
        return (bar) => {
          if (bar.index === 0) kept.value = shapes.label({ at: { bar: 0, value: 1 }, text: 'a' });
          if (bar.index === 1) kept.value?.remove();
          if (bar.index === 2) kept.value?.set({ text: 'b' });
        };
      },
    });
    const run = new ScriptRun(script);
    run.load(BARS.slice(0, 4));
    expect(run.output.drawings).toEqual([]);
    expect(run.output.errors).toEqual([]);
  });
});

