<svelte:head>
  <title>Loại biểu đồ — Tài liệu TradeCanvas</title>
  <meta name="description" content="18 loại biểu đồ có sẵn: nến, OHLC, Cao-Thấp, Heikin-Ashi, Renko, Kagi, Point & Figure, Equivolume và nhiều loại khác." />
</svelte:head>

<h1>Loại biểu đồ</h1>
<p>18 loại biểu đồ có sẵn. Đổi loại lúc chạy bằng <code>chart.setChartType(type)</code>.</p>

<h2>Cơ bản</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>Nến OHLC kinh điển.</td></tr>
    <tr><td><code>bar</code></td><td>Thanh OHLC (kiểu phương Tây).</td></tr>
    <tr><td><code>line</code></td><td>Biểu đồ đường theo giá đóng cửa.</td></tr>
    <tr><td><code>area</code></td><td>Vùng tô màu bên dưới đường giá đóng cửa.</td></tr>
    <tr><td><code>baseline</code></td><td>Trên / dưới một mức giá cơ sở, tô hai màu.</td></tr>
    <tr><td><code>stepLine</code></td><td>Đường bậc thang — làm nổi bật từng giá đóng cửa rời rạc của nến.</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>Đường kèm một chấm tại mỗi điểm dữ liệu.</td></tr>
    <tr><td><code>hollowCandle</code></td><td>Thân nến rỗng khi giá đóng cửa &gt; giá đóng cửa trước đó.</td></tr>
    <tr><td><code>hlcArea</code></td><td>Dải cao-thấp kèm đường giá đóng cửa.</td></tr>
    <tr><td><code>hiLo</code></td><td>Một thanh nối giá thấp với giá cao của mỗi nến, tô màu theo chiều tăng / giảm; thanh đủ rộng sẽ ghi kèm giá cao và giá thấp.</td></tr>
  </tbody>
</table>

<h2>Biến đổi</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Chuỗi nến được làm mượt bằng phép biến đổi Heikin-Ashi.</td></tr>
    <tr><td><code>renko</code></td><td>Biểu đồ viên gạch với bước giá cố định; không phụ thuộc thời gian.</td></tr>
    <tr><td><code>kagi</code></td><td>Đường đảo chiều dương/âm (yang/yin); mức đảo chiều theo phần trăm (mặc định 4) hoặc theo giá.</td></tr>
    <tr><td><code>lineBreak</code></td><td>Một đường mới khi giá đóng cửa phá vỡ các đường gần nhất (mặc định 3).</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>Các cột X/O; kích thước ô + số ô đảo chiều.</td></tr>
    <tr><td><code>rangeBars</code></td><td>Biên độ cao-thấp của mỗi nến bằng một khoảng cố định.</td></tr>
  </tbody>
</table>

<h2>Theo khối lượng</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>Độ rộng nến tỉ lệ với khối lượng.</td></tr>
    <tr><td><code>equivolume</code></td><td>
      Hộp phủ trọn biên độ, độ rộng tỉ lệ với tỉ trọng khối lượng; màu theo giá đóng cửa so với giá đóng cửa trước (kiểu Richard Arms).
    </td></tr>
  </tbody>
</table>

<h2>Đổi loại lúc chạy</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  Các phép biến đổi (Heikin-Ashi, Renko, Kagi, Line Break, P&amp;F, Range Bars) được xử lý
  bên trong — <code>chart.getData()</code> vẫn trả về chuỗi dữ liệu gốc đã truyền vào.
</p>

<h2>Thông số của các loại nến dựng từ dữ liệu</h2>
<p>
  Kích thước ô của Renko, số đường mà Line Break phải phá vỡ, mức đảo chiều của Kagi, kích thước
  ô và số ô đảo chiều của Point &amp; Figure, và biên độ của Range Bars. Thông số nào không đặt sẽ
  được tính từ dữ liệu (ô Renko theo ATR, ô P&amp;F bằng 1% giá đóng cửa trung bình…). Các thông số
  được giữ trong trạng thái đã lưu; trong ChartWidget, chúng nằm trong hộp thoại cài đặt, ở phần
  dành cho loại biểu đồ đang dùng.
</p>
<pre><code>{`chart.setChartTypeOptions({
  renko: { boxSize: 50 },                         // or 'atr' with atrPeriod
  lineBreak: { lines: 2 },
  kagi: { reversal: 25, reversalType: 'price' },  // or a percent
  pointAndFigure: { boxSize: 10, reversal: 3 },
  rangeBars: { range: 20 },
})
chart.getChartTypeOptions()
new Chart(host, { chartTypeOptions: { renko: { boxSize: 50 } } })`}</code></pre>

<h2>Chuỗi giá chính và các đường trên bảng giá chính</h2>
<p>
  Ẩn chuỗi giá chính để chỉ xem các chỉ báo hoặc các mã so sánh; đánh dấu giá cao nhất và thấp
  nhất trên màn hình; đánh dấu giá bid và ask. Nguồn dữ liệu nào có tick kèm <code>bid</code> và
  <code>ask</code> sẽ tự cập nhật các đường này.
</p>
<pre><code>{`chart.setMainSeriesVisible(false)
chart.setHighLowLines(true)          // or new Chart(host, { highLowLines: true })
chart.setBidAsk({ bid: 64210.5, ask: 64211 })
chart.setBidAsk(null)`}</code></pre>
