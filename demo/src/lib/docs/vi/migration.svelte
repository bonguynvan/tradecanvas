<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Chuyển sang 2.0 — Tài liệu TradeCanvas</title>
  <meta name="description" content="Những gì thay đổi với code của bạn giữa TradeCanvas 1.x và 2.0: cách cài, giao diện mặc định và một tuỳ chọn giữ giao diện của 1.x, các tên đã bị gỡ cùng tên thay thế, và những hành vi đã đổi." />
</svelte:head>

<h1>Chuyển sang 2.0</h1>
<p>
  2.0 đổi giao diện mặc định của chart và widget, gỡ các tên mà 1.x đã đánh dấu deprecated, và đổi bốn hành vi.
  Dữ liệu, bố cục đã lưu, chỉ báo, hình vẽ, giao dịch và chủ đề màu giữ nguyên. Trang này liệt kê từng thay đổi và
  việc bạn cần làm.
</p>

<h2 id="install">Cài đặt</h2>
<p>
  2.0 là bản phát hành hiện tại: mọi gói đều là <code>2.0.0</code> dưới tag <code>latest</code> của npm. Bản 1.x vẫn còn đó, cài bằng <code>@tradecanvas/chart@1</code>, cho trang chưa sẵn sàng chuyển.
</p>
<pre><code>{`npm install @tradecanvas/chart

# nếu dùng component của framework thì cài thêm gói của nó
npm install @tradecanvas/react
npm install @tradecanvas/vue
npm install @tradecanvas/svelte`}</code></pre>

<h2 id="look">Giao diện mặc định</h2>
<p>
  Chart và widget mở ra với nhiều khoảng thoáng hơn quanh những gì chúng vẽ. Một tuỳ chọn giữ lại giao diện của 1.x:
</p>
<pre><code>{`// Widget như ở 1.x
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// Chart của riêng bạn như ở 1.x
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code> (nút điều khiển nhỏ hơn) không đổi.
</p>
<p>Những điểm khác đi theo mặc định:</p>
<table>
  <thead><tr><th>Phần</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>Khoảng trống sau nến mới nhất</td><td>5 ô</td><td>8 ô</td></tr>
    <tr><td>Khoảng trống phía trên và phía dưới giá</td><td>9% chiều cao</td><td>11,5% chiều cao</td></tr>
    <tr><td>Nến của một <code>Chart</code> dùng riêng</td><td>Classic</td><td>Golden, thân nến bằng 62% ô, như widget vốn đã vẽ</td></tr>
    <tr><td>Legend, tính từ góc vùng vẽ</td><td>lùi vào 8 px</td><td>lùi vào 12 px</td></tr>
    <tr><td>Các con số của <code>Chart</code> trần (trục, nhãn, legend)</td><td>Font đơn cách</td><td>Font sans của hệ thống, như widget và các financial chart; <code>font: {'{'} family: MONO_FONT_FAMILY {'}'}</code> giữ font cũ</td></tr>
    <tr><td>Khoảng cách của widget, <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>Nút của Print</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>Đệm hai bên nhãn của nút</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  Mọi kích thước và khoảng cách trong widget nay là số pixel chẵn, và các đường mảnh rộng đúng một pixel thiết bị
  ở tỉ lệ màn hình 125% và 150%.
</p>
<p>Những chỗ cần kiểm tra trong code của bạn:</p>
<ul>
  <li>CSS ghi đè <code>--tcw-space-*</code>, hoặc mặc định một nút điều khiển cao 33 px.</li>
  <li>Code có truyền <code>rightMargin</code>. Khi đã đặt, giá trị này vẫn được ưu tiên.</li>
  <li>
    Các component React, Vue và Svelte không còn tự đặt <code>rightMargin: 5</code>. Muốn giữ, hãy truyền
    <code>density: 'compact'</code> hoặc <code>rightMargin: 5</code> trong <code>options</code>.
  </li>
  <li>
    Code đọc <code>PRICE_SCALE_MARGIN</code> từ <code>@tradecanvas/core</code> hoặc
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code>: cả hai đã đổi giá trị.
  </li>
</ul>
<pre><code>{`// React; component Vue và Svelte nhận cùng options
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  Mỗi mức density đặt những gì, xem đầy đủ ở <a href={href('/docs/styling#density')}>Giao diện → Mật độ</a>.
</p>

<h2 id="removed">Các tên đã gỡ</h2>
<p>Mỗi tên dưới đây đã bị đánh dấu deprecated ở 1.x và không còn trong 2.0.</p>
<table>
  <thead><tr><th>Đã gỡ</th><th>Dùng thay</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>: số phút về phía đông UTC, hoặc <code>null</code> để dùng múi giờ của trình duyệt</td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>DEFAULT_FONT_FAMILY</code></td><td><code>MONO_FONT_FAMILY</code>: font đơn cách, nay không còn là mặc định</td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>TimeFormatContext.kind === 'date'</code> trong một <code>timeFormatter</code></td><td>Trục thời gian đưa <code>'year'</code>, <code>'month'</code> hoặc <code>'day'</code>. Từ 1.x nó đã không còn đưa <code>'date'</code>, và nay kiểu cũng không còn giá trị này.</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code> và <code>SessionBreaks.renderLabels()</code> (<code>@tradecanvas/core</code>)</td><td>Bỏ các lời gọi: cả hai vốn không làm gì.</td></tr>
    <tr><td>Khoá chuỗi <code>replay.barsPerSecond</code> của widget</td><td>Bỏ nó khỏi phần ghi đè <code>messages</code>: khoá này không được dùng. Chữ hiển thị tốc độ replay là <code>replay.rate</code>.</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone"><code>timezone</code> của một mã không còn được đọc</h3>
<p>
  Trường cũ không còn được đọc nữa. Một mã chỉ ghi <code>timezone</code>, dù đến từ <code>symbols</code> của bạn,
  <code>resolveSymbol</code>, một feed hay một adapter, nay không có múi giờ riêng:
</p>
<ul>
  <li><code>setTimeZone('exchange')</code> và ngày của nến ngày lùi về múi giờ của thị trường, hoặc về UTC;</li>
  <li><code>sessions</code> của chính mã đó không được tô màu (giờ của thị trường thì có, khi đã đặt thị trường);</li>
  <li>trạng thái của mã hiện như một thị trường giao dịch suốt ngày đêm, và bảng thông tin mã không hiện múi giờ.</li>
</ul>
<p>
  Nếu bạn vẫn truyền <code>timezone</code>, nó được giữ nguyên trong <code>getSymbolInfo()</code> nhưng không gì đọc nó.
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">Những tên không đổi</h3>
<p>
  Các tên này rất giống nhau, nên hãy cẩn thận khi tìm và thay hàng loạt. Thiết lập của widget vẫn viết là
  <code>timezone</code>:
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  Hai khoá chuỗi của widget, <code>settings.timezone</code> và <code>menu.chart.timezone</code>, cũng giữ nguyên tên.
</p>

<h3 id="find">Cách tìm</h3>
<p>
  Tìm trong code của bạn <code>Timezone(</code> và <code>EXCHANGE_TIMEZONE</code>, cùng với <code>timezone:</code>
  bên trong các object mô tả mã. TypeScript báo lỗi ở từng tên đã gỡ.
</p>

<h2 id="behaviour">Hành vi đã đổi</h2>
<p>Các thay đổi sau không kèm theo việc đổi tên nào.</p>
<ul>
  <li>
    <strong>Nhãn trục giá ở mép pane.</strong> Nhãn nào sẽ bị mép trên hoặc mép dưới của pane cắt mất thì không
    được vẽ. Đường lưới của nó vẫn còn.
  </li>
  <li>
    <strong>Pane giá giữa nhiều pane.</strong> Dù mở bao nhiêu pane chỉ báo, pane giá vẫn giữ ít nhất 38,2% chiều
    cao của chart, và các pane đang mở chia phần còn lại theo tỉ lệ kích thước của chúng. Kích thước đã đặt cho một
    pane được giữ lại, và hiện đúng trở lại khi chart cao hơn. Trước đây các pane giữ nguyên chiều cao và có thể
    không chừa lại gì cho pane giá.
  </li>
  <li>
    <strong>Độ rộng nét nằm giữa hai số pixel nguyên.</strong> Một nét có độ rộng như vậy lấy số pixel thiết bị
    nguyên ngay bên dưới: 1,5 px là một pixel thiết bị ở tỉ lệ 100%, trước đây là hai.
  </li>
  <li>
    <strong><code>setBarLayout()</code> và <code>setDensity()</code>.</strong> Kiểu nến đặt bằng
    <code>chart.setBarLayout()</code> khi chart đang chạy được giữ lại qua một lần <code>setDensity()</code> sau đó.
  </li>
</ul>

<h2 id="unchanged">Không thay đổi</h2>
<ul>
  <li>
    Dữ liệu: <code>DataAdapter</code>, <code>DataFeed</code>, <code>setData</code>, <code>appendBar</code> và
    <code>updateLastBar</code>.
  </li>
  <li>Bố cục và thiết lập đã lưu từ 1.x vẫn tải được như trước.</li>
  <li>Chỉ báo, hình vẽ, giao dịch, chủ đề màu và các khoá style giữ nguyên tên.</li>
</ul>
