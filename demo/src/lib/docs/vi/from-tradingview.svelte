<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Chuyển từ TradingView — Tài liệu TradeCanvas</title>
  <meta name="description" content="Chuyển một ứng dụng từ charting library của TradingView (Advanced Charts, Trading Platform) hoặc Lightweight Charts sang TradeCanvas: giữ datafeed bằng feedFromJsApi hoặc udfFeed, để coding agent đối chiếu tên và tuỳ chọn qua MCP server, và những gì không chuyển sang được." />
</svelte:head>

<h1>Chuyển từ TradingView</h1>
<p>
  Một ứng dụng xây trên charting library của TradingView (Advanced Charts hoặc Trading Platform) hoặc trên Lightweight Charts
  chuyển sang TradeCanvas mà backend không phải thay đổi. Datafeed giữ nguyên, đặt sau một bridge. Các tên
  có thay đổi (tuỳ chọn, featureset, override, study, hình vẽ và phương thức) nằm trong các bảng mà
  <a href={href('/docs/getting-started#ai')}>MCP server</a> dùng để trả lời, nên coding agent tra từng tên
  thay vì đoán. Trang này nêu những gì chuyển sang được, những gì thay đổi và những gì không chuyển sang được.
</p>

<h2 id="datafeed">Giữ datafeed</h2>
<p>
  <code>feedFromJsApi</code> chuyển một datafeed viết cho JS API (<code>onReady</code>,
  <code>resolveSymbol</code>, <code>getBars</code>, <code>subscribeBars</code>, và <code>searchSymbols</code>,
  <code>getQuotes</code>, <code>subscribeQuotes</code> nếu có) thành một <code>DataFeed</code>:
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // the app's datafeed, unchanged
await feed.ready()                      // onReady has answered: the timeframes it serves are known

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>Bridge làm những việc sau cho datafeed:</p>
<ul>
  <li>resolve mỗi mã một lần và truyền lại symbol info cho <code>getBars</code> và <code>subscribeBars</code>;</li>
  <li>
    chuyển khung thời gian của biểu đồ thành resolution (<code>'1h'</code> → <code>'60'</code>, <code>'1d'</code> →
    <code>'1D'</code>), và <code>countBack</code>, <code>before</code> của biểu đồ thành <code>from</code>, <code>to</code>
    và <code>countBack</code> tính bằng giây;
  </li>
  <li>hỏi thêm một lần từ <code>nextTime</code> khi một khoảng thời gian không có nến;</li>
  <li>
    unsubscribe bằng đúng guid đã dùng khi subscribe, và tải lại series khi datafeed gọi
    <code>onResetCacheNeeded</code>;
  </li>
  <li>
    đọc <code>pricescale</code> và <code>minmov</code> của mã làm bước giá, <code>session</code> làm
    giờ giao dịch, và các khung thời gian datafeed phục vụ từ <code>supported_resolutions</code>.
  </li>
</ul>
<p>
  Biểu đồ đọc các khung thời gian mà feed phục vụ lúc kết nối, và dựng các khung khác từ đó (biểu đồ 7 phút
  từ nến 1 phút). <code>onReady</code> trả lời sau, nên cần await <code>feed.ready()</code> trước khi tạo
  widget, hoặc tự truyền vào: <code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>.
</p>

<h3 id="udf">Server UDF</h3>
<p>Server dùng giao thức UDF không cần viết code datafeed nào:</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // the timeframes of its /config

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  Feed đọc <code>/config</code>, <code>/symbols</code>, <code>/search</code>, <code>/history</code> và
  <code>/quotes</code>. UDF không có push, nên nến và quote trực tiếp được hỏi lại sau mỗi
  <code>updateFrequency</code> ms (mặc định 10 s). <code>headers</code> được gửi kèm mọi request.
</p>

<h2 id="mcp">Để agent đối chiếu phần còn lại</h2>
<p>MCP server có ba tool cho việc chuyển đổi:</p>
<table>
  <thead><tr><th>Tool</th><th>Chức năng</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>Các bước theo thứ tự, những gì cần tìm trong code của ứng dụng, và tool nào đối chiếu kết quả của mỗi lần tìm.</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        Một tên chuyển thành gì: tuỳ chọn widget, featureset, override key, study, drawing shape, phương thức của widget hoặc
        chart, thành phần của datafeed hoặc broker, hoặc một resolution. Tool trả về tuỳ chọn, công tắc tính năng, style key,
        id chỉ báo (kèm giá trị mặc định và key của các đường), loại hình vẽ (kèm các điểm) hoặc lời gọi, và nói rõ
        khi không có gì tương đương và nên làm gì thay thế.
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        Toàn bộ object tuỳ chọn của <code>new TradingView.widget({'{'}...{'}'})</code>, gồm cả featureset và override,
        chuyển thành tuỳ chọn của <code>ChartWidget</code>; hoặc tuỳ chọn <code>createChart</code> của Lightweight Charts thành tuỳ chọn của
        <code>Chart</code>. Tool cũng liệt kê các lời gọi cần thực hiện sau khi biểu đồ được tạo và những gì không có chỗ tương ứng, rồi
        kiểm tra kết quả như <code>validate_options</code>.
      </td>
    </tr>
  </tbody>
</table>
<p>
  Khi đã kết nối server, yêu cầu agent thực hiện việc chuyển đổi: agent gọi <code>migration_plan</code> trước rồi
  đi qua ứng dụng từ đó. Agent skill có cùng các bước cho agent không dùng server.
</p>

<h2 id="differs">Những gì thay đổi</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>, <code>library_path</code></td><td><code>new ChartWidget(element, options)</code>; không cần host file nào</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td>Tuỳ chọn <code>onReady</code>, hoặc code đặt sau constructor</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>; id ngắn: <code>'rsi'</code>, <code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>, thời gian tính bằng giây</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>, thời gian tính bằng mili giây</td></tr>
    <tr><td>Resolution: <code>'60'</code>, <code>'1D'</code>, <code>'W'</code></td><td>Khung thời gian: <code>'1h'</code>, <code>'1d'</code>, <code>'1w'</code> (<code>resolutionToTimeframe</code>, <code>timeframeToResolution</code>)</td></tr>
    <tr><td><code>disabled_features</code>, <code>enabled_features</code></td><td><code>features</code>: mọi công tắc đều bật trừ khi đặt <code>false</code></td></tr>
    <tr><td><code>overrides</code>, <code>applyOverrides</code></td><td>Style key, trong <code>chartOptions.overrides</code> hoặc <code>chart.applyOverrides()</code>; kiểu đường viết bằng tên</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code> với một <code>LayoutStorage</code> (<code>list</code>, <code>load</code>, <code>save</code>, <code>remove</code>)</td></tr>
    <tr><td>Broker API, đường order và position</td><td>Một <code>ExecutionAdapter</code>, <code>setOrders</code>, <code>setPositions</code> và các event lệnh (<a href={href('/docs/trading')}>Giao dịch</a>)</td></tr>
    <tr><td>Lightweight Charts: nến và marker tính bằng giây</td><td>Mili giây: <code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">Những gì không chuyển sang được</h2>
<ul>
  <li>
    <strong>Biểu đồ đã lưu.</strong> Layout, hình vẽ và study đã lưu theo định dạng của TradingView không tải được: người dùng
    tạo layout mới.
  </li>
  <li>
    <strong>Chỉ báo tuỳ biến</strong> viết cho <code>custom_indicators_getter</code> phải viết lại thành một
    <a href={href('/docs/plugins')}>plugin chỉ báo</a>, trừ khi một trong 138 chỉ báo có sẵn làm được việc tương tự.
  </li>
  <li>
    <strong>Một số công cụ vẽ và featureset</strong> không có bản tương đương. <code>migration_lookup</code> cho biết đó là những cái nào,
    và nêu công cụ gần nhất.
  </li>
  <li>
    <strong>Giao dịch trên nhiều mã.</strong> Order và position của một <code>ExecutionAdapter</code> là của mã
    đang hiển thị trên biểu đồ; phần quản lý tài khoản trên nhiều mã và nhiều tài khoản do ứng dụng tự làm.
  </li>
</ul>
<p>
  Các bảng được viết từ tài liệu công khai của TradingView, đọc vào tháng 11 năm 2026, và được đối chiếu với
  tên của TradeCanvas ở mỗi lần build. Tên bị thiếu hoặc sai là một bug: báo lại trên GitHub.
</p>
