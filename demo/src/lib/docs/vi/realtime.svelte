<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Thời gian thực &amp; phát lại — Tài liệu TradeCanvas</title>
  <meta name="description" content="Adapter dữ liệu stream, gộp tick, cơ chế kết nối lại và ReplayController mới để phát lại dữ liệu lịch sử." />
</svelte:head>

<h1>Thời gian thực &amp; phát lại</h1>
<p>Stream dữ liệu trực tiếp, gộp tick thành nến và phát lại dữ liệu lịch sử với tốc độ điều chỉnh được.</p>

<h2>Adapter có sẵn</h2>
<p>Tất cả đều miễn phí, không cần API key — kết nối adapter nào cũng theo cùng một cách:</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })`}</code></pre>

<h2>Interface DataAdapter</h2>
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

<h2>Nguồn dữ liệu bất kỳ trong ~20 dòng</h2>
<p>
  Kế thừa <code>WebSocketAdapter</code> (dữ liệu trực tiếp + lịch sử qua REST) hoặc <code>PollingAdapter</code>
  (nguồn chỉ có REST). Lớp cơ sở lo vòng đời kết nối, kết nối lại, giải mã và
  phát sự kiện — bạn chỉ cần cung cấp một URL và một hàm phân tích dữ liệu.
</p>
<pre><code>{`import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => 'wss://api.myexchange.com/ws/' + c.symbol + '@kline_' + c.timeframe,
  fetchHistory: (symbol, tf, limit) => fetch('/candles?...').then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})`}</code></pre>

<h2>Gộp tick</h2>
<p>Gộp tick thô thành nến OHLC theo từng khung thời gian:</p>
<pre><code>{`import { TickAggregator } from '@tradecanvas/chart'

const agg = new TickAggregator('1m')
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar
const closed = agg.flushClosedBars()        // bars that have rolled over`}</code></pre>

<h2>Kết nối lại</h2>
<p><code>ReconnectManager</code> giãn cách các lần thử lại theo cấp số nhân (exponential backoff), có mức trần và dừng hẳn sau lần thử cuối.</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>Chế độ phát lại</h2>
<p>
  Đẩy một <code>DataSeries</code> lịch sử tiến lên với tốc độ điều chỉnh được.
  Tách rời khỏi <code>Chart</code> nên có thể dùng cho cả phát lại trên giao diện lẫn backtest
  headless.
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
  Trong chế độ phát lại của widget, <strong>bấm vào bất kỳ nến nào đã hiện để đưa con trỏ phát lại
  tới đó</strong>. Rộng hơn, biểu đồ giờ phát ra các sự kiện <code>click</code>
  và <code>barClick</code> cho những cú bấm chuột trái thông thường (nhấn và nhả
  mà không kéo):
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>Phát lại trên biểu đồ, theo bước nhỏ hơn</h3>
<p>
  <code>chart.replayStart()</code> phát lại chính chuỗi dữ liệu của biểu đồ. Truyền các nến nhỏ hơn
  vào <code>steps</code> (nến 5 phút dưới một biểu đồ khung giờ) và mỗi bước sẽ làm nến đang hình thành
  lớn dần từ chúng, đúng như nó đã hình thành trên thị trường; các nến đã đóng hiện đúng như trong
  chuỗi. <code>startIndex</code> và <code>replaySeekToBar</code> đếm theo nến của biểu đồ.
  Trong ChartWidget, menu <strong>Bước</strong> trên thanh phát lại đưa ra các khung thời gian nhỏ hơn
  mà nguồn dữ liệu có (hoặc dựng được từ các nến bạn đã nạp).
</p>
<pre><code>{`const steps = await adapter.fetchHistory('BTCUSDT', '5m', 2000)
chart.replayStart({ steps, startIndex: 120, paused: true, speed: 5 })
chart.replayResume()
chart.getReplayBarIndex()      // the chart bar forming now
chart.replaySeekToBar(150)     // to the end of bar 150
chart.replayStop()             // back to the live series`}</code></pre>

<h3>Giao dịch giấy trong lúc phát lại</h3>
<p>
  Một adapter khớp lệnh có <code>setMarkPrice(price, time)</code> (như
  <code>PaperExecutionAdapter</code>) sẽ giao dịch trên phiên phát lại: trong lúc phát lại, biểu đồ
  chuyển cho nó từng mức giá và thời điểm được phát lại, nên lệnh và mức dừng lỗ khớp khi phát lại
  đi qua chúng, và các lần khớp nằm trên các nến được phát lại. Giá thấp và giá cao của mỗi bước đều
  được tính, và một lần nhảy tới trước sẽ đi qua mọi bước trên đường. Nó chỉ đi tới: sau khi tua lùi,
  nó chờ đến khi phát lại vượt qua điểm xa nhất nó đã thấy. Trong lúc đó giá trực tiếp không làm nó
  thay đổi; khi phát lại kết thúc, nó quay về giá trực tiếp, và các lần khớp quay về theo giờ thực.
  Cảnh báo giá vẫn theo dõi thị trường trực tiếp trong suốt thời gian đó; cảnh báo theo đường chỉ báo
  chờ đến khi phát lại kết thúc.
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>Bắt đầu phát từ vị trí hiện tại.</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>Tạm dừng/tiếp tục bộ hẹn giờ.</td></tr>
    <tr><td><code>step(n)</code></td><td>Phát N nến một cách đồng bộ, không qua bộ hẹn giờ.</td></tr>
    <tr><td><code>seek(index)</code></td><td>Nhảy tới vị trí mới mà không phát các nến ở giữa.</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>Số nến mỗi giây (giới hạn ở mức &gt;= 0.01).</td></tr>
    <tr><td><code>destroy()</code></td><td>Xoá bộ hẹn giờ + các listener.</td></tr>
  </tbody>
</table>

<p>Xem <a href={href('/docs/analytics')}>Phân tích</a> để dùng phát lại cùng bộ backtest.</p>
