<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Realtime &amp; replay — TradeCanvas docs</title>
  <meta name="description" content="Streaming data adapters, tick aggregation, reconnect logic, and the new ReplayController for historical playback." />
</svelte:head>

<h1>Realtime &amp; replay</h1>
<p>Stream live data, aggregate ticks into bars, and replay historical data at controlled speed.</p>

<h2>Built-in adapters</h2>
<p>All free, no API key — connect any of them the same way:</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })`}</code></pre>

<h2>DataAdapter interface</h2>
<pre><code>{`interface DataAdapter {
  name: string
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'tick' | 'snapshot' | 'connectionChange' | 'error'
  off(event, listener): void
  dispose(): void

  // Optional
  fetchHistoryBefore?(symbol, timeframe, before, limit): Promise<OHLCBar[]>
  searchSymbols?(query, options?): Promise<SymbolInfo[]>
  resolveSymbol?(symbol): Promise<SymbolInfo | null>
  subscribeQuotes?(symbols, onQuotes): () => void      // a watchlist's rows
  fetchNews?(symbol, limit?): Promise<NewsItem[]>       // the symbol info panel
  fetchTrades?(symbol, limit?): Promise<Trade[]>        // tick charts, with
  subscribeTrades?(symbol, onTrades): () => void        // subscribeTrades
}`}</code></pre>

<h2>Any feed in ~20 lines</h2>
<p>
  Extend <code>WebSocketAdapter</code> (live + REST history) or <code>PollingAdapter</code>
  (REST-only feeds). The base handles the connection lifecycle, reconnect, decoding, and
  event emission — you supply a URL and a parse function.
</p>
<pre><code>{`import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => 'wss://api.myexchange.com/ws/' + c.symbol + '@kline_' + c.timeframe,
  fetchHistory: (symbol, tf, limit) => fetch('/candles?...').then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})`}</code></pre>

<h2>Tick aggregation</h2>
<p>Roll raw ticks into OHLC bars per timeframe:</p>
<pre><code>{`import { TickAggregator } from '@tradecanvas/chart'

const agg = new TickAggregator('1m')
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar
const closed = agg.flushClosedBars()        // bars that have rolled over`}</code></pre>

<h2>Quotes for many symbols</h2>
<p>
  A feed with <code>subscribeQuotes</code> sends quotes (last price, the day's change, high, low,
  volume, bid and ask) for many symbols at once until you stop it. <code>BinanceAdapter</code> sends
  a 24 h snapshot, then its mini-ticker stream; <code>MockAdapter</code> makes quotes up. A widget's
  watchlist fills its rows from it.
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>Tick charts</h2>
<p>
  A tick timeframe — <code>'100T'</code> — draws a bar per 100 trades. It is built from a feed's
  trades: its recent ones for the history (<code>fetchTrades</code>), then its live ones
  (<code>subscribeTrades</code>). <code>BinanceAdapter</code> streams aggregate trades. A tick chart
  has no countdown and pages in no older history; a feed without trades refuses tick timeframes.
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2>Market status and news</h2>
<p>
  <code>marketStatus(info, now)</code> tells whether a symbol's market is open at a moment, from its
  hours in its exchange's zone (clock changes included), and when that changes. Sessions can name the
  weekdays they open on. A feed's <code>fetchNews</code> gives headlines for the widget's symbol info
  panel; <code>readNews</code> keeps only items with a title and a time, and links to web pages.
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timezone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

<h2>Reconnect</h2>
<p><code>ReconnectManager</code> handles exponential backoff with a cap and a final give-up.</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>Replay mode</h2>
<p>
  Drive a historical <code>DataSeries</code> forward at controlled speed.
  Decoupled from <code>Chart</code> so it can power both UI replay and headless
  backtests.
</p>

<pre><code>{`import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,      // bars per second
  startIndex: 0,
})

// Seed the chart with everything before startIndex
chart.setData(replay.getPrefix())

// Wire each emitted bar into the chart
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
`}</code></pre>

<p>
  In the widget's replay mode, <strong>click any revealed bar to jump the replay
  cursor there</strong>. More generally, the chart now emits <code>click</code>
  and <code>barClick</code> events for plain left-clicks (press and release
  without dragging):
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>Replay on the chart, in finer steps</h3>
<p>
  <code>chart.replayStart()</code> replays the chart's own series. Give it finer bars as
  <code>steps</code> (5-minute bars under an hourly chart) and each step grows the
  forming bar from them, as it grew in the market; closed bars show as they are in the
  series. <code>startIndex</code> and <code>replaySeekToBar</code> count the chart's bars.
  In ChartWidget, the replay bar's <strong>Step</strong> menu offers the finer intervals the
  feed has (or that the bars you loaded can build).
</p>
<pre><code>{`const steps = await adapter.fetchHistory('BTCUSDT', '5m', 2000)
chart.replayStart({ steps, startIndex: 120, paused: true, speed: 5 })
chart.replayResume()
chart.getReplayBarIndex()      // the chart bar forming now
chart.replaySeekToBar(150)     // to the end of bar 150
chart.replaySeekToTime(t)      // to the bars that opened before t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>Paper trading in a replay</h3>
<p>
  An execution adapter with <code>setMarkPrice(price, time)</code> (as
  <code>PaperExecutionAdapter</code> has) trades on the replay: during a replay the chart
  hands it each replayed price and time, so orders and stops fill as the replay passes
  them and fills land on the replayed bars. Each step's low and high count, and a jump
  ahead passes every step on the way. It only goes forward: after a seek back it waits
  until the replay is past the furthest point it has seen. The live price doesn't move
  it meanwhile; when the replay ends it goes back to the live price, and fills to the
  clock. Price alerts keep watching the live market throughout; alerts on indicator
  lines wait for the replay to end.
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>Method</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>Begin emitting from current index.</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>Pause/continue timer.</td></tr>
    <tr><td><code>step(n)</code></td><td>Emit N bars synchronously without the timer.</td></tr>
    <tr><td><code>seek(index)</code></td><td>Jump without emitting in-between bars.</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>Bars per second (clamped to &gt;= 0.01).</td></tr>
    <tr><td><code>destroy()</code></td><td>Clear timer + listeners.</td></tr>
  </tbody>
</table>

<p>See <a href={href('/docs/analytics')}>Analytics</a> for using replay alongside the backtester.</p>
