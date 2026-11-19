<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Widget nhúng — Tài liệu TradeCanvas</title>
  <meta name="description" content="Nhúng một biểu đồ giao dịch đã cấu hình đầy đủ vào trang bất kỳ qua một URL iframe." />
</svelte:head>

<h1>Widget nhúng</h1>
<p>
  Đặt một biểu đồ giao dịch đã cấu hình đầy đủ vào trang bất kỳ qua một URL
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
    <tr><td><code>chartType</code></td><td><code>candlestick</code></td><td>Một trong 18 loại.</td></tr>
    <tr><td><code>indicators</code></td><td><em>không có</em></td><td>Các id cách nhau bằng dấu phẩy, ví dụ <code>indicators=sma,rsi</code>.</td></tr>
    <tr><td><code>trading</code></td><td><code>false</code></td><td>Hiện panel giao dịch.</td></tr>
  </tbody>
</table>

<h2 id="mobile-app">Trong ứng dụng điện thoại</h2>
<p>
  Biểu đồ và widget chạy trong WebView bất kỳ: React Native (<code>react-native-webview</code>), Capacitor, Tauri, hoặc WebView riêng của ứng dụng native. Khi rộng dưới 641 px, widget chuyển sang bố cục cho điện thoại: toolbar giữ mã, khung thời gian, loại biểu đồ và chỉ báo, phần còn lại đưa vào “thêm”; công cụ vẽ nằm sau một nút trên biểu đồ; menu mở dạng sheet từ dưới lên; grid hiện từng biểu đồ một, mỗi biểu đồ một tab. Ở độ rộng lớn hơn, toolbar không đủ chỗ cũng xử lý như vậy. Từ khoảng 320 px trở lên, hoặc hẹp hơn nhiều nếu không có item riêng của bạn, thanh trạng thái giữ đồng hồ hiển thị đầy đủ: khi thiếu chỗ, các preset khoảng thời gian thu vào “thêm”, preset dài nhất trước, rồi đến nút đi tới ngày, cuối cùng trạng thái thị trường rút còn một từ (“Closed”). Ngón tay làm được những gì chuột làm.
</p>
<p>Đặt cho trang một viewport phủ toàn màn hình. Widget giữ các sheet tránh tai thỏ và thanh home, và nằm trên bàn phím ảo.</p>
<pre><code>{`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`}</code></pre>
<p>Phần lớn WebView báo trang bị ẩn khi ứng dụng chạy nền: khi đó biểu đồ tự ngừng vẽ (<code>pauseWhenHidden</code>), và một stream im lặng quá lâu sẽ kết nối lại khi ứng dụng quay lại. Nếu WebView của bạn không làm vậy, tạm dừng biểu đồ từ phía ứng dụng.</p>
<pre><code>{`// React Native (react-native-webview): the app tells the page
AppState.addEventListener('change', (state) => {
  webview.current?.injectJavaScript(state === 'active' ? 'chart.resume(); true;' : 'chart.suspend(); true;');
});

// Capacitor
import { App } from '@capacitor/app';
App.addListener('appStateChange', ({ isActive }) => (isActive ? chart.resume() : chart.suspend()));`}</code></pre>
<p>Biểu đồ nằm trong một màn hình cuộn được thì để thao tác vuốt dọc cho màn hình.</p>
<pre><code>{`new Chart(host, { pageScroll: true })   // a chart in a screen that scrolls`}</code></pre>
<p>
  Content security policy của Tauri phải cho phép trang truy cập các host của feed dữ liệu. Widget cũng cần <code>style-src 'unsafe-inline'</code> cho phần tử <code>&lt;style&gt;</code> duy nhất mà nó thêm vào, và <code>img-src data:</code> cho các icon nhỏ trong field và checkbox: thiếu cái thứ nhất thì widget hiện ra không có style, thiếu cái thứ hai thì field và checkbox mất icon. Sao chép ảnh biểu đồ không cần thêm gì.
</p>
<pre><code>{`// tauri.conf.json (Tauri 2): the feed's hosts, the widget's styles and icons
"app": {
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.binance.com wss://stream.binance.com:9443; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  }
}`}</code></pre>
<p>
  Tauri thêm một nonce vào <code>style-src</code> cho mỗi phần tử <code>&lt;style&gt;</code> trong HTML của trang (và một hash trong isolation pattern), và trình duyệt bỏ qua <code>'unsafe-inline'</code> khi đã có nonce, nên style của widget lại bị chặn. Đặt style của trang trong các file stylesheet, hoặc liệt kê <code>"style-src"</code> trong <code>dangerousDisableAssetCspModification</code>.
</p>
<p>
  Biểu đồ vẽ với pixel ratio tối đa là 2 (<code>maxPixelRatio</code>); huỷ biểu đồ (<code>chart.destroy()</code>) khi màn hình chứa nó đóng lại, bộ nhớ canvas được trả lại ngay.
</p>

<h2>Trang chạy thật</h2>
<p>
  Mở trực tiếp <a href="{base}/embed">route embed</a> để xem trước mà không có
  khung giao diện của trang tài liệu.
</p>
