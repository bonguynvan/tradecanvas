<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Chuyển sang 2.0 — Tài liệu TradeCanvas</title>
  <meta name="description" content="Những gì thay đổi với code giữa TradeCanvas 1.x và 2.0: cách cài đặt, giao diện mặc định và tuỳ chọn giữ giao diện của 1.x, các tên đã bị xoá và tên dùng thay thế, và các hành vi đã thay đổi." />
</svelte:head>

<h1>Chuyển sang 2.0</h1>
<p>
  2.0 thay đổi giao diện mặc định của biểu đồ và widget, xoá các tên đã bị deprecate trong 1.x, và thay đổi
  bốn hành vi. Dữ liệu, layout đã lưu, chỉ báo, hình vẽ, giao dịch và theme giữ nguyên. Trang này
  liệt kê từng thay đổi và cách xử lý.
</p>

<h2 id="install">Cài đặt</h2>
<p>
  2.0 là bản phát hành hiện tại: mọi package đều là <code>2.0.0</code> dưới tag <code>latest</code> của npm. 1.x vẫn giữ nguyên, dưới dạng <code>@tradecanvas/chart@1</code>, cho trang chưa sẵn sàng chuyển.
</p>
<pre><code>{`npm install @tradecanvas/chart

# with a framework component, its package too
npm install @tradecanvas/react
npm install @tradecanvas/vue
npm install @tradecanvas/svelte`}</code></pre>

<h2 id="look">Giao diện mặc định</h2>
<p>
  Biểu đồ và widget mở ra với nhiều khoảng trống hơn quanh nội dung được vẽ. Một tuỳ chọn giữ giao diện của 1.x:
</p>
<pre><code>{`// The widget as it was in 1.x
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// A chart of your own as it was in 1.x
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code> (control nhỏ hơn) không thay đổi.
</p>
<p>Những gì khác theo mặc định:</p>
<table>
  <thead><tr><th>Mục</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>Khoảng trống sau nến mới nhất</td><td>5 slot</td><td>8 slot</td></tr>
    <tr><td>Khoảng trống phía trên và dưới vùng giá</td><td>9% chiều cao</td><td>11.5% chiều cao</td></tr>
    <tr><td>Nến của một <code>Chart</code> không có widget</td><td>Classic</td><td>Golden, thân nến chiếm 62% slot, như widget vẫn vẽ</td></tr>
    <tr><td>Legend, tính từ góc vùng vẽ</td><td>cách 8 px</td><td>cách 12 px</td></tr>
    <tr><td>Chữ số của một <code>Chart</code> không có widget (trục, tag, legend)</td><td>Font monospace</td><td>Font sans của hệ thống, như widget và các finance chart; <code>font: {'{'} family: MONO_FONT_FAMILY {'}'}</code> giữ font cũ</td></tr>
    <tr><td>Khoảng cách trong widget, <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>Nút của look Print</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>Padding hai bên nhãn của nút</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  Mọi kích thước và khoảng cách trong widget giờ là số pixel chẵn, và các đường mảnh rộng đúng một pixel thiết bị ở
  tỉ lệ màn hình 125% và 150%.
</p>
<p>Kiểm tra những điểm sau trong code của bạn:</p>
<ul>
  <li>CSS override <code>--tcw-space-*</code>, hoặc giả định control cao 33 px.</li>
  <li>Code truyền <code>rightMargin</code>. Khi được đặt, giá trị này vẫn được ưu tiên.</li>
  <li>
    Component React, Vue và Svelte không còn tự đặt <code>rightMargin: 5</code>. Để giữ giá trị này, truyền
    <code>density: 'compact'</code> hoặc <code>rightMargin: 5</code> trong <code>options</code>.
  </li>
  <li>
    Code đọc <code>PRICE_SCALE_MARGIN</code> từ <code>@tradecanvas/core</code> hoặc
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code>: cả hai đã đổi giá trị.
  </li>
</ul>
<pre><code>{`// React; the Vue and Svelte components take the same options
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  Chi tiết từng density đặt những gì: <a href={href('/docs/styling#density')}>Styling → Density</a>.
</p>

<h2 id="removed">Các tên đã bị xoá</h2>
<p>Các tên sau đã bị deprecate trong 1.x và bị xoá trong 2.0.</p>
<table>
  <thead><tr><th>Đã xoá</th><th>Dùng thay thế</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>: số phút lệch về phía đông so với UTC, hoặc <code>null</code> để dùng múi giờ của trình duyệt</td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>DEFAULT_FONT_FAMILY</code></td><td><code>MONO_FONT_FAMILY</code>: font monospace, không còn là font mặc định</td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>TimeFormatContext.kind === 'date'</code> trong <code>timeFormatter</code></td><td>Trục truyền <code>'year'</code>, <code>'month'</code> hoặc <code>'day'</code>. Trục đã không truyền <code>'date'</code> từ 1.x, và kiểu không còn giá trị này.</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code> và <code>SessionBreaks.renderLabels()</code> (<code>@tradecanvas/core</code>)</td><td>Xoá các lời gọi: cả hai đều không làm gì.</td></tr>
    <tr><td>Key chuỗi của widget <code>replay.barsPerSecond</code></td><td>Xoá key này khỏi override <code>messages</code>: nó không được dùng. Chuỗi tốc độ replay là <code>replay.rate</code>.</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone"><code>timezone</code> của mã không còn được đọc</h3>
<p>
  Trường cũ hoàn toàn không được đọc. Một mã chỉ có <code>timezone</code>, dù đến từ
  <code>symbols</code>, <code>resolveSymbol</code>, một feed hay một adapter, giờ không có múi giờ riêng:
</p>
<ul>
  <li><code>setTimeZone('exchange')</code> và ngày của nến ngày dùng múi giờ của thị trường, hoặc UTC;</li>
  <li><code>sessions</code> riêng của mã không được tô nền (giờ của thị trường thì có, khi đã đặt thị trường);</li>
  <li>trạng thái của mã hiển thị như thị trường giao dịch suốt ngày đêm, và panel của mã không hiện múi giờ.</li>
</ul>
<p>
  <code>timezone</code> nếu vẫn được truyền sẽ giữ nguyên trong <code>getSymbolInfo()</code>, và không có gì đọc nó.
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">Các tên không thay đổi</h3>
<p>
  Các tên rất giống nhau, nên cẩn thận khi tìm và thay thế. Setting của widget vẫn viết là
  <code>timezone</code>:
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  Các key chuỗi của widget <code>settings.timezone</code> và <code>menu.chart.timezone</code> cũng giữ tên.
</p>

<h3 id="find">Tìm các tên này</h3>
<p>
  Tìm trong code <code>Timezone(</code> và <code>EXCHANGE_TIMEZONE</code>, và <code>timezone:</code>
  trong các object mã. TypeScript báo lỗi ở từng tên đã bị xoá.
</p>

<h2 id="behaviour">Các hành vi đã thay đổi</h2>
<p>Các thay đổi sau không kèm đổi tên nào.</p>
<ul>
  <li>
    <strong>Nhãn trục giá ở mép pane.</strong> Nhãn bị mép trên hoặc mép dưới của pane cắt mất sẽ không được vẽ.
    Đường lưới của nhãn đó vẫn giữ.
  </li>
  <li>
    <strong>Pane giá khi có nhiều pane.</strong> Dù mở bao nhiêu pane chỉ báo, pane giá vẫn giữ
    ít nhất 38.2% chiều cao biểu đồ, và các pane đang mở chia phần còn lại theo tỉ lệ kích thước của chúng. Kích thước
    đã đặt của một pane được giữ lại, và hiện lại khi biểu đồ cao hơn. Trước đây, các pane giữ chiều cao và có thể không chừa
    chỗ nào cho pane giá.
  </li>
  <li>
    <strong>Độ rộng đường nằm giữa hai số pixel nguyên.</strong> Đường có độ rộng như vậy dùng số pixel thiết bị nguyên ngay dưới
    nó: 1.5 px là một pixel thiết bị ở 100%, trước đây là hai.
  </li>
  <li>
    <strong><code>setBarLayout()</code> và <code>setDensity()</code>.</strong> Bar layout đặt bằng
    <code>chart.setBarLayout()</code> trong lúc biểu đồ chạy được giữ lại khi gọi <code>setDensity()</code> sau đó.
  </li>
</ul>

<h2 id="unchanged">Không thay đổi</h2>
<ul>
  <li>
    Dữ liệu: <code>DataAdapter</code>, <code>DataFeed</code>, <code>setData</code>, <code>appendBar</code> và
    <code>updateLastBar</code>.
  </li>
  <li>Layout và setting đã lưu từ 1.x tải như trước.</li>
  <li>Chỉ báo, hình vẽ, giao dịch, theme và style key giữ nguyên tên.</li>
</ul>
