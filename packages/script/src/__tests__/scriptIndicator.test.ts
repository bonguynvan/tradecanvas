import { describe, expect, it } from 'vitest';
import type { IndicatorConfig } from '@tradecanvas/commons';
import { defineScript, scriptIndicator, ta } from '../index.js';
import { seededBars } from './bars.js';

const BARS = seededBars(300);

const cross = defineScript({
  id: 'emaCross',
  name: 'EMA Cross',
  shortName: 'Cross',
  overlay: true,
  inputs: { fast: { default: 9, kind: 'int', min: 1 }, slow: { default: 21, kind: 'int', min: 1 } },
  setup({ inputs, plot, shape }) {
    const fast = ta.ema(inputs.fast);
    const slow = ta.ema(inputs.slow);
    const up = ta.crossover();
    const fastLine = plot('Fast', { color: '#f5c542' });
    const slowLine = plot('Slow', { color: '#3b82f6', width: 2 });
    const mark = shape('Up', { shape: 'triangleUp', position: 'belowBar', color: '#22c55e' });
    return (bar) => {
      const f = fastLine.set(fast(bar.close));
      const s = slowLine.set(slow(bar.close));
      mark.set(up(f, s));
    };
  },
});

const oscillator = defineScript({
  id: 'rsiLevels',
  name: 'RSI',
  setup({ plot, hline }) {
    const rsi = ta.rsi(14);
    const line = plot('RSI', { kind: 'line' });
    hline(70);
    hline(30);
    return (bar) => line.set(rsi(bar.close));
  },
});

const configOf = (params: Record<string, number> = {}): IndicatorConfig => ({ id: 'emaCross', instanceId: 'x', params: { fast: 9, slow: 21, ...params } });

describe('scriptIndicator: a script as an indicator the chart draws', () => {
  it('describes its lines, marks, inputs, levels and colours', () => {
    const plugin = scriptIndicator(cross);
    expect(plugin.descriptor).toMatchObject({
      id: 'emaCross',
      name: 'EMA Cross',
      shortName: 'Cross',
      placement: 'overlay',
      defaultConfig: { fast: 9, slow: 21 },
      inputs: { fast: { kind: 'int', min: 1 }, slow: { kind: 'int', min: 1 } },
      plots: [
        { key: 'p0', title: 'Fast', color: 0 },
        { key: 'p1', title: 'Slow', color: 1 },
        { key: 's0', title: 'Up', color: 2, kind: 'markers', shape: 'triangleUp', position: 'belowBar' },
      ],
    });
    expect(plugin.descriptor.defaultStyle).toMatchObject({ colors: ['#f5c542', '#3b82f6', '#22c55e'] });
    const levels = scriptIndicator(oscillator).descriptor;
    expect(levels.placement).toBe('panel');
    expect(levels.levels).toEqual([70, 30]);
  });

  it('gives a value a bar under each key, marks as 1 on their bars', () => {
    const output = scriptIndicator(cross).calculate(BARS, configOf());
    const series = output.series ?? [];
    expect(series).toHaveLength(BARS.length);
    expect(series[0]?.p0).toBeUndefined();
    expect(series[50]?.p0).toBeTypeOf('number');
    const marked = series.filter((point) => point?.s0 === 1);
    expect(marked.length).toBeGreaterThan(2);
    expect(output.values.get(BARS[50].time)).toEqual(series[50]);
  });

  it('runs only the live bar on a tick and a new bar, as a full calculate would', () => {
    const plugin = scriptIndicator(cross);
    const data = BARS.slice(0, 200);
    const prev = plugin.calculate(data, configOf());
    const ticked = [...data.slice(0, -1), { ...data[199], close: data[199].close + 1.5, high: data[199].high + 1.5 }];
    const afterTick = plugin.update!(ticked, configOf(), prev, 199);
    expect(afterTick).not.toBeNull();
    expect(afterTick!.series).toEqual(plugin.calculate(ticked, configOf()).series);
    const grown = [...ticked.slice(0, -1), data[199], BARS[200], BARS[201]];
    const afterBars = plugin.update!(grown, configOf(), afterTick!, 199);
    expect(afterBars!.series).toEqual(plugin.calculate(grown, configOf()).series);
  });

  it('runs bars added after an unchanged live bar', () => {
    const plugin = scriptIndicator(cross);
    const prev = plugin.calculate(BARS.slice(0, 100), configOf());
    const grown = BARS.slice(0, 103);
    expect(plugin.update!(grown, configOf(), prev, 100)!.series).toEqual(plugin.calculate(grown, configOf()).series);
  });

  it('says where a script stopped, and why', () => {
    const stops = defineScript({
      id: 'stops',
      name: 'Stops',
      setup({ plot }) {
        const line = plot('close');
        return (bar) => {
          if (bar.index === 10) throw new Error('bar ten');
          line.set(bar.close);
        };
      },
    });
    const output = scriptIndicator(stops).calculate(BARS.slice(0, 20), { id: 'stops', instanceId: 's', params: {} });
    expect(output.meta?.errors).toEqual([{ bar: 10, message: 'bar ten' }]);
    expect(output.series?.[11]).toBeNull();
  });

  it('asks for a full calculate when older bars changed or the inputs did', () => {
    const plugin = scriptIndicator(cross);
    const prev = plugin.calculate(BARS.slice(0, 100), configOf());
    expect(plugin.update!(BARS.slice(0, 100), configOf(), prev, 50)).toBeNull();
    expect(plugin.update!(BARS.slice(0, 100), configOf({ fast: 5 }), prev, 99)).toBeNull();
  });
});
