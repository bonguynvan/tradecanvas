import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolutionToTimeframe, timeframeToResolution } from '@tradecanvas/commons';
import type { FeedSubscriber, OHLCBar } from '@tradecanvas/commons';
import { feedFromJsApi } from '../jsApiFeed.js';
import { adapterFromFeed } from '../feedAdapter.js';
import { servesTimeframe, withResampling } from '../../adapters/ResamplingAdapter.js';
import { sessionsFromJsApi, symbolInfoFromJsApi, quotesFromJsApi } from '../jsApiSymbols.js';
import { udfFeed } from '../udfFeed.js';
import type { JsApiBar, JsApiDatafeed, JsApiPeriodParams, JsApiQuoteData, JsApiSymbolInfo } from '../jsApiTypes.js';

const DAY = 86_400_000;
const jsBar = (time: number, close = 10): JsApiBar => ({ time, open: close, high: close + 1, low: close - 1, close, volume: 5 });

function subscriber() {
  return {
    bar: vi.fn<(bar: OHLCBar, closed: boolean) => void>(),
    tick: vi.fn(),
    connection: vi.fn(),
    symbolInfo: vi.fn(),
    error: vi.fn(),
  } satisfies FeedSubscriber;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** A datafeed that records its calls; `bars` answers getBars. */
function recordingDatafeed(bars: (params: JsApiPeriodParams) => { bars: JsApiBar[]; meta?: { noData?: boolean; nextTime?: number } }) {
  const calls = {
    getBars: [] as { resolution: string; params: JsApiPeriodParams; info: JsApiSymbolInfo }[],
    resolved: [] as string[],
    subscribed: [] as { guid: string; resolution: string; onTick: (bar: JsApiBar) => void; reset: () => void }[],
    unsubscribed: [] as string[],
  };
  const datafeed: JsApiDatafeed = {
    onReady: (cb) => setTimeout(() => cb({ supported_resolutions: ['1', '60', '1D'] }), 0),
    resolveSymbol: (name, ok, fail) =>
      setTimeout(() => {
        calls.resolved.push(name);
        if (name === 'NOPE') fail('unknown_symbol');
        else ok({ name, ticker: `X:${name}`, pricescale: 100, minmov: 1, timezone: 'America/New_York', session: '0930-1600' });
      }, 0),
    getBars: (info, resolution, params, ok) => {
      calls.getBars.push({ resolution, params, info });
      const answer = bars(params);
      setTimeout(() => ok(answer.bars, answer.meta), 0);
    },
    subscribeBars: (_info, resolution, onTick, guid, reset) => calls.subscribed.push({ guid, resolution, onTick, reset }),
    unsubscribeBars: (guid) => calls.unsubscribed.push(guid),
  };
  return { datafeed, calls };
}

describe('resolutions and timeframes', () => {
  it('reads minutes, hours, days, weeks, months, seconds and ticks', () => {
    expect(resolutionToTimeframe('1')).toBe('1m');
    expect(resolutionToTimeframe('60')).toBe('1h');
    expect(resolutionToTimeframe('240')).toBe('4h');
    expect(resolutionToTimeframe('90')).toBe('90m');
    expect(resolutionToTimeframe('D')).toBe('1d');
    expect(resolutionToTimeframe('1D')).toBe('1d');
    expect(resolutionToTimeframe('W')).toBe('1w');
    expect(resolutionToTimeframe('3M')).toBe('3M');
    expect(resolutionToTimeframe('15S')).toBe('15s');
    expect(resolutionToTimeframe('100T')).toBe('100T');
  });

  it('names nothing for what is no resolution', () => {
    for (const bad of ['', 'x', '1m', '0', '-5', '1.5']) expect(resolutionToTimeframe(bad)).toBeNull();
  });

  it('goes back the other way', () => {
    expect(timeframeToResolution('1m')).toBe('1');
    expect(timeframeToResolution('4h')).toBe('240');
    expect(timeframeToResolution('1d')).toBe('1D');
    expect(timeframeToResolution('1w')).toBe('1W');
    expect(timeframeToResolution('1M')).toBe('1M');
    expect(timeframeToResolution('30s')).toBe('30S');
    expect(timeframeToResolution('100T')).toBe('100T');
  });
});

describe('sessionsFromJsApi', () => {
  it('reads a session on weekdays by default', () => {
    expect(sessionsFromJsApi('0930-1600')).toEqual([{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }]);
  });

  it('reads several ranges and days counted from Sunday as 1', () => {
    expect(sessionsFromJsApi('0930-1400,1430-1700:23')).toEqual([
      { start: '09:30', end: '14:00', days: [1, 2] },
      { start: '14:30', end: '17:00', days: [1, 2] },
    ]);
  });

  it('gives a schedule without days the weekdays no other names', () => {
    expect(sessionsFromJsApi('0900-1200:6|0900-1600')).toEqual([
      { start: '09:00', end: '12:00', days: [5] },
      { start: '09:00', end: '16:00', days: [1, 2, 3, 4] },
    ]);
  });

  it('wraps an overnight session and moves an F start to the day before', () => {
    expect(sessionsFromJsApi('1800-1700')).toEqual([{ start: '18:00', end: '17:00', days: [1, 2, 3, 4, 5] }]);
    expect(sessionsFromJsApi('1700F-1600:3')).toEqual([{ start: '17:00', end: '16:00', days: [1] }]);
  });

  it('splits a whole day from a time to the same time the next day', () => {
    expect(sessionsFromJsApi('1700-1700:2')).toEqual([
      { start: '17:00', end: '24:00', days: [1] },
      { start: '00:00', end: '17:00', days: [2] },
    ]);
  });

  it('reads the current schedule of a history, and nothing for round the clock or what it cannot read', () => {
    expect(sessionsFromJsApi('0900-1500#20200101/0930-1600')).toEqual([{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }]);
    expect(sessionsFromJsApi('24x7')).toBeUndefined();
    expect(sessionsFromJsApi(undefined)).toBeUndefined();
    expect(sessionsFromJsApi('9:30-16:00')).toBeUndefined();
    expect(sessionsFromJsApi('0930-1600:8')).toBeUndefined();
    expect(sessionsFromJsApi('0975-1600')).toBeUndefined();
  });
});

describe('symbolInfoFromJsApi', () => {
  it('takes the ticker, price step, zone, hours and logo', () => {
    expect(
      symbolInfoFromJsApi({
        name: 'AAPL',
        ticker: 'NASDAQ:AAPL',
        description: 'Apple',
        exchange: 'NASDAQ',
        type: 'stock',
        timezone: 'America/New_York',
        session: '0930-1600',
        pricescale: 100,
        minmov: 5,
        currency_code: 'USD',
        logo_urls: ['https://example.com/aapl.svg'],
      }),
    ).toEqual({
      symbol: 'NASDAQ:AAPL',
      description: 'Apple',
      exchange: 'NASDAQ',
      type: 'stock',
      timeZone: 'America/New_York',
      sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
      minTick: 0.05,
      pricePrecision: 2,
      currency: 'USD',
      logo: 'https://example.com/aapl.svg',
    });
  });

  it('leaves out what it was not told', () => {
    expect(symbolInfoFromJsApi({ name: 'BTC', session: '24x7', pricescale: 0 })).toEqual({ symbol: 'BTC' });
  });

  it('reads quotes with a last price and leaves the others out', () => {
    expect(
      quotesFromJsApi([
        { s: 'ok', n: 'AAPL', v: { lp: 190, ch: 2, chp: 1.06, bid: 189.9, ask: 190.1 } },
        { s: 'error', n: 'BAD', v: {} },
        { s: 'ok', n: 'NOLAST', v: { ch: 1 } },
      ]),
    ).toEqual([{ symbol: 'AAPL', last: 190, change: 2, changePercent: 1.06, bid: 189.9, ask: 190.1 }]);
  });
});

describe('feedFromJsApi', () => {
  afterEach(() => vi.useRealTimers());

  it('asks getBars with the resolved symbol, a resolution and a range in seconds', async () => {
    const { datafeed, calls } = recordingDatafeed(() => ({ bars: [jsBar(2 * DAY), jsBar(DAY)] }));
    const feed = feedFromJsApi(datafeed);
    const bars = await feed.getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 10, signal: new AbortController().signal });

    expect(bars.map((b) => b.time)).toEqual([DAY, 2 * DAY]);
    expect(bars[0]).toEqual({ time: DAY, open: 10, high: 11, low: 9, close: 10, volume: 5 });
    const call = calls.getBars[0];
    expect(call.resolution).toBe('1D');
    expect(call.info.ticker).toBe('X:AAPL');
    expect(call.params.countBack).toBe(10);
    expect(call.params.firstDataRequest).toBe(true);
    expect(call.params.to - call.params.from).toBe(10 * 86_400);
  });

  it('pages back from the oldest bar, its time in seconds and not included', async () => {
    const { datafeed, calls } = recordingDatafeed(() => ({ bars: [jsBar(DAY), jsBar(5 * DAY)] }));
    const feed = feedFromJsApi(datafeed);
    const bars = await feed.getBars({ symbol: 'AAPL', timeframe: '1h', countBack: 3, before: 5 * DAY, signal: new AbortController().signal });

    expect(calls.getBars[0].params).toMatchObject({ to: (5 * DAY) / 1000, firstDataRequest: false, countBack: 3 });
    expect(calls.getBars[0].resolution).toBe('60');
    expect(bars.map((b) => b.time)).toEqual([DAY]);
  });

  it('asks once more from the next time when there were no bars in the range, in ms or in seconds', async () => {
    const T0 = Date.UTC(2026, 0, 5);
    for (const nextTime of [T0, T0 / 1000]) {
      const { datafeed, calls } = recordingDatafeed((params) =>
        params.to > T0 / 1000 + 86_400 ? { bars: [], meta: { noData: true, nextTime } } : { bars: [jsBar(T0)] },
      );
      const bars = await feedFromJsApi(datafeed).getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 5, before: T0 + 20 * DAY, signal: new AbortController().signal });

      expect(calls.getBars).toHaveLength(2);
      expect(calls.getBars[1].params.to).toBe(T0 / 1000 + 1);
      expect(bars.map((b) => b.time)).toEqual([T0]);
    }
  });

  it('looks wider when a range is empty with no word of more, and stops when there are no more', async () => {
    const T0 = Date.UTC(2026, 0, 5);
    const widening = recordingDatafeed((params) => (params.to - params.from > 5 * 86_400 ? { bars: [jsBar(T0)] } : { bars: [] }));
    const bars = await feedFromJsApi(widening.datafeed).getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 5, before: T0 + 3 * DAY, signal: new AbortController().signal });
    expect(bars.map((b) => b.time)).toEqual([T0]);
    expect(widening.calls.getBars.map((c) => (c.params.to - c.params.from) / 86_400)).toEqual([5, 40]);

    const done = recordingDatafeed(() => ({ bars: [], meta: { noData: true } }));
    expect(await feedFromJsApi(done.datafeed).getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 5, before: T0, signal: new AbortController().signal })).toEqual([]);
    expect(done.calls.getBars).toHaveLength(1);
  });

  it('resolves a symbol once, and rejects an aborted request', async () => {
    const { datafeed, calls } = recordingDatafeed(() => ({ bars: [] }));
    const feed = feedFromJsApi(datafeed);
    const controller = new AbortController();
    const pending = feed.getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 5, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await feed.getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 5, signal: new AbortController().signal });
    expect(calls.resolved).toEqual(['AAPL']);
  });

  it('answers null for a symbol the datafeed cannot resolve', async () => {
    const feed = feedFromJsApi(recordingDatafeed(() => ({ bars: [] })).datafeed);
    expect(await feed.resolveSymbol!('NOPE')).toBeNull();
    expect(await feed.resolveSymbol!('AAPL')).toMatchObject({ symbol: 'X:AAPL', minTick: 0.01, timeZone: 'America/New_York' });
  });

  it('takes the timeframes it serves from onReady, for a chart that connects once it is ready', async () => {
    const feed = feedFromJsApi(recordingDatafeed(() => ({ bars: [] })).datafeed);
    expect(feed.supportedTimeframes).toBeUndefined();
    expect(await feed.ready()).toEqual(['1m', '1h', '1d']);
    // What a chart makes of the feed when it connects: it builds 7m from 1m.
    const adapter = adapterFromFeed(feed);
    expect(adapter.supportedTimeframes).toEqual(['1m', '1h', '1d']);
    expect(servesTimeframe(adapter, '7m')).toBe(true);
    expect(withResampling(adapter)).not.toBe(adapter);
    const given = feedFromJsApi(recordingDatafeed(() => ({ bars: [] })).datafeed, { supportedTimeframes: ['5m'] });
    expect(given.supportedTimeframes).toEqual(['5m']);
    expect(await given.ready()).toEqual(['5m']);
  });

  it('reports a symbol that fails or a datafeed that throws, and lets the chart try again', async () => {
    const { datafeed } = recordingDatafeed(() => ({ bars: [] }));
    const throwing: JsApiDatafeed = { ...datafeed, subscribeBars: () => { throw new Error('socket closed'); } };
    const sub = subscriber();
    feedFromJsApi(throwing).subscribeBars({ symbol: 'AAPL', timeframe: '1d' }, sub);
    await flush();
    await flush();
    expect(sub.error).toHaveBeenCalledWith('socket closed');
    expect(sub.connection).toHaveBeenCalledWith('error');
  });

  it('unsubscribes when stopped from inside the subscribe of the datafeed', async () => {
    const unsubscribed: string[] = [];
    const { datafeed } = recordingDatafeed(() => ({ bars: [] }));
    let stop = (): void => {};
    const reentrant: JsApiDatafeed = { ...datafeed, subscribeBars: () => stop(), unsubscribeBars: (guid) => unsubscribed.push(guid) };
    stop = feedFromJsApi(reentrant).subscribeBars({ symbol: 'AAPL', timeframe: '1d' }, subscriber());
    await flush();
    await flush();
    expect(unsubscribed).toHaveLength(1);
  });

  it('streams bars, closes the one before when a newer starts, and unsubscribes by its guid', async () => {
    const { datafeed, calls } = recordingDatafeed(() => ({ bars: [] }));
    const feed = feedFromJsApi(datafeed);
    const sub = subscriber();
    const stop = feed.subscribeBars({ symbol: 'AAPL', timeframe: '5m' }, sub);
    await flush();
    await flush();

    const { onTick, guid, resolution } = calls.subscribed[0];
    expect(resolution).toBe('5');
    expect(sub.symbolInfo).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'X:AAPL' }));
    onTick(jsBar(1000, 1));
    onTick(jsBar(1000, 2));
    onTick(jsBar(2000, 3));
    expect(sub.bar.mock.calls.map(([b, closed]) => [b.time, b.close, closed])).toEqual([
      [1000, 1, false],
      [1000, 2, false],
      [1000, 2, true],
      [2000, 3, false],
    ]);

    stop();
    onTick(jsBar(3000));
    expect(sub.bar).toHaveBeenCalledTimes(4);
    expect(calls.unsubscribed).toEqual([guid]);
  });

  it('makes the chart load again when the datafeed resets its cache', async () => {
    const { datafeed, calls } = recordingDatafeed(() => ({ bars: [] }));
    const sub = subscriber();
    feedFromJsApi(datafeed).subscribeBars({ symbol: 'AAPL', timeframe: '1d' }, sub);
    await flush();
    await flush();
    calls.subscribed[0].reset();
    expect(sub.connection).toHaveBeenCalledWith('disconnected');
  });

  it('does not subscribe when stopped before the symbol resolved, and reports a symbol that fails', async () => {
    const { datafeed, calls } = recordingDatafeed(() => ({ bars: [] }));
    const feed = feedFromJsApi(datafeed);
    feed.subscribeBars({ symbol: 'AAPL', timeframe: '1d' }, subscriber())();
    const failing = subscriber();
    feed.subscribeBars({ symbol: 'NOPE', timeframe: '1d' }, failing);
    await flush();
    await flush();
    expect(calls.subscribed).toHaveLength(0);
    expect(calls.unsubscribed).toHaveLength(0);
    expect(failing.error).toHaveBeenCalledWith('unknown_symbol');
  });

  it('searches and streams quotes when the datafeed can', async () => {
    const quoteGuids: string[] = [];
    let push: ((data: JsApiQuoteData[]) => void) | null = null;
    const { datafeed } = recordingDatafeed(() => ({ bars: [] }));
    const full: JsApiDatafeed = {
      ...datafeed,
      searchSymbols: (input, _exchange, _type, onResult) =>
        onResult([
          { symbol: 'AAPL', ticker: 'NASDAQ:AAPL', description: `found ${input}`, exchange: 'NASDAQ', type: 'stock' },
          { symbol: 'AAPX', description: 'two' },
        ]),
      getQuotes: (symbols, onData) => onData(symbols.map((n) => ({ s: 'ok', n, v: { lp: 1 } }))),
      subscribeQuotes: (_symbols, _fast, onRealtime, guid) => {
        quoteGuids.push(guid);
        push = onRealtime;
      },
      unsubscribeQuotes: (guid) => quoteGuids.splice(quoteGuids.indexOf(guid), 1),
    };
    const feed = feedFromJsApi(full);

    expect(await feed.searchSymbols!('aa', { limit: 1 })).toEqual([{ symbol: 'NASDAQ:AAPL', description: 'found aa', exchange: 'NASDAQ', type: 'stock' }]);

    const onQuotes = vi.fn();
    const stop = feed.subscribeQuotes!(['AAPL', 'MSFT'], onQuotes);
    expect(onQuotes).toHaveBeenCalledWith([{ symbol: 'AAPL', last: 1 }, { symbol: 'MSFT', last: 1 }]);
    push!([{ s: 'ok', n: 'AAPL', v: { lp: 2 } }]);
    expect(onQuotes).toHaveBeenLastCalledWith([{ symbol: 'AAPL', last: 2 }]);
    stop();
    expect(quoteGuids).toEqual([]);
  });

  it('has no search or quotes when the datafeed has none', () => {
    const feed = feedFromJsApi(recordingDatafeed(() => ({ bars: [] })).datafeed);
    expect(feed.searchSymbols).toBeUndefined();
    expect(feed.subscribeQuotes).toBeUndefined();
  });
});

describe('udfFeed', () => {
  afterEach(() => vi.useRealTimers());

  /** A UDF server answering from `routes` by path; records the URLs asked. */
  function server(routes: Record<string, (params: URLSearchParams) => unknown>) {
    const asked: string[] = [];
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      asked.push(`${url.pathname}${url.search}`);
      const route = routes[url.pathname.replace('/udf', '')];
      if (!route) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(route(url.searchParams)), { status: 200 });
    });
    return { fetch: fetch as unknown as typeof globalThis.fetch, asked };
  }

  it('reads /history columns in seconds as bars in ms, and its timeframes from /config', async () => {
    const { fetch, asked } = server({
      '/config': () => ({ supported_resolutions: ['1', 'D'], supports_search: true }),
      '/symbols': (p) => ({ name: p.get('symbol'), ticker: p.get('symbol'), pricescale: 1000 }),
      '/history': () => ({ s: 'ok', t: [86_400, 172_800], o: [1, 2], h: [3, 4], l: [0, 1], c: [2, 3], v: [10, 20] }),
    });
    const feed = udfFeed({ url: 'https://data.example.com/udf/', fetch });
    const bars = await feed.getBars({ symbol: 'AAPL', timeframe: '1d', countBack: 2, signal: new AbortController().signal });

    expect(bars).toEqual([
      { time: DAY, open: 1, high: 3, low: 0, close: 2, volume: 10 },
      { time: 2 * DAY, open: 2, high: 4, low: 1, close: 3, volume: 20 },
    ]);
    expect(feed.supportedTimeframes).toEqual(['1m', '1d']);
    const history = asked.find((a) => a.startsWith('/udf/history'))!;
    expect(history).toContain('symbol=AAPL');
    expect(history).toContain('resolution=1D');
    expect(history).toContain('countback=2');
    expect(await feed.resolveSymbol!('AAPL')).toMatchObject({ symbol: 'AAPL', minTick: 0.001, pricePrecision: 3 });
  });

  it('charts the name it was given when the server has no /symbols, and falls back without /config', async () => {
    const { fetch } = server({ '/history': () => ({ s: 'no_data' }) });
    const feed = udfFeed({ url: 'https://data.example.com/udf', fetch });
    expect(await feed.resolveSymbol!('ES1!')).toEqual({ symbol: 'ES1!' });
    expect(await feed.getBars({ symbol: 'ES1!', timeframe: '1m', countBack: 5, signal: new AbortController().signal })).toEqual([]);
    expect(feed.supportedTimeframes).toEqual(['1m', '5m', '15m', '30m', '1h', '1d', '1w', '1M']);
  });

  it('tells a server that cannot be reached from one without /symbols', async () => {
    const down = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof globalThis.fetch;
    expect(await udfFeed({ url: 'https://data.example.com/udf', fetch: down }).resolveSymbol!('AAPL')).toBeNull();
    const unknown = server({ '/symbols': () => ({ s: 'error', errmsg: 'unknown_symbol' }) });
    expect(await udfFeed({ url: 'https://data.example.com/udf', fetch: unknown.fetch }).resolveSymbol!('NOPE')).toBeNull();
  });

  it('rejects with the server error', async () => {
    const { fetch } = server({ '/history': () => ({ s: 'error', errmsg: 'bad symbol' }) });
    const feed = udfFeed({ url: 'https://data.example.com/udf', fetch });
    await expect(feed.getBars({ symbol: 'X', timeframe: '1d', countBack: 5, signal: new AbortController().signal })).rejects.toThrow('bad symbol');
  });

  it('searches only when /config says it can', async () => {
    const { fetch } = server({
      '/config': () => ({ supports_search: true }),
      '/search': (p) => [{ symbol: p.get('query')!.toUpperCase(), description: 'found', exchange: 'X', type: 'stock' }],
    });
    expect(await udfFeed({ url: 'https://data.example.com/udf', fetch }).searchSymbols!('msft')).toEqual([
      { symbol: 'MSFT', description: 'found', exchange: 'X', type: 'stock' },
    ]);
    const quiet = server({ '/config': () => ({ supports_search: false }) });
    expect(await udfFeed({ url: 'https://data.example.com/udf', fetch: quiet.fetch }).searchSymbols!('msft')).toEqual([]);
  });

  it('polls /history for live bars and /quotes for quotes, and stops', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    let close = 5;
    const { fetch, asked } = server({
      '/history': () => ({ s: 'ok', t: [60, 120], c: [4, close] }),
      '/quotes': (p) => ({ s: 'ok', d: p.get('symbols')!.split(',').map((n) => ({ s: 'ok', n, v: { lp: close } })) }),
    });
    const feed = udfFeed({ url: 'https://data.example.com/udf', fetch, updateFrequency: 1000 });
    const sub = subscriber();
    const stop = feed.subscribeBars({ symbol: 'AAPL', timeframe: '1m' }, sub);
    await vi.waitFor(() => expect(asked.some((a) => a.startsWith('/udf/symbols'))).toBe(true));
    await flush();

    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(sub.bar).toHaveBeenCalledTimes(3));
    expect(sub.bar.mock.calls.map(([b, closed]) => [b.time, b.close, closed])).toEqual([
      [60_000, 4, false],
      [60_000, 4, true],
      [120_000, 5, false],
    ]);

    close = 6;
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(sub.bar).toHaveBeenLastCalledWith(expect.objectContaining({ time: 120_000, close: 6 }), false));

    stop();
    const count = asked.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(asked.length).toBe(count);

    const onQuotes = vi.fn();
    const stopQuotes = feed.subscribeQuotes!(['AAPL'], onQuotes);
    await vi.waitFor(() => expect(onQuotes).toHaveBeenCalledWith([{ symbol: 'AAPL', last: 6 }]));
    stopQuotes();
  });
});
