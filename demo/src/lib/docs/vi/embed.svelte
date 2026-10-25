<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Widget nhúng — Tài liệu TradeCanvas</title>
  <meta name="description" content="Nhúng một biểu đồ giao dịch đã cấu hình đầy đủ vào bất kỳ trang nào chỉ bằng một URL iframe." />
</svelte:head>

<h1>Widget nhúng</h1>
<p>
  Đưa một biểu đồ giao dịch đã cấu hình đầy đủ vào bất kỳ trang nào chỉ bằng một URL
  <code>&lt;iframe&gt;</code>. Không cần npm install, không cần bước build.
</p>

<h2>Iframe cơ bản</h2>
<pre><code>{`<iframe
  src="https://your-site/tradecanvas/embed/?symbol=BTCUSDT&timeframe=5m&theme=dark"
  width="800"
  height="500"
  style="border: 0; border-radius: 12px;"
></iframe>`}</code></pre>

<h2>Tham số URL</h2>
<table>
  <thead><tr><th>Tham số</th><th>Mặc định</th><th>Ghi chú</th></tr></thead>
  <tbody>
    <tr><td><code>symbol</code></td><td><code>BTCUSDT</code></td><td>Mã trên Binance.</td></tr>
    <tr><td><code>timeframe</code></td><td><code>5m</code></td><td><code>1m</code>, <code>5m</code>, <code>15m</code>, <code>1h</code>, <code>4h</code>, <code>1d</code>.</td></tr>
    <tr><td><code>theme</code></td><td><code>dark</code></td><td><code>dark</code>, <code>light</code>, <code>darkTerminal</code>.</td></tr>
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Bất kỳ loại nào trong 18 loại.</td></tr>
    <tr><td><code>indicators</code></td><td><em>không có</em></td><td>Các id cách nhau bằng dấu phẩy, ví dụ <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Hiện bảng giao dịch.</td></tr>
  </tbody>
</table>

<h2 id="mobile-app">Trong ứng dụng điện thoại</h2>
<p>
  Biểu đồ và widget chạy trong mọi WebView: React Native (<code>react-native-webview</code>), Capacitor, Tauri, hay WebView riêng của ứng dụng native. Hẹp hơn 641 px, widget tự bố trí cho điện thoại: thanh công cụ giữ mã, khung thời gian, loại biểu đồ và chỉ báo, phần còn lại nằm trong nút “thêm”; công cụ vẽ nằm sau một nút trên biểu đồ; menu mở thành bảng trượt từ dưới lên; lưới chỉ hiện một biểu đồ mỗi lúc, mỗi biểu đồ một tab. Rộng hơn, thanh công cụ không vừa cũng làm như vậy. Ngón tay làm được mọi việc của chuột.
</p>
<p>Cho trang một viewport phủ cả màn hình. Widget giữ các bảng trượt tránh tai thỏ và thanh home, và nằm trên bàn phím ảo.</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>Phần lớn WebView báo trang bị ẩn khi ứng dụng xuống nền: biểu đồ tự ngừng vẽ (<code>pauseWhenHidden</code>), và luồng dữ liệu im lặng quá lâu sẽ kết nối lại khi ứng dụng trở lại. Nếu WebView của bạn không báo, hãy tạm dừng từ phía ứng dụng.</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>Biểu đồ nằm trong một màn hình có cuộn thì để vuốt dọc cho màn hình.</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>
  Chính sách bảo mật nội dung (CSP) của Tauri phải cho trang kết nối tới máy chủ của nguồn dữ liệu. Widget còn cần <code>style-src 'unsafe-inline'</code> cho thẻ <code>&lt;style&gt;</code> duy nhất mà nó chèn vào, và <code>img-src data:</code> cho các biểu tượng nhỏ trong ô nhập và ô đánh dấu của nó: thiếu cái đầu, widget hiện ra không có kiểu dáng; thiếu cái sau, các ô nhập mất biểu tượng. Sao chép ảnh biểu đồ không cần thêm gì nữa.
</p>
<pre><code>{`// tauri.conf.json (Tauri 2): the feed's hosts, the widget's styles and icons
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  }
}`}</code></pre>
<p>
  Tauri thêm một nonce vào <code>style-src</code> cho mỗi thẻ <code>&lt;style&gt;</code> trong HTML của chính trang (và một mã băm khi dùng isolation pattern), mà khi đã có nonce thì trình duyệt bỏ qua <code>'unsafe-inline'</code>, nên kiểu dáng của widget lại bị chặn. Hãy để kiểu dáng của trang trong các tệp stylesheet, hoặc ghi <code>"style-src"</code> vào <code>dangerousDisableAssetCspModification</code>.
</p>
<p>
  Biểu đồ vẽ ở mật độ điểm ảnh tối đa 2 (<code>maxPixelRatio</code>); huỷ nó (<code>chart.destroy()</code>) khi màn hình đóng, bộ nhớ canvas được trả lại ngay.
</p>

<h2>Trang trực tiếp</h2>
<p>
  Mở thẳng <a href="{base}/embed">trang embed</a> để xem trước mà không có
  khung giao diện của trang tài liệu.
</p>
