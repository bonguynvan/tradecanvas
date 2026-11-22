<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Loại biểu đồ — Tài liệu TradeCanvas</title>
  <meta name="description" content="25 loại biểu đồ có sẵn: candlestick, thanh OHLC và HLC, cột, spline, step area, High-Low, Heikin-Ashi và dạng làm mượt của nó, Renko, Kagi, Point & Figure, Equivolume và các loại khác." />
</svelte:head>

<h1>Loại biểu đồ</h1>
<p>25 loại biểu đồ có sẵn. Đổi loại lúc chạy bằng <code>chart.setChartType(type)</code>.</p>

<h2>Cơ bản</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>Nến OHLC truyền thống.</td></tr>
    <tr><td><code>bar</code></td><td>Nến OHLC dạng thanh (kiểu phương Tây).</td></tr>
    <tr><td><code>line</code></td><td>Biểu đồ đường theo giá đóng cửa.</td></tr>
    <tr><td><code>area</code></td><td>Tô vùng bên dưới đường giá đóng cửa.</td></tr>
    <tr><td><code>baseline</code></td><td>Trên / dưới một mức giá cơ sở, tô hai màu.</td></tr>
    <tr><td><code>stepLine</code></td><td>Đường bậc thang, làm rõ giá đóng cửa rời rạc của từng nến.</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>Đường kèm một chấm tại mỗi điểm dữ liệu.</td></tr>
    <tr><td><code>hollowCandle</code></td><td>Thân rỗng khi giá đóng cửa &gt; giá đóng cửa trước đó.</td></tr>
    <tr><td><code>hlcArea</code></td><td>Dải high-low kèm đường giá đóng cửa.</td></tr>
    <tr><td><code>hiLo</code></td><td>Một thanh từ low đến high của mỗi nến, tô màu theo hướng; thanh đủ rộng ghi giá high và low.</td></tr>
    <tr><td><code>hlcBars</code></td><td>Một thanh dọc từ low đến high của mỗi nến và một vạch tại giá đóng cửa, không có giá mở cửa; tô màu theo giá đóng cửa so với giá đóng cửa trước đó.</td></tr>
    <tr><td><code>columns</code></td><td>Một cột lên tới mỗi giá đóng cửa, tô màu theo giá đóng cửa so với giá đóng cửa trước đó. Các cột đứng ngay dưới giá đóng cửa thấp nhất đang hiển thị, tách khỏi khối lượng.</td></tr>
    <tr><td><code>stepArea</code></td><td>Đường bậc thang với vùng bên dưới được tô.</td></tr>
    <tr><td><code>spline</code></td><td>Một đường cong mượt qua các giá đóng cửa, không bao giờ vượt lên trên một giá đóng cửa cao hoặc xuống dưới một giá đóng cửa thấp.</td></tr>
    <tr><td><code>dots</code></td><td>Một chấm tại mỗi giá đóng cửa.</td></tr>
  </tbody>
</table>

<h2>Dẫn xuất</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>Chuỗi nến được làm mượt bằng phép biến đổi Heikin-Ashi.</td></tr>
    <tr><td><code>smoothedHeikinAshi</code></td><td>Heikin-Ashi của giá đã được lấy trung bình trước trên <code>period</code> nến (10, số nguyên từ 1 đến 500; Độ dài làm mượt trong phần cài đặt của widget): nến của nó đổi chiều muộn hơn và ít hơn, nên một xu hướng hiện thành một dãy liền cùng màu. <code>{`chart.setChartTypeOptions({ smoothedHeikinAshi: { period: 20 } })`}</code>.</td></tr>
    <tr><td><code>renko</code></td><td>Biểu đồ brick với bước giá cố định; không phụ thuộc thời gian.</td></tr>
    <tr><td><code>kagi</code></td><td>Đường đảo chiều yang/yin; mức đảo chiều là phần trăm (4) hoặc một khoảng giá.</td></tr>
    <tr><td><code>lineBreak</code></td><td>Vẽ một đường mới khi giá đóng cửa phá các đường gần nhất (mặc định 3).</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>Các cột X/O; box size + số box đảo chiều. Box quá nhỏ để nhìn thấy được vẽ thành cột liền, và khi số cột ít hơn sức chứa của khung nhìn thì các cột được giãn cho vừa khung.</td></tr>
    <tr><td><code>rangeBars</code></td><td>Khoảng high-low của mỗi nến bằng một range cố định, và nến đóng ở high hoặc low của nó; nến cuối là nến đang hình thành.</td></tr>
  </tbody>
</table>

<h2>Theo khối lượng</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>Độ rộng nến tỷ lệ với khối lượng.</td></tr>
    <tr><td><code>equivolume</code></td><td>
      Hộp phủ toàn bộ khoảng giá, độ rộng tỷ lệ với tỷ trọng khối lượng; màu theo giá đóng cửa so với giá đóng cửa trước (kiểu Richard Arms).
    </td></tr>
  </tbody>
</table>

<h2>Order flow</h2>
<table>
  <thead><tr><th>Loại</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>footprint</code></td><td>
      Bên cạnh mỗi nến, những gì đã khớp ở từng mức giá bên trong nến đó: phần bên bán chủ động khớp vào giá bid và phần bên mua chủ động khớp vào giá ask, lấy từ trade của feed hoặc của chính bạn. Xem <a href={href('/docs/realtime#footprint')}>biểu đồ footprint</a>.
    </td></tr>
  </tbody>
</table>

<h2>Đổi loại lúc chạy</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  Các phép biến đổi (Heikin-Ashi, Renko, Kagi, Line Break, P&amp;F, Range Bars) được xử lý
  bên trong; <code>chart.getData()</code> vẫn trả về chuỗi dữ liệu đầu vào gốc.
</p>
<p>
  Trục thời gian và nhãn thời gian của crosshair ghi ngày của một brick, đường hoặc cột theo nến
  mà nó hoàn thành, nên trục của biểu đồ Renko, Kagi, Line Break, P&amp;F hoặc Range Bars hiển thị
  các năm, tháng và ngày mà nó trải qua; các brick hoàn thành trên cùng một nến dùng chung nhãn của nến đó.
  Giá trị <code>time</code> của chính chúng vẫn chỉ là số đếm, cách nhau 1. <code>axisTimes(series)</code> từ
  <code>@tradecanvas/chart</code> trả về các ngày đó cho một chuỗi được dựng bằng <code>toRenko</code> và các hàm tương tự.
</p>
<p>
  Tooltip của crosshair và event <code>crosshairMove</code> ghi ngày của brick theo cùng cách: <code>time</code>
  của payload là ngày trên trục, và <code>prevClose</code> là giá đóng cửa của brick trước đó. Với các loại
  này, chỉ báo được tính trên brick, đường hoặc cột được vẽ, không phải trên các nến bên dưới, nên
  đường trung bình động nằm trên các brick, và legend, cửa sổ dữ liệu của ChartWidget và file export đọc giá trị
  tại một brick; file export ghi các brick, với ngày như trên trục. Các chỉ báo tính theo ngày
  (VWAP, Session VWAP, đường trung bình động đa khung thời gian) và các chỉ báo đọc mã khác theo thời gian
  không được vẽ ở đây: <code>getActiveIndicators()</code> đánh dấu chúng <code>offChartType: true</code>.
</p>
<p>
  Renko, Kagi, Line Break và Range Bars có ít brick hoặc đường hơn sức chứa của khung nhìn thì được
  giãn cho vừa khung như Point &amp; Figure, nên chúng không bị dồn về phần bên phải của vùng vẽ. Khối lượng
  của một cột P&amp;F là khối lượng của các nến tạo nên nó. Với các loại này, trục thời gian giữ
  hai loại nhãn thô nhất trong khung nhìn (ví dụ năm và tháng), không hiện một ngày lẻ giữa chúng.
</p>

<h2>Thiết lập của các loại nến dựng lại</h2>
<p>
  Box của Renko, số đường mà Line Break phải phá, mức đảo chiều của Kagi, box và
  số box đảo chiều của Point &amp; Figure, và range của range bar. Giá trị nào không được đặt thì được tính từ
  dữ liệu (box theo ATR cho Renko, một phần năm mươi khoảng giá, làm tròn về 1, 2 hoặc 5, cho box P&amp;F…). Các thiết lập
  được lưu trong state đã lưu; trong ChartWidget, chúng nằm trong dialog cài đặt của
  loại biểu đồ.
</p>
<p>
  Range tự động của range bar là true range trung bình của 100 nến đã đóng gần nhất,
  làm tròn về 1, 2 hoặc 5 (… 1, 2, 5, 10, 20 …) và về một bội số nguyên của bước giá
  của mã (với thị trường có bước giá phụ thuộc vào giá, lấy bước giá lớn nhất mà các nến đó
  đã giao dịch): nến nhỏ trên biểu đồ một giây, nến lớn hơn trên biểu đồ ngày. Nến
  đang hình thành không được tính vào, nên một tick chỉ thay đổi các range bar dựng từ nến
  đó; các range bar trước vẫn giữ nguyên. Khi một nến đóng và làm giá trị trung bình chuyển sang
  mức 1-2-5 tiếp theo, hoặc làm các nến đó chuyển sang bước giá khác, mọi range bar được dựng lại theo
  range mới. Một range bar đóng tại low cộng range khi đi lên, hoặc tại high trừ
  range khi đi xuống: giá đóng cửa là một mức giá đã đạt tới, và bóng nến cho thấy hướng
  đi trước. Một bước nhảy nhiều range, kể cả một gap giữa hai nến, tạo một range bar cho mỗi range;
  các range bar lấp gap nằm ở những mức giá mà gap bỏ qua, chưa từng được giao dịch. Một range, đặt tay
  hay tự động, được nâng lên 2, 5, 10, 20… lần chính nó, lấy mức đầu tiên không vượt giới hạn, khi
  các nến đã đóng sẽ tạo ra hơn 100,000 range bar, hoặc riêng nến đang hình thành tạo ra hơn
  100,000; khi đó mọi range bar được dựng lại theo range đã nâng. Range nhỏ hơn một nửa chữ số
  có nghĩa thứ 15 của mức giá lớn nhất thì không đóng range bar nào, bất kể giá được viết thế nào.
</p>
<p>
  Box của Renko, mức đảo chiều của Kagi và box của Point &amp; Figure tuân theo cùng giới hạn: một giá trị quá nhỏ
  so với mức giá, khiến các nến trước nến cuối tạo ra hơn 100,000 brick, đường hoặc
  cột, hoặc riêng nến cuối tạo ra số lượng đó, được nâng lên 2, 5, 10, 20… lần chính nó, lấy
  mức đầu tiên không vượt giới hạn, và biểu đồ được dựng theo giá trị đó. Kagi và Point &amp; Figure tạo tối đa một
  đường hoặc cột cho mỗi nến, nên chỉ chuỗi hơn 100,000 nến mới chạm tới giới hạn;
  Line Break, với thiết lập là số đường, cũng tạo tối đa một đường cho mỗi nến. Box, mức đảo chiều
  hoặc range không phải số hữu hạn lớn hơn 0, trong state đã lưu hoặc trong link chia sẻ, sẽ bị bỏ qua (biểu
  đồ quay về giá trị mặc định: tính từ dữ liệu, hoặc 4% với Kagi), nên một link không thể làm treo
  biểu đồ. Dialog cài đặt không nhận giá trị nhỏ hơn 0.00000001 và báo lỗi dưới ô nhập. Trên biểu đồ live, kích thước
  đã nâng được giữ qua các tick, nên mỗi tick chỉ dựng nến một lần, và được tính lại cho chuỗi
  mới; <code>toRenko</code>, <code>toKagi</code>, <code>toPointAndFigure</code> và
  <code>toRangeBars</code> cũng làm như vậy khi nhận một <code>ReshapeMemo</code> làm tham số cuối.
  Giữ một memo cho mỗi chuỗi, truyền nó vào mỗi lần chạy, và gọi <code>memo.clear()</code> (hoặc tạo
  memo mới) khi chuỗi bị thay thế, cho mã hoặc khung thời gian mới: memo không tự nhận ra chuỗi mới,
  và sẽ vẽ chuỗi mới theo kích thước đã nâng của chuỗi cũ.
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

<h2>Chuỗi chính và các đường trên pane giá</h2>
<p>
  Ẩn chuỗi chính để chỉ xem chỉ báo hoặc các mã so sánh; đánh dấu
  high cao nhất và low thấp nhất trên màn hình; đánh dấu bid và ask. Feed có tick mang
  <code>bid</code> và <code>ask</code> tự cập nhật các giá trị này.
</p>
<pre><code>{`chart.setMainSeriesVisible(false)
chart.setHighLowLines(true)          // or new Chart(host, { highLowLines: true })
chart.setBidAsk({ bid: 64210.5, ask: 64211 })
chart.setBidAsk(null)`}</code></pre>
<p>
  Các nhãn trên trục giá có thể che nhau (giá cuối, bid và ask,
  high và low, biên độ trong ngày, order và position) được tách ra: nhãn giá cuối
  giữ trên đường của nó, các nhãn phía trên được đẩy lên và các nhãn phía dưới được đẩy xuống, mỗi nhãn chỉ dịch
  vừa đủ. Menu thang giá và Cài đặt biểu đồ của ChartWidget gọi tính năng này là "Nhãn không chồng nhau". Tắt nó
  để giữ mọi nhãn trên đường của nó:
</p>
<pre><code>{`chart.setAxisLabelsAligned(false)   // or new Chart(host, { features: { alignAxisLabels: false } })`}</code></pre>
