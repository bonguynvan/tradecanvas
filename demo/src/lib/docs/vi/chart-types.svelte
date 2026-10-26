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
    <tr><td><code>rangeBars</code></td><td>Biên độ cao-thấp của mỗi nến bằng một khoảng cố định, và nến đóng cửa ở giá cao nhất hoặc thấp nhất của nó; nến cuối cùng là nến đang hình thành.</td></tr>
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
<p>
  Biên độ tự động của Range Bars là true range trung bình của 100 nến đã đóng gần nhất, làm tròn
  về 1, 2 hoặc 5 (… 1, 2, 5, 10, 20 …) và về một số nguyên lần bước giá của mã (với thị trường có
  bước giá thay đổi theo mức giá, đó là bước giá lớn nhất mà các nến này đã giao dịch): nến nhỏ trên
  biểu đồ một giây, lớn hơn trên biểu đồ ngày. Nến đang hình thành không được tính vào, nên một tick
  chỉ thay đổi các range bar dựng từ nến đó; các range bar trước nó giữ nguyên. Khi một nến đóng cửa
  làm giá trị trung bình chuyển sang số 1-2-5 kế tiếp, hoặc đưa các nến này sang một bước giá khác,
  mọi range bar được dựng lại theo biên độ mới. Khi đi lên, nến đóng cửa ở giá thấp nhất cộng
  biên độ; khi đi xuống, ở giá cao nhất trừ biên độ: giá đóng cửa là giá nến đã chạm tới, và râu nến
  cho thấy hướng giá đi trước. Một cú nhảy qua nhiều biên độ, kể cả khoảng trống giữa hai nến, tạo
  một nến cho mỗi biên độ; các nến lấp khoảng trống nằm ở những mức giá mà khoảng trống đã bỏ qua,
  chưa từng được giao dịch. Một biên độ, đặt tay hay tự động, sẽ được nâng lên 2, 5, 10, 20… lần chính
  nó, lấy mức đầu tiên không vượt quá số đó, khi các nến đã đóng tạo ra hơn 100,000 range bar, hoặc
  riêng nến đang hình thành tạo ra hơn 100,000; khi đó mọi range bar được dựng lại theo biên độ đã nâng.
</p>
<p>
  Kích thước ô của Renko, mức đảo chiều của Kagi và kích thước ô của Point &amp; Figure cũng theo
  cùng giới hạn đó: một giá trị quá nhỏ so với giá, khiến các nến trước nến cuối tạo ra hơn 100,000
  viên gạch, đường hay cột, hoặc riêng nến cuối tạo ra ngần ấy, sẽ được nâng lên 2, 5, 10, 20… lần
  chính nó, lấy mức đầu tiên không vượt quá số đó, và biểu đồ được dựng theo mức đã nâng. Kagi và
  Point &amp; Figure tạo nhiều nhất một đường hay một cột cho mỗi nến, nên chỉ chuỗi hơn 100,000 nến
  mới chạm tới giới hạn này; Line Break, với thông số là số đường, cũng tạo nhiều nhất một đường cho
  mỗi nến. Kích thước ô, mức đảo chiều hay biên độ nào không phải là số hữu hạn lớn hơn 0, trong trạng
  thái đã lưu hay trong một link chia sẻ, sẽ bị bỏ qua (biểu đồ tự tính từ dữ liệu), nên một link
  không thể làm biểu đồ treo. Hộp thoại cài đặt không nhận giá trị nhỏ hơn 0.00000001.
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
