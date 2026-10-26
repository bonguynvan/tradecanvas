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
  <code>searchSymbols</code> 和 <code>resolveSymbol</code> 返回 <code>SymbolInfo</code>：<code>symbol</code>，以及数据源
  知道的其他信息：可读的名称（<code>description</code>）、<code>exchange</code>、用数据源自己的说法写的
  <code>type</code>（<code>'stock'</code>、<code>'futures'</code>、<code>'Cổ phiếu'</code>…）、小部件的搜索代码里显示的
  <code>logo</code>、<code>pricePrecision</code>、<code>minTick</code>、<code>currency</code>、<code>timeZone</code> 和
  <code>sessions</code>。
</p>

<h2 id="built-timeframes">数据源没有的周期</h2>
<p>
  列出 <code>supportedTimeframes</code> 的数据源，其他周期都由其中能整除它的最粗周期构建：7m 由 1m 构建，4h 和 1D 由 1h 构建。
  日、周、月以及能整除一天的小时周期（2h、3h、4h、6h、8h、12h）从交易所的午夜开始，以 <code>resolveSymbol</code> 给出的
  <code>timeZone</code> 为准。图表对每个品种只询问一次，在这类周期第一次加载历史之前，并记住该时区；1h 及更短的周期不会等待。
  没有 <code>resolveSymbol</code>、不提供时区或提供 UTC，或者其周期无法与该午夜对齐（时区与 UTC 相差 7 小时却只有 4h K线）的数据源，
  仍按 UTC 划分日期，与以前一样。回答失败或超过 5 秒才回答的数据源也一样，此后该品种的日期保持按 UTC 划分，直到图表重新加载该品种（连接到它，或从其他品种或周期切换过来），因此更早的分页和重新连接后的历史中同一天不会出现两次；重新加载时按数据源此后给出的时区构建日期，或再次询问数据源。
  市场的时区（<code>setMarket</code>）不会移动这些K线。时间戳为 00:00 UTC 的日线被视为其标明的日期。数据源之后通过 <code>symbolInfo</code>
  事件发送的时区会改变显示的时间，但不会改变已构建的日的起点。
</p>

<h2 id="symbol-info">数据源稍后才得知的品种信息</h2>
<p>
  已连接的图表只调用一次 <code>resolveSymbol</code>。若数据源要稍后（例如收到第一条消息时）才得知品种信息，可通过 <code>symbolInfo</code> 事件发送，图表随即应用：价格轴、图例和价格标签按品种的小数位（<code>pricePrecision</code>）显示，绘图标签、当日涨跌停价与参考价、枢轴点标签、测量工具和市场轮廓也一样；组件中的数据窗口、价格提醒列表、委托单和账户面板同样如此；价格轴刻度落在最小变动价位（<code>minTick</code>）上，并采用交易所的交易时段。市场的小数位（<code>setMarket</code>）作用于同样的位置，并优先于品种的小数位。两者都没有时，绘图标签保留按价格大小决定的小数位，并像价格轴一样按数字区域设置分组。
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // 与适配器发送其他事件的方式相同`}</code></pre>

<h2 id="corrections">数据源修正的K线</h2>
<p>
  数据源修正一根K线的方式，是把它以已收盘的状态、用它自己的时间再发一次：<code>parseMessage</code> 返回 <code>{'{'} bar, closed: true {'}'}</code>，或一个 <code>bar</code> 事件。比数据流见过的最新K线更早的已收盘K线，是数据源对它的最终结论，例如在下一根K线的第一帧之后才到的交易所最终数据，或一次修订：图表替换这个时间的K线，无论其位置（<code>updateBar</code>），从它起重新计算指标，并保持视图不变。它不是实时价格：价格线、订单和警报仍跟随市场。比最新K线更早的未收盘数据帧已经过时，会被忽略，不改变任何东西。内置适配器（<code>WebSocketAdapter</code>、<code>PollingAdapter</code>、基于它们的数据源以及 <code>BinanceAdapter</code>）只用最新K线的收盘价生成 tick（它们提供的历史数据的最后一根K线也算在内，因此数据源在订阅时重发的最后一根已收盘K线不会生成 tick）；你自己的适配器若用K线生成 tick，也应忽略更早的K线。没有适配器时，调用 <code>chart.updateBar(bar)</code>。
</p>
<p>
  使用 <code>aggregateTicks</code> 时，历史数据的最后一根K线就是成交继续构建的那根：连接后的第一笔成交保留它的开盘价、最高价、最低价和成交量。迟到的、属于已过去K线的成交会被忽略，而该K线的已收盘数据会修正它，正在形成的K线保留自己的成交。在由更细周期构建的周期上，被修正的基础K线会重新构建它所属的K线，适用于正在形成的K线之前最近的两根已构建K线；更早的修正会被忽略。
</p>
<pre><code>{`// 在适配器中：交易所对图表上已有K线的最终数据
parseMessage: (raw) => ({ bar: toBar(raw), closed: true })

// 你自己的K线，不经适配器
const corrected = chart.updateBar(bar)   // false：没有已加载的K线是 bar.time`}</code></pre>

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

const agg = new TickAggregator('1d')
agg.setTimeZone('Asia/Ho_Chi_Minh')         // days start at the exchange's midnight
agg.seed(history.at(-1).time)               // a bar older than the history's last is past
agg.on('barClose', (bar) => console.log(bar))   // a bar whose interval is over
agg.on('correction', (bar) => console.log(bar)) // a closed bar older than the newest
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar`}</code></pre>
<p>周从周一开始，月从 1 日开始。使用 <code>setTimeZone</code> 后，日、周、月以及能整除一天的小时周期从交易所的午夜开始；图表会按品种的时区（没有则按市场的时区）为其数据流的 tick（<code>aggregateTicks</code>）设置它，并让由 tick 构建的K线与历史K线对齐：历史数据以 00:00 UTC 标记日期时，日线也这样标记；2h 到 12h 的K线只有在历史K线从交易所午夜开始时才从那里开始，因此数据源自己的 4h K线（00:00、04:00… UTC）保持原来的时间。在由数据源更细周期构建的周期上，它们从构建出的K线开始的地方开始。由小时K线构建时，从数据源的 <code>resolveSymbol</code> 给出的时区的午夜开始，没有则从 UTC 的午夜开始，无论图表使用哪个时区；由数据源以 00:00 UTC 标记的日线构建时，周线和月线保留数据源的日期，成交按数据源给出的时区确定日期，没有则按图表的时区，与数据源自己的日线一致。</p>
<p>比已见到的最新K线更早的K线已经过去：<code>processBar</code> 把已收盘的这类K线作为 <code>correction</code> 发出，并忽略未收盘的数据帧；<code>processTick</code> 忽略属于这类K线的成交，因此迟到的数据帧或成交既不会提前结束正在形成的K线，也不会移动价格。<code>seed(time)</code> 从历史数据的最后一根K线开始，且不会后退（除非较新的那根K线是成交按如今已不再采用的时间段构建的，比如交易所时区在成交开始后才到：这根K线会被放弃，否则后续成交在下一个时间段开始前都会被忽略）；<code>resume(bar)</code> 让这根仍在形成的K线成为后续成交继续构建的K线，除非成交已经到了更新的K线；图表的数据流在每次连接时都会做这两步，因此重连时即使历史数据只到前一根K线，正在形成的K线的成交也会保留。此时 <code>StreamManager</code> 会把正在形成的K线（无论由成交构建，还是来自数据源的数据帧）放在它作为 <code>snapshot</code> 发出的历史数据之上，并且不会为历史数据最后一根K线的收盘价这个较旧的价格发出 <code>priceChange</code>。它把修正作为 <code>barCorrection</code> 发出。</p>

<h2>多个品种的报价</h2>
<p>
  带有 <code>subscribeQuotes</code> 的数据源会同时推送多个品种的报价（最新价、当日涨跌、最高价、最低价、
  成交量、买价和卖价），直到你停止订阅。<code>BinanceAdapter</code> 先发送 24 小时快照，再接上它的 mini-ticker 流；
  <code>MockAdapter</code> 会生成模拟报价。组件的自选列表就用它来填充各行。
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>Tick 图</h2>
<p>
  Tick 周期——<code>'100T'</code>——每 100 笔成交画一根K线。它由数据源的成交构建：历史部分用最近的成交
  （<code>fetchTrades</code>），之后接入实时成交（<code>subscribeTrades</code>）。<code>BinanceAdapter</code> 推送归集成交
  （aggregate trades）。Tick 图没有倒计时，也不会向前分页加载更早的历史；不提供成交的数据源会拒绝 tick 周期。
  Tick K 线在时间上并不等距，因此时间轴和十字光标只为 K 线标注时间，不在旁边的空白处标注。
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2>市场状态与新闻</h2>
<p>
  <code>marketStatus(info, now)</code> 根据品种在其交易所时区内的交易时段（包括夏令时切换），判断某一时刻市场是否开放，
  以及何时会发生变化。交易时段可以指定一周中开放的日子。数据源的 <code>fetchNews</code> 为组件的品种信息面板提供新闻标题；
  <code>readNews</code> 只保留带标题和时间的条目，并且只保留指向网页的链接。
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timeZone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

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
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until, total }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>在你自己的应用中回放</h3>
<p>
  买卖标记和交易区域会在回放到达时出现：标记在其 K 线出现时显示，交易在入场后显示，并在到达出场前一直画成未平仓（<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code> 则全部显示）。<code>startTime</code> 按时间而不是按 K 线开始；<code>hideHistory</code> 在回放停止前不显示起点之前的 K 线；<code>duration</code> 不论 K 线多少，都在大约这段时间内播放到结尾，每帧可前进多根 K 线，迟到的帧会让回放放慢而不是跳过。
</p>
<pre><code>{`chart.setSignalMarkers(signals)          // 整个回测，全部保留
chart.setTradeZones(trades)
chart.replayStart({
  startTime: Date.now() - 30 * 86_400_000,   // 最近 30 天
  hideHistory: true,                          // 图表上只显示它们
  duration: 3500,                             // 大约 3.5 秒
})
chart.on('replayComplete', () => chart.replayStop())   // 然后恢复整个序列
chart.replayStart({ startIndex: 100, revealMarks: false })   // 从一开始就显示所有标记`}</code></pre>

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
