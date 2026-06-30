<script lang="ts">
  import { base } from '$app/paths';
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

<p>See <a href="{base}/docs/analytics">Analytics</a> for using replay alongside the backtester.</p>
