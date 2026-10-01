import { bench, describe } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine } from './IndicatorEngine.js';
import { registerBuiltInIndicators } from './registry.js';

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

/** The demo's default stack: two overlays (BB, EMA) + two panels (RSI, MACD). */
function engineWith(data: OHLCBar[]): IndicatorEngine {
  const engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
  for (const id of ['bb', 'ema', 'rsi', 'macd']) engine.addIndicator(id, {}, data);
  return engine;
}

/** One live tick: the forming (last) bar's close moves; nothing else changes. */
function tickLast(data: OHLCBar[], k: number): void {
  const last = data[data.length - 1];
  const close = last.close * (1 + ((k % 7) - 3) * 0.0005);
  data[data.length - 1] = { ...last, close, high: Math.max(last.high, close), low: Math.min(last.low, close) };
}

for (const n of [20_000, 100_000]) {
  describe(`live tick, 4 indicators, ${n.toLocaleString('en-US')} bars`, () => {
    const data = bars(n);
    const engine = engineWith(data);
    let k = 0;

    bench('full recalculateAll (previous per-tick behaviour)', () => {
      tickLast(data, k++);
      engine.recalculateAll(data);
    });

    bench('incremental recalculateFrom(last bar)', () => {
      tickLast(data, k++);
      engine.recalculateFrom(data, data.length - 1);
    });
  });
}
