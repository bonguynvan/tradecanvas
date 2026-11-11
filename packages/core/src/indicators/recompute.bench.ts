import { bench, describe } from 'vitest';
import type { IndicatorOutput, OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine } from './IndicatorEngine.js';
import { registerBuiltInIndicators } from './registry.js';
import { barsToColumns, columnsToOutput, outputToColumns } from './worker/columns.js';

// What a full recompute of the demo's default stack (BB, EMA, RSI, MACD)
// costs the main thread on its own, against what it still costs there when
// the worker computes it: the bars into columns, and the outputs back into
// points. The second is no less than the first, but it is done a slice at a
// time (`DECODE_SLICE_BARS`) where the first holds the thread in one go;
// `INDICATOR_WORKER_MIN_BARS` is where the first stops fitting in a frame.

const STACK = ['bb', 'ema', 'rsi', 'macd'];

function bars(n: number): OHLCBar[] {
  const out: OHLCBar[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    const o = p;
    const c = o * (1 + Math.sin(i * 0.37) * 0.004);
    out.push({ time: 1_600_000_000_000 + i * 60_000, open: o, close: c, high: Math.max(o, c) * 1.002, low: Math.min(o, c) * 0.998, volume: 100 + (i % 17) * 40 });
    p = c;
  }
  return out;
}

for (const n of [5_000, 20_000, 100_000, 1_000_000]) {
  describe(`full recompute, 4 indicators, ${n.toLocaleString('en-US')} bars`, () => {
    const data = bars(n);
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    const ids = STACK.map((id) => engine.addIndicator(id, {}, data));
    const outputs: IndicatorOutput[] = ids.map((id) => engine.getOutput(id)!);
    const time = barsToColumns(data).time;
    const replies = outputs.map((output) => outputToColumns(output, time));

    bench('on the main thread (recalculateAll)', () => {
      engine.recalculateAll(data);
    });

    bench('main thread\'s share with the worker (columns out and back)', () => {
      // One set of columns for the four, sent in one message; the times kept here.
      barsToColumns(data).time.slice();
      for (const reply of replies) columnsToOutput(reply, time);
    });
  });
}
