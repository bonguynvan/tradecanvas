<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>实时数据与回放 — TradeCanvas 文档</title>
  <meta name="description" content="流式数据适配器、tick 聚合、断线重连逻辑，以及用于历史数据回放的全新 ReplayController。" />
</svelte:head>

<h1>实时数据与回放</h1>
<p>接入实时数据流，把 tick 聚合成K线，并以可控的速度回放历史数据。</p>

<h2>内置适配器</h2>
<p>全部免费，无需 API key——连接方式完全相同：</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })`}</code></pre>

<h2>DataAdapter 接口</h2>
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

<h2>约 20 行代码接入任意数据源</h2>
<p>
  继承 <code>WebSocketAdapter</code>（实时数据 + REST 历史数据）或 <code>PollingAdapter</code>
  （仅 REST 的数据源）。基类负责连接生命周期、断线重连、解码和事件派发——
  你只需提供一个 URL 和一个解析函数。
</p>
<pre><code>{`import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => 'wss://api.myexchange.com/ws/' + c.symbol + '@kline_' + c.timeframe,
  fetchHistory: (symbol, tf, limit) => fetch('/candles?...').then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})`}</code></pre>

<h2>Tick 聚合</h2>
<p>按周期把原始 tick 汇总成 OHLC K线：</p>
<pre><code>{`import { TickAggregator } from '@tradecanvas/chart'

const agg = new TickAggregator('1m')
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar
const closed = agg.flushClosedBars()        // bars that have rolled over`}</code></pre>

<h2>断线重连</h2>
<p><code>ReconnectManager</code> 负责带上限的指数退避，并在最终失败时放弃重连。</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>回放模式</h2>
<p>
  以可控的速度向前推进一段历史 <code>DataSeries</code>。
  它与 <code>Chart</code> 解耦，因此既能驱动界面上的回放，也能用于无界面的回测。
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
  在组件的回放模式中，<strong>点击任意已显示的K线，回放光标即跳到该处</strong>。
  更一般地，图表现在会在普通的左键单击（按下并松开、中间没有拖动）时发出
  <code>click</code> 和 <code>barClick</code> 事件：
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>在图表上按更细的步长回放</h3>
<p>
  <code>chart.replayStart()</code> 回放图表自身的序列。把更小周期的K线作为 <code>steps</code>
  传入（例如小时图下的 5 分钟K线），每一步都会用它们让正在形成的K线逐渐长成，
  就像它当初在市场中形成时那样；已收盘的K线则按序列中的原样显示。
  <code>startIndex</code> 和 <code>replaySeekToBar</code> 按图表的K线计数。
  在 ChartWidget 中，回放栏的<strong>步长</strong>菜单会列出数据源提供的更小周期
  （或由你加载的K线能够合成的周期）。
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

<h3>在回放中模拟交易</h3>
<p>
  带有 <code>setMarkPrice(price, time)</code> 的执行适配器（如
  <code>PaperExecutionAdapter</code>）可以在回放中交易：回放期间，图表会把每个回放出的价格和时间交给它，
  因此订单和止损会在回放经过时成交，成交也会落在回放的K线上。每一步的最低价和最高价都会计入，
  向前跳转会经过途中的每一步。它只会向前推进：向后跳转后，它会等到回放越过它见过的最远位置。
  这期间实时价格不会影响它；回放结束后，它会回到实时价格，成交时间也回到实际时钟。
  价格提醒在整个过程中始终监控实时行情；基于指标线的提醒则会等到回放结束。
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>方法</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>从当前索引开始推送。</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>暂停 / 继续计时器。</td></tr>
    <tr><td><code>step(n)</code></td><td>不经过计时器，同步推送 N 根K线。</td></tr>
    <tr><td><code>seek(index)</code></td><td>直接跳转，不推送中间的K线。</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>每秒推送的K线数（最小为 0.01）。</td></tr>
    <tr><td><code>destroy()</code></td><td>清除计时器和监听器。</td></tr>
  </tbody>
</table>

<p>如何将回放与回测器配合使用，请参见 <a href={href('/docs/analytics')}>分析</a>。</p>
