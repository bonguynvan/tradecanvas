import { describe, it, expect, vi } from 'vitest';
import { SMAIndicator } from '../overlay/SMA.js';
import type { OHLCBar } from '@tradecanvas/commons';
import { indicatorSource } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { lineSourceBars, priceSourceBars, alignOutput, inputSource } from '../sources.js';

const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => {
    const close = 100 + Math.sin(i / 3) * 4 + i * 0.1;
    return { time: i * 60_000, open: close - 1, high: close + 2, low: close - 2, close, volume: 10 + i };
  });

const engine = () => {
  const e = new IndicatorEngine();
  registerBuiltInIndicators(e);
  return e;
};
const last = (e: IndicatorEngine, id: string, key = 'value') => {
  const series = e.getOutput(id)!.series!;
  return series[series.length - 1]?.[key];
};

describe('price sources', () => {
  it('computes from the chosen price instead of the close', () => {
    const data = bars(50);
    const e = engine();
    const onClose = e.addIndicator('sma', { period: 5 }, data);
    const onHigh = e.addIndicator('sma', { period: 5, source: 'high' }, data);
    const onHl2 = e.addIndicator('sma', { period: 5, source: 'hl2' }, data);
    expect(last(e, onHigh)).toBeCloseTo(last(e, onClose)! + 2, 9);
    expect(last(e, onHl2)).toBeCloseTo(last(e, onClose)!, 9); // (h + l) / 2 = close here
  });

  it('follows a live tick on the chosen price', () => {
    const data = bars(50);
    const e = engine();
    const id = e.addIndicator('ema', { period: 10, source: 'high' }, data);
    const ticked = [...data.slice(0, -1), { ...data[49], high: data[49].high + 10 }];
    e.recalculateFrom(ticked, 49);
    const fresh = engine();
    const ref = fresh.addIndicator('ema', { period: 10, source: 'high' }, ticked);
    expect(last(e, id)).toBeCloseTo(last(fresh, ref)!, 9);
  });

  it('ignores a source on an indicator without one', () => {
    const data = bars(30);
    const e = engine();
    const plain = e.addIndicator('atr', { period: 5 }, data);
    const tagged = e.addIndicator('atr', { period: 5, source: 'high' }, data);
    expect(last(e, tagged)).toBe(last(e, plain));
  });
});

describe('indicators on indicators', () => {
  it('runs on another indicator’s line, aligned to the bars', () => {
    const data = bars(60);
    const e = engine();
    const rsi = e.addIndicator('rsi', { period: 14 }, data);
    const sma = e.addIndicator('sma', { period: 5, source: indicatorSource(rsi, 'value') }, data);
    const rsiSeries = e.getOutput(rsi)!.series!;
    const smaSeries = e.getOutput(sma)!.series!;
    expect(smaSeries).toHaveLength(data.length);
    // RSI starts at bar 14; a 5-bar average of it at bar 18.
    expect(smaSeries[17]).toBeNull();
    const mean = [14, 15, 16, 17, 18].reduce((s, i) => s + rsiSeries[i]!.value!, 0) / 5;
    expect(smaSeries[18]!.value).toBeCloseTo(mean, 9);
  });

  it('follows live ticks and new bars incrementally, matching a fresh computation', () => {
    let data = bars(80);
    const e = engine();
    const rsi = e.addIndicator('rsi', { period: 14 }, data);
    const sma = e.addIndicator('sma', { period: 5, source: indicatorSource(rsi, 'value') }, data);
    const ema = e.addIndicator('ema', { period: 4, source: indicatorSource(sma, 'value') }, data);
    const full = vi.spyOn(SMAIndicator.prototype, 'calculate');
    for (let step = 0; step < 12; step++) {
      const last = data[data.length - 1];
      if (step % 3 === 2) {
        data = [...data, { ...last, time: last.time + 60_000, close: last.close + 0.7 }];
        e.recalculateFrom(data, data.length - 2);
      } else {
        data = [...data.slice(0, -1), { ...last, close: last.close + (step % 2 ? -1.3 : 0.9) }];
        e.recalculateFrom(data, data.length - 1);
      }
    }
    expect(full).not.toHaveBeenCalled(); // the SMA of RSI was extended, never recomputed
    full.mockRestore();
    const fresh = engine();
    const fRsi = fresh.addIndicator('rsi', { period: 14 }, data);
    const fSma = fresh.addIndicator('sma', { period: 5, source: indicatorSource(fRsi, 'value') }, data);
    const fEma = fresh.addIndicator('ema', { period: 4, source: indicatorSource(fSma, 'value') }, data);
    for (const [mine, theirs] of [[sma, fSma], [ema, fEma]]) {
      const a = e.getOutput(mine)!;
      const b = fresh.getOutput(theirs)!;
      expect(a.series).toHaveLength(data.length);
      a.series!.forEach((v, i) => {
        if (!b.series![i]) expect(v).toBeNull();
        else expect(v!.value).toBeCloseTo(b.series![i]!.value!, 9);
      });
      expect([...a.values.keys()].sort()).toEqual([...b.values.keys()].sort());
    }
  });

  it('recomputes the readers when the read indicator changes', () => {
    const data = bars(60);
    const e = engine();
    const rsi = e.addIndicator('rsi', { period: 14 }, data);
    const sma = e.addIndicator('sma', { period: 5, source: indicatorSource(rsi, 'value') }, data);
    const before = last(e, sma);
    e.updateIndicator(rsi, { period: 7 }, data);
    expect(last(e, sma)).not.toBe(before);
    expect(e.getDependents(rsi)).toEqual([sma]);
  });

  it('computes a reader after what it reads, whatever the order they were added in', () => {
    const data = bars(60);
    const e = engine();
    const sma = e.addIndicator('sma', { period: 5 }, data);
    const rsi = e.addIndicator('rsi', { period: 14 }, data);
    e.updateIndicator(sma, { source: indicatorSource(rsi, 'value') }, data);
    e.recalculateAll(data);
    expect(last(e, sma)).toBeGreaterThan(0);
    expect(last(e, sma)).toBeLessThan(100); // an average of RSI, not of prices near 100+
  });

  it('has no values while the line it reads has none, or is gone', () => {
    const data = bars(10);
    const e = engine();
    const rsi = e.addIndicator('rsi', { period: 14 }, data); // never warms up on 10 bars
    const sma = e.addIndicator('sma', { period: 3, source: indicatorSource(rsi, 'value') }, data);
    expect(e.getOutput(sma)!.series!.every((v) => v === null)).toBe(true);
    const orphan = e.addIndicator('sma', { period: 3, source: indicatorSource('nope', 'value') }, data);
    expect(e.getOutput(orphan)!.series).toHaveLength(10);
  });
});

describe('shared panes', () => {
  it('draws a member on its host’s pane scale, not on the price pane', () => {
    const data = bars(60);
    const e = engine();
    const rsi = e.addIndicator('rsi', { period: 14 }, data);
    const sma = e.addIndicator('sma', { period: 5, source: indicatorSource(rsi, 'value') }, data, { pane: rsi });
    expect(e.getPaneMembers(rsi)).toEqual([sma]);
    expect(e.getActiveIndicators().find((i) => i.instanceId === sma)?.pane).toBe(rsi);
    // Not part of the price scale…
    expect(e.getOverlayPriceRange(0, 59)).toBeNull();
    expect(e.getLatestOverlayValues()).toEqual([]);
    // …but of its host's.
    expect(e.getPaneValueRange(rsi, 0, 59)).toEqual({ min: 0, max: 100 });
  });

  it('can move an instance into a pane and back', () => {
    const e = engine();
    const rsi = e.addIndicator('rsi');
    const stoch = e.addIndicator('stochastic');
    expect(e.setPane(stoch, rsi)).toBe(true);
    expect(e.getPaneMembers(rsi)).toEqual([stoch]);
    expect(e.setPane(stoch, stoch)).toBe(false);
    expect(e.setPane(stoch, null)).toBe(true);
    expect(e.getPaneMembers(rsi)).toEqual([]);
  });
});

describe('source helpers', () => {
  it('reads the source parameter', () => {
    const inputs = { inputs: { source: { source: true } } };
    expect(inputSource(inputs, { source: 'close' })).toEqual({ kind: 'bars' });
    expect(inputSource(inputs, { source: 'hlc3' })).toEqual({ kind: 'price', source: 'hlc3' });
    expect(inputSource(inputs, { source: 'ind:tc_rsi_1:value' })).toEqual({ kind: 'line', instanceId: 'tc_rsi_1', key: 'value' });
    expect(inputSource({}, { source: 'hlc3' })).toEqual({ kind: 'bars' });
  });

  it('rebuilds only the changed tail of price-source bars', () => {
    const data = bars(5);
    const first = priceSourceBars(data, 'high');
    const kept = first[1];
    const next = priceSourceBars([...data.slice(0, 4), { ...data[4], high: 999 }], 'high', first, 4);
    expect(next).toBe(first);
    expect(next[1]).toBe(kept);
    expect(next[4].close).toBe(999);
  });

  it('builds bars from a line from its first value on, repeating it over gaps', () => {
    const data = bars(5);
    const line = [null, null, { v: 1 }, null, { v: 3 }];
    const built = lineSourceBars(data, line, 'v')!;
    expect(built.start).toBe(2);
    expect(built.bars.map((b) => b.close)).toEqual([1, 1, 3]);
    expect(lineSourceBars(data, [null, null], 'v')).toBeNull();
    const aligned = alignOutput({ values: new Map(), series: [{ v: 1 }, { v: 2 }] }, 3, 5);
    expect(aligned.series).toEqual([null, null, null, { v: 1 }, { v: 2 }]);
  });
});
