<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Hiệu năng — Tài liệu TradeCanvas</title>
  <meta name="description" content="Cách TradeCanvas giữ tốc độ: render bằng hai canvas, chỉ xử lý khoảng đang hiển thị, chỉ báo tính tăng dần, nạp toàn bộ dữ liệu với chi phí thấp, giảm mẫu LTTB, kèm số liệu benchmark." />
</svelte:head>

<h1>Hiệu năng</h1>
<p>
  Pipeline Canvas2D hai canvas chỉ vẽ lại phần đã thay đổi, và mọi bước trong mỗi frame
  bị giới hạn theo những gì đang hiển thị trên màn hình, không theo lượng dữ liệu lịch sử đã nạp. Các số liệu dưới đây lấy từ
  <code>pnpm bench</code> (một nhân) và từ việc profile widget đang chạy;
  <a href={href('/') + '#lab-title'}>Feature Lab</a> đo thời gian các thao tác chuyển đổi thật khi bạn click.
</p>

<h2>Frame: không đổi từ 500 đến 100,000 nến</h2>
<ul>
  <li><strong>Hai canvas</strong>: một canvas scene (lưới, chuỗi giá, chỉ báo, đối tượng trên biểu đồ, trục) và một canvas mỏng phía trên cho crosshair, legend và các phần hiển thị khác gắn với con trỏ. Khi rê chuột chỉ canvas phía trên được vẽ lại (~0.2 ms), và trình duyệt composite hai bề mặt, không phải bốn.</li>
  <li><strong>Render theo khoảng đang hiển thị</strong>: mọi renderer, phần tự co giãn thang và khoảng giá của chỉ báo chỉ duyệt các nến trong khung nhìn.</li>
  <li><strong>Không tạo rác mỗi frame</strong>: snapshot của viewport được cache giữa các lần thay đổi; các hàm định dạng số và ngày được dùng lại thay vì tạo mới cho mỗi nhãn.</li>
  <li><strong>Trục giá tự đặt kích thước</strong>: căn trục theo nhãn dài nhất tốn ~0.05 ms và chỉ tính lại layout khi chiều rộng thật sự thay đổi.</li>
</ul>

<h2>Tick live: chỉ báo tính tăng dần</h2>
<p>
  Một tick chỉ thay đổi nến đang hình thành, nên chỉ báo có <code>update()</code> riêng chỉ tính lại nến đó: ATR, Bollinger Bands, Chande Kroll Stop, DEMA, EMA, Envelope, KAMA, MACD, MA Cross, McGinley Dynamic, OBV, RSI, SMA, SMMA, Stochastic, Ulcer Index, Volume Oscillator, VWMA, WMA. 31 chỉ báo khác được xây trên <code>PointwiseIndicator</code> và tiếp tục từ nến cuối theo cùng cách, và chỉ báo đọc đường của chỉ báo khác cũng tiếp tục như vậy. Khi các nến mà chỉ báo ghi nhớ không còn khớp, nó tính lại toàn bộ. BB + EMA + RSI + MACD:
</p>
<table>
  <thead><tr><th>Dữ liệu lịch sử</th><th>Tính lại toàn bộ</th><th><code>update()</code> tăng dần</th></tr></thead>
  <tbody>
    <tr><td>20,000 nến</td><td>~5 ms</td><td>~0.0005 ms</td></tr>
    <tr><td>100,000 nến</td><td>~27 ms</td><td>~0.001 ms</td></tr>
  </tbody>
</table>
<p>
  Chỉ báo tuỳ chỉnh cũng có thể dùng cơ chế này, xem <a href={href('/docs/plugins')}>Plugins → cập nhật live nhanh</a>.
</p>

<h2>Đổi mã hoặc khung thời gian</h2>
<ul>
  <li><strong>Nạp toàn bộ với chi phí thấp</strong>: giá trị chỉ báo nằm trong <code>IndicatorValueMap</code> (dựa trên mảng, tạo nhanh hơn ~3 lần so với <code>Map</code> có key là timestamp), và <code>setData</code> dùng lại các nến còn hợp lệ thay vì sao chép chúng.</li>
  <li><strong>Chỉ báo đang tải khi chậm</strong>: biểu đồ cũ vẫn hiển thị; lớp phủ đang tải chỉ xuất hiện nếu thao tác chuyển kéo dài quá 200 ms, nên một lần chuyển qua mạng thông thường ~130 ms không bị nháy.</li>
  <li><strong>Không có dữ liệu cũ</strong>: các yêu cầu dữ liệu lịch sử đã bị thay thế sẽ bị bỏ, và socket cũ được tách ra, nên lần click cuối luôn được áp dụng.</li>
  <li><strong>Resample tại chỗ</strong>: dữ liệu tĩnh đổi khung thời gian mà không cần tải lại; khi resample chậm, lớp phủ đang tải được vẽ trước khi main thread bận.</li>
</ul>

<h2>Giảm mẫu LTTB</h2>
<p>
  Biểu đồ đường và biểu đồ vùng giảm mẫu khoảng đang hiển thị xuống ~2 điểm mỗi pixel bằng
  <strong>Largest-Triangle-Three-Buckets</strong> khi số nến nhiều hơn số pixel rất nhiều: đường
  trông như cũ trong khi số điểm phải vẽ ít hơn hàng chục lần. Ở mức zoom thông thường, bước này không làm gì. Thuật
  toán được export để dùng riêng:
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>Số điểm hiển thị → 1600</th><th>Thời gian / frame</th><th>Thông lượng</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>~0.025 ms</td><td>39,600 / s</td></tr>
    <tr><td>100,000</td><td>~0.32 ms</td><td>3,100 / s</td></tr>
    <tr><td>1,000,000</td><td>~2.6 ms</td><td>380 / s</td></tr>
  </tbody>
</table>

<h2>Chỉ báo khi zoom xa</h2>
<p>
  Khi mỗi nến chiếm dưới một pixel, đường, dải và histogram của chỉ báo vẽ một đoạn cho mỗi cột pixel: từ điểm thấp nhất đến điểm cao nhất của cột, nối với cột trước, rộng bằng nét đường. Kết quả trông gần như giống một nét vẽ qua hàng nghìn điểm, với một phần nhỏ khối lượng raster. Khi zoom xa trên 200,000 nến với Bollinger Bands, EMA, RSI và MACD, một frame giảm từ khoảng 54 ms xuống khoảng 21 ms trên GPU tích hợp. <code>node scripts/bench-render.mjs</code> chạy các phép đo này trên máy của bạn.
</p>

<h2>Renderer WebGL (preview)</h2>
<p>
  <code>renderer: 'webgl'</code> vẽ vùng giá và các pane chỉ báo bằng WebGL 2, trên một canvas nằm dưới scene 2D: lưới, phiên, nến và khối lượng được vẽ trực tiếp, còn phần vẽ Canvas 2D của chỉ báo, đường so sánh và phần lớn các loại biểu đồ được ghi lại thành nét, vùng tô và hình chữ nhật trên GPU, khử răng cưa ở cạnh như Canvas 2D. Depth heatmap, volume profile và market profile được ghi lại theo cùng cách, nằm dưới nến; market profile đang hiện phần thống kê hoặc chữ cái thì vẫn dùng Canvas 2D. Chữ, hình vẽ, order, trục và crosshair vẫn ở Canvas 2D, cùng mọi thứ mà GPU không vẽ giống hệt (để lại cho Canvas 2D theo đúng thứ tự, nên thứ tự chồng lớp không đổi); plugin chỉ báo tuỳ chỉnh dùng được mà không cần sửa. Nến nằm trên đúng các pixel thiết bị như với Canvas 2D; đường và vùng tô chỉ khác ở vài pixel cạnh được khử răng cưa. Code WebGL là một chunk riêng (khoảng 17 KB gzip), tải ở lần dùng đầu tiên; khi không có WebGL 2, hoặc context bị mất, biểu đồ tiếp tục với Canvas 2D. Nếu context trở lại, WebGL cũng trở lại. Tối đa 8 biểu đồ trên một trang vẽ bằng WebGL cùng lúc (<code>setMaxWebGLCharts</code>), vì Chrome và Safari chỉ giữ khoảng 16 WebGL context mỗi trang và bỏ context cũ nhất khi vượt quá; biểu đồ vượt giới hạn vẽ bằng Canvas 2D cho đến khi có một biểu đồ nhả context. Đã kiểm tra trên Chrome, Firefox và WebKit.
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl', reason?: 'contextRestored' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' | 'limit' }

await chart.setRenderer('canvas')   // resolves to what draws now

setMaxWebGLCharts(4)   // from '@tradecanvas/chart': at most 4 charts on the page draw with WebGL (8 by default)`}</code></pre>
<p>Thời gian mỗi frame khi pan, trên GPU tích hợp (Intel UHD; 16.7 ms là 60 fps):</p>
<table>
  <thead><tr><th>Biểu đồ</th><th>Pixel ratio</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900, 500 nến + 4 chỉ báo</td><td>2</td><td>27.4 ms</td><td>19.6 ms</td></tr>
    <tr><td>1600×900, zoom xa trên 200,000 nến + 4 chỉ báo</td><td>2</td><td>34.5 ms</td><td>20.2 ms</td></tr>
    <tr><td>1600×900, zoom xa trên 1,000,000 nến + 4 chỉ báo</td><td>2</td><td>34.5 ms</td><td>16.7 ms</td></tr>
    <tr><td>1600×900, depth heatmap, 240 snapshot × 80 mức giá</td><td>2</td><td>25.5 ms</td><td>16.8 ms</td></tr>
    <tr><td>Sáu biểu đồ, mỗi biểu đồ 500 nến và hai chỉ báo</td><td>2</td><td>23.5 ms</td><td>17.2 ms</td></tr>
    <tr><td>2560×1400, 2,000 nến + 4 chỉ báo</td><td>1</td><td>41.6 ms</td><td>17.7 ms</td></tr>
    <tr><td>2560×1400, 2,000 nến + 4 chỉ báo</td><td>1.5</td><td>70.8 ms</td><td>17.6 ms</td></tr>
    <tr><td>2560×1400, 2,000 nến + 4 chỉ báo</td><td>2</td><td>114.5 ms</td><td>29.1 ms</td></tr>
    <tr><td>2560×1400, 2,000 nến</td><td>2</td><td>33.1 ms</td><td>20.9 ms</td></tr>
  </tbody>
</table>
<p>
  Phần lớn các frame WebGL ở trên đạt 16.7 ms; giá trị trung bình bị kéo lên bởi vài frame dài hơn. Ở pixel ratio 2 trên biểu đồ 2560×1400, riêng việc trình duyệt composite các layer kích thước đầy đủ đã mất khoảng 23 ms trên GPU này. <code>node scripts/bench-render.mjs --renderer=webgl</code> chạy các phép đo này trên máy của bạn.
</p>
<p>
  Một nến không bao giờ hẹp hơn một phần tư pixel CSS, nên “zoom xa trên 1,000,000 nến” hiển thị khoảng bốn nến mỗi pixel (khoảng 6,400 nến trên biểu đồ rộng 1600 px); scene pan qua phần còn lại của một triệu nến.
</p>

<h2 id="mobile">Điện thoại và ứng dụng</h2>
<p>
  Điện thoại có màn hình 3x, CPU chậm hơn và dùng pin. Biểu đồ vẽ ở pixel ratio tối đa là 2 (<code>maxPixelRatio</code>): ít hơn 56% số pixel so với 3x, còn đường nét chỉ mềm hơn rất ít. Biểu đồ ngừng vẽ khi nằm ngoài màn hình hoặc khi trang bị ẩn (<code>pauseWhenHidden</code>), và ứng dụng nhúng biểu đồ trong WebView có thể tạm dừng bằng <code>suspend()</code>. Feed live gửi tick nhanh hơn tốc độ frame thì chỉ báo được tính lại một lần mỗi frame, trước khi có phần nào đọc chúng. Khi trang hoặc mạng hoạt động trở lại, stream im lặng quá lâu sẽ kết nối lại ngay thay vì chờ heartbeat; biểu đồ đã destroy trả lại bộ nhớ canvas ngay lập tức.
</p>
<pre><code>{`new Chart(host, {
  maxPixelRatio: 2,       // the default; Infinity draws at the screen's own
  pauseWhenHidden: true,  // the default: no frames off screen or on a hidden page
})
chart.suspend()   // your app went to the background (a WebView): stop drawing
chart.resume()    // back: one frame draws what changed`}</code></pre>
<p>Đo trên màn hình điện thoại (390 × 844 ở 3x, CPU bị làm chậm 4 lần, GPU tích hợp), một biểu đồ với bốn chỉ báo:</p>
<table>
  <thead><tr><th></th><th>Trước</th><th>Hiện tại</th></tr></thead>
  <tbody>
    <tr><td>Vẽ scene, 300 nến</td><td>34 ms</td><td>25 ms</td></tr>
    <tr><td>Live, 2 tick mỗi frame</td><td>18.5 ms</td><td>11–13 ms</td></tr>
    <tr><td>Bộ nhớ canvas</td><td>17.1 MB</td><td>7.6 MB</td></tr>
  </tbody>
</table>
<p>
  Widget trên màn hình cảm ứng: ô nhập cỡ 16 px để trang không zoom khi ô nhập được focus, các sheet nằm trên bàn phím ảo, chiều cao theo đơn vị dynamic viewport. Để đo trên máy của bạn: <code>node scripts/bench-render.mjs --mobile</code>.
</p>

<h2 id="soak">Mười phút với feed dày đặc</h2>
<p>
  Một màn hình giao dịch live để chạy liên tục: widget đầy đủ trên 1,000,000 nến một giây, vẽ bằng WebGL, bốn chỉ báo, một position kèm stop và mục tiêu, các order đang chờ được fill, đặt lại và di chuyển, bid và ask, một depth heatmap, và một feed 30,000 giao dịch mỗi giây từ một worker đóng vai socket. Mỗi giao dịch đến biểu đồ dưới dạng một tick. Cứ 30 giây, bài soak thu gom rác và đọc lượng bộ nhớ còn giữ.
</p>
<table>
  <thead><tr><th>Chỉ số đo</th><th>Ở phút 1</th><th>Ở phút 10</th></tr></thead>
  <tbody>
    <tr><td>JS heap sau khi thu gom</td><td>418.0 MB</td><td>418.3 MB</td></tr>
    <tr><td>Số DOM node</td><td>1,220</td><td>1,220</td></tr>
    <tr><td>Số event listener</td><td>364</td><td>364</td></tr>
    <tr><td>Số giao dịch nhận mỗi giây</td><td>30,027</td><td>29,998</td></tr>
    <tr><td>Số frame mỗi giây</td><td>56.7</td><td>56.4</td></tr>
    <tr><td>Frame p95</td><td>18.2 ms</td><td>18.2 ms</td></tr>
    <tr><td>Task trên main thread dài hơn 50 ms</td><td>0</td><td>0</td></tr>
  </tbody>
</table>
<p>
  Heap tăng 0.3 MB trong chín phút: 600 nến mới và giá trị chỉ báo của chúng. Việc nhận các giao dịch tốn khoảng 1% main thread; phần lớn thời gian của một frame là để vẽ. Ở bản 1.68.0, cùng màn hình này vẽ khoảng 29 frame mỗi giây với một task 50 ms mỗi giây: trục thời gian duyệt thời gian của mọi nến ở mỗi frame, các đường phân ngày duyệt toàn bộ dữ liệu lịch sử cho mỗi nến mới, và heatmap sắp xếp giá của từng snapshot ở mỗi frame. Headless Chrome trên Intel UHD 770. Để chạy trên máy của bạn:
</p>
<pre><code>{`pnpm build
pnpm soak                          # 10 minutes, 30,000 trades/s, 1,000,000 bars, WebGL
pnpm soak --minutes=30 --rate=50000 --renderer=canvas`}</code></pre>

<h2 id="download">Dung lượng trang phải tải</h2>
<p>
  <code>new ChartWidget()</code> kéo theo 386 kB JavaScript gzip (1.46 MB trước khi nén), gồm cả chuỗi tiếng Anh. Các dialog mà trang không cần khi tải (dialog chỉ báo, command palette, tìm mã, Cài đặt biểu đồ, cài đặt của chỉ báo và hình vẽ, Đi tới và bảng phím tắt) thêm 34 kB. Chúng được tải lần đầu khi một dialog được mở, hoặc khi trang rảnh sau khi widget đã hiển thị, tuỳ điều nào đến trước. Worker chỉ báo (<code>indicatorWorker: 'auto'</code>) thêm 36 kB, tải lần đầu khi một biểu đồ gửi việc cho nó, không bao giờ tải với <code>'off'</code>. Bundler tách chúng thành các file riêng; khi dùng thẳng từ package, chúng nằm trong thư mục <code>dist</code> cạnh các entry, nên hãy sao chép cả thư mục. <code>pnpm size</code>, sau <code>pnpm build</code>, in các số liệu này cho từng entry.
</p>

<h2 id="worker">Main thread</h2>
<p>
  Mặc định chỉ báo được tính trên main thread. Với <code>indicatorWorker: 'auto'</code>, việc tính toàn bộ (khi <code>setData</code>, đổi mã hoặc khung thời gian, thêm chỉ báo hoặc đổi tham số) trên 50,000 nến trở lên được chuyển sang một Web Worker đi kèm package. Code của worker được inline trong một chunk tải ở lần đầu cần dùng và khởi động từ một Blob URL, nên không cần phục vụ file nào, và một worker phục vụ mọi biểu đồ trên trang. Các nến được gửi sang worker dưới dạng các cột số và kết quả trả về theo cùng cách, được chuyển lại thành điểm theo từng lát nến, nên trang vẫn vẽ và phản hồi thao tác. Tick live vẫn được tính tăng dần trên main thread.
</p>
<pre><code>{`new Chart(el, { indicatorWorker: 'auto' })
new ChartWidget(el, { chartOptions: { indicatorWorker: 'auto' } })`}</code></pre>
<p>
  Cho đến khi có kết quả, biểu đồ tiếp tục vẽ kết quả cũ: sau khi đổi mã hoặc khung thời gian là các đường của chuỗi trước; với chỉ báo vừa thêm thì không vẽ gì. Khi đọc giá trị, bằng <code>getIndicatorOutput</code> hoặc qua export, phần nào còn trong worker sẽ được tính trước trên main thread, nên giá trị đọc ra không bao giờ cũ, và cảnh báo trên một đường còn trong worker được kiểm tra khi kết quả về; <code>getIndicatorOutput(id, {'{'} drawn: true {'}'})</code> trả về những gì đang được vẽ mà không chờ. Chỉ báo đọc đường của chỉ báo khác hoặc đọc mã khác, và chỉ báo tự định nghĩa (<code>registerIndicator</code>), được tính trên main thread, cũng như mọi trường hợp không chạy được worker: server, jsdom, hoặc Content Security Policy chặn worker <code>blob:</code>.
</p>
<table>
  <thead><tr><th>setData, rồi EMA, RSI, MACD và Bollinger Bands</th><th>200,000 nến, off</th><th>auto</th><th>1,000,000 nến, off</th><th>auto</th></tr></thead>
  <tbody>
    <tr><td>Thời gian main thread bị chiếm bởi các lời gọi</td><td>74 ms</td><td>21 ms</td><td>269 ms</td><td>43 ms</td></tr>
    <tr><td>Số task dài hơn 50 ms</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>
    <tr><td>Khoảng dài nhất giữa hai frame</td><td>50 ms</td><td>33 ms</td><td>250 ms</td><td>33 ms</td></tr>
    <tr><td>Thời điểm mọi đường đã được vẽ</td><td>74 ms</td><td>243 ms</td><td>269 ms</td><td>1,025 ms</td></tr>
  </tbody>
</table>
<p>
  Worker không giảm tổng khối lượng công việc: chuyển kết quả của nó lại thành điểm tốn của main thread khoảng bằng thời gian tính chúng. Nó chia phần việc đó thành các lát vừa với một frame, đổi lại các đường xuất hiện muộn hơn, vì vậy nó chỉ bắt đầu từ 50,000 nến. Headless Chrome trên máy desktop, trung vị của ba lần chạy; <code>pnpm bench</code> đo cả hai nửa trong Node (<code>recompute.bench.ts</code>).
</p>
