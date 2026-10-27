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
  supportedTimeframes?: TimeFrame[]   // left out: it serves every timeframe
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'tick' | 'connectionChange' | 'error' | 'symbolInfo'
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
<p>
  <code>searchSymbols</code> and <code>resolveSymbol</code> answer with <code>SymbolInfo</code>: the
  <code>symbol</code>, and what the feed knows of the rest: a readable name (<code>description</code>), the
  <code>exchange</code>, the <code>type</code> in the feed's own words (<code>'stock'</code>, <code>'futures'</code>,
  <code>'Cổ phiếu'</code>…), a <code>logo</code> the widget's symbol search shows, the <code>pricePrecision</code>,
  <code>minTick</code>, <code>currency</code>, <code>timeZone</code> and <code>sessions</code>.
</p>

<h2 id="built-timeframes">Timeframes the feed lacks</h2>
<p>
  A feed that lists its <code>supportedTimeframes</code> gets every other timeframe built from the
  coarsest of them that divides it: 7m from 1m, 4h and 1D from 1h. Days, weeks, months and the hour
  frames that divide a day (2h, 3h, 4h, 6h, 8h, 12h) start at the midnight of the symbol's exchange,
  in the <code>timeZone</code> its <code>resolveSymbol</code> names. The chart asks once per symbol,
  as the first history of such a timeframe is fetched, builds that history once the answer comes, and
  keeps the zone; 1h and shorter frames don't wait for it. A zone whose days need a finer timeframe
  than UTC's (Ho Chi Minh City's on a feed of 4h bars) has that history fetched again at it. A feed without <code>resolveSymbol</code>, one that names no zone or UTC, or one whose
  timeframes can't line up with that midnight (only 4h bars for a zone 7 hours from UTC) gets UTC
  days, as before. So does one that fails to answer or takes more than 5 seconds, and the symbol's days then
  stay UTC's until the chart loads the symbol afresh (connects to it, or comes to it from another symbol or timeframe), so older pages and the history after a reconnect never hold a day twice; a fresh load builds them in the zone the feed has named since, or asks it again. The
  market's zone (<code>setMarket</code>) doesn't move these bars. Daily bars stamped at 00:00 UTC are read as the dates they name. A zone the feed
  sends later in a <code>symbolInfo</code> event changes the times shown, not where built days start.
</p>

<h2 id="symbol-info">Symbol details the feed learns later</h2>
<p>
  A connected chart asks <code>resolveSymbol</code> once. A feed that learns the symbol's details only later (on its first message, say) sends them with a <code>symbolInfo</code> event, and the chart applies them: the symbol's decimals (<code>pricePrecision</code>) on the price scale, the legend and the tags, and on the drawings' labels, the day's price limits, pivot labels, the measure and the market profile too; in the widget, on the data window, the alerts list, the order ticket and the account panel; the scale's ticks on its price step (<code>minTick</code>); the exchange's hours. A market's decimals (<code>setMarket</code>) go to the same places and come before the symbol's. Without either, a drawing's label keeps the decimals of its price's size, grouped in the number locale as the axis is.
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // as your adapter sends its other events`}</code></pre>

<h2 id="corrections">A bar the feed corrects</h2>
<p>
  A feed corrects a bar by sending it again, closed, with its own time: <code>{'{'} bar, closed: true {'}'}</code> from <code>parseMessage</code>, or a <code>bar</code> event. A closed bar older than the newest the stream has seen is the feed's last word on it, a venue's final that came after the next bar's first frame or a revision: the chart replaces the bar with that time wherever it is (<code>updateBar</code>), computes its indicators again from it, and keeps the view. It is no live price: the price line, the orders and the alerts stay with the market. A forming frame older than the newest is stale and left out; it moves nothing. The built-in adapters (<code>WebSocketAdapter</code>, <code>PollingAdapter</code>, the feeds built on them and <code>BinanceAdapter</code>) make a tick from a bar's close only for the newest bar, counting the last bar of the history they served, so a last closed bar a feed sends again on subscribing makes none; an adapter of your own that makes ticks from its bars should leave older ones out too. Without an adapter, call <code>chart.updateBar(bar)</code>.
</p>
<p>
  With <code>aggregateTicks</code> the history's last bar is the one the trades build on: the first trade after connecting keeps its open, high, low and volume. A trade for a bar already past, delivered late, is left out, and a closed bar for one corrects it, the forming bar keeping its trades. A trade from after the newest bar starts goes in that bar even when the buckets would start it earlier (daily bars stamped at another hour than midnight, or a symbol whose zone comes after the first trade), so the price follows every trade. On a timeframe built from a finer one, a corrected base bar builds its bar again, for the last two built bars before the forming one; a correction further back is left out.
</p>
<pre><code>{`// in an adapter: the venue's final for a bar already on the chart
parseMessage: (raw) => ({ bar: toBar(raw), closed: true })

// your own bars, without an adapter
const corrected = chart.updateBar(bar)   // false: no loaded bar has bar.time`}</code></pre>

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

const agg = new TickAggregator('1d')
agg.setTimeZone('Asia/Ho_Chi_Minh')         // days start at the exchange's midnight
agg.seed(history.at(-1).time)               // a bar older than the history's last is past
agg.on('barClose', (bar) => console.log(bar))   // a bar whose interval is over
agg.on('correction', (bar) => console.log(bar)) // a closed bar older than the newest
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar`}</code></pre>
<p>Weeks start on Monday and months on the 1st. With <code>setTimeZone</code>, days, weeks, months and the hour frames that divide a day start at the exchange's midnight; a chart sets it for its stream's ticks (<code>aggregateTicks</code>) from the symbol's zone, else its market's, and lands their bars on the history's: days are stamped at 00:00 UTC when the history's are, and 2h to 12h bars start at the exchange's midnight only when the history's do, so a feed's own 4h bars (00:00, 04:00… UTC) keep their times. On a timeframe built from a shorter one of the feed's, they start where the built bars start. Built from hours, they start at the midnight of the zone its <code>resolveSymbol</code> named, else UTC's, whatever zone the chart has; built from the feed's days stamped at 00:00 UTC, weeks and months keep its dates, and a trade is dated in the zone it named, else the chart's, as on the feed's own days.</p>
<p>A bar older than the newest one seen is past: <code>processBar</code> sends a closed one as <code>correction</code> and leaves out a forming one, and <code>processTick</code> leaves out a trade for one, so a late frame or trade can neither close the forming bar early nor move the price. <code>seed(time)</code> starts from a history's last bar and doesn't move back (unless the trades built the newer bar on buckets they no longer start on, the exchange's zone having come after them: that bar is let go, or the next trades would be left out until the next bucket), and <code>resume(bar)</code> makes that bar, still forming, the one the next trades build on, unless the trades have reached a newer one; a chart's stream does both on every connect, so a reconnect whose history ends on the bar before keeps the forming bar's trades. <code>StreamManager</code> then puts the forming bar, built from trades or from a feed's frames, on top of the history it sends as <code>snapshot</code>, and sends no <code>priceChange</code> for the history's last close, an older price. It sends a correction as <code>barCorrection</code>.</p>

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
  Tick bars are not evenly spaced in time, so the time axis and the crosshair give times only to
  bars, not to the empty space beside them.
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
  timeZone: 'America/New_York',
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
chart.replaySeekToTime(t)      // to the bars that closed by t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until, total, cause }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>A replay outlives the bars</h3>
<p>
  A replay is a time over the live series. When the bars change — a new symbol or
  timeframe through <code>connect</code> or <code>switchStream</code>, <code>setData</code>,
  older bars paged in, the extended hours, a corrected bar — it goes on over the new bars at
  the time it had reached, and shows only bars that closed by then. While a new series
  loads, the replay waits, playing or paused as it was. Indices (<code>barIndex</code>,
  <code>total</code>, <code>replaySeekToBar</code>) are of the bars replayed now and change
  with them; keep a position by time. A replay a paper account trades ends when the symbol
  changes. In ChartWidget the replay bar stays open, says <em>Loading chart</em> and waits
  while the bars load, then follows their total and the new interval's steps.
</p>
<pre><code>{`chart.replayStart({ startIndex: 300, paused: true })
await chart.setTimeframe('1h')        // the replay waits, then goes on at the same time
const { until } = chart.getReplayProgress()   // keep a position by time, not by index
chart.replaySeekToTime(until)         // back to it, on any interval
chart.on('replayStep', (e) => {
  if (e.payload.cause === 'series') {}  // carried over: barIndex and total are the new bars'
})
chart.replayStop()                    // call it first to end the replay as before`}</code></pre>

<h3>A replay in your own app</h3>
<p>
  Buy and sell marks and trade zones show as the replay reaches them: a mark once its bar is shown, a trade once entered, drawn open until its exit is reached (<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code> shows them all). <code>startTime</code> starts at a time instead of a bar; <code>hideHistory</code> leaves the bars before the start out until the replay stops; <code>duration</code> plays to the end in about that long however many bars there are, several bars a frame, and a late frame slows it rather than skip ahead.
</p>
<pre><code>{`chart.setSignalMarkers(signals)          // the whole backtest, kept
chart.setTradeZones(trades)
chart.replayStart({
  startTime: Date.now() - 30 * 86_400_000,   // the last 30 days
  hideHistory: true,                          // only them on the chart
  duration: 3500,                             // in about 3.5 s
})
chart.on('replayComplete', () => chart.replayStop())   // then the whole series again
chart.replayStart({ startIndex: 100, revealMarks: false })   // every mark from the start`}</code></pre>

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
