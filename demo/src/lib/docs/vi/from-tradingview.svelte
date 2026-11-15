<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Chuyển từ TradingView — Tài liệu TradeCanvas</title>
  <meta name="description" content="Chuyển một app từ charting library của TradingView (Advanced Charts, Trading Platform) hoặc Lightweight Charts sang TradeCanvas: giữ datafeed với feedFromJsApi hoặc udfFeed, để coding agent đối chiếu tên và option qua MCP server, và biết những gì không mang sang được." />
</svelte:head>

<h1>Chuyển từ TradingView</h1>
<p>
  Một app xây trên charting library của TradingView (Advanced Charts hoặc Trading Platform) hoặc trên Lightweight
  Charts chuyển sang TradeCanvas mà backend không phải đổi. Datafeed giữ nguyên, nằm sau một lớp cầu nối. Những tên
  có đổi, gồm option, featureset, override, study, drawing và method, nằm trong các bảng mà
  <a href={href('/docs/getting-started#ai')}>MCP server</a> dùng để trả lời, nên coding agent tra từng tên thay vì
  đoán. Trang này nói những gì mang sang được, những gì đổi và những gì không mang sang được.
</p>

<h2 id="datafeed">Giữ datafeed</h2>
<p>
  <code>feedFromJsApi</code> biến một datafeed viết cho JS API (<code>onReady</code>,
  <code>resolveSymbol</code>, <code>getBars</code>, <code>subscribeBars</code>, và <code>searchSymbols</code>,
  <code>getQuotes</code>, <code>subscribeQuotes</code> nếu có) thành một <code>DataFeed</code>:
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // datafeed của app, giữ nguyên
await feed.ready()                      // onReady đã trả lời: đã biết các timeframe nó phục vụ

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>Cầu nối làm những việc sau cho datafeed:</p>
<ul>
  <li>resolve mỗi symbol một lần và đưa symbol info của nó lại cho <code>getBars</code> và <code>subscribeBars</code>;</li>
  <li>
    đổi timeframe của chart thành resolution (<code>'1h'</code> → <code>'60'</code>, <code>'1d'</code> →
    <code>'1D'</code>), và <code>countBack</code> cùng <code>before</code> của chart thành <code>from</code>,
    <code>to</code> và <code>countBack</code> tính bằng giây;
  </li>
  <li>hỏi thêm một lần từ <code>nextTime</code> khi một khoảng không có nến nào;</li>
  <li>
    huỷ đăng ký bằng đúng guid đã dùng khi đăng ký, và tải lại series khi datafeed gọi
    <code>onResetCacheNeeded</code>;
  </li>
  <li>
    đọc <code>pricescale</code> và <code>minmov</code> của symbol làm bước giá, <code>session</code> làm giờ giao
    dịch, và các timeframe nó phục vụ từ <code>supported_resolutions</code>.
  </li>
</ul>
<p>
  Chart đọc các timeframe mà một feed phục vụ khi kết nối, và dựng các timeframe khác từ đó (chart 7 phút từ nến
  1 phút). <code>onReady</code> trả lời muộn hơn, nên hãy await <code>feed.ready()</code> trước khi tạo widget, hoặc
  tự truyền chúng vào: <code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>.
</p>

<h3 id="udf">Một server UDF</h3>
<p>Một server nói UDF không cần chút code datafeed nào:</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // các timeframe trong /config của nó

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  Nó đọc <code>/config</code>, <code>/symbols</code>, <code>/search</code>, <code>/history</code> và
  <code>/quotes</code>. UDF không có push, nên nến và quote trực tiếp được hỏi lại sau mỗi
  <code>updateFrequency</code> ms (mặc định 10 giây). <code>headers</code> được gửi kèm mọi request.
</p>

<h2 id="mcp">Để agent đối chiếu phần còn lại</h2>
<p>MCP server có ba tool cho việc chuyển:</p>
<table>
  <thead><tr><th>Tool</th><th>Việc nó làm</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>Các bước theo thứ tự, những gì cần tìm trong code của app, và tool nào đối chiếu những gì mỗi lần tìm thấy.</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        Một tên sẽ thành gì: một option của widget, featureset, khoá override, study, drawing shape, method của
        widget hay chart, thành phần của datafeed hay broker, hoặc một resolution. Nó cho ra option, feature switch,
        style key, id của indicator (kèm giá trị mặc định và các khoá đường), loại drawing (kèm các điểm của nó) hoặc
        lời gọi tương ứng, và nói rõ khi không có gì tương đương và nên làm gì thay thế.
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        Toàn bộ object option của <code>new TradingView.widget({'{'}...{'}'})</code>, kể cả featureset và override,
        thành option của <code>ChartWidget</code>; hoặc option <code>createChart</code> của Lightweight Charts thành
        option của <code>Chart</code>. Nó cũng liệt kê các lời gọi cần làm sau khi chart đã có và những gì không có
        chỗ, rồi kiểm tra kết quả như <code>validate_options</code>.
      </td>
    </tr>
  </tbody>
</table>
<p>
  Khi đã kết nối server, hãy nhờ agent làm việc chuyển: nó gọi <code>migration_plan</code> trước rồi đi qua app từ
  đó. Agent skill có cùng các bước cho agent không có server.
</p>

<h2 id="differs">Những gì đổi</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>, <code>library_path</code></td><td><code>new ChartWidget(element, options)</code>; không có gì phải host</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td>Option <code>onReady</code>, hoặc code đặt sau constructor</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>; id ngắn: <code>'rsi'</code>, <code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>, thời gian tính bằng giây</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>, thời gian tính bằng mili giây</td></tr>
    <tr><td>Một resolution: <code>'60'</code>, <code>'1D'</code>, <code>'W'</code></td><td>Một timeframe: <code>'1h'</code>, <code>'1d'</code>, <code>'1w'</code> (<code>resolutionToTimeframe</code>, <code>timeframeToResolution</code>)</td></tr>
    <tr><td><code>disabled_features</code>, <code>enabled_features</code></td><td><code>features</code>: mọi switch đều bật trừ khi đặt <code>false</code></td></tr>
    <tr><td><code>overrides</code>, <code>applyOverrides</code></td><td>Style key, trong <code>chartOptions.overrides</code> hoặc <code>chart.applyOverrides()</code>; kiểu đường viết bằng tên</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code> với một <code>LayoutStorage</code> (<code>list</code>, <code>load</code>, <code>save</code>, <code>remove</code>)</td></tr>
    <tr><td>Broker API, đường lệnh và đường vị thế</td><td>Một <code>ExecutionAdapter</code>, <code>setOrders</code>, <code>setPositions</code> và các event lệnh (<a href={href('/docs/trading')}>Giao dịch</a>)</td></tr>
    <tr><td>Lightweight Charts: nến và marker tính bằng giây</td><td>Mili giây: <code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">Những gì không mang sang được</h2>
<ul>
  <li>
    <strong>Chart đã lưu.</strong> Layout, drawing và study lưu theo định dạng của TradingView không tải được: người
    dùng bắt đầu layout mới.
  </li>
  <li>
    <strong>Indicator tự viết</strong> cho <code>custom_indicators_getter</code> được viết lại thành một
    <a href={href('/docs/plugins')}>indicator plugin</a>, trừ khi một trong 134 indicator có sẵn làm được điều tương tự.
  </li>
  <li>
    <strong>Một số drawing tool và featureset</strong> không có bản tương đương. <code>migration_lookup</code> cho biết
    là những cái nào, và nêu tool gần nhất.
  </li>
  <li>
    <strong>Giao dịch trên nhiều symbol.</strong> Lệnh và vị thế của một <code>ExecutionAdapter</code> là của symbol
    đang mở trên chart; một account manager trải trên nhiều symbol và nhiều tài khoản là phần của chính app.
  </li>
</ul>
<p>
  Các bảng được viết từ tài liệu công khai của TradingView, đọc vào tháng 11 năm 2026, và được đối chiếu với tên của
  chính TradeCanvas ở mỗi lần build. Một tên bị thiếu hoặc sai là một bug: hãy báo trên GitHub.
</p>
