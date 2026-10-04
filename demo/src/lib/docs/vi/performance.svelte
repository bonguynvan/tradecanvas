<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Hiệu năng — Tài liệu TradeCanvas</title>
  <meta name="description" content="Cách TradeCanvas giữ tốc độ: render bằng hai canvas, chỉ xử lý khoảng đang hiện, chỉ báo tính tăng dần, nạp toàn bộ dữ liệu với chi phí thấp, giảm mẫu LTTB — kèm số liệu benchmark." />
</svelte:head>

<h1>Hiệu năng</h1>
<p>
  Quy trình Canvas2D hai canvas chỉ vẽ lại phần đã thay đổi, và mọi bước trong mỗi khung hình
  chỉ phụ thuộc vào những gì đang hiện trên màn hình, không phụ thuộc vào lượng lịch sử đã nạp. Số liệu bên dưới lấy từ
  <code>pnpm bench</code> (một nhân) và từ việc profile widget đang chạy;
  <a href={href('/') + '#lab-title'}>Feature Lab</a> đo thời gian các lần chuyển thực tế ngay khi bạn bấm.
</p>

<h2>Khung hình: không đổi từ 500 đến 100,000 nến</h2>
<ul>
  <li><strong>Hai canvas</strong> — một canvas cảnh (lưới, chuỗi giá, chỉ báo, đối tượng trên biểu đồ, trục) và một canvas mỏng phía trên cho con trỏ chữ thập, chú thích và các phần hiển thị khác bám theo con trỏ. Khi rê chuột, chỉ canvas phía trên được vẽ lại (~0.2 ms), và trình duyệt chỉ ghép hai bề mặt chứ không phải bốn.</li>
  <li><strong>Render theo khoảng đang hiện</strong> — mọi bộ render, phần tự co giãn thang và khoảng giá của chỉ báo chỉ duyệt các nến đang nằm trong khung nhìn.</li>
  <li><strong>Không tạo rác mỗi khung hình</strong> — ảnh chụp trạng thái khung nhìn được cache giữa các lần thay đổi; bộ định dạng số và ngày được dùng lại thay vì tạo mới cho từng nhãn.</li>
  <li><strong>Trục giá tự đổi độ rộng</strong> — việc khớp trục theo nhãn dài nhất tốn ~0.05 ms và chỉ bố trí lại khi độ rộng thực sự thay đổi.</li>
</ul>

<h2>Tick trực tiếp: chỉ báo tính tăng dần</h2>
<p>
  Một tick chỉ làm thay đổi nến đang hình thành, nên các chỉ báo có cài đặt <code>update()</code> chỉ tính lại
  đúng nến đó (SMA, EMA, WMA, VWMA, Bollinger, Envelope, RSI, MACD, ATR, OBV, Stochastic). Các chỉ báo khác
  quay về tính lại toàn bộ. BB + EMA + RSI + MACD:
</p>
<table>
  <thead><tr><th>Lịch sử</th><th>Tính lại toàn bộ</th><th><code>update()</code> tăng dần</th></tr></thead>
  <tbody>
    <tr><td>20,000 nến</td><td>~5 ms</td><td>~0.0005 ms</td></tr>
    <tr><td>100,000 nến</td><td>~27 ms</td><td>~0.001 ms</td></tr>
  </tbody>
</table>
<p>
  Chỉ báo tuỳ chỉnh cũng có thể dùng cơ chế này — xem <a href={href('/docs/plugins')}>Plugin → cập nhật trực tiếp nhanh</a>.
</p>

<h2>Đổi mã hoặc khung thời gian</h2>
<ul>
  <li><strong>Nạp toàn bộ dữ liệu với chi phí thấp</strong> — giá trị chỉ báo nằm trong một <code>IndicatorValueMap</code> (dựa trên mảng, dựng rẻ hơn ~3× so với một <code>Map</code> dùng timestamp làm khoá), và <code>setData</code> dùng lại các nến vẫn còn hợp lệ thay vì sao chép chúng.</li>
  <li><strong>Chỉ hiện trạng thái đang tải khi thật sự chậm</strong> — biểu đồ trước vẫn hiện; lớp phủ mờ chỉ xuất hiện nếu một lần chuyển kéo dài quá 200 ms, nên một lần chuyển qua mạng bình thường ~130 ms không bao giờ bị nháy.</li>
  <li><strong>Không có dữ liệu cũ lẫn vào</strong> — các yêu cầu lịch sử đã bị thay thế sẽ bị bỏ và các socket cũ được tách ra, nên lần bấm cuối cùng luôn thắng.</li>
  <li><strong>Lấy mẫu lại cục bộ</strong> — dữ liệu tĩnh đổi khung thời gian mà không cần tải lại; những lần lấy mẫu lại chậm sẽ vẽ lớp phủ mờ trước khi luồng chính bận.</li>
</ul>

<h2>Giảm mẫu LTTB</h2>
<p>
  Biểu đồ đường và vùng giảm mẫu khoảng đang hiện xuống ~2 điểm mỗi pixel bằng
  <strong>Largest-Triangle-Three-Buckets</strong> khi số nến nhiều hơn hẳn số pixel — đường
  trông vẫn y hệt trong khi số điểm phải vẽ ít hơn hàng chục lần. Ở mức zoom bình thường thì không có tác dụng gì. Thuật toán
  được export để bạn tự dùng:
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>Số điểm đang hiện → 1600</th><th>Thời gian / khung hình</th><th>Thông lượng</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>~0.025 ms</td><td>39,600 / s</td></tr>
    <tr><td>100,000</td><td>~0.32 ms</td><td>3,100 / s</td></tr>
    <tr><td>1,000,000</td><td>~2.6 ms</td><td>380 / s</td></tr>
  </tbody>
</table>

<h2>Chỉ báo khi thu nhỏ</h2>
<p>
  Khi mỗi nến hẹp hơn một pixel, đường, dải và histogram của chỉ báo được vẽ thành một đoạn cho mỗi cột pixel: từ điểm thấp nhất tới cao nhất trong cột, nối với cột trước, rộng bằng nét đường. Cách này trông gần như y hệt nét vẽ qua hàng nghìn điểm, nhưng tốn ít công raster hơn hẳn. Khi thu nhỏ trên 200.000 nến với Bollinger Bands, EMA, RSI và MACD, mỗi khung hình giảm từ khoảng 54 ms xuống khoảng 21 ms trên GPU tích hợp. <code>node scripts/bench-render.mjs</code> chạy các số đo này trên máy của bạn.
</p>

<h2>Bộ vẽ WebGL (bản xem trước)</h2>
<p>
  <code>renderer: 'webgl'</code> vẽ lưới, vùng tô phiên, vạch ngắt phiên, nến và khối lượng bằng WebGL 2, trên một canvas nằm dưới cảnh 2D; chỉ báo, hình vẽ, trục và crosshair vẫn vẽ bằng Canvas 2D. <code>'auto'</code> chỉ dùng WebGL khi có GPU phần cứng. Điểm ảnh khớp với Canvas 2D, lệch không quá 2/255. Mã WebGL nằm trong một chunk riêng (khoảng 6 KB sau gzip), chỉ tải khi dùng lần đầu; nơi không có WebGL 2, hoặc khi mất context, biểu đồ tiếp tục vẽ bằng Canvas 2D.
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' }

await chart.setRenderer('canvas')   // resolves to what draws now`}</code></pre>
<p>Thời gian mỗi khung hình khi kéo, trên GPU tích hợp (Intel UHD; 16.7 ms là 60 fps):</p>
<table>
  <thead><tr><th>Biểu đồ</th><th>Tỉ lệ điểm ảnh</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900, 2,000 nến</td><td>2</td><td>23.3 ms</td><td>17.6 ms</td></tr>
    <tr><td>1600×900, thu nhỏ trên 200,000 nến</td><td>2</td><td>25.1 ms</td><td>18.2 ms</td></tr>
    <tr><td>2560×1400, 2,000 nến</td><td>1.5</td><td>28.8 ms</td><td>20.9 ms</td></tr>
    <tr><td>2560×1400, 2,000 nến</td><td>2</td><td>38.1 ms</td><td>22.5 ms</td></tr>
    <tr><td>Sáu biểu đồ, mỗi cái 500 nến và hai chỉ báo</td><td>2</td><td>33.4 ms</td><td>24 ms</td></tr>
  </tbody>
</table>
<p>
  Chỉ báo vẫn vẽ bằng Canvas 2D, nên biểu đồ nhiều chỉ báo được lợi ít hơn: 2560×1400 với bốn chỉ báo ở tỉ lệ 2 giảm từ 138 xuống 97 ms. Ở kích thước và tỉ lệ đó, riêng việc trình duyệt ghép các lớp full-size đã mất khoảng 23 ms trên GPU này. <code>node scripts/bench-render.mjs --renderer=webgl</code> chạy các số đo này trên máy của bạn.
</p>

<h2>Ngoài luồng chính</h2>
<p>
  <code>IndicatorWorkerHost</code> chạy phần tính toán chỉ báo trong một Web Worker với <code>calculate()</code>
  trả về Promise, thời gian chờ tối đa cho từng yêu cầu, và phương án chạy đồng bộ dự phòng cho SSR và test.
</p>
