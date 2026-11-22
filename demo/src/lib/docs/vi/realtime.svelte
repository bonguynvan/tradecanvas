<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Thời gian thực &amp; replay — Tài liệu TradeCanvas</title>
  <meta name="description" content="Adapter dữ liệu stream, gộp tick, logic kết nối lại và ReplayController mới để replay dữ liệu lịch sử." />
</svelte:head>

<h1>Thời gian thực &amp; replay</h1>
<p>Stream dữ liệu trực tiếp, gộp tick thành nến và replay dữ liệu lịch sử với tốc độ điều chỉnh được.</p>

<h2>Adapter có sẵn</h2>
<p>Tất cả đều miễn phí, không cần API key. Mọi adapter kết nối theo cùng một cách:</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter, UpbitAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })
chart.connect({ adapter: new UpbitAdapter(),   symbol: 'KRW-BTC', timeframe: '1m' })`}</code></pre>
<p>
  <code>UpbitAdapter</code> nhận các market của Upbit (<code>KRW-BTC</code>, <code>BTC-ETH</code>):
  nến được stream tới khung 4 giờ, nến ngày lấy từ ticker, và các nến dài hơn được dựng
  từ nến ngày. REST API của Upbit trả 200 nến mỗi lần gọi và chỉ cho trình duyệt gọi một lần
  trong mười giây, nên một trang web truyền <code>restBase</code> trỏ tới proxy riêng của mình.
  Dữ liệu thuộc về Upbit, theo điều khoản Open API của Upbit. <code>MARKET_UPBIT_KRW</code> cung cấp
  bước giá và màu của thị trường KRW.
</p>

<h2 id="data-feed">Feed mà biểu đồ chủ động lấy dữ liệu</h2>
<p>
  <code>DataFeed</code> là cách ngắn hơn để nối dữ liệu của bạn vào: hai phương thức, dùng Promise.
  Biểu đồ yêu cầu nến (<code>getBars</code>) và subscribe nến trực tiếp
  (<code>subscribeBars</code>); biểu đồ tự tải trang cũ hơn, kết nối lại, dựng các khung thời gian
  mà feed không có và subscribe lại sau mỗi lần chuyển, nên feed chỉ cần trả lời. Truyền feed cho
  <code>connect</code> hoặc tuỳ chọn <code>feed</code> của widget, ở chỗ vốn dành cho adapter.
</p>
<pre><code>{`import type { DataFeed } from '@tradecanvas/chart'

const feed: DataFeed = {
  name: 'my-api',
  // The newest countBack bars, or the ones before \`before\` when the chart pages back.
  // An empty array: no more.
  getBars: ({ symbol, timeframe, countBack, before, signal }) =>
    fetch(\`/candles?s=\${symbol}&tf=\${timeframe}&n=\${countBack}&before=\${before ?? ''}\`, { signal })
      .then((r) => r.json()),
  subscribeBars: ({ symbol, timeframe }, on) => {
    const ws = new WebSocket(\`wss://example.com/\${symbol}/\${timeframe}\`)
    ws.onmessage = (m) => {
      const k = JSON.parse(m.data)
      on.bar(k.bar, k.closed)   // the forming bar again, a new one, or its final values
    }
    ws.onclose = () => on.connection('disconnected')   // the chart loads and subscribes again
    return () => ws.close()
  },
}

chart.connect({ feed, symbol: 'AAPL', timeframe: '1d' })
new ChartWidget(el, { feed, symbol: 'AAPL' })`}</code></pre>
<p>
  Subscriber còn nhận <code>tick</code> (giao dịch và quote), <code>connection</code>
  (feed không bao giờ gọi nó được coi là đã kết nối khi <code>subscribeBars</code> trả về),
  <code>symbolInfo</code> và <code>error</code>. <code>signal</code> bị abort khi biểu đồ
  không còn cần câu trả lời: khi chuyển mã hoặc ngắt kết nối. Dữ liệu một subscription gửi
  sau khi đã unsubscribe bị bỏ, nên một socket đóng muộn không thể đưa nến của mã cũ
  lên mã mới. Các phương thức tuỳ chọn là của adapter: <code>supportedTimeframes</code>,
  <code>resolveSymbol</code>, <code>searchSymbols</code>, <code>subscribeQuotes</code>,
  <code>fetchNews</code>, <code>fetchTrades</code> và <code>subscribeTrades</code>. Feed chỉ có các nến mới nhất đặt <code>pagesBack: false</code>, để biểu đồ không bao giờ yêu cầu nến cũ hơn. Biểu đồ không coi một feed im lặng là feed đã chết (biểu đồ ngày, thị trường đã đóng cửa): feed có socket có thể rớt mà không báo thì phải báo qua <code>connection</code>.
</p>
<p>
  Một feed phục vụ được nhiều biểu đồ: mỗi biểu đồ subscribe riêng, nên một grid dùng một feed
  cho mọi biểu đồ (<code>widget: {'{'} feed {'}'}</code> trong <code>ChartWidgetGrid</code>,
  <code>grid.connectAll(feed, symbols, '1h')</code>), trong khi với adapter thì mỗi biểu đồ cần một adapter.
  Adapter vẫn dùng được ở mọi nơi, và hai loại chuyển đổi qua lại được: <code>feedFromAdapter(new BinanceAdapter())</code>
  là một feed, <code>adapterFromFeed(feed)</code> là một adapter. Gọi connect với cả adapter lẫn feed sẽ ném lỗi.
</p>

<h3 id="manual-feed">Nến do bạn đẩy vào: ManualFeed</h3>
<p>
  Với các nến mà app đã có, <code>ManualFeed</code> giữ dữ liệu lịch sử của từng mã và
  khung thời gian, và gửi các nến bạn push tới các biểu đồ đang subscribe series đó. Các lần
  tải sau (kết nối lại, chuyển về) đều có các nến này, nên nến chỉ có một nơi ghi là feed, thay vì
  các lời gọi <code>setData</code> và <code>appendBar</code> chạy song song với một stream. Nến được
  push mà cũ hơn nến mới nhất là giá trị cuối cùng của nến tại thời điểm đó; nếu series không có nến
  nào tại thời điểm đó thì ném lỗi.
</p>
<pre><code>{`import { ManualFeed } from '@tradecanvas/chart'

const feed = new ManualFeed()
feed.setBars('AAPL', '1d', history)
chart.connect({ feed, symbol: 'AAPL', timeframe: '1d' })

feed.pushBar('AAPL', '1d', formingBar)        // again and again as it forms
feed.pushBar('AAPL', '1d', finalBar, true)    // closed`}</code></pre>

<h2>Interface DataAdapter</h2>
<pre><code>{`interface DataAdapter {
  name: string
  supportedTimeframes?: TimeFrame[]   // left out: it serves every timeframe
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'barClose' | 'tick' | 'snapshot' | 'connectionChange' | 'error' | 'symbolInfo'
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
  <code>searchSymbols</code> và <code>resolveSymbol</code> trả về <code>SymbolInfo</code>:
  <code>symbol</code>, và những gì feed biết về phần còn lại: tên dễ đọc (<code>description</code>),
  <code>exchange</code>, <code>type</code> theo cách gọi riêng của feed (<code>'stock'</code>, <code>'futures'</code>,
  <code>'Cổ phiếu'</code>…), <code>logo</code> hiển thị trong ô tìm mã của widget, <code>pricePrecision</code>,
  <code>minTick</code>, <code>currency</code>, <code>timeZone</code> và <code>sessions</code>. Feed có giá chậm hơn thị trường ghi độ trễ trong <code>delayMinutes</code> (15 với dữ liệu miễn phí của hầu hết các sàn): khi đó thanh trạng thái của widget hiển thị "Trễ 15 phút" thay cho "Live", kèm một chấm riêng.
</p>

<h2 id="built-timeframes">Khung thời gian mà feed không có</h2>
<p>
  Feed liệt kê <code>supportedTimeframes</code> sẽ có mọi khung thời gian khác được dựng từ khung
  thô nhất trong số đó mà chia hết cho nó: 7m từ 1m, 4h và 1D từ 1h. Ngày, tuần, tháng và các khung giờ
  chia hết một ngày (2h, 3h, 4h, 6h, 8h, 12h) bắt đầu lúc nửa đêm theo giờ sàn của mã,
  theo <code>timeZone</code> mà <code>resolveSymbol</code> trả về. Biểu đồ hỏi một lần cho mỗi mã,
  khi tải dữ liệu lịch sử đầu tiên của khung như vậy, dựng dữ liệu lịch sử đó khi có câu trả lời, và
  giữ lại múi giờ; khung 1h và ngắn hơn không chờ câu trả lời. Một múi giờ mà ngày của nó cần khung thời gian
  mịn hơn của UTC (giờ TP. Hồ Chí Minh trên feed nến 4h) thì dữ liệu lịch sử đó được tải lại ở khung mịn hơn. Feed không có <code>resolveSymbol</code>, feed không nêu múi giờ hoặc nêu UTC, hay feed có
  khung thời gian không khớp với mốc nửa đêm đó (chỉ có nến 4h với một múi giờ lệch UTC 7 tiếng) sẽ nhận
  ngày theo UTC, như trước. Feed không trả lời được hoặc trả lời quá 5 giây cũng vậy, và khi đó ngày của mã
  giữ theo UTC cho đến khi biểu đồ tải lại mã từ đầu (connect tới mã, hoặc chuyển tới từ một mã hay khung thời gian khác), để các trang cũ hơn và dữ liệu lịch sử sau khi kết nối lại không bao giờ chứa một ngày hai lần; lần tải mới dựng ngày theo múi giờ mà feed đã nêu từ đó, hoặc hỏi lại feed.
  Múi giờ của thị trường (<code>setMarket</code>) không dịch chuyển các nến này. Nến ngày có mốc 00:00 UTC được hiểu là đúng ngày mà mốc đó ghi. Múi giờ mà feed
  gửi sau trong event <code>symbolInfo</code> thay đổi thời gian hiển thị, không thay đổi điểm bắt đầu của các ngày được dựng.
</p>

<h2 id="symbol-info">Thông tin mã mà feed biết sau</h2>
<p>
  Biểu đồ đã kết nối hỏi <code>resolveSymbol</code> một lần. Feed chỉ biết thông tin của mã về sau (chẳng hạn ở message đầu tiên) gửi thông tin đó bằng event <code>symbolInfo</code>, và biểu đồ áp dụng: số chữ số thập phân của mã (<code>pricePrecision</code>) trên thang giá, legend và các tag, trên nhãn của hình vẽ, biên độ giá trong ngày, nhãn pivot, công cụ đo và market profile; trong widget là data window, danh sách cảnh báo, order ticket và panel tài khoản; vạch chia của thang theo bước giá (<code>minTick</code>); giờ giao dịch của sàn. Số thập phân của thị trường (<code>setMarket</code>) áp dụng vào cùng những chỗ đó và được ưu tiên hơn của mã. Khi không có cả hai, nhãn của hình vẽ giữ số thập phân theo độ lớn của giá, nhóm chữ số theo number locale như trục. Watchlist của widget ghi mỗi mã theo <code>pricePrecision</code> mà mục của mã đó trong <code>symbols</code> đưa ra, và nếu không có thì theo độ lớn của giá: hai chữ số thập phân từ 1,000, bốn chữ số thập phân từ 1, bốn chữ số có nghĩa dưới 1, dù nhỏ đến đâu.
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // as your adapter sends its other events`}</code></pre>

<h2 id="corrections">Nến được feed sửa lại</h2>
<p>
  Feed sửa một nến bằng cách gửi lại nến đó, ở trạng thái đã đóng, với đúng thời gian của nó: <code>{'{'} bar, closed: true {'}'}</code> từ <code>parseMessage</code>, hoặc một event <code>bar</code>. Nến đã đóng mà cũ hơn nến mới nhất stream đã thấy là giá trị chốt của feed cho nến đó: giá trị cuối của sàn đến sau frame đầu tiên của nến kế tiếp, hoặc một bản sửa. Biểu đồ thay nến có thời gian đó ở bất kỳ vị trí nào (<code>updateBar</code>), tính lại chỉ báo từ nến đó và giữ nguyên khung nhìn. Đây không phải giá trực tiếp: đường giá, các order và cảnh báo vẫn theo thị trường. Frame đang hình thành mà cũ hơn nến mới nhất là dữ liệu cũ và bị bỏ qua; nó không thay đổi gì. Các adapter có sẵn (<code>WebSocketAdapter</code>, <code>PollingAdapter</code>, các feed dựng trên chúng và <code>BinanceAdapter</code>) chỉ tạo tick từ giá đóng cửa của nến mới nhất, tính cả nến cuối của dữ liệu lịch sử chúng đã trả về, nên nến đã đóng cuối cùng mà feed gửi lại khi subscribe không tạo tick nào; adapter tự viết có tạo tick từ nến cũng nên bỏ qua các nến cũ hơn. Khi không dùng adapter, gọi <code>chart.updateBar(bar)</code>.
</p>
<p>
  Với <code>aggregateTicks</code>, nến cuối của dữ liệu lịch sử là nến mà các giao dịch dựng tiếp lên: giao dịch đầu tiên sau khi kết nối giữ nguyên open, high, low và khối lượng của nến đó. Giao dịch thuộc một nến đã qua mà đến muộn thì bị bỏ qua, còn một nến đã đóng gửi cho nến đó thì sửa nó, nến đang hình thành vẫn giữ các giao dịch của mình. Giao dịch xảy ra sau thời điểm bắt đầu của nến mới nhất được đưa vào nến đó kể cả khi cách chia bucket lẽ ra bắt đầu nến sớm hơn (nến ngày có mốc ở giờ khác nửa đêm, hoặc mã có múi giờ đến sau giao dịch đầu tiên), để giá theo sát mọi giao dịch. Trên khung thời gian dựng từ khung mịn hơn, một nến gốc được sửa sẽ dựng lại nến của nó, áp dụng cho hai nến dựng cuối cùng trước nến đang hình thành; bản sửa xa hơn về trước bị bỏ qua.
</p>
<pre><code>{`// in an adapter: the venue's final for a bar already on the chart
parseMessage: (raw) => ({ bar: toBar(raw), closed: true })

// your own bars, without an adapter
const corrected = chart.updateBar(bar)   // false: no loaded bar has bar.time`}</code></pre>

<h2>Feed bất kỳ trong khoảng 20 dòng</h2>
<p>
  Kế thừa <code>WebSocketAdapter</code> (trực tiếp + dữ liệu lịch sử qua REST) hoặc <code>PollingAdapter</code>
  (feed chỉ có REST). Lớp cơ sở lo vòng đời kết nối, kết nối lại, giải mã và
  phát event; bạn cung cấp một URL và một hàm parse.
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
<p>Tuần bắt đầu vào thứ Hai và tháng vào ngày 1. Với <code>setTimeZone</code>, ngày, tuần, tháng và các khung giờ chia hết một ngày bắt đầu lúc nửa đêm theo giờ sàn; biểu đồ đặt múi giờ này cho tick trong stream của nó (<code>aggregateTicks</code>) từ múi giờ của mã, nếu không có thì của thị trường, và đặt nến của chúng khớp với nến của dữ liệu lịch sử: ngày có mốc 00:00 UTC khi ngày của dữ liệu lịch sử như vậy, và nến 2h đến 12h chỉ bắt đầu lúc nửa đêm theo giờ sàn khi nến của dữ liệu lịch sử cũng vậy, nên nến 4h của chính feed (00:00, 04:00… UTC) giữ nguyên thời gian. Trên khung thời gian dựng từ một khung ngắn hơn của feed, nến bắt đầu ở chỗ các nến dựng bắt đầu. Khi dựng từ nến giờ, nến bắt đầu lúc nửa đêm của múi giờ mà <code>resolveSymbol</code> đã nêu, nếu không có thì của UTC, bất kể biểu đồ dùng múi giờ nào; khi dựng từ nến ngày của feed có mốc 00:00 UTC, tuần và tháng giữ ngày của feed, và một giao dịch được tính ngày theo múi giờ đã nêu, nếu không có thì theo múi giờ của biểu đồ, như trên nến ngày của chính feed.</p>
<p>Nến cũ hơn nến mới nhất đã thấy là nến đã qua: <code>processBar</code> gửi nến đã đóng dưới dạng <code>correction</code> và bỏ qua nến đang hình thành, còn <code>processTick</code> bỏ qua giao dịch thuộc nến đó, nên một frame hay giao dịch đến muộn không thể đóng sớm nến đang hình thành hay làm giá dịch chuyển. <code>seed(time)</code> bắt đầu từ nến cuối của dữ liệu lịch sử và không lùi lại (trừ khi các giao dịch đã dựng nến mới hơn trên các bucket mà chúng không còn dùng nữa, do múi giờ của sàn đến sau chúng: nến đó bị bỏ, nếu không các giao dịch tiếp theo sẽ bị bỏ qua cho đến bucket kế tiếp), và <code>resume(bar)</code> biến nến đó, vẫn đang hình thành, thành nến mà các giao dịch tiếp theo dựng lên, trừ khi các giao dịch đã sang một nến mới hơn; stream của biểu đồ làm cả hai việc này mỗi lần connect, nên một lần kết nối lại có dữ liệu lịch sử kết thúc ở nến trước vẫn giữ các giao dịch của nến đang hình thành. Sau đó <code>StreamManager</code> đặt nến đang hình thành, dựng từ giao dịch hoặc từ frame của feed, lên trên dữ liệu lịch sử mà nó gửi dưới dạng <code>snapshot</code>, và không gửi <code>priceChange</code> cho giá đóng cửa cuối của dữ liệu lịch sử, vốn là một giá cũ hơn. Bản sửa được gửi dưới dạng <code>barCorrection</code>.</p>

<h2>Quote cho nhiều mã</h2>
<p>
  Feed có <code>subscribeQuotes</code> gửi quote (giá cuối, thay đổi trong ngày, cao, thấp,
  khối lượng, bid và ask) cho nhiều mã cùng lúc cho đến khi bạn dừng. <code>BinanceAdapter</code> gửi
  một snapshot 24 h, rồi đến stream mini-ticker; <code>MockAdapter</code> tạo quote giả. Watchlist của
  widget điền các dòng từ đây. Khi không có quote, dòng của chính mã đang xem lấy giá và
  mức thay đổi trong ngày từ các nến của biểu đồ, giống panel thông tin mã: so với giá đóng cửa
  trước ngày cuối cùng, theo múi giờ của sàn, và không có mức thay đổi khi các nến không chứa ngày nào trước đó.
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>Biểu đồ tick</h2>
<p>
  Khung thời gian tick, <code>'100T'</code>, vẽ một nến cho mỗi 100 giao dịch. Nến được dựng từ giao dịch
  của feed: các giao dịch gần đây cho dữ liệu lịch sử (<code>fetchTrades</code>), sau đó là giao dịch trực tiếp
  (<code>subscribeTrades</code>). <code>BinanceAdapter</code> stream aggregate trade. Biểu đồ tick
  không có đồng hồ đếm ngược và không tải thêm dữ liệu lịch sử cũ hơn; feed không có giao dịch sẽ từ chối khung thời gian tick.
  Nến tick không cách đều nhau theo thời gian, nên trục thời gian và crosshair chỉ hiển thị thời gian cho
  nến, không cho khoảng trống bên cạnh.
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2 id="order-flow">Bên nào chủ động khớp</h2>
<p>
  Feed có thể cho biết bên nào chủ động trong mỗi lệnh khớp, tức bên vượt spread: <code>side</code> trên một
  trade (<code>'buy'</code> khi bên mua khớp vào giá ask, <code>'sell'</code> khi bên bán khớp vào giá
  bid) và <code>buyVolume</code> trên một nến, là phần <code>volume</code> mà bên mua chủ động lấy. Cả hai
  đều không bắt buộc. Có <code>buyVolume</code> thì nến có delta, tức mua trừ bán:
  <code>barDelta(bar)</code> trả về delta đó, hoặc <code>null</code> với nến không ghi, và chỉ báo Volume
  Delta (<code>voldelta</code>) vẽ delta này cùng tổng cộng dồn của nó thay cho giá trị ước lượng.
  <code>BinanceAdapter</code> điền cả hai, từ taker buy volume của sàn và các aggregate trade;
  <code>MockAdapter</code> tự tạo ra chúng.
</p>
<pre><code>{`chart.setData([{ time, open, high, low, close, volume: 1200, buyVolume: 700 }])
chart.addIndicator('voldelta', { mode: 1, anchor: 'session' })   // the cumulative delta, from each session's start

barDelta({ volume: 1200, buyVolume: 700 })   // 200: 700 bought, 500 sold`}</code></pre>
<p>
  Chart mang <code>buyVolume</code> đi tới mọi nơi nó mang khối lượng. Nến ghép từ các nến khác
  (<code>resampleBars</code>, khung thời gian mà feed không có) cộng dồn nó; nến tick, và nến gộp từ tick,
  đếm nó từ các trade có ghi <code>side</code>; nến đang replay có nó theo cùng tỉ lệ với khối lượng; bản xuất
  CSV và JSON ghi nó vào một cột riêng (<code>Buy Volume</code>), và bản nhập đọc lại được cột này. Nến có một
  phần không ghi thì không có giá trị này: biết một nửa thì không tính là biết.
</p>
<p>
  Ba điều cần biết. Trade đưa vào bằng <code>chart.updateLastBarFromTick</code> cũng được đếm khi nó có
  <code>side</code>; trade có khối lượng mà không có side làm nến đang hình thành không còn
  <code>buyVolume</code>. Renko, Kagi, line break, point and figure và range bars là nến do chart vẽ ra, không
  phải nến của feed: chỉ báo trên các chart đó đọc nến được vẽ, vốn không có số liệu này, nên delta ở đó là
  giá trị ước lượng. Và khi chỉ một số nến của chuỗi có ghi, delta tích luỹ cộng delta thật với giá trị ước
  lượng, mà mỗi giá trị ước lượng là toàn bộ khối lượng của một nến: đường này nhảy bậc ở chỗ hai loại gặp nhau.
  Các cầu nối JS API và UDF không có trường cho số liệu này.
</p>

<h2 id="footprint">Biểu đồ footprint</h2>
<p>
  <code>chartType: 'footprint'</code> vẽ, bên cạnh mỗi nến, những gì đã khớp ở từng mức giá bên trong nến đó:
  phần bên bán chủ động khớp vào giá bid nằm bên trái, phần bên mua chủ động khớp vào giá ask nằm bên phải. Hàng
  giá nào có một bên áp đảo bên kia thì được in đậm trên nền đậm hơn, hàng giá khớp nhiều nhất có đường viền bao
  quanh, và một cây nến mảnh đứng ở bên trái mỗi nến. Trong widget, loại này là Footprint trong menu loại biểu đồ,
  và các thiết lập của nó nằm trong Chart Settings.
</p>
<pre><code>{`const chart = new Chart(el, { chartType: 'footprint' })
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '1m' })`}</code></pre>
<p>
  Với một feed có trade thì chỉ cần vậy (<code>fetchTrades</code> và <code>subscribeTrades</code>, như
  <code>BinanceAdapter</code> và <code>MockAdapter</code> có): khi đang hiển thị footprint, chart hỏi feed các
  trade gần nhất, một nghìn trade, rồi theo các trade trực tiếp, và dừng lại khi loại biểu đồ đổi. Feed chỉ giữ ít
  trade, nên lúc đầu chỉ những nến mới nhất có footprint: nến mà các trade gần nhất bắt đầu giữa chừng bị bỏ qua,
  các nến trước nó là nến mảnh, và từ đó footprint lớn dần theo các trade trực tiếp. Đổi symbol hoặc timeframe thì
  nó bắt đầu lại.
</p>
<p>
  Host có trade riêng thì đưa vào bằng <code>chart.addTrades(trades)</code>, ở bất kỳ loại biểu đồ nào: mỗi
  trade được tính vào nến theo thời gian của nó và hàng giá theo giá của nó, ở bên đã chủ động khớp. Trade không
  có <code>side</code> được suy ra từ trade ngay trước nó (mua khi giá đi lên tới nó, bán khi giá đi xuống): đây
  là giá trị ước lượng, như delta của một nến không có <code>buyVolume</code>. Host tự giữ các hàng giá thì đưa
  thẳng các hàng đó, từng nến một, và <code>footprintOf</code> tạo chúng từ trade trong một lần gọi.
</p>
<pre><code>{`import { footprintOf, footprintStats } from '@tradecanvas/chart'

chart.setChartTypeOptions({ footprint: { rowSize: 0.5, collect: false } })   // các hàng giá là của host
chart.setFootprint([
  { time: bar.time, levels: [{ price: 100, buy: 12, sell: 30 }, { price: 100.5, buy: 41, sell: 9 }] },
])
chart.setFootprint(footprintOf(trades, '1m', 0.5))    // hoặc tạo từ trade

const rows = chart.getFootprint(bar.time)             // { time, levels }, hoặc null với nến không có
if (rows) footprintStats(rows.levels)                 // { buy, sell, volume, delta, poc, … }
chart.clearFootprint()                                // trước khi đưa hàng giá của chuỗi khác`}</code></pre>
<table>
  <thead><tr><th>Thiết lập</th><th>Mặc định</th><th>Tác dụng</th></tr></thead>
  <tbody>
    <tr><td><code>rowSize</code></td><td><code>'auto'</code></td><td>Chiều cao một hàng giá, tính theo giá. Auto là khoảng một phần mười nghìn của giá cuối, làm tròn về 1, 2 hoặc 5 (5 ở mức 60.000), theo bội số nguyên của bước giá của symbol; với các hàng đưa vào bằng tay, là bước nhỏ nhất giữa các mức giá của chúng. Đổi sang cỡ khác thì footprint bắt đầu lại.</td></tr>
    <tr><td><code>cells</code></td><td><code>'bidAsk'</code></td><td><code>'bidAsk'</code>: hai bên tách riêng. <code>'delta'</code>: mua trừ bán. <code>'volume'</code>: cả hai cộng lại.</td></tr>
    <tr><td><code>imbalance</code></td><td><code>3</code></td><td>Một bên phải gấp bên kia bao nhiêu lần, lệch nhau một hàng, thì được đánh dấu: phần mua ở một mức giá so với phần bán ở hàng ngay dưới, và phần bán so với phần mua ở hàng ngay trên. 0 thì không đánh dấu hàng nào.</td></tr>
    <tr><td><code>collect</code></td><td><code>true</code></td><td>false: chart không hỏi feed để lấy trade.</td></tr>
  </tbody>
</table>
<p>
  Mức zoom quyết định một nến mang gì. Chọn footprint thì chart zoom vào tới chỗ đọc được các con số, và nến
  của nó có thể rộng hơn nến thường nhiều; zoom ra thì các con số nhường chỗ cho một thanh cho mỗi bên, rồi cho
  nến thường. Các hàng quá mỏng để đọc được vẽ gộp 2, 5, 10… hàng làm một, ở các mức giá tròn. Footprint được giữ
  cho 500 nến mới nhất và không được lưu cùng trạng thái của chart. Trong replay, các nến chưa được hiện không có
  ô nào. Nó được vẽ bằng Canvas 2D, kể cả khi dùng renderer WebGL. <code>renderPriceChart</code> vẽ nó từ
  <code>footprint</code>, là các hàng đúng như <code>chart.getFootprint()</code> trả về.
</p>

<h2>Trạng thái thị trường và tin tức</h2>
<p>
  <code>marketStatus(info, now)</code> cho biết thị trường của một mã có mở cửa tại một thời điểm hay không, dựa trên
  giờ giao dịch theo múi giờ của sàn (tính cả chuyển đổi giờ mùa hè), và khi nào trạng thái đó thay đổi. Phiên có thể ghi rõ các
  ngày trong tuần mà phiên mở cửa. <code>fetchNews</code> của feed cung cấp tiêu đề tin cho panel thông tin mã
  của widget; <code>readNews</code> chỉ giữ các mục có tiêu đề và thời gian, và chỉ giữ liên kết tới trang web.
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timeZone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

<h2>Kết nối lại</h2>
<p><code>ReconnectManager</code> xử lý exponential backoff có giới hạn trên và dừng hẳn sau lần thử cuối.</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>Chế độ replay</h2>
<p>
  Chạy một <code>DataSeries</code> lịch sử tiến về phía trước với tốc độ điều chỉnh được.
  Tách khỏi <code>Chart</code> để dùng được cho cả replay trên UI lẫn backtest
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
  Trong chế độ replay của widget, <strong>click vào nến bất kỳ đã hiện để đưa con trỏ
  replay tới đó</strong>. Tổng quát hơn, biểu đồ phát event <code>click</code>
  và <code>barClick</code> cho các lần click chuột trái thông thường (nhấn và thả
  mà không kéo):
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>Replay trên biểu đồ, theo bước mịn hơn</h3>
<p>
  <code>chart.replayStart()</code> replay chính series của biểu đồ. Truyền nến mịn hơn vào
  <code>steps</code> (nến 5 phút dưới biểu đồ giờ) thì mỗi bước làm nến đang hình thành
  lớn dần từ các nến đó, như nó đã hình thành trên thị trường; nến đã đóng hiển thị đúng như trong
  series. <code>startIndex</code> và <code>replaySeekToBar</code> đếm theo nến của biểu đồ.
  Trong ChartWidget, menu <strong>Bước</strong> của thanh replay đưa ra các khung mịn hơn mà
  feed có (hoặc mà các nến bạn đã tải dựng được).
</p>
<pre><code>{`chart.replayStart({ animate: true, step: 'auto', startIndex: 120, paused: true })
// or finer bars you hold for the bars replayed: { steps, startIndex: 120 }
chart.replayResume()
chart.getReplayBarIndex()      // the chart bar forming now
chart.replaySeekToBar(150)     // to the end of bar 150
chart.replaySeekToTime(t)      // to the bars that closed by t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, stepTime, until, total, cause }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>Nến hình thành khi phát</h3>
<p>
  Với <code>animate: true</code>, mỗi nến lớn dần theo thời gian của nó, như nến trực tiếp: từ
  giá mở cửa tới cực trị mà chiều của nến cho thấy đến trước (nến tăng giảm xuống trước), rồi cực trị còn lại, rồi
  giá đóng cửa. Với <code>step</code> (<code>'auto'</code>, hoặc một khung như <code>'1m'</code>),
  biểu đồ tải nến mịn hơn của những nến sắp phát qua <code>fetchHistoryBefore</code> của feed đang kết nối,
  mỗi lần một trang và chỉ khi đang phát, và mỗi nến hình thành
  theo các nến đó; <code>'auto'</code> là khung mịn nhất mà feed phục vụ với tối đa 60 nến cho một nến. Frame
  cuối luôn là nến đúng như trong series. <code>steps</code> bạn truyền vào được dùng theo cùng
  cách. Đồng hồ vẫn đếm theo nến của biểu đồ: <code>speed</code>, <code>duration</code> và
  các index tính theo nến, và <code>getReplayBarIndex()</code> là nến đang hình thành. Khi tạm dừng, nến
  đang vẽ dở được giữ nguyên; seek hoặc step hiển thị nến trọn vẹn. Tài khoản paper trading khớp order khi giá đang vẽ
  chạm tới order đó. Nến ngắn hơn ba frame hiện ra trọn vẹn, và khi bật reduced motion, nến
  nhảy từ giá này sang giá kế tiếp. <code>replayStepsLoad</code> báo
  <code>loading</code>, <code>loaded</code>, <code>end</code> hoặc <code>error</code>; nến không có nến
  mịn hơn thì hình thành từ chính các giá của nó. ChartWidget làm việc này mặc định: menu Bước bắt đầu ở
  <strong>Tự động</strong>; <code>replayStep</code> (<code>'auto'</code>, <code>'bar'</code> hoặc một
  khung) và <code>replayAnimate: false</code> thay đổi điều đó. Trên feed không có
  <code>fetchHistoryBefore</code>, widget tải nến mịn hơn trong một request trước khi replay bắt đầu.
  Với <code>replayAnimate: false</code>, chế độ Tự động replay nến trọn vẹn; nếu chọn một khung mịn hơn thì phát theo từng bước của khung đó.
</p>

<h3>Thanh replay trong ChartWidget</h3>
<p>
  Nút <strong>Bar replay</strong> trên toolbar mở một thanh bên dưới biểu đồ, trải ngang widget,
  phía trên thanh trạng thái: biểu đồ chừa chỗ cho thanh này, nên khối lượng, các pane bên dưới và trục
  thời gian vẫn hiện. Trước tiên chọn nến bắt đầu: click
  vào nến đó, hoặc nhấn <strong>Nến ngẫu nhiên</strong>; <strong>Huỷ</strong> (hoặc <kbd>Esc</kbd>) để thoát.
  Sau đó: lùi một bước, <strong>Phát</strong>/<strong>Tạm dừng</strong> và tiến một bước; ngày giờ của
  bước đang hiển thị, theo múi giờ hiển thị (chỉ ghi năm khi không phải năm nay), và một thanh tiến trình
  tô phần đã phát; <strong>Tốc độ</strong> dưới dạng hệ số từ 0.1× tới 50× (1× phát một nến
  của biểu đồ mỗi giây, bất kể bước; mặc định là 1×); <strong>Bước</strong>;
  <strong>Chọn nến</strong>, tạm dừng và chọn điểm bắt đầu khác trong các nến đang hiển thị, không
  để lộ các nến phía sau (<strong>Huỷ</strong> hoặc <kbd>Esc</kbd> quay về đúng chỗ cũ); và
  <strong>Về thời gian thực</strong>. Trên điện thoại hoặc biểu đồ hẹp, thanh này chiếm hai hàng, ngày giờ và
  thanh tiến trình ở trên. Phím tắt, áp dụng cho widget dùng gần nhất: <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> để step,
  <kbd>Space</kbd> trên biểu đồ hoặc thanh tiến trình để phát hoặc tạm dừng (ngoài replay thì phím này fit biểu đồ), và
  <kbd>Esc</kbd> để dừng chọn nến. Phím tắt bạn thêm bằng <code>addHotkey</code> trên cùng phím được ưu
  tiên. Thanh replay đọc các token <code>--tcw-*</code> của look và theme; host cũng có thể đặt
  <code>--tcw-replay-btn</code>, <code>--tcw-replay-play</code> hoặc <code>--tcw-replay-track-w</code> trên
  <code>.tcw-replay-bar</code>. Phần hiển thị thời gian lấy từ <code>stepTime</code> của
  <code>replayStep</code>, thời gian của bước đang hiển thị.
</p>

<h3>Replay vẫn tiếp tục khi nến thay đổi</h3>
<p>
  Replay là một mốc thời gian trên series trực tiếp. Khi nến thay đổi (mã hoặc
  khung thời gian mới qua <code>connect</code> hoặc <code>switchStream</code>, <code>setData</code>,
  nến cũ hơn được tải thêm, phiên mở rộng, một nến được sửa), replay tiếp tục trên các nến mới tại
  thời điểm nó đã đến, và chỉ hiển thị các nến đã đóng trước thời điểm đó. Trong khi series mới
  đang tải, replay chờ, giữ nguyên trạng thái đang phát hay tạm dừng. Các index (<code>barIndex</code>,
  <code>total</code>, <code>replaySeekToBar</code>) là của các nến đang được replay và thay đổi
  theo các nến đó; hãy giữ vị trí theo thời gian. Replay mà tài khoản paper trading đang giao dịch sẽ kết thúc khi đổi
  mã. Trong ChartWidget, thanh replay vẫn mở, hiện <em>Đang tải biểu đồ</em> và chờ
  trong khi nến tải, sau đó theo tổng số nến và các bước của khung thời gian mới.
</p>
<pre><code>{`chart.replayStart({ startIndex: 300, paused: true })
await chart.setTimeframe('1h')        // the replay waits, then goes on at the same time
const { until } = chart.getReplayProgress()   // keep a position by time, not by index
if (until !== null) chart.replaySeekToTime(until)   // back to it, on any interval
chart.on('replayStep', (e) => {
  if (e.payload.cause === 'series') {}  // carried over: barIndex and total are the new bars'
})
chart.replayStop()                    // call it first to end the replay as before`}</code></pre>

<h3>Replay trong app của bạn</h3>
<p>
  Dấu mua/bán và vùng giao dịch hiện ra khi replay tới chúng: một dấu hiện khi nến của nó được hiển thị, một giao dịch hiện khi đã vào lệnh, được vẽ ở trạng thái mở cho đến khi tới điểm thoát (<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code> hiển thị tất cả). <code>startTime</code> bắt đầu tại một thời điểm thay vì một nến; <code>hideHistory</code> ẩn các nến trước điểm bắt đầu cho đến khi replay dừng; <code>duration</code> phát tới cuối trong khoảng thời gian đó bất kể có bao nhiêu nến, nhiều nến mỗi frame, và một frame trễ làm replay chậm lại chứ không nhảy cóc.
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

<h3>Paper trading trong replay</h3>
<p>
  Execution adapter có <code>setMarkPrice(price, time)</code> (như
  <code>PaperExecutionAdapter</code>) giao dịch theo replay: trong khi replay, biểu đồ
  chuyển cho adapter từng giá và thời gian được replay, nên order và stop được khớp khi replay đi qua
  chúng và các fill nằm trên nến được replay. Giá thấp và giá cao của mỗi bước đều được tính, và một lần nhảy
  tới đi qua mọi bước trên đường. Adapter chỉ đi tới: sau khi seek lùi, nó chờ
  cho đến khi replay vượt qua điểm xa nhất nó đã thấy. Trong lúc đó giá trực tiếp không làm
  nó thay đổi; khi replay kết thúc, nó quay lại giá trực tiếp, và các fill lại theo
  đồng hồ thực. Cảnh báo giá vẫn theo dõi thị trường trực tiếp trong suốt quá trình; cảnh báo trên đường chỉ báo
  chờ replay kết thúc.
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>Bắt đầu phát từ index hiện tại.</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>Tạm dừng/tiếp tục timer.</td></tr>
    <tr><td><code>step(n)</code></td><td>Phát N nến đồng bộ, không qua timer.</td></tr>
    <tr><td><code>seek(index)</code></td><td>Nhảy tới index mà không phát các nến ở giữa.</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>Số nến mỗi giây (giới hạn &gt;= 0.01).</td></tr>
    <tr><td><code>destroy()</code></td><td>Xoá timer và listener.</td></tr>
  </tbody>
</table>

<p>Xem <a href={href('/docs/analytics')}>Phân tích</a> để dùng replay cùng bộ backtest.</p>
