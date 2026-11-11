import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorValue } from '@tradecanvas/commons';
import {
  barColumnBuffers,
  barsToColumns,
  columnsToBars,
  columnsToOutput,
  outputColumnBuffers,
  outputToColumns,
} from '../columns.js';
import { IndicatorValueMap } from '../../IndicatorValueMap.js';
import { walkBars } from './workerFixtures.js';

describe('bar columns', () => {
  it('turns bars into six number columns and back', () => {
    const bars = walkBars(50);
    const columns = barsToColumns(bars);
    expect(columns.time).toBeInstanceOf(Float64Array);
    expect(columns.close.length).toBe(50);
    expect(columnsToBars(columns)).toEqual(bars);
  });

  it('lists each column buffer once for transfer', () => {
    const buffers = barColumnBuffers(barsToColumns(walkBars(3)));
    expect(buffers).toHaveLength(6);
    expect(new Set(buffers).size).toBe(6);
  });
});

function seriesOutput(times: number[], points: (IndicatorValue | null)[], meta?: Record<string, unknown>): IndicatorOutput {
  const values = new IndicatorValueMap();
  points.forEach((p, i) => {
    if (p) values.set(times[i], p);
  });
  return { values, series: points, ...(meta ? { meta } : {}) };
}

describe('output columns', () => {
  const times = [1000, 2000, 3000, 4000];
  const time = Float64Array.from(times);

  it('round-trips a series with gaps, several keys and meta', () => {
    const output = seriesOutput(times, [null, { a: 1, b: 2 }, { a: 3 }, { b: -0 }], { pivots: [1, 3] });
    const back = columnsToOutput(outputToColumns(output, time), times);
    expect(back.series).toEqual(output.series);
    expect([...back.values]).toEqual([...output.values]);
    expect(back.meta).toEqual({ pivots: [1, 3] });
  });

  it('sends one column per key, NaN where there is no value', () => {
    const output = seriesOutput(times, [null, { a: 1, b: 2 }, { a: 3 }, { b: 4 }]);
    const columns = outputToColumns(output, time);
    expect(columns.keys).toEqual(['a', 'b']);
    expect(Array.from(columns.columns[0])).toEqual([NaN, 1, 3, NaN]);
    expect(columns.values).toBeNull();
  });

  it('shares each point between the series and the values', () => {
    const back = columnsToOutput(outputToColumns(seriesOutput(times, [{ a: 1 }, null, { a: 2 }, null]), time), times);
    expect(back.values.get(1000)).toBe(back.series![0]);
    expect(back.values.get(3000)).toBe(back.series![2]);
  });

  it('keeps values that are not the series by time as they are', () => {
    const output: IndicatorOutput = { values: new Map([[1000, { a: 9 }]]), series: [{ a: 1 }, null, null, null] };
    const back = columnsToOutput(outputToColumns(output, time), times);
    expect([...back.values]).toEqual([[1000, { a: 9 }]]);
    expect(back.series).toEqual(output.series);
  });

  it('carries an output with values and no series', () => {
    const output: IndicatorOutput = { values: new Map([[2000, { v: 5 }]]) };
    const back = columnsToOutput(outputToColumns(output, time), times);
    expect(back.series).toBeUndefined();
    expect([...back.values]).toEqual([[2000, { v: 5 }]]);
  });

  it('lists every buffer for transfer', () => {
    const columns = outputToColumns(seriesOutput(times, [{ a: 1, b: 1 }, null, null, null]), time);
    // present, and a column per key
    expect(outputColumnBuffers(columns)).toHaveLength(3);
  });
});
