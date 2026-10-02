<svelte:head>
  <title>Loại biểu đồ — Tài liệu TradeCanvas</title>
  <meta name="description" content="17 loại biểu đồ có sẵn: nến, OHLC, Heikin-Ashi, Renko, Kagi, Point & Figure, Equivolume và nhiều loại khác." />
</svelte:head>

<h1>Loại biểu đồ</h1>
<p>17 loại biểu đồ có sẵn. Đổi loại lúc chạy bằng <code>chart.setChartType(type)</code>.</p>

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
  </tbody>
</table>

<h2>Biến đổi</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Chuỗi nến được làm mượt bằng phép biến đổi Heikin-Ashi.</td></tr>
    <tr><td><code>renko</code></td><td>Biểu đồ viên gạch với bước giá cố định; không phụ thuộc thời gian.</td></tr>
    <tr><td><code>kagi</code></td><td>Đường đảo chiều dương/âm (yang/yin) theo một ngưỡng phần trăm.</td></tr>
    <tr><td><code>lineBreak</code></td><td>Mô hình đảo chiều phá vỡ 3 đường.</td></tr>
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
