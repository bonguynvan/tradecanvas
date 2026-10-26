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

<h2 id="built-timeframes">Khung thời gian nguồn dữ liệu không có</h2>
<p>
  Nguồn dữ liệu khai báo <code>supportedTimeframes</code> được dựng mọi khung khác từ khung thô nhất
  trong số đó chia hết khung cần dựng: 7m từ 1m, 4h và 1D từ 1h. Ngày, tuần, tháng và các khung giờ
  chia hết một ngày (2h, 3h, 4h, 6h, 8h, 12h) bắt đầu lúc nửa đêm của sàn giao dịch, theo
  <code>timeZone</code> mà <code>resolveSymbol</code> trả về. Biểu đồ hỏi một lần cho mỗi mã, trước
  lần tải lịch sử đầu tiên của khung như vậy, rồi giữ múi giờ đó; khung 1h trở xuống không chờ. Nguồn
  dữ liệu không có <code>resolveSymbol</code>, không nêu múi giờ hoặc nêu UTC, hay có các khung không
  khớp được với nửa đêm đó (chỉ có nến 4h cho múi giờ lệch UTC 7 tiếng) thì dùng ngày theo UTC như
  trước. Nguồn dữ liệu trả lời lỗi hoặc chậm quá 5 giây cũng vậy, và từ đó ngày của mã giữ theo
  UTC cho tới khi biểu đồ tải lại mã từ đầu (kết nối tới nó, hoặc chuyển sang nó từ mã hay khung thời gian khác), nên các trang cũ hơn và lịch sử sau khi kết nối lại không bao giờ có một ngày hai lần; lần tải mới dựng ngày theo múi giờ mà nguồn dữ liệu đã nêu từ đó, hoặc hỏi lại nguồn. Múi giờ
  của thị trường (<code>setMarket</code>) không dời những nến này. Nến ngày đóng dấu 00:00 UTC được đọc là đúng ngày chúng ghi. Múi giờ mà nguồn dữ liệu gửi sau
  qua sự kiện <code>symbolInfo</code> đổi giờ hiển thị, không đổi lúc bắt đầu của những ngày đã dựng.
</p>

<h2 id="symbol-info">Thông tin mã mà nguồn dữ liệu biết sau</h2>
<p>
  Chart đã kết nối hỏi <code>resolveSymbol</code> một lần. Nguồn dữ liệu nào chỉ biết thông tin của mã về sau (chẳng hạn ở tin nhắn đầu tiên) thì gửi nó bằng sự kiện <code>symbolInfo</code>, và chart áp dụng ngay: số lẻ của mã (<code>pricePrecision</code>) trên trục giá, legend và nhãn giá, và cả trên nhãn của các hình vẽ, giá trần, sàn và tham chiếu trong ngày, nhãn đỉnh đáy, công cụ đo và market profile; trong widget, trên cửa sổ dữ liệu, danh sách cảnh báo, phiếu đặt lệnh và bảng tài khoản; vạch chia trục theo bước giá (<code>minTick</code>); giờ giao dịch của sàn. Số lẻ của thị trường (<code>setMarket</code>) đi tới đúng những chỗ đó và được ưu tiên hơn số lẻ của mã. Khi không có cả hai, nhãn của hình vẽ giữ số lẻ theo độ lớn của giá, nhóm hàng nghìn theo locale số như trục giá.
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // như cách adapter gửi các sự kiện khác`}</code></pre>

<h2 id="corrections">Nến mà nguồn dữ liệu sửa lại</h2>
<p>
  Nguồn dữ liệu sửa một nến bằng cách gửi lại nó, đã đóng, với đúng thời gian của nó: <code>{'{'} bar, closed: true {'}'}</code> từ <code>parseMessage</code>, hoặc một sự kiện <code>bar</code>. Một nến đã đóng cũ hơn nến mới nhất mà luồng dữ liệu đã thấy là lời cuối của nguồn về nến đó, chẳng hạn giá chốt của sàn đến sau khung đầu tiên của nến kế tiếp, hoặc một lần điều chỉnh: biểu đồ thay nến có thời gian đó dù nằm ở đâu (<code>updateBar</code>), tính lại chỉ báo từ nến đó và giữ nguyên khung nhìn. Đây không phải giá hiện tại: đường giá, lệnh và cảnh báo vẫn đi theo thị trường. Một khung đang hình thành cũ hơn nến mới nhất là dữ liệu cũ và bị bỏ qua; nó không làm thay đổi gì. Các adapter có sẵn (<code>WebSocketAdapter</code>, <code>PollingAdapter</code>, các nguồn dựng trên chúng và <code>BinanceAdapter</code>) chỉ tạo tick từ giá đóng cửa của nến mới nhất; adapter của riêng bạn nếu tạo tick từ các nến cũng nên bỏ qua nến cũ hơn. Không có adapter thì gọi <code>chart.updateBar(bar)</code>.
</p>
<p>
  Với <code>aggregateTicks</code>, nến cuối của lịch sử là nến mà các giao dịch tiếp tục dựng: giao dịch đầu tiên sau khi kết nối giữ nguyên giá mở cửa, cao, thấp và khối lượng của nó. Một giao dịch thuộc về nến đã qua mà đến muộn bị bỏ qua, còn một nến đã đóng của nến đó thì sửa nó, nến đang hình thành vẫn giữ các giao dịch của mình. Với khung thời gian dựng từ một khung nhỏ hơn, nến gốc được sửa sẽ dựng lại nến của nó, cho hai nến đã dựng gần nhất trước nến đang hình thành; lần sửa xa hơn bị bỏ qua.
</p>
<pre><code>{`// trong adapter: giá chốt của sàn cho một nến đã có trên biểu đồ
parseMessage: (raw) => ({ bar: toBar(raw), closed: true })

// nến của riêng bạn, không có adapter
const corrected = chart.updateBar(bar)   // false: không có nến đã nạp nào có bar.time`}</code></pre>

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

const agg = new TickAggregator('1d')
agg.setTimeZone('Asia/Ho_Chi_Minh')         // days start at the exchange's midnight
agg.seed(history.at(-1).time)               // a bar older than the history's last is past
agg.on('barClose', (bar) => console.log(bar))   // a bar whose interval is over
agg.on('correction', (bar) => console.log(bar)) // a closed bar older than the newest
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar`}</code></pre>
<p>Tuần bắt đầu từ thứ Hai và tháng từ ngày 1. Với <code>setTimeZone</code>, ngày, tuần, tháng và các khung giờ chia hết một ngày bắt đầu lúc nửa đêm của sàn; biểu đồ tự đặt nó cho tick của luồng dữ liệu (<code>aggregateTicks</code>) theo múi giờ của mã, nếu không có thì của thị trường, và cho nến dựng từ tick khớp với nến lịch sử: ngày được đóng dấu lúc 00:00 UTC khi lịch sử cũng đóng dấu như vậy, còn nến 2h đến 12h chỉ bắt đầu lúc nửa đêm của sàn khi nến lịch sử bắt đầu ở đó, nên nến 4h của chính nguồn dữ liệu (00:00, 04:00… UTC) giữ nguyên thời điểm. Với khung thời gian dựng từ một khung nhỏ hơn của nguồn dữ liệu, chúng bắt đầu ở nơi nến đã dựng bắt đầu: lúc nửa đêm của múi giờ mà <code>resolveSymbol</code> của nguồn nêu, nếu không có thì của UTC, dù biểu đồ đang dùng múi giờ nào.</p>
<p>Nến cũ hơn nến mới nhất đã thấy là nến đã qua: <code>processBar</code> gửi nến đã đóng dưới dạng <code>correction</code> và bỏ qua khung đang hình thành, còn <code>processTick</code> bỏ qua giao dịch thuộc về nến đó, nên một khung hay giao dịch đến muộn không thể đóng sớm nến đang hình thành hay làm giá thay đổi. <code>seed(time)</code> bắt đầu từ nến cuối của lịch sử và không bao giờ lùi lại, còn <code>resume(bar)</code> biến nến đó, vẫn đang hình thành, thành nến mà các giao dịch tiếp theo dựng tiếp, trừ khi giao dịch đã sang một nến mới hơn; luồng dữ liệu của biểu đồ làm cả hai mỗi lần kết nối, nên khi kết nối lại mà lịch sử chỉ đến nến trước đó thì các giao dịch của nến đang hình thành vẫn được giữ. <code>StreamManager</code> gửi một lần sửa dưới dạng <code>barCorrection</code>.</p>

<h2>Giá của nhiều mã</h2>
<p>
  Nguồn dữ liệu có <code>subscribeQuotes</code> gửi giá (giá cuối, thay đổi trong ngày, cao nhất, thấp nhất,
  khối lượng, giá mua và giá bán) của nhiều mã cùng lúc cho đến khi bạn dừng. <code>BinanceAdapter</code> gửi
  một ảnh chụp 24 giờ, rồi đến luồng mini-ticker; <code>MockAdapter</code> tự tạo giá giả. Danh mục theo dõi
  của widget lấy giá cho các dòng từ đây.
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>Biểu đồ tick</h2>
<p>
  Khung thời gian tick — <code>'100T'</code> — vẽ mỗi nến từ 100 giao dịch. Nó được dựng từ các giao dịch
  của nguồn dữ liệu: các giao dịch gần đây cho phần lịch sử (<code>fetchTrades</code>), rồi các giao dịch trực tiếp
  (<code>subscribeTrades</code>). <code>BinanceAdapter</code> stream các giao dịch gộp (aggregate trades). Biểu đồ tick
  không có đồng hồ đếm ngược và không tải thêm lịch sử cũ hơn; nguồn không có giao dịch sẽ từ chối khung thời gian tick.
  Nến tick không cách đều nhau theo thời gian, nên trục thời gian và crosshair chỉ ghi giờ cho các nến, không ghi
  vào khoảng trống bên cạnh.
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2>Trạng thái thị trường và tin tức</h2>
<p>
  <code>marketStatus(info, now)</code> cho biết thị trường của một mã có mở tại một thời điểm hay không, dựa trên
  giờ giao dịch theo múi giờ của sàn (tính cả lúc đổi giờ), và khi nào điều đó thay đổi. Mỗi phiên có thể ghi rõ
  những ngày trong tuần mà nó mở. <code>fetchNews</code> của nguồn dữ liệu cung cấp tiêu đề tin cho bảng thông tin mã
  của widget; <code>readNews</code> chỉ giữ các tin có tiêu đề và thời gian, và chỉ giữ liên kết tới trang web.
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timeZone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

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
chart.replaySeekToTime(t)      // to the bars that opened before t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until, total }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>Phát lại trong ứng dụng của bạn</h3>
<p>
  Điểm mua, bán và vùng lệnh hiện ra khi phần phát lại chạy tới: một điểm hiện khi nến của nó hiện, một lệnh hiện khi đã vào và được vẽ mở cho tới khi tới lúc thoát (<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code> hiện tất cả). <code>startTime</code> bắt đầu từ một thời điểm thay vì một nến; <code>hideHistory</code> bỏ các nến trước điểm bắt đầu cho tới khi dừng phát lại; <code>duration</code> chạy tới cuối trong khoảng thời gian đó dù có bao nhiêu nến, nhiều nến mỗi khung hình, và một khung hình trễ sẽ làm chậm lại thay vì nhảy cóc.
</p>
<pre><code>{`chart.setSignalMarkers(signals)          // cả backtest, giữ nguyên
chart.setTradeZones(trades)
chart.replayStart({
  startTime: Date.now() - 30 * 86_400_000,   // 30 ngày gần nhất
  hideHistory: true,                          // chỉ chúng trên biểu đồ
  duration: 3500,                             // trong khoảng 3,5 giây
})
chart.on('replayComplete', () => chart.replayStop())   // rồi lại cả chuỗi dữ liệu
chart.replayStart({ startIndex: 100, revealMarks: false })   // mọi điểm ngay từ đầu`}</code></pre>

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
