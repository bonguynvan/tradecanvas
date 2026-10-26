import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollingAdapter } from '../PollingAdapter.js';
import type { DataAdapterConfig, OHLCBar } from '@tradecanvas/commons';

const CONFIG: DataAdapterConfig = { symbol: 'BTC-USD', timeframe: '1m' };

function bar(time: number, close: number): OHLCBar {
  return { time, open: close, high: close, low: close, close, volume: 1 };
}

/** Let pending microtasks/macrotasks (the unawaited initial poll) settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('PollingAdapter', () => {
  let barEvents: { bar: OHLCBar; closed: boolean }[];
  let connEvents: unknown[];

  beforeEach(() => {
    barEvents = [];
    connEvents = [];
  });

  function makeAdapter(fetchBars: (s: string, tf: string, n: number) => Promise<OHLCBar[]>) {
    const adapter = new PollingAdapter({
      name: 'poll',
      fetchBars: fetchBars as never,
      // no-op timer so connect() doesn't schedule real intervals
      setInterval: () => 1,
      clearInterval: () => {},
    });
    adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => barEvents.push(e.data));
    adapter.on('connectionChange', (e) => connEvents.push(e.data));
    return adapter;
  }

  it('reports connected on connect', async () => {
    const adapter = makeAdapter(async () => [bar(60, 100)]);
    adapter.connect(CONFIG);
    expect(adapter.getConnectionState()).toBe('connected');
    expect(connEvents).toContain('connected');
  });

  it('emits the latest bar as forming on poll', async () => {
    const adapter = makeAdapter(async () => [bar(60, 100), bar(120, 101)]);
    adapter.connect(CONFIG);
    await adapter.poll();

    const forming = barEvents.filter((e) => !e.closed);
    expect(forming.at(-1)).toEqual({ bar: bar(120, 101), closed: false });
  });

  it('emits the prior bar as closed when the bucket rolls over', async () => {
    let current: OHLCBar[] = [bar(60, 100), bar(120, 101)];
    const adapter = makeAdapter(async () => current);

    adapter.connect(CONFIG);
    await flush(); // let connect()'s initial poll settle → lastBarTime = 120
    barEvents.length = 0;

    current = [bar(120, 101.5), bar(180, 102)]; // 120 finalized, 180 forming
    await adapter.poll();

    const closed = barEvents.filter((e) => e.closed);
    expect(closed).toEqual([{ bar: bar(120, 101.5), closed: true }]);
    expect(barEvents.some((e) => !e.closed && e.bar.time === 180)).toBe(true);
  });

  it('emits an error event when the fetch throws', async () => {
    const errors: unknown[] = [];
    const adapter = makeAdapter(async () => {
      throw new Error('network down');
    });
    adapter.on('error', (e) => errors.push(e.data));

    adapter.connect(CONFIG);
    await flush(); // settle the initial poll's rejection
    errors.length = 0;

    await adapter.poll();
    expect(errors).toHaveLength(1);
  });

  it('does nothing on empty bar responses', async () => {
    const adapter = makeAdapter(async () => []);
    adapter.connect(CONFIG);
    await adapter.poll();
    expect(barEvents).toHaveLength(0);
  });

  it('leaves out an answer older than one it already sent: no bar, no price', async () => {
    const answers: ((bars: OHLCBar[]) => void)[] = [];
    const adapter = makeAdapter(() => new Promise((resolve) => answers.push(resolve)));
    const prices: number[] = [];
    adapter.on<{ price: number }>('tick', (e) => prices.push(e.data.price));
    adapter.connect(CONFIG); // the first poll asks
    const second = adapter.poll(); // a slow answer overtaken by the next
    answers[1]([bar(120, 101), bar(180, 102)]);
    await second;
    answers[0]([bar(60, 100), bar(120, 101)]);
    await flush();
    expect(prices).toEqual([102]);
    expect(barEvents).toEqual([{ bar: bar(180, 102), closed: false }]);

    const third = adapter.poll();
    answers[2]([bar(180, 102.5), bar(240, 103)]);
    await third;
    expect(prices).toEqual([102, 103]);
    expect(barEvents.filter((e) => e.closed)).toEqual([{ bar: bar(180, 102.5), closed: true }]);
  });

  describe('the history it served', () => {
    /** An adapter whose answers the test gives, one per request: the history first, then each poll. */
    function answering() {
      const answers: ((bars: OHLCBar[]) => void)[] = [];
      const adapter = makeAdapter(() => new Promise((resolve) => answers.push(resolve)));
      const prices: number[] = [];
      adapter.on<{ price: number }>('tick', (e) => prices.push(e.data.price));
      /** The history for `symbol`, as the stream asks for it before connecting. */
      const serve = async (bars: OHLCBar[], symbol = CONFIG.symbol) => {
        const history = adapter.fetchHistory(symbol, CONFIG.timeframe, 2);
        answers.at(-1)!(bars);
        await history;
      };
      const answer = async (bars: OHLCBar[]) => {
        answers.at(-1)!(bars);
        await flush();
      };
      return { adapter, prices, serve, answer };
    }

    it('is where a connection starts: an older answer, a cached page, makes no bar or price', async () => {
      const { adapter, prices, serve, answer } = answering();
      await serve([bar(60, 100), bar(120, 101)]);
      adapter.connect(CONFIG);
      await answer([bar(0, 99), bar(60, 100)]);
      expect(barEvents).toEqual([]);
      expect(prices).toEqual([]);
    });

    it('sends its last bar closed, with its final values, when the next one started before the first poll', async () => {
      const { adapter, prices, serve, answer } = answering();
      await serve([bar(60, 100), bar(120, 101)]);
      adapter.connect(CONFIG);
      await answer([bar(120, 101.5), bar(180, 102)]);
      expect(barEvents).toEqual([{ bar: bar(120, 101.5), closed: true }, { bar: bar(180, 102), closed: false }]);
      expect(prices).toEqual([102]);
    });

    it("is another symbol's no start for this one", async () => {
      const { adapter, prices, serve, answer } = answering();
      await serve([bar(60, 100), bar(120, 101)], 'ETH-USD');
      adapter.connect(CONFIG);
      await answer([bar(0, 99), bar(60, 100)]);
      expect(prices).toEqual([100]);
    });
  });

  it('stops polling and reports disconnected on disconnect', async () => {
    const cleared = vi.fn();
    const adapter = new PollingAdapter({
      name: 'poll',
      fetchBars: async () => [bar(60, 100)],
      setInterval: () => 7,
      clearInterval: cleared,
    });
    adapter.on('connectionChange', (e) => connEvents.push(e.data));

    adapter.connect(CONFIG);
    adapter.disconnect();

    expect(cleared).toHaveBeenCalledWith(7);
    expect(adapter.getConnectionState()).toBe('disconnected');
    expect(connEvents).toContain('disconnected');
  });

  it('delegates fetchHistory to fetchBars', async () => {
    const history = [bar(60, 100), bar(120, 101)];
    const adapter = makeAdapter(async () => history);
    await expect(adapter.fetchHistory('BTC-USD', '1m', 2)).resolves.toEqual(history);
  });

  it('pages older history only when given a fetcher for it', async () => {
    expect(makeAdapter(async () => []).fetchHistoryBefore).toBeUndefined();

    const older = [bar(0, 99)];
    const fetchHistoryBefore = vi.fn().mockResolvedValue(older);
    const adapter = new PollingAdapter({
      name: 'poll', fetchBars: async () => [], fetchHistoryBefore, setInterval: () => 1, clearInterval: () => {},
    });
    await expect(adapter.fetchHistoryBefore?.('BTC-USD', '1m', 60, 10)).resolves.toEqual(older);
    expect(fetchHistoryBefore).toHaveBeenCalledWith('BTC-USD', '1m', 60, 10);
  });
});

describe('PollingAdapter subclasses', () => {
  it('can send what they learn about the symbol', () => {
    class Feed extends PollingAdapter {
      learned(info: { symbol: string; pricePrecision: number }): void {
        this.emitEvent('symbolInfo', info);
      }
    }
    const feed = new Feed({ name: 'feed', intervalMs: 1000, fetchBars: async () => [] });
    const seen: unknown[] = [];
    feed.on('symbolInfo', (e) => seen.push(e.data));
    feed.learned({ symbol: 'X', pricePrecision: 0 });
    expect(seen).toEqual([{ symbol: 'X', pricePrecision: 0 }]);
  });
});
