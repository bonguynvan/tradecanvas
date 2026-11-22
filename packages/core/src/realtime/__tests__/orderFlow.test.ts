import { describe, it, expect } from 'vitest';
import type { OHLCBar, Trade } from '@tradecanvas/commons';
import { barDelta, mergeBar, normalizeBar, resampleBars } from '@tradecanvas/commons';
import { TickBarBuilder } from '../TickBars.js';
import { TickAggregator } from '../TickAggregator.js';
import { parseAggTrade, parseRestKline, parseWsKline } from '../adapters/binanceTypes.js';
import { DataExporter } from '../../features/DataExporter.js';

const MIN = 60_000;
const bar = (time: number, volume: number, buyVolume?: number): OHLCBar => ({ time, open: 10, high: 12, low: 9, close: 11, volume, ...(buyVolume === undefined ? {} : { buyVolume }) });

describe('a bar that says who took its trades', () => {
  it('has a delta: what was bought at the ask less what was sold at the bid', () => {
    expect(barDelta(bar(0, 10, 7))).toBe(4);
    expect(barDelta(bar(0, 10, 0))).toBe(-10);
    expect(barDelta(bar(0, 10, 10))).toBe(10);
  });

  it('has none where the feed does not say, or says what cannot be', () => {
    expect(barDelta(bar(0, 10))).toBeNull();
    for (const bought of [Number.NaN, -1, 11, Number.POSITIVE_INFINITY]) expect(barDelta(bar(0, 10, bought)), String(bought)).toBeNull();
  });

  it('keeps it through the chart’s own reading of a bar, by its name or by `bv`, and drops one that cannot be', () => {
    expect(normalizeBar({ time: 1_700_000_000_000, open: 1, high: 2, low: 1, close: 2, volume: 10, buyVolume: 6 })).toEqual(expect.objectContaining({ volume: 10, buyVolume: 6 }));
    expect(normalizeBar({ t: 1_700_000_000_000, o: 1, h: 2, l: 1, c: 2, v: 10, bv: 4 })).toEqual(expect.objectContaining({ buyVolume: 4 }));
    expect(normalizeBar({ time: 1_700_000_000_000, open: 1, high: 2, low: 1, close: 2, volume: 10 })).not.toHaveProperty('buyVolume');
    expect(normalizeBar({ time: 1_700_000_000_000, open: 1, high: 2, low: 1, close: 2, volume: 10, buyVolume: 40 })).not.toHaveProperty('buyVolume');
  });
});

describe('bars made of other bars', () => {
  it('add up what was bought, as they add up the volume', () => {
    const out = resampleBars([bar(0, 10, 7), bar(MIN, 5, 1), bar(5 * MIN, 8, 8)], '5m');
    expect(out.map((b) => [b.volume, b.buyVolume])).toEqual([[15, 8], [8, 8]]);
  });

  it('say nothing of it for a bar that has a part with none: the split is not known', () => {
    const out = resampleBars([bar(0, 10, 7), bar(MIN, 5), bar(5 * MIN, 8, 3)], '5m');
    expect(out[0]).not.toHaveProperty('buyVolume');
    expect(out[1].buyVolume).toBe(3);
  });
});

describe('a trade into its bar', () => {
  const open: OHLCBar = { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 4, buyVolume: 1 };

  it('adds to what was bought when the buyer took it, and only to the volume when the seller did', () => {
    expect(mergeBar(open, { time: 1, price: 11, volume: 2, side: 'buy' })).toEqual(expect.objectContaining({ volume: 6, buyVolume: 3 }));
    expect(mergeBar(open, { time: 1, price: 9, volume: 2, side: 'sell' })).toEqual(expect.objectContaining({ volume: 6, buyVolume: 1 }));
  });

  it('leaves the bar with no split once a trade does not say who took it', () => {
    expect(mergeBar(open, { time: 1, price: 11, volume: 2 })).not.toHaveProperty('buyVolume');
    // A price with no volume is no trade: nothing to split.
    expect(mergeBar(open, { time: 1, price: 11 })).toEqual(expect.objectContaining({ volume: 4, buyVolume: 1 }));
    // A bar that never had one gets none from a later trade.
    const { buyVolume: _none, ...plain } = open;
    expect(mergeBar(plain, { time: 1, price: 11, volume: 2, side: 'buy' })).not.toHaveProperty('buyVolume');
  });
});

describe('bars of trades', () => {
  const trade = (time: number, price: number, volume: number, side?: Trade['side']): Trade => ({ time, price, volume, ...(side ? { side } : {}) });

  it('count what the buyers took in each bar of N trades', () => {
    const bars = new TickBarBuilder(3).build([
      trade(1, 10, 2, 'buy'), trade(2, 11, 1, 'sell'), trade(3, 12, 4, 'buy'),
      trade(4, 12, 5, 'sell'), trade(5, 11, 1, 'sell'),
    ]);
    expect(bars.map((b) => [b.volume, b.buyVolume])).toEqual([[7, 6], [6, 0]]);
  });

  it('have no split in a bar where one trade does not say, and have it again in the next', () => {
    const bars = new TickBarBuilder(2).build([trade(1, 10, 2, 'buy'), trade(2, 11, 1), trade(3, 12, 4, 'sell'), trade(4, 12, 5, 'buy')]);
    expect(bars[0]).not.toHaveProperty('buyVolume');
    expect(bars[1]).toEqual(expect.objectContaining({ volume: 9, buyVolume: 5 }));
  });

  it('are counted the same in bars of time, from ticks that say who took them', () => {
    const agg = new TickAggregator('1m');
    const seen: OHLCBar[] = [];
    agg.on('bar', (b) => seen.push({ ...b }));
    agg.processTick({ time: MIN + 1, price: 100, volume: 3, side: 'buy' });
    agg.processTick({ time: MIN + 2, price: 101, volume: 2, side: 'sell' });
    expect(seen.at(-1)).toEqual(expect.objectContaining({ volume: 5, buyVolume: 3 }));
    agg.processTick({ time: MIN + 3, price: 101, volume: 1 });
    expect(seen.at(-1)!.volume).toBe(6);
    expect(seen.at(-1)).not.toHaveProperty('buyVolume');
  });
});

describe('Binance’s own words for it', () => {
  it('reads who took an aggregate trade: the buyer, unless the buyer was the maker', () => {
    expect(parseAggTrade({ T: 1, p: '100', q: '2', m: false })).toEqual({ time: 1, price: 100, volume: 2, side: 'buy' });
    expect(parseAggTrade({ T: 1, p: '100', q: '2', m: true })).toEqual({ time: 1, price: 100, volume: 2, side: 'sell' });
    expect(parseAggTrade({ T: 1, p: '100', q: '2' })).toEqual({ time: 1, price: 100, volume: 2 });
  });

  it('reads the taker buy volume of a bar, from history and from the stream', () => {
    const rest = [1_700_000_000_000, '1', '2', '0.5', '1.5', '10', 1_700_000_059_999, '15', 42, '6.5', '9.75', '0'];
    expect(parseRestKline(rest)).toEqual(expect.objectContaining({ volume: 10, buyVolume: 6.5 }));
    expect(parseRestKline(rest.slice(0, 6))).not.toHaveProperty('buyVolume');
    const ws = { t: 1_700_000_000_000, o: '1', h: '2', l: '0.5', c: '1.5', v: '10', V: '4', x: false };
    expect(parseWsKline(ws)!.bar).toEqual(expect.objectContaining({ volume: 10, buyVolume: 4 }));
    const { V: _taker, ...without } = ws;
    expect(parseWsKline(without)!.bar).not.toHaveProperty('buyVolume');
    // A taker volume over the bar's own is no split of it.
    expect(parseWsKline({ ...ws, V: '11' })!.bar).not.toHaveProperty('buyVolume');
  });
});

describe('the bars written out', () => {
  it('have a column for what was bought when a bar says, and none when no bar does', () => {
    const plain = DataExporter.toCSV([bar(1_700_000_000_000, 10)]);
    expect(plain.split('\n')[0]).toBe('Time,Open,High,Low,Close,Volume');
    const csv = DataExporter.toCSV([bar(1_700_000_000_000, 10, 7), bar(1_700_000_060_000, 5)]);
    const [head, first, second] = csv.split('\n');
    expect(head).toBe('Time,Open,High,Low,Close,Volume,Buy Volume');
    expect(first.endsWith(',10,7')).toBe(true);
    // A bar that does not say leaves its cell empty.
    expect(second.endsWith(',5,')).toBe(true);
    const json = JSON.parse(DataExporter.toJSON([bar(1_700_000_000_000, 10, 7)])) as { buyVolume?: number }[];
    expect(json[0].buyVolume).toBe(7);
    expect(JSON.parse(DataExporter.toJSON([bar(1_700_000_000_000, 10)]))[0]).not.toHaveProperty('buyVolume');
  });
});

describe('a bar with no trade in it yet', () => {
  it('starts counting what the buyers take with its first trade, though it said nothing before', () => {
    const empty: OHLCBar = { time: 0, open: 10, high: 10, low: 10, close: 10, volume: 0 };
    expect(mergeBar(empty, { time: 1, price: 11, volume: 2, side: 'buy' })).toEqual(expect.objectContaining({ volume: 2, buyVolume: 2 }));
    expect(mergeBar(empty, { time: 1, price: 9, volume: 2, side: 'sell' })).toEqual(expect.objectContaining({ volume: 2, buyVolume: 0 }));
    expect(mergeBar(empty, { time: 1, price: 9, volume: 2 })).not.toHaveProperty('buyVolume');
  });
});

describe('the mock feed’s made-up split', () => {
  it('is within each bar’s volume, and draws no random number of its own', async () => {
    const { MockAdapter } = await import('../adapters/MockAdapter.js');
    const random = Math.random;
    let draws = 0;
    Math.random = () => {
      draws++;
      return random();
    };
    try {
      const bars = await new MockAdapter({ tickInterval: 1000, historySize: 200 }).fetchHistory('BTCUSDT', '5m');
      expect(bars).toHaveLength(200);
      for (const b of bars) {
        expect(b.buyVolume).toBeGreaterThanOrEqual(0);
        expect(b.buyVolume!).toBeLessThanOrEqual(b.volume);
      }
      // Some bars go against their close: the split is no copy of the bar's direction.
      expect(bars.some((b) => (b.close >= b.open) !== (2 * b.buyVolume! - b.volume >= 0))).toBe(true);
      // Four draws a bar, as before the split: the change, the two wicks and the volume.
      expect(draws % 200).toBe(0);
      expect(draws / 200).toBe(4);
    } finally {
      Math.random = random;
    }
  });
});

describe('the bars written out and read back', () => {
  it('say the same of what was bought, cell by cell', async () => {
    const { parseOHLCV } = await import('../../../../library/src/io/parseOHLCV.js');
    const bars = [bar(1_700_000_000_000, 10, 7), bar(1_700_000_060_000, 5), bar(1_700_000_120_000, 8, 0)];
    const back = parseOHLCV(DataExporter.toCSV(bars)).data;
    expect(back.map((b) => [b.volume, b.buyVolume])).toEqual([[10, 7], [5, undefined], [8, 0]]);
  });
});

describe('a reconnect’s forming bar', () => {
  it('keeps what the buyers took of it, on top of the history', async () => {
    const { withForming } = await import('../StreamManager.js');
    const history: OHLCBar[] = [bar(1_700_000_000_000, 10, 7)];
    const forming = { time: 1_700_000_060_000, open: 10, high: 12, low: 9, close: 11, volume: 6, buyVolume: 2, closed: false, tickCount: 3 };
    expect(withForming(history, forming).at(-1)).toEqual({ time: 1_700_000_060_000, open: 10, high: 12, low: 9, close: 11, volume: 6, buyVolume: 2 });
    const { buyVolume: _bought, ...plain } = forming;
    expect(withForming(history, plain).at(-1)).not.toHaveProperty('buyVolume');
    expect(withForming(history, null)).toBe(history);
  });
});
