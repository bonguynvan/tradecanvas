<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Tham chiếu API — Tài liệu TradeCanvas</title>
  <meta name="description" content="Tham chiếu API cho Chart, ChartWidget, ChartGrid và phần lõi của TradeCanvas." />
</svelte:head>

<h1>Tham chiếu API</h1>
<p>API công khai của các lớp cấp cao nhất: <code>Chart</code>, <code>ChartWidget</code>, <code>ChartWidgetGrid</code> và <code>ChartGrid</code>.</p>

<h2>Chart</h2>
<p>Bộ render headless. Bạn tự làm giao diện, đăng ký nghe sự kiện và thay đổi trạng thái bằng các lời gọi trực tiếp.</p>

<h3>Khởi tạo</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>Dữ liệu</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>Thay toàn bộ chuỗi dữ liệu.</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>Thêm một nến mới; tự cuộn nếu được bật.</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>Thêm hàng loạt; chỉ tính lại chỉ báo một lần.</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>Sửa nến đang hình thành.</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>Gộp một tick vào nến cuối.</td></tr>
    <tr><td><code>updateBar(bar)</code></td><td>Sửa một nến đã nạp: nến có cùng thời gian, ở bất kỳ đâu trong chuỗi. Khung nhìn giữ nguyên; trả về false khi không có nến đã nạp nào có thời gian đó.</td></tr>
    <tr><td><code>getData()</code></td><td>Đọc chuỗi OHLC gốc.</td></tr>
  </tbody>
</table>

<p id="live-price">
  Nến từ <code>appendBar</code>, <code>appendBars</code> hay <code>updateLastBar</code>, và một tick, là giá hiện tại: đường giá, cảnh báo và lãi/lỗ của lệnh đi theo nó, như đi theo một luồng dữ liệu đã kết nối và <code>setCurrentPrice</code>. Nến mới gửi <code>dataUpdate</code>; tick trên nến đang hình thành thì không.
</p>

<p id="corrections">
  Nến mà nguồn dữ liệu của bạn sửa lại được đưa vào bằng <code>updateBar(bar)</code>: nó thay nến đã nạp có cùng <code>time</code>, dù nằm ở đâu trong chuỗi, và trả về <code>true</code>. Các chỉ báo được tính lại từ nến đó trở đi, Heikin-Ashi, Renko và các kiểu biểu đồ dựng từ nến cũng theo, còn khung nhìn giữ nguyên chỗ cũ; nhiều lần sửa trước khung hình kế tiếp chỉ được tính một lần, từ nến sớm nhất. Nó trả về <code>false</code> và không thay đổi gì khi không có nến đã nạp nào có thời gian đó (nến mới là việc của <code>appendBar</code>, nến cũ hơn là của <code>prependBars</code>) hoặc biểu đồ không nhận được nến đó. Đây không phải giá hiện tại: lệnh và cảnh báo không đi theo nó, không cảnh báo nào kích hoạt vì nó, và cảnh báo trên đường chỉ báo không được kiểm tra lại với giá trị đã sửa. Sửa nến cuối thì đường giá đi theo nó, như sau <code>setData</code>. Trong lúc phát lại, nó sửa chuỗi trực tiếp, hiện ra khi phát lại kết thúc; một nến ngoài giờ giao dịch chính, khi giờ mở rộng đang ẩn, hiện ra khi chúng được bật. Gửi lại đúng nến đã nạp thì không đổi gì; thiếu khối lượng thì tính là 0, như với <code>setData</code>, nên hãy gửi đủ cả nến. Nó gửi <code>dataUpdate</code> với <code>{'{'} kind: 'correction', time, index {'}'}</code>. Trong ChartWidget, <code>widget.getChart().updateBar(bar)</code> sửa nến của nguồn dữ liệu đã kết nối; nến bạn đưa cho widget bằng <code>setData</code> là một bản sao mà widget dựng lại các khung thời gian từ đó, nên lần sửa trên chúng chỉ giữ tới lần đổi khung thời gian kế tiếp (phương thức của widget cho trường hợp này sẽ có sau).
</p>

<p id="bar-times">
  Thời gian của nến là epoch mili-giây hoặc giây, một đơn vị cho cả chuỗi. Biểu đồ đọc đơn vị một lần, từ nến mới nhất: <code>barTimeUnit(data)</code> trả về 1 (mili-giây, từ 1e11 trở lên) hoặc 1000 (giây). Vì vậy một chuỗi mili-giây giữ đúng ngày cả trước năm 2001, dù các giá trị đó nhỏ hơn 1e12. Hãy giữ một chuỗi ở một đơn vị; thời gian biểu đồ trả lại (sự kiện, <code>getData()</code>) dùng đơn vị đó.
</p>

<h3>Loại biểu đồ &amp; giao diện</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>Một trong 18 loại — xem <a href={href('/docs/chart-types')}>Loại biểu đồ</a>.</td></tr>
    <tr><td><code>getChartType()</code></td><td>Loại biểu đồ đang vẽ (mặc định <code>'candlestick'</code>).</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>Chuyển giữa các giao diện có sẵn, hoặc đặt theme của bạn. <code>getTheme()</code> trả lại đúng như đã đặt.</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>Đặt style bất kỳ phần nào của biểu đồ theo khoá (<code>'grid.vertical.visible'</code>, <code>'series.candlestick.upColor'</code>…); <code>null</code> bỏ một khoá. Xem <a href={href('/docs/styling#overrides')}>Styling</a>.</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>Cả một lớp một lúc; bỏ các khoá (hoặc tất cả).</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>Override của một lớp; giao diện đã phân giải; giá trị một khoá ra.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>Đổi khung thời gian đang dùng; nối lại luồng dữ liệu trực tiếp.</td></tr>
  </tbody>
</table>

<h3>Bộ vẽ</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td>Tuỳ chọn <code>renderer</code></td><td><code>'canvas'</code> (mặc định), <code>'webgl'</code>, hoặc <code>'auto'</code> (chỉ dùng WebGL khi có GPU phần cứng).</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>Đổi khi đang chạy. Trả về bộ đang vẽ: <code>'canvas'</code> nếu không có WebGL 2.</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> hoặc <code>'webgl'</code>.</td></tr>
  </tbody>
</table>
<p>GPU vẽ những gì, và số đo: <a href={href('/docs/performance')}>Hiệu năng → Bộ vẽ WebGL</a>.</p>

<h3>Chỉ báo</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>Thêm một chỉ báo phủ lên biểu đồ hoặc ở bảng riêng. Trả về id của instance.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>Sửa một chỉ báo đang chạy.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>Xoá và dọn dẹp chỉ báo.</td></tr>
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>Xoá nhiều chỉ báo, gộp thành một bước hoàn tác.</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>Màu, độ dày, độ mờ, và kiểu nét, ẩn/hiện của từng đường (<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>).</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>Style mà các chỉ báo cùng loại bắt đầu với, từ nay.</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>Các khung thời gian mà chỉ báo hiện trên đó (<code>{`{ minutes: false, hours: [1, 4] }`}</code>); <code>null</code>: mọi khung. Lưu cùng bố cục.</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td>Khung thời gian của nến nạp bằng <code>setData</code>: dòng tiêu đề chú thích ghi nó, và các chỉ báo chỉ hiện trên một số khung đi theo nó.</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>Giao diện riêng của một pane, lưu cùng chỉ báo của nó.</td></tr>
  </tbody>
</table>

<h3>Trục &amp; thang</h3>
<p>
  Trục giá (dải bên phải) và trục thời gian (dải bên dưới) nhận thao tác chuột
  trực tiếp, với các cử chỉ mà trader đã quen:
</p>
<table>
  <thead><tr><th>Cử chỉ</th><th>Tác dụng</th></tr></thead>
  <tbody>
    <tr><td>Kéo trục giá lên / xuống</td><td>Thu hẹp / mở rộng khoảng giá theo chiều dọc (tắt tự co giãn thang).</td></tr>
    <tr><td>Kéo trục thời gian sang trái / phải</td><td>Phóng to / thu nhỏ trục thời gian.</td></tr>
    <tr><td>Bấm đúp vào trục giá</td><td>Bật lại tự co giãn thang.</td></tr>
    <tr><td>Bấm đúp vào trục thời gian</td><td>Vừa khít toàn bộ dữ liệu vào khung nhìn.</td></tr>
  </tbody>
</table>
<p>
  <strong>Múi giờ.</strong> Trục thời gian, giờ của con trỏ chữ thập, tooltip, vạch ngăn ngày
  và các khoảng thời gian chọn sẵn mặc định theo múi giờ của trình duyệt. Có thể đặt một múi
  giờ IANA (tính cả giờ mùa hè), một độ lệch cố định tính bằng phút về phía đông UTC, hoặc
  <code>'exchange'</code> để theo múi giờ của mã (<code>SymbolInfo.timeZone</code>), không có thì
  theo múi giờ của thị trường: bằng tùy chọn <code>timeZone</code>, từ phần cài đặt của widget,
  hoặc gọi trực tiếp:
</p>
<pre><code>{`new Chart(host, { timeZone: 'America/New_York' }) // ngay từ đầu

chart.setTimeZone('America/New_York')  // giờ New York, tính cả giờ mùa hè
chart.setTimeZone(330)                 // UTC+5:30, tính bằng phút
chart.setTimeZone(null)                // múi giờ của trình duyệt
chart.setTimeZone('exchange')          // múi giờ của mã, không có thì của thị trường
chart.getTimeZone()                    // 'exchange', như đã đặt
chart.getEffectiveTimeZone()           // múi giờ nó trỏ tới: 'Asia/Ho_Chi_Minh' trên HOSE`}</code></pre>
<p>
  Các phương thức và kiểu của biểu đồ viết múi giờ là <code>timeZone</code>, như
  <code>Intl.DateTimeFormat</code>. Các tên cũ vẫn chạy, nhưng không nên dùng nữa (deprecated):
  <code>setTimezone</code>, <code>getTimezone</code>, <code>getEffectiveTimezone</code>,
  <code>getExchangeTimezone</code>, <code>setTimezoneOffset</code>, <code>EXCHANGE_TIMEZONE</code> và
  <code>SymbolInfo.timezone</code> (mã nào ghi cả hai thì đọc theo <code>timeZone</code>).
</p>

<p>Các tác dụng trên cũng có thể gọi bằng code:</p>
<pre><code>{`chart.setAutoScale(false)  // hold the price range on screen (a new series is fitted once)
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data (Alt+R in the widget, with auto scale)
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.setMinBarUnit(0.05)               // narrower bars, so 'All' fits a long series (0.25 by default)
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)
chart.setVisibleRange(from, to)         // the bars between two times, edge to edge (Go to's Custom range)
chart.getVisibleTimeRange()             // { from, to }: the first and last bars on screen, or null`}</code></pre>
<p id="long-ranges">
  <strong>Khoảng dài.</strong> Mỗi nến không hẹp hơn 0,25 px, nên một khoảng dài hơn mức đó (26 năm nến ngày trên laptop) chỉ hiện phần mới nhất. Trong widget, một khoảng dài trên thanh khoảng thời gian sẽ chuyển sang khung có số nến vừa màn hình, từ 2 px mỗi nến: 5Y nến ngày sang nến tuần, All sang nến tháng; khoảng ngắn thì trở về khung bạn đã chọn, không bao giờ mịn hơn. Nó chỉ chuyển sang khung mà nguồn dữ liệu của bạn có (hoặc nến hiện có gộp lên được). <code>{`features: { 'statusBar.rangeTimeframe': false }`}</code> giữ nguyên khung. Với <code>Chart</code> dùng trực tiếp, <code>minBarUnit</code> (tuỳ chọn, hoặc <code>setMinBarUnit</code>) cho nến hẹp đến 0,02 px, vẽ theo từng cột pixel.
</p>

<p>
  <strong>Chế độ thang giá.</strong> Ngoài thang thường và logarit, trục giá
  có thể tính lại nhãn so với nến đầu tiên đang hiện — <code>percentage</code>
  hiện % thay đổi, <code>indexedTo100</code> quy mốc về 100. Thang thường,
  phần trăm và quy về 100 dùng chung một hình học tuyến tính; chỉ có nhãn
  là khác. Đặt từ bảng cài đặt biểu đồ hoặc gọi trực tiếp:
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>Định dạng giá và thời gian</h3>
<p>
  Giá có thể hiển thị theo định dạng của riêng bạn, hoặc theo phân số của một điểm như cách yết
  giá trái phiếu và hợp đồng tương lai của chúng (<code>101'16</code> là 101 và 16/32). Định dạng
  này áp dụng cho mọi chỗ in giá theo thang giá: trục, con trỏ chữ thập, nhãn giá cuối, chú thích,
  tooltip, lệnh, cảnh báo và nhãn hình vẽ; trục đặt vạch đúng vào các phân số chẵn và
  <code>roundPrice</code> làm tròn theo chúng. Các bảng chỉ báo giữ cách hiển thị số riêng. Khi bạn
  không đặt định dạng riêng, giá được nhóm chữ số theo cách viết số của ngôn ngữ đã chọn (<code>numberLocale</code>); nhãn vạch chia trên trục chỉ hiện số chữ số
  thập phân mà bước của nó cần (73,500), còn giá cuối, con trỏ chữ thập và các nhãn cạnh trục hiện đủ mọi chữ số thập
  phân. Thời gian cũng hiển thị được theo cách của bạn; hàm định dạng được cho biết nhãn đang in là loại nào.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">Cách các trục chọn nhãn</h3>
<p>
  Trục thời gian gắn nhãn cho những nến mở đầu bước lịch lớn nhất: một năm (chữ đậm), một tháng, một ngày, một giờ tròn, cách nhau ít nhất 80 px. Vì vậy ở 5Y trục đọc <code>2022 · Jul · 2023</code>, ở một tháng <code>Oct · 8 · 15</code>, trong ngày <code>12:00 · 18:00</code>. Nhãn thuộc về nến chứ không thuộc về màn hình: kéo biểu đồ thì nhãn đi theo nến, nạp thêm lịch sử phía trước thì nhãn vẫn ở chỗ cũ. Bên trái nến cũ nhất không có nhãn. Tên tháng theo <code>setNumberLocale</code>, và các đường lưới nằm đúng chỗ nhãn.
</p>
<p>
  Thang giá đặt số nhãn vừa với chiều cao của nó, cách nhau ít nhất 30 px, theo bước giá của thị trường. Ở thang log bước tăng theo giá, nên phần dưới cũng có nhãn như phần trên; ở thang phần trăm hay chỉ số, nhãn là phần trăm hoặc điểm chỉ số tròn tính từ mốc. Các pane chỉ báo cũng đếm nhãn theo chiều cao của chúng.
</p>

<h3>Thị trường: bước giá, biên độ và phiên giao dịch</h3>
<p>
  <code>setMarket</code> cho biểu đồ biết quy định của một sàn: màu nến, số chữ số thập
  phân, bước giá (có thể đổi theo vùng giá), giá trần và giá sàn trong ngày, và lô giao
  dịch. <code>roundPrice</code> và <code>getPriceStep</code> theo bước giá của vùng giá, nên
  giá lấy từ menu của biểu đồ luôn là giá hợp lệ, và phiếu đặt lệnh của widget kiểm tra
  lệnh theo bước giá, biên độ trong ngày và lô chẵn. Preset còn mang các phiên và múi giờ
  của sàn, dùng cho <code>getCurrentSession</code> và code của bạn; vùng tô phiên và giờ mở
  rộng trên biểu đồ lấy từ <code>setSymbolInfo</code>. Có sẵn
  preset cho các sàn Việt Nam theo quy định tháng 5/2025: HOSE (bước 10, 50 hoặc 100 đồng
  theo vùng giá, ±7%), chứng chỉ quỹ ETF và chứng quyền trên HOSE (10 đồng), HNX (±10%, có
  phiên sau giờ), UPCoM (±15%) và hợp đồng tương lai VN30 (bước 0,1 điểm, ±7%, mở cửa
  8:45); cổ phiếu giao dịch theo lô 100, xanh tăng, đỏ giảm, tím trần, xanh lam sàn, vàng
  tham chiếu. Giá trong các preset tính bằng nghìn đồng như trên bảng giá;
  <code>scaleMarketPrices(preset, 1000)</code> dùng cho giá tính bằng đồng.
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // hoặc scaleMarketPrices(MARKET_HOSE, 1000) cho giá 25350
chart.setTimeZone('exchange')                // trục thời gian theo múi giờ của sàn: Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35)                  // giá tham chiếu: giá đóng cửa hôm trước
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35, bước 50 đồng
chart.getPriceStep(9.5)                      // 0.01 dưới 10.000 đồng

// Dùng riêng các quy tắc
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }, chỉ theo giờ

// Hợp đồng tương lai VN30: bốn hợp đồng đang niêm yết và ngày giao dịch cuối cùng
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // thứ Năm thứ ba, lùi lại nếu là ngày nghỉ`}</code></pre>
<p>
  Thị trường của riêng bạn là một <code>MarketConfig</code>: <code>priceStep</code>, hoặc
  <code>priceSteps: [{'{'} from, step {'}'}]</code> cho các vùng giá, <code>priceLimits</code>,
  <code>volumeUnit</code> (lô), <code>sessions</code>, <code>timeZone</code> và
  <code>colorScheme</code>. <code>minTick</code> của mã đi trước bước giá của thị trường.
  Các sàn thỉnh thoảng đổi quy định; hãy đối chiếu preset với quy định hiện hành của sàn
  trước khi dựa vào nó.
</p>

<h3 id="comparing-symbols">So sánh các mã</h3>
<p>
  Phần trăm thay đổi của một mã khác trên thang giá (<code>addCompareSymbol</code>), hoặc giá của
  nó trên thang riêng, trong bảng riêng, hoặc chênh lệch hay tỷ lệ giữa giá đóng cửa của biểu đồ
  và mã đó — mấy cách sau là chỉ báo (<code>compareSymbol</code>, <code>spread</code>), có chú
  thích, nhãn giá trị, cảnh báo và được lưu trong bố cục như mọi chỉ báo khác. Nến của mã kia được
  khớp với nến của biểu đồ theo thời gian. Biểu đồ tự yêu cầu những nến nó cần; hãy cung cấp lại
  sau khi đổi khung thời gian. <code>correlation</code> (theo giá đóng cửa) và <code>correlationlog</code>
  (theo lợi suất từng nến) đọc mã kia theo cùng cách, cho giá trị từ −1 đến 1.
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  Một đường so sánh phần trăm bắt đầu ở giá đóng cửa của nến đầu tiên trên màn hình, mức giá mà
  thang phần trăm đọc là 0%, tính từ nến đầu tiên trên màn hình của chính mã kia; một mã có nến
  bắt đầu muộn hơn cũng bắt đầu ở 0%. Khi thang giá ở chế độ phần trăm
  (<code>chart.setScaleMode('percentage')</code>), mỗi đường đọc đúng mức thay đổi của riêng nó
  kể từ nến đầu tiên trên màn hình, và mức này đổi khi bạn kéo biểu đồ. Nhãn của đường nằm ở cuối
  đường. <code>chart.getCompareValues(barIndex?)</code> cho giá trị của từng đường tại một nến
  (mặc định là nến cuối), để bạn tự làm chú thích: <code>{'{'} id, label, color, visible, close, change, stale {'}'}</code>, trong đó <code>close</code> là giá
  đóng cửa của mã kia tại hoặc trước nến đó và <code>change</code> là mức thay đổi tính bằng phần
  trăm, đúng như đường của nó đọc. Sau nến cuối của mã kia (nến bạn chỉ tải một lần, trong khi
  biểu đồ vẫn chạy tiếp), nó cho giá đóng cửa cuối cùng kèm <code>stale: true</code>.
  <code>chart.setCompareVisible(id, false)</code> ẩn một đường và bỏ nó khỏi thang tự động.
</p>
<p>
  Renko, Kagi, Line Break, P&amp;F và Range Bars không vẽ đường so sánh: nến của chúng chỉ được đếm
  tiếp từ nến đầu, không mang thời gian riêng, nên một đường ở đó sẽ đọc mã kia tại sai nến. Ở các
  kiểu này, đường so sánh không tính vào thang tự động, và <code>getCompareValues()</code> cho giá
  đóng cửa của từng mã tại nến dữ liệu mới nhất, dù hỏi nến nào, kèm <code>change: null</code>.
</p>
<pre><code>{`chart.setScaleMode('percentage')       // each line reads its change on the axis
chart.getCompareValues()               // [{ id: 'eth', label: 'ETHUSDT', color, visible, close: 2650.4, change: -1.82, stale: false }]
chart.getCompareValues(barIndex)       // at a bar: the one under the cursor
chart.setCompareVisible('eth', false)  // hidden, and out of the auto scale`}</code></pre>
<p>
  Trong ChartWidget, nút So sánh trên thanh công cụ (và nút + trong cây đối tượng) mở hộp thoại so sánh: tìm một
  mã, chọn cách so sánh ở <strong>Thêm theo kiểu</strong> (thay đổi phần trăm, thang riêng, pane riêng, chênh lệch,
  tỷ lệ, hoặc tương quan theo giá hay theo lợi suất) và thêm bao nhiêu mã tuỳ ý. Các mã đang so sánh được liệt kê
  trước, mỗi mã kèm cách so sánh của nó và một nút để gỡ ra. Lần mở sau, hộp thoại chọn sẵn cách đã dùng lần trước.
</p>
<p>
  ChartWidget đặt thang giá ở chế độ phần trăm khi có mã được so sánh theo phần trăm, và trả về
  thang bạn đang dùng khi mã cuối cùng được gỡ ra. Thang logarit, phần trăm hay chỉ số 100 được
  giữ nguyên, và thang bạn chọn trong lúc so sánh (nút % hay log ở thanh trạng thái, menu của biểu
  đồ, phần cài đặt) được giữ lại, kể cả sau khi mã so sánh cuối cùng được gỡ. Thang phần trăm này
  không bao giờ được lưu: bố cục và liên kết chia sẻ giữ thang của bạn. Chú thích liệt kê mỗi mã so
  sánh theo phần trăm phía trên các chỉ báo, được đánh dấu bằng màu đường của nó, kèm giá và mức thay đổi tại nến dưới con trỏ (nếu
  không thì tại nến cuối), một nút mắt để ẩn và một nút để gỡ ra. Nến của mã đó được tải sâu bằng
  nến của biểu đồ, và khi biểu đồ tải thêm nến cũ thì chỉ tải thêm đoạn nến cũ hơn đó (với nguồn
  dữ liệu không có <code>fetchHistoryBefore</code> thì tải lại từng mã sâu bằng biểu đồ, chừng nào nguồn còn nến cũ hơn), nên đường của nó bắt đầu
  cùng chỗ với biểu đồ. Ở một kiểu biểu đồ không vẽ đường so sánh, ChartWidget giữ nguyên thang của bạn và làm
  mờ dòng của từng mã so sánh, cho biết lý do trong chú giải khi rê chuột và cho trình đọc màn hình; khi quay lại một kiểu có vẽ đường, thang
  phần trăm trở lại.
</p>

<h3>Xuất dữ liệu</h3>
<p>
  Xuất các nến dưới dạng CSV hoặc JSON, mỗi đường chỉ báo nằm trong một cột riêng, đặt tên theo
  tên trên chú thích. ChartWidget có mục <strong>Xuất dữ liệu (CSV)</strong> trong menu chuột phải
  của biểu đồ. Số có phần thập phân được ghi với 15 chữ số có nghĩa, nên khối lượng cộng từ các
  nến nhỏ hơn được ghi là <code>40.37</code> chứ không phải <code>40.370000000000005</code>.
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

<h3>Hồ sơ khối lượng (Volume Profile)</h3>
<p>
  Biểu đồ tần suất nằm ngang của khối lượng giao dịch, gom theo mức giá trong khoảng
  đang hiện. Mặc định tắt — bật bằng code hoặc qua bảng cài đặt
  của widget:
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>Điểm đảo chiều (pivot)</h3>
<p>
  Đánh dấu các đỉnh/đáy sóng kiểu fractal bằng tam giác nhỏ (▼ phía trên một đỉnh pivot
  đã xác nhận, ▲ phía dưới một đáy pivot). Độ mạnh quy định phải có bao nhiêu nến thấp hơn
  ở mỗi bên. Bật từ bảng cài đặt, hoặc:
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>Tô màu phiên (giờ giao dịch chính thức)</h3>
<p>
  Làm mờ các nến nằm ngoài phiên chính (trước/sau giờ giao dịch hoặc khoảng nghỉ qua đêm)
  để phiên chính nổi bật. Mặc định là giờ giao dịch chính thức (RTH) của cổ phiếu Mỹ (09:30–16:00 giờ New
  York, đã tính giờ mùa hè); cấu hình khung giờ theo số phút trong ngày
  cùng múi giờ của thị trường. Mã nào có nguồn dữ liệu báo kèm phiên giao dịch sẽ
  tự đặt phiên.
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>
<p>
  <strong>Giờ giao dịch mở rộng.</strong> Khi tắt, các nến nằm ngoài giờ giao dịch chính của mã
  (<code>SymbolInfo.sessions</code> theo <code>timeZone</code> của mã) rời khỏi biểu đồ; chúng được
  cất riêng, cả nến trực tiếp lẫn các trang lịch sử, và trở lại khi bật lên. Nến từ một ngày trở
  lên được giữ nguyên.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

<h3>Mức của kỳ trước (PDH / PDL / PDC)</h3>
<p>
  Vẽ giá cao, thấp và đóng cửa của ngày (hoặc tuần) trước, cùng giá mở cửa của kỳ
  hiện tại, thành các đường ngang có nhãn — những mức hỗ trợ/kháng cự
  mà trader trong ngày theo dõi. Bật từ bảng cài đặt, hoặc gọi trực tiếp:
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported; the chart passes the exchange's zone (left out, the days are UTC's)
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day', 'Australia/Sydney')  // [{ id, label, price }]`}</code></pre>

<h3>Hồ sơ thị trường (TPO)</h3>
<p>
  Biểu đồ tần suất thời gian tại mỗi mức giá: mỗi nến đóng góp một TPO vào mọi ô giá
  mà biên độ của nó chạm tới, làm lộ ra Point of Control (mức giá có nhiều TPO nhất) và
  vùng giá trị (≈70% số TPO). Khác với Hồ sơ khối lượng — nó tính theo thời gian,
  không theo khối lượng — và được ghim bên trái nên cả hai có thể hiện cùng lúc. Mặc định tắt;
  bật từ bảng cài đặt hoặc gọi trực tiếp:
</p>
<pre><code>{`chart.setMarketProfileVisible(true)
chart.setMarketProfileConfig({
  buckets: 48,
  widthRatio: 0.18,
  opacity: 0.32,
  valueAreaPct: 0.7,  // fraction of TPOs in the value area
  highlightPoC: true, // dashed line at the point of control
})

// split into one mini-profile per trading day, in the exchange's zone
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too; give the sessions the exchange's zone, as the chart does (left out, UTC's days)
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax, {}, 'Australia/Sydney')  // per-day TPO`}</code></pre>

<h3>Cảm ứng &amp; di động</h3>
<table>
  <thead><tr><th>Cử chỉ</th><th>Thao tác</th></tr></thead>
  <tbody>
    <tr><td>Kéo 1 ngón (vùng biểu đồ)</td><td>Kéo biểu đồ + di chuyển con trỏ chữ thập</td></tr>
    <tr><td>Chụm 2 ngón</td><td>Phóng to quanh điểm giữa</td></tr>
    <tr><td>Nhấn giữ (~500 ms)</td><td>Ghim chú thích OHLC tại nến (bản di động của Alt+bấm)</td></tr>
    <tr><td>Kéo 1 ngón trong dải trục giá / thời gian</td><td>Co giãn trục tương ứng</td></tr>
    <tr><td>Chạm</td><td>Bấm: <code>click</code>, <code>barClick</code>, một signal marker; chạm lên hình vẽ thì chọn nó</td></tr>
    <tr><td>Chạm đúp</td><td>Bấm đúp: trên trục thì đặt lại trục; trên hình vẽ thì mở cài đặt của nó</td></tr>
    <tr><td>Kéo 1 ngón trên hình vẽ</td><td>Di chuyển nó, hoặc đổi dạng bằng một tay nắm của hình đang chọn</td></tr>
    <tr><td>Khi đang chọn công cụ vẽ: chạm, chạm — hoặc nhấn, kéo, nhấc</td><td>Đặt các điểm; nhấn, kéo rồi nhấc ngón vẽ xong đường hai điểm trong một lần</td></tr>
    <tr><td>Nhấn giữ trên hình vẽ</td><td>Menu của nó (như bấm chuột phải)</td></tr>
    <tr><td>Kéo 1 ngón trên đường cảnh báo, lệnh, bracket hoặc đường chia pane</td><td>Kéo nó</td></tr>
  </tbody>
</table>
<p>
  Ngón tay với xa hơn chuột: khoảng 16 px tới một đường và 22 px tới một tay nắm, so với 8. Trên trang có cuộn, <code>pageScroll: true</code> để vuốt dọc và con lăn chuột thường cho trang: biểu đồ kéo theo vuốt ngang và phóng to bằng hai ngón hoặc Ctrl + con lăn (chụm trên touchpad), còn nhấn lên hình vẽ, các đường và trục vẫn thuộc về biểu đồ. <code>chart.setPageScroll(on)</code> bật tắt khi đang chạy.
</p>
<p>
  Các hộp thoại (cài đặt, bảng phím tắt, bảng lệnh, tìm mã) tự động
  chuyển sang dạng bảng trượt từ dưới lên, có tay nắm để kéo và phần đệm tính đến vùng an toàn
  của màn hình khi khung nhìn hẹp hơn 640 px.
</p>

<h3>Công cụ đo</h3>
<p>
  Giữ <kbd>Shift</kbd> và kéo trên biểu đồ để đo số nến × giá giữa
  hai điểm — lớp phủ hiện chênh lệch giá Δ (tuyệt đối + %), số nến và khoảng
  thời gian. Lớp phủ biến mất ngay khi nhả chuột; nó không được
  lưu vào trạng thái.
</p>

<h3>Sự kiện</h3>
<p>Mọi sự kiện đều có kiểu qua <code>ChartEventMap</code>:</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { kind: 'bars', length } khi setData và khi có nến mới; { kind: 'correction', time, index } khi một nến được sửa; hoặc kind 'alert' | 'bracket' | 'connection' | 'error' */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* hình vẽ, chỉ báo, cảnh báo, loại biểu đồ hoặc giao diện có thể đã thay đổi */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('marketChange', e => /* { market }: setMarket */)
chart.on('compareChange', e => /* { id, change: 'add' | 'remove' | 'data' | 'visible' }: addCompareSymbol and the rest */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>

<h3>Hoàn tác cho thay đổi của riêng bạn</h3>
<p>
  <code>recordUndo</code> đưa một thay đổi của bạn vào lịch sử hoàn tác của biểu đồ, cùng với hình vẽ và
  chỉ báo: Ctrl/Cmd+Z gọi <code>undo</code>, làm lại thì gọi <code>redo</code>. Các thay đổi về cùng một
  <code>subject</code> diễn ra sát nhau được tính là một bước. ChartWidget ghi lại cài đặt và loại biểu đồ của nó theo cách này.
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>Bàn phím và trình đọc màn hình</h3>
<p>
  Khi đang có focus, biểu đồ cuộn bằng các phím mũi tên (giữ Shift để cuộn mười nến), phóng to thu nhỏ bằng ↑/↓
  hoặc +/−, và về đầu, về cuối bằng Home và End. Với trình đọc màn hình, biểu đồ là một ứng dụng có phần tóm tắt
  (mã, loại biểu đồ, khung thời gian, giá cuối); sau khi các phím di chuyển khung nhìn, nó đọc những gì đang hiện trên
  màn hình, và dấu phẩy, dấu chấm đọc từng nến một. <code>a11y.labels</code> chuyển các câu đó sang ngôn ngữ của bạn;
  <code>a11y: false</code> bỏ hẳn phần này. <code>scrollBars(n)</code> và <code>selectDrawing(id)</code>
  làm bằng code những gì các phím và một cú bấm chuột làm.
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  Giá lấy từ con trỏ chuột có thể được làm tròn theo bước giá của thị trường bằng
  <code>chart.roundPrice(price)</code>: về bội số của <code>minTick</code> của mã, nếu không có thì theo
  độ chính xác của mã. Các menu, phiếu đặt lệnh và tab Coordinates trong cài đặt hình vẽ của ChartWidget đều làm như vậy.
  <code>chart.getPriceStep()</code> trả về chính bước giá đó.
</p>

<h2>ChartWidget</h2>
<p>Bọc <code>Chart</code> trong một giao diện hoàn chỉnh. Có thể truy cập chính instance đó qua <code>widget.chart</code>.</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { 'toolbar.replay': false },   // công tắc của widget: xem Tùy biến
  onReady: (chart, widget) => { /* once built, just after new ChartWidget() returns */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">Các thanh</h3>
<table>
  <thead><tr><th>Thanh</th><th>Có gì trên đó</th></tr></thead>
  <tbody>
    <tr><td>Thanh công cụ</td><td>
      Mã và thông tin của mã; các khung thời gian (những khung đã ghim hiện thành nút, cùng một menu có đủ mọi khung
      theo đơn vị, từ phút đến tháng, mỗi khung có một ngôi sao để ghim); loại biểu đồ, hiện bằng icon của nó; Chỉ báo (một hộp thoại: xem <a href={href('/docs/indicators')}>Chỉ báo</a>)
      và So sánh khi có bộ nạp dữ liệu (adapter); hoàn tác và làm lại. Bên phải: bố cục, phát lại nến, một menu Giao dịch
      (lệnh mới, bracket Long và Short, sổ lệnh và bảng tài khoản), rồi chụp màn hình, cài đặt, giao diện và toàn màn
      hình; khi không có dải nút (trên điện thoại, hoặc với <code>{`features: { dock: false }`}</code>) thì có thêm
      cảnh báo và cây đối tượng. Phần nào không vừa thì gập vào “Thêm”.
    </td></tr>
    <tr><td>Công cụ vẽ</td><td>
      Menu của mỗi nhóm ghi phím tắt của các công cụ trong nhóm (Alt+T là đường xu hướng) và có một ngôi sao trên mỗi
      dòng để ghim công cụ đó lên đầu. Ở dưới cùng: kiểu vẽ, nam châm, cục tẩy, zoom vùng, giữ chế độ vẽ, khoá tất cả,
      ẩn tất cả và xoá tất cả.
    </td></tr>
    <tr><td>Thanh trạng thái</td><td>
      Các khoảng thời gian dựng sẵn và đi tới ngày; trạng thái thị trường, kết nối, một đồng hồ theo múi giờ hiển thị
      (bấm vào thì mở danh sách múi giờ để chọn) và các công tắc <code>%</code> · <code>log</code> · <code>auto</code>
      của thang giá.
    </td></tr>
    <tr><td>Trên hình vẽ đang chọn</td><td>
      Màu, độ dày và kiểu nét, cài đặt, cảnh báo, khoá, menu thêm và xoá. Kéo thanh này bằng tay nắm của nó thì nó ở
      yên chỗ đó cho hình vẽ tiếp theo; bấm đúp vào tay nắm để đưa nó về lại trên hình vẽ.
    </td></tr>
    <tr><td>Ngăn bên</td><td>
      Một dải nút ở mép ngoài, mỗi bảng một nút: danh mục theo dõi, cảnh báo, cây đối tượng, cửa sổ dữ liệu và thông
      tin mã. Xem <a href="#dock">Ngăn bên</a>.
    </td></tr>
  </tbody>
</table>

<h3 id="dock">Ngăn bên</h3>
<p>
  Các bảng của widget nằm cạnh biểu đồ, mỗi lúc một bảng, và mở từ dải nút ở mép ngoài (bên trái khi widget đảo
  chiều từ phải sang trái). Bấm một nút trên dải thì bảng của nó mở ra, hoặc đóng lại nếu đó là bảng đang mở; nút
  đóng trên mỗi bảng cũng đóng bảng đó. Không bảng nào tự mở: biểu đồ giữ toàn bộ chỗ cho tới khi có bảng được gọi
  (<code>widget.openPanel('watchlist')</code> mở một bảng từ code của bạn). Kéo mép bảng, hoặc dùng các phím mũi tên trên mép đó, để đặt độ rộng từ 233 đến 377 px (ban đầu
  296), được giữ lại trên trình duyệt này; bảng không bao giờ chiếm quá 38,2% hàng, phần còn lại dành cho biểu đồ.
</p>
<p>
  Trên điện thoại, hoặc khi widget hẹp hơn 641 px, không có dải nút: bảng trượt từ dưới lên, phủ lên biểu đồ, lúc
  đầu đóng và đóng khi nhấn Escape; bảng đang mở khi widget hẹp lại (xoay máy tính bảng) sẽ đóng. Khi đó cảnh báo và cây đối tượng mở từ thanh công cụ, thông tin mã mở từ nút <strong>ⓘ</strong>
  cạnh mã, và bảng nào cũng mở được từ code của bạn. Các biểu đồ của một <code>ChartWidgetGrid</code> không có dải
  nút riêng, trừ khi <code>widget.features</code> của nó bật <code>dock</code>.
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo' | 'depthLadder'; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">Tìm mã, So sánh và Đi tới</h3>
<p>
  <strong>Tìm mã</strong> mở từ mã trên thanh công cụ, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>,
  hoặc khi gõ một chữ cái trên biểu đồ, và bắt đầu tìm bằng chữ cái đó. Khi chưa gõ gì, hộp thoại liệt kê các mã
  trong <code>symbols</code> của bạn; khi đã gõ, mỗi lần bạn ngừng gõ nó hỏi chức năng tìm kiếm của nguồn dữ liệu
  (<code>searchSymbols</code>, hoặc của adapter). Mỗi dòng mở đầu bằng một huy hiệu (logo của mã, nếu không có thì
  chữ cái đầu của mã trong màu của loại mã), rồi đến mã, tên, loại và sàn xếp thành cột, mã của biểu đồ được đánh
  dấu. Các thẻ lọc danh sách theo một loại (cổ phiếu, tiền mã hoá) và đứng yên khi bạn gõ; khi các dòng đến từ hai
  sàn trở lên, một danh sách bên cạnh lọc theo một sàn. Cả hai chỉ lọc những dòng đang có, không tìm lại: một lần tìm
  trả về một trang kết quả (chức năng tìm của adapter được yêu cầu 50 kết quả), nên chọn HNX sau khi gõ <code>V</code>
  chỉ hiện các mã HNX trong số đó, không phải mọi mã HNX có chữ V. Danh sách hiện 200 dòng khớp nhất, và một dòng bên
  dưới cho biết còn bao nhiêu mã nữa để gõ thêm mà thu hẹp. Khi không có chức năng tìm, chữ gõ vào sẽ tìm mã của bạn theo mã và theo tên, có
  dấu hay không dấu (<code>ngan hang</code> tìm ra “Ngân hàng”).
  <code>{`features: { symbolTyping: false }`}</code> để các chữ cái gõ trên biểu đồ không mở hộp thoại này.
</p>
<p>
  Truyền <code>symbols</code> dưới dạng <code>SymbolInfo</code> thì danh sách mở ra đã có tên, loại, sàn và logo;
  mã trên thanh công cụ và bảng thông tin mã lấy tên và sàn từ đó khi biểu đồ chưa biết. Kết quả tìm của nguồn dữ
  liệu được ưu tiên hơn những thông tin này nhưng vẫn giữ logo của bạn; những gì biểu đồ biết về mã của nó chỉ điền tên hoặc logo còn thiếu vào hộp tìm, vì nó có thể gọi loại và sàn bằng từ khác với danh sách của bạn (stock thay cho Cổ phiếu, tên công ty chứng khoán thay cho sàn). Bước giá và giờ giao dịch truyền ở đây không áp dụng cho biểu đồ: chúng đến từ
  <code>resolveSymbol</code> của adapter hoặc <code>chart.setSymbolInfo</code>.
</p>
<pre><code>{`new ChartWidget(el, {
  symbols: [
    { symbol: 'VNM', description: 'Vinamilk', type: 'Cổ phiếu', exchange: 'HOSE', logo: '/logos/vnm.svg' },
    'FPT',   // chỉ mã, như trước
  ],
})`}</code></pre>
<p>
  <code>logo</code> là một địa chỉ <code>https:</code> hoặc <code>http:</code>, một đường dẫn trên trang của bạn, một
  URL <code>blob:</code> hoặc một ảnh viết trong <code>data:</code> (PNG, JPEG, GIF, WebP, AVIF hoặc SVG); mọi thứ khác
  bị bỏ qua. Nó chỉ được tải như một ảnh, không kèm referrer, nên chính sách <code>img-src</code> của trang phải cho
  phép máy chủ của nó; logo không tải được sẽ hiện chữ cái. Màu của chữ cái lấy từ <code>--tcw-kind-1</code> … <code>--tcw-kind-5</code> (cổ phiếu, phái sinh, chỉ số, tiền mã hoá và hợp đồng vĩnh cửu, ngoại hối, viết bằng tiếng Anh, Việt, Nhật, Trung hay Hàn; chứng quyền lấy màu của phái sinh, chứng chỉ quỹ và ETF lấy màu của chỉ số, trái phiếu lấy màu của ngoại hối; loại khác nhận một màu theo tên của nó), đặt cho cả giao diện tối và sáng.
</p>
<p>
  Khi một lần tìm đã cho biết về một mã, tên của nguồn dữ liệu cũng hiện trên danh sách lúc hộp thoại mở ra, không
  chỉ trong kết quả tìm. Tên, loại, sàn hay logo không phải là chữ (<code>null</code> của một nguồn JSON, mã sàn dạng số), trong kết quả của nguồn dữ liệu hay trong thông tin biểu đồ biết, được coi như không có: nó không hiện ra và không xoá thông tin của bạn. Tên sàn đứng trước dấu hai chấm
  (<code>BINANCE:BTCUSDT</code>) hiện mờ hơn và được rút gọn trước tiên khi cột hẹp; trên điện thoại, các thẻ loại mã cuộn
  trên một dòng và mờ dần ở đầu còn thẻ bị khuất. Thông tin biểu đồ biết về mã của nó đặt tên cho mã trên thanh công
  cụ và trong bảng thông tin khi nó nói về đúng mã đó (không phân biệt chữ hoa chữ thường, có hay không có tên sàn
  trước dấu hai chấm) hoặc được đặt sau khi đổi mã, nên cách viết riêng của nguồn dữ liệu (<code>BTC-USD</code> cho
  <code>BTCUSD</code>) vẫn được tính.
</p>
<p>
  <strong>So sánh</strong> là chính hộp thoại đó, có thêm <strong>Thêm theo kiểu</strong> dưới ô tìm kiếm và các mã
  đang so sánh được liệt kê trước (xem <a href="#comparing-symbols">So sánh các mã</a>).
</p>
<p>
  <strong>Đi tới</strong> (biểu tượng lịch trên thanh trạng thái, <kbd>Alt</kbd>+<kbd>G</kbd>, hoặc menu của biểu đồ)
  có hai tab. <strong>Ngày</strong> đưa nến của một ngày và giờ vào giữa; <strong>Khoảng tự chọn</strong> hiện các
  nến giữa hai mốc như vậy, vừa khít từ mép này sang mép kia, ban đầu là khoảng đang hiện trên màn hình. Lịch tháng
  dưới các ô nhập điền vào ô ngày đang nhập, và sau khi chọn đầu khoảng thì chuyển sang cuối khoảng. Với nến ngày
  trở lên thì không cần nhập giờ, và không chọn được các ngày sau hôm nay. Ngày và giờ được hiểu theo múi giờ hiển thị.
</p>

<h3>Phím tắt của widget</h3>
<table>
  <thead><tr><th>Phím tắt</th><th>Thao tác</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Bảng lệnh: các lệnh của widget kèm phím tắt (đi tới, đặt lại khung nhìn, lưu layout, các bảng…), công cụ vẽ, loại biểu đồ, khung thời gian và chỉ báo; lệnh dùng gần đây đứng đầu</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Tìm mã: các mã của bạn, hoặc tìm qua nguồn dữ liệu khi bạn gõ</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>Tìm một mã, bắt đầu bằng chữ cái vừa gõ (<code>{`features: { symbolTyping: false }`}</code> để tắt)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Lưu bố cục (lần đầu sẽ hỏi tên)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Gõ một khung thời gian (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) rồi nhấn Enter (<code>intervalTyping: false</code> để tắt)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Đường xu hướng, đường ngang, tia ngang, đường dọc, đường chữ thập, Fibonacci thoái lui</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>Đặt lại khung nhìn: hiện mọi nến, thang giá vừa với chúng</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>Đảo ngược thang giá</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>Đi tới một ngày</td></tr>
    <tr><td><kbd>?</kbd></td><td>Bảng phím tắt, tìm được theo việc phím làm hoặc theo phím</td></tr>
    <tr><td><kbd>Alt</kbd> + bấm vào biểu đồ</td><td>Ghim chú thích OHLC tại nến đang rê chuột (kèm chênh lệch so với vị trí con trỏ chữ thập hiện tại)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Bỏ ghim chú thích / huỷ hình đang vẽ</td></tr>
    <tr><td><kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd></td><td>Lùi / tiến phát lại một bước</td></tr>
    <tr><td><kbd>Space</kbd></td><td>Phát hoặc tạm dừng phát lại (trên biểu đồ hoặc thanh trượt; ngoài phát lại nó vừa khung biểu đồ)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Thôi chọn nến bắt đầu phát lại</td></tr>
    <tr><td>Bấm vào mã trên thanh công cụ</td><td>Mở hộp thoại tìm mã</td></tr>
    <tr><td>Bấm nút phát trên thanh công cụ</td><td>Mở thanh điều khiển phát lại nến (phát/từng bước/tua/tốc độ)</td></tr>
  </tbody>
</table>
<p>
  Đổi các mã có thể tìm lúc chạy bằng <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>, là mã hoặc
  <code>SymbolInfo</code> như trong <code>symbols</code>. Danh mục theo dõi được tạo từ <code>symbols</code> (không có
  <code>lists</code>, không lưu lại) sẽ được thay bằng các mã này và hỏi giá của từng mã: với một danh sách dài từ máy
  chủ của bạn, hãy cho danh mục theo dõi các danh sách riêng.
</p>
<pre><code>{`const widget = new ChartWidget(el, {
  adapter: feed,
  watchlist: { lists: [{ id: 'main', name: 'Chính', symbols: ['VNM', 'FPT'] }] },
})
widget.setSymbols(await loadMarkets())   // SymbolInfo[] từ máy chủ của bạn: ô tìm mở ra với chúng, danh mục theo dõi giữ nguyên`}</code></pre>

<h3>Cửa sổ dữ liệu</h3>
<p>
  Một bảng nổi hiển thị chính xác O/H/L/C/V, mức thay đổi của nến và giá trị của mọi
  chỉ báo đang bật tại nến đang rê chuột — cập nhật trực tiếp khi bạn di chuyển
  con trỏ chữ thập. Bật/tắt từ bảng lệnh (<kbd>Ctrl/⌘ K</kbd> →
  "Bật/tắt cửa sổ dữ liệu").
</p>

<h3>Chia sẻ góc nhìn (deep link)</h3>
<p>
  Mã hoá toàn bộ góc nhìn — mã, khung thời gian, loại biểu đồ, thang giá,
  chỉ báo (kèm tham số), hình vẽ và những Cài đặt biểu đồ đã đổi khác mặc định
  (trừ múi giờ và định dạng số) — thành một chuỗi gọn, an toàn cho URL để
  tạo liên kết sâu. Với <code>shareUrl: true</code>, widget khôi phục hash
  <code>#tcw=…</code> khi tải trang, và thao tác "Chia sẻ góc nhìn" trong bảng lệnh
  sao chép một liên kết vào clipboard.
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>Bố cục có tên</h3>
<p>
  Nút bố cục trên thanh công cụ lưu biểu đồ dưới một cái tên: mã, khung thời gian,
  thang giá, loại biểu đồ, chỉ báo, hình vẽ, cảnh báo và
  <a href="#chart-settings">Cài đặt biểu đồ</a> (không gồm giao diện, múi giờ và định
  dạng số, vì đó là lựa chọn của người xem). Mở, đổi tên và xoá bố cục từ menu của nút này; bố cục
  đang mở tự lưu mỗi khi thay đổi, và <kbd>Ctrl/⌘ S</kbd> sẽ lưu nó. Bố cục được lưu
  trong <code>localStorage</code> của trình duyệt này, trừ khi bạn truyền vào một
  <code>storage</code>: bốn hàm, hàm nào cũng có thể trả về một promise.
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } hoặc null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // hoặc false để tắt
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } hoặc null
layouts.setAutoSave(false)

// Chỉ lấy phần nội dung, để cất ở đâu tuỳ bạn
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  <code>localStorageLayouts(prefix)</code> và <code>memoryLayouts()</code> là hai kiểu
  lưu trữ có sẵn. Nội dung đã lưu được đọc một cách thận trọng: bố cục nào không phân
  tích được sẽ bị từ chối, chứ không bị áp dụng nửa chừng. Mỗi bố cục ghi lại
  <code>kind</code> của nó (<code>'chart'</code> hoặc <code>'grid'</code>), nên một widget
  và một lưới có thể dùng chung một nơi lưu trữ mà mỗi bên chỉ liệt kê bố cục của riêng
  mình. Việc lưu, mở và tự động lưu chạy lần lượt từng việc một, nên một lần lưu không bao
  giờ ghi vào bố cục được mở sau nó.
</p>

<h3 id="chart-settings">Cài đặt biểu đồ</h3>
<p>
  Các công tắc và lựa chọn trong hộp thoại cài đặt (hồ sơ khối lượng và Market
  Profile, điểm swing, tô vùng phiên, mức của kỳ trước, lưới, chú giải, con trỏ chữ
  thập, thang giá, múi giờ, định dạng số) là Cài đặt biểu đồ của widget. Đọc chúng
  bằng <code>getSettings()</code> (một bản sao); đổi một phần bằng
  <code>setSettings(patch)</code>, hàm này bỏ những gì không đọc được, giữ các số
  trong khoảng của hộp thoại và không ghi bước hoàn tác; và nghe từng thay đổi bằng
  <code>onSettingsChange(listener)</code>, hàm này trả về hàm để ngừng nghe. Nó được
  gọi một lần khi hộp thoại đóng bằng OK, không bao giờ cho Huỷ hay cho một thay đổi
  không đổi gì. Khi biểu đồ chưa có nến, <code>setSettings</code> để tự co giãn thang
  bật, vì tắt nó là giữ nguyên khoảng giá đang hiện, mà lúc đó chưa có khoảng nào:
  cài đặt mà <code>onSettingsChange</code> đưa ra, có tự co giãn thang bị tắt sau khi
  kéo trục giá, vẫn đưa lại được ngay sau hàm khởi tạo mà không sao. Với <code>persistSettings: true</code>, widget giữ chúng trong trình
  duyệt này và đặt lại ở lần ghé sau.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  chartOptions: { timeZone: 'UTC' },
  persistSettings: true,            // hoặc { key: 'myapp:settings' }
})

widget.setSettings({ volumeProfileVisible: true, timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'

const stop = widget.onSettingsChange((settings) => {
  api.put('/me/chart-settings', settings)   // máy chủ của bạn, chẳng hạn
})
stop()`}</code></pre>
<p>
  <code>getSettings()</code> cũng đọc lại những gì đã đặt trên <code>getChart()</code>,
  nên bố cục hay liên kết lưu đúng như vậy. Biểu đồ cho biết các cài đặt này qua
  <code>isVolumeVisible()</code>, <code>isLegendVisible()</code>,
  <code>isBarCountdownVisible()</code>, <code>isIndicatorValueLabelsVisible()</code>,
  <code>isLeftPriceScaleVisible()</code>, <code>getMarketProfileConfig()</code>,
  <code>getDepthHeatmapConfig()</code>, <code>getPivotMarkersConfig()</code> và
  <code>getPeriodLevelsPeriod()</code>, cùng với <code>is…Visible()</code> của từng lớp phủ.
</p>
<ul>
  <li><strong>persistSettings</strong> giữ, theo từng trình duyệt, những gì người dùng
    đã đổi so với giá trị của bạn. Giá trị được giữ thắng <code>chartOptions</code>, và
    Đặt lại đưa về giá trị của bạn. Nó bỏ qua cờ thang log, cờ tự co giãn và cài đặt riêng
    của từng loại biểu đồ (hộp Renko và những thứ tương tự), vốn là trạng thái của biểu đồ.
    Hãy cho mỗi widget trên trang một <code>key</code> riêng; lưới tự cho mỗi biểu đồ của
    nó một key. Nó không biết ai đã đổi: những gì bạn đặt bằng <code>setSettings</code>
    (chẳng hạn trong <code>onReady</code>), và những gì một bố cục được mở mang đến,
    cũng được giữ như lựa chọn của người dùng, và thắng
    <code>chartOptions</code> ở lần ghé sau, kể cả khi mã của bạn đã thôi đặt chúng. Đặt một
    cài đặt về lại giá trị trong <code>chartOptions</code> của bạn thì nó không còn được giữ.
    Những gì một liên kết chia sẻ được mở mang đến là lựa chọn của người khác: chúng chỉ
    hiện trong lần ghé đó, không được giữ và không gọi listener nào của
    <code>onSettingsChange</code> (thay đổi kế tiếp sẽ báo tất cả).</li>
  <li><strong>Bố cục có tên</strong> giữ tất cả, trừ múi giờ và định dạng số, vốn là của
    người xem, và chế độ tự co giãn, thứ một lần kéo trục giá sẽ tắt. Trong JSON của bố cục,
    chúng nằm dưới <code>settings</code>, trừ thang giá và việc lật thang, vốn có trường
    riêng, và cài đặt riêng của từng loại biểu đồ, vốn nằm trong trạng thái của biểu đồ.
    Bố cục lưu trước khi có tính năng này không có chúng, và mở nó thì cài đặt giữ nguyên.
    Một phiên bản thư viện cũ hơn mở bố cục mới mà không có chúng, và lần tự lưu của nó
    ghi lại bố cục mà không có chúng.</li>
  <li><strong>Liên kết chia sẻ</strong> mang những cài đặt người gửi đã đổi khác mặc định,
    trừ múi giờ, định dạng số và chế độ tự co giãn. Cài đặt riêng của loại biểu đồ trong một
    liên kết chỉ đặt những loại mà người gửi đã đặt và loại đang hiển thị (theo mặc định nếu
    người gửi để nguyên); cài đặt của người xem cho các loại khác
    giữ nguyên. Với các công tắc mà <code>features</code>
    của bạn đặt (chú giải, khối lượng, thời gian còn lại của nến, nhãn giá trị của chỉ báo),
    mặc định là chỗ <code>features</code> đặt chúng, nên một công tắc mà ứng dụng của người
    gửi đã tắt không được gửi đi như một thay đổi.</li>
  <li><strong>Tính năng đã tắt</strong>: khi <code>features</code> của bạn tắt chú giải,
    khối lượng, thời gian còn lại của nến hay thang log, không gì được giữ, chia sẻ, mở,
    đặt hay áp dụng từ một mẫu biểu đồ có thể bật chúng lên, và hộp thoại cài đặt không có
    công tắc và màu của chú giải hay của khối lượng.</li>
  <li><strong>Bố cục theo từng mã</strong> (<code>persistLayouts</code>) và
    <code>chart.saveState()</code> giữ cài đặt riêng của từng loại biểu đồ, vốn là một phần
    trạng thái của biểu đồ, và không giữ cài đặt nào khác trong số này.</li>
</ul>

<h3>Bố cục theo từng mã</h3>
<p>
  Ngoài ra, có thể tự động lưu bộ chỉ báo, hình vẽ, cảnh báo và loại biểu đồ theo từng mã
  vào <code>localStorage</code>:
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  persistLayouts: true,  // or { keyPrefix: 'myapp:', debounceMs: 2000 }
})

// Reset a single symbol's layout
widget.clearSavedLayout('BTCUSDT')`}</code></pre>
<p>
  Bố cục được ghi lại khi đổi mã và khi huỷ widget, nên không mất gì
  khi người dùng rời trang. Trong Cài đặt biểu đồ, chúng chỉ
  giữ cài đặt riêng của từng loại biểu đồ; <code>persistSettings</code> giữ phần còn lại.
</p>

<h3>Kéo thả để nhập dữ liệu</h3>
<p>
  Thả một tệp CSV hoặc JSON lên biểu đồ để nạp ngay. Bật sẵn theo
  mặc định — tắt bằng <code>dragDropImport: false</code>. Bộ phân tích
  xử lý được các bố cục cột thông dụng (<code>time, open, high, low, close, volume</code>),
  dấu thời gian ISO 8601 và thời gian unix tính bằng giây/ms.
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>Lấy mẫu lại khung thời gian</h3>
<p>
  Đưa cho widget chuỗi dữ liệu có độ phân giải mịn nhất qua <code>widget.setData()</code>
  và các nút khung thời gian trên thanh công cụ sẽ gộp nó ngay trên client — một bộ dữ liệu
  cho mọi độ phân giải, không cần tải lại. Hoạt động khi không gắn adapter dữ liệu trực tiếp
  nào; tắt bằng <code>resampleTimeframes: false</code>. Nhóm theo tuần
  mặc định bắt đầu từ thứ Hai (<code>weekStartsOn: 0</code> để bắt đầu từ Chủ nhật).
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  timeframes: ['5m', '15m', '1h', '4h', '1d', '1w'],
})
widget.setData(oneMinuteBars)   // base series; clicking 4h/1d/1w resamples it

// Or build bars yourself
import { resampleBars, timeframeBucketStart } from '@tradecanvas/chart'

const hourly = resampleBars(oneMinuteBars, '1h')   // OHLC merged, volume summed
const days = resampleBars(oneMinuteBars, '1d', { timeZone: 'Asia/Ho_Chi_Minh' })   // from 00:00 there
const dayStart = timeframeBucketStart(trade.time, '1d', { timeZone: 'Asia/Ho_Chi_Minh' })`}</code></pre>
<p>
  Gom nhóm theo lịch: phút và giờ (1h trở xuống) làm tròn xuống bội số của khung tính từ
  epoch Unix. Ngày, tuần (từ ngày đầu tuần đã cấu hình), tháng, quý và năm bắt đầu lúc nửa
  đêm của sàn, các khung giờ chia hết một ngày (2h, 3h, 4h, 6h, 8h, 12h) cũng vậy. Với nến đưa vào
  <code>widget.setData</code>, đó là nửa đêm theo <code>timeZone</code> của mã (<code>setSymbolInfo</code>),
  nếu không có thì của thị trường (<code>setMarket</code>), nếu không nữa thì của UTC. Các khung
  mà nguồn dữ liệu không có bắt đầu lúc nửa đêm của múi giờ mà <code>resolveSymbol</code> của nó
  nêu, nếu không có thì của UTC: múi giờ của thị trường không dời chúng. Ngày đổi giờ dài 23 hoặc 25 tiếng. Nến ngày đóng dấu 00:00 UTC được đọc là đúng ngày
  chúng ghi, nên ở phía tây UTC thứ Hai vẫn nằm trong tuần của nó và nến tuần giữ dấu 00:00
  UTC. Nến đầu vào không bao giờ bị sửa đổi.
</p>
<p>
  Nến ngày hiện đúng ngày mà nó đại diện, dù biểu đồ đang hiển thị múi giờ nào: nến đóng dấu
  00:00 UTC hiện ngày UTC của nó, nến dựng từ nửa đêm của sàn hiện ngày của sàn (trên trục
  thời gian, crosshair và thẻ của nó, chú giải ghim bằng Alt-click, và thời điểm của nến mà trình đọc màn hình đọc). Khi bạn tự dựng nến, <code>timeframeBucketStart(time, timeframe, {'{'} timeZone {'}'})</code> cho biết lúc bắt đầu
  của nến chứa một thời điểm.
</p>

<h3>Danh mục theo dõi</h3>
<p>
  Một bảng trong ngăn bên, gồm các danh sách mã, mỗi dòng có giá cuối, % thay đổi và một sparkline. Chuyển, tạo,
  đổi tên và xoá danh sách từ menu của bảng; thêm mã từ ô tìm mã (+), bỏ mã, và sắp xếp lại bằng cách kéo
  hoặc Alt+↑/↓. Các dòng lấy giá từ <code>subscribeQuotes</code> của adapter, từ một nguồn giá của riêng bạn,
  hoặc từ những gì bạn đẩy vào.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code> vẫn hiện một danh sách gồm các <code>symbols</code> như trước; <code>setWatchlistEntry</code>
  vẫn đẩy giá, mức thay đổi và sparkline của một dòng.
</p>

<h3>Thông tin mã</h3>
<p>
  Một bảng trong ngăn bên, mở từ nút ⓘ cạnh mã, từ dải nút hoặc từ bảng lệnh: tên của mã, giá cuối và mức thay đổi, trạng thái
  thị trường kèm đếm ngược tới lần mở hoặc đóng cửa kế tiếp, giá mở cửa, biên độ và khối lượng trong ngày, giá đóng cửa
  phiên trước, giá mua và giá bán, bước giá, tiền tệ, múi giờ và giờ giao dịch, cùng tin tức. Thanh trạng thái báo
  khi thị trường đóng cửa.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>Điều hướng, hoàn tác và hướng chữ</h3>
<p>
  Các nút trên biểu đồ — thu nhỏ và phóng to, cuộn về trước và về sau (giữ nút thì cuộn tiếp), đặt lại —
  hiện ra khi chuột ở gần mép dưới vùng vẽ, tránh che dữ liệu, hoặc khi một nút đang có focus
  (<code>navigation: false</code> để bỏ chúng). Thay đổi cài đặt và đổi loại
  biểu đồ được hoàn tác bằng Ctrl/Cmd+Z, cùng với hình vẽ và chỉ báo. Với tiếng Ả Rập, tiếng Do Thái, tiếng Ba Tư
  hoặc tiếng Urdu, widget đảo chiều (<code>dir: 'auto'</code>; hoặc <code>'rtl'</code> / <code>'ltr'</code>);
  biểu đồ vẫn giữ thời gian chạy từ trái sang phải.
</p>

<h3>Công cụ vẽ yêu thích</h3>
<p>
  Ghim các công cụ vẽ hay dùng vào một dải ở đầu thanh bên.
  Bấm chuột phải vào công cụ bất kỳ (trong menu của nhóm hoặc ngay trên dải) để ghim hoặc bỏ ghim;
  danh sách được lưu vào localStorage. Đặt các công cụ ghim ban đầu bằng
  <code>drawingFavorites</code>:
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>

<h3>Kiểu vẽ &amp; mẫu</h3>
<p>
  Nút bảng màu trên thanh bên công cụ vẽ mở một popover kiểu vẽ — chọn màu,
  độ dày nét và kiểu nét cho hình vẽ tiếp theo (và hình đang chọn), rồi
  lưu thành các <strong>mẫu</strong> có tên trong localStorage để dùng lại chỉ với
  một cú bấm. Các lệnh tương đương trong code:
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>Cây đối tượng</h3>
<p>
  Nút lớp (layers) trên dải nút (trên thanh công cụ, khi không có dải nút) mở cây đối tượng
  trong ngăn bên, liệt kê mọi chỉ báo đang có, gọi theo tên trên nhãn của nó (EMA 20, Compare ETHUSDT),
  và mọi hình vẽ. Chỉ báo có thể xoá; mỗi hình vẽ có nút
  hiện / ẩn, khoá / mở khoá, cài đặt và xoá, còn các nhóm được liệt kê cùng
  các hình vẽ của chúng bên dưới. Bật sẵn theo mặc định — tắt bằng
  <code>objectTree: false</code>. Các nút cho hình vẽ tương ứng với:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // không bị ẩn, và hiện trên khung thời gian này
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // ẩn, khoá và chọn cùng nhau
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>Cài đặt hình vẽ và menu</h3>
<p>
  Bấm đúp vào một hình vẽ, hoặc dùng nút bánh răng của nó trong cây đối tượng, để mở
  cài đặt theo từng tab: Kiểu (đường, hai đầu đường, màu nền, các cài đặt riêng
  của công cụ như mức Fibonacci, phần kéo dài và nhãn), Chữ cho các công cụ có
  chữ, Toạ độ (các điểm của nó theo múi giờ của biểu đồ) và Hiển thị (các khung
  thời gian mà nó hiện trên đó), cùng menu Mẫu, Huỷ và OK ở cuối hộp thoại.
  Bấm chuột phải vào một
  hình vẽ để mở menu: cài đặt, cảnh báo trên đường của nó, thứ tự, nhóm, khoá,
  ẩn, nhân bản và xoá. Thanh bên còn có tẩy, công cụ phóng to và nam châm với
  các mức tắt, yếu và mạnh. Xem
  <a href={href('/docs/drawing-tools')}>Công cụ vẽ</a> để biết API bên dưới.
</p>

<p>
  Nút bánh răng trên mỗi dòng chỉ báo mở <strong>hộp thoại cài đặt</strong>,
  tự đọc các tham số của chỉ báo (số, công tắc, màu) và
  áp dụng thay đổi ngay qua <code>updateIndicator</code> — không cần xoá rồi
  thêm lại để đổi chu kỳ hay màu.
</p>
<p>
  Phần <strong>So sánh</strong> trong cây đối tượng liệt kê mọi mã đang so sánh, như hộp thoại
  so sánh: mỗi mã kèm cách so sánh (thay đổi phần trăm, thang riêng, pane riêng, chênh lệch, tỷ lệ
  hay tương quan) và một nút để bỏ nó đi. Khi có adapter dữ liệu trực tiếp, nút + của phần này mở
  hộp thoại so sánh. Dù so sánh theo cách nào, widget cũng tải nến của mã kia qua
  <code>adapter.fetchHistory</code> trước khi thêm, và không thêm gì nếu nến không về (tải lỗi,
  hoặc không có nến ở khung thời gian này); một thông báo nói lý do. Một mã so sánh do trạng thái
  đã lưu mang lại vẫn ở trên biểu đồ khi nến của nó không tải được, và có dữ liệu ở khung thời
  gian có nến. Các mã so sánh tự tải lại khi đổi khung thời gian. Các lệnh tương đương trong code:
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)
await widget.addCompareSymbol('ETHUSDT', 'scale')  // its bars first; nothing added if they don't come

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.setScaleMode('percentage')     // each line's change, read on the axis
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>Cảnh báo giá</h3>
<p>
  Ngoài một mức giá, cảnh báo còn có thể so một đường với một đường khác (giá cắt một đường
  trung bình động, MACD cắt đường tín hiệu của nó), kích hoạt khi giá biến động một số phần trăm
  trong một số nến (từ 2 đến 500), chỉ xét các nến đã đóng (không kích hoạt bởi một râu nến đâm
  qua rồi quay lại), và hết hạn. Bảng cảnh báo của widget có tất cả những tuỳ chọn này; trong code
  chúng là tham số cuối cùng của <code>addAlert</code>. Cảnh báo được kiểm tra ở mỗi lần có giá,
  dù từ <code>setCurrentPrice</code> hay từ một nguồn dữ liệu đã kết nối, cùng lúc với các đường
  mà chúng theo dõi:
</p>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })
const rsi = chart.addIndicator('rsi')
chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: \`\${ema}:value\` })
chart.addAlert(NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 })
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', \`\${rsi}:value\`, 'RSI', { onBarClose: true })
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 })

chart.on('alertExpired', (e) => e.payload)   // it reached its time without firing
chart.on('alertTriggered', (e) => e.payload)  // { id, condition, channel, target?, percent?, bars?, … }`}</code></pre>
<p>
  Biểu tượng chuông trên thanh công cụ mở một bảng nổi để thêm, xem và xoá cảnh báo
  giá; một thông báo toast hiện lên khi cảnh báo kích hoạt. Đường cảnh báo cũng
  <strong>kéo được</strong> — nắm một đường trên biểu đồ và trượt để đổi giá
  (di chuyển cảnh báo sẽ đặt nó về trạng thái chờ kích hoạt lại). Bật sẵn theo mặc định — tắt bằng
  <code>alerts: false</code>. Điều khiển bằng code qua API của
  <code>Chart</code> và các sự kiện cảnh báo có kiểu:
</p>
<pre><code>{`// Add from code (condition: 'crossing' | 'crossingUp' | 'crossingDown'
//                          | 'greaterThan' | 'lessThan')
const id = chart.addAlert(64200, 'crossingUp', 'breakout')
chart.removeAlert(id)
chart.getAlerts()      // PriceAlert[]
chart.saveAlerts('tcw:alerts:BTCUSDT')   // localStorage persistence
chart.loadAlerts('tcw:alerts:BTCUSDT')

// React to triggers
chart.on('alertTriggered', (e) => {
  console.log('hit', e.payload.price, e.payload.message)
})
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)

// Indicator alerts: bind to an indicator line via channel '<instanceId>:<key>'.
// In the widget, the alerts panel's source dropdown lists every active line.
const ema = chart.addIndicator('rsi')
chart.addAlert(70, 'crossingUp', 'RSI overbought', \`\${ema}:rsi\`, 'RSI')`}</code></pre>
<p>
  Có thể bật âm thanh và/hoặc thông báo trên màn hình máy tính khi cảnh báo kích hoạt (cả hai mặc định
  tắt). <code>sound: true</code> phát tiếng bíp có sẵn; truyền một URL để dùng
  âm thanh riêng. <code>desktop: true</code> dùng Notification API và hỏi
  quyền ở lần dùng đầu tiên.
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>Công tắc tính năng</h3>
<p>132 công tắc, cái nào cũng bật cho tới khi tắt: tên không có dấu chấm là cả một tính năng, tắt ở mọi nơi nó xuất hiện; tên có dấu chấm là một chỗ. Công tắc đổi được khi widget đang chạy. Danh sách đầy đủ và các option cũ tương ứng nằm ở <a href={href('/docs/customization')}>Tùy biến</a>.</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // một nút, một nhóm công cụ vẽ, mọi phím tắt

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // mọi công tắc, bật hay tắt`}</code></pre>

<h3>Nút và mục menu của riêng bạn</h3>
<p>
  Thêm nút vào thanh công cụ (một biểu tượng có sẵn hoặc phần tử của bạn, chữ, một công
  tắc) và thêm mục vào các menu chuột phải của biểu đồ, xếp sau các mục của widget.
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // hoặc một phần tử <svg>; hoặc text: 'News'
  side: 'right',           // 'left' nằm cùng các nút điều khiển biểu đồ
  toggle: true,
  onClick: () => news?.setActive(togglePanel()),
})
news?.setText('3')
news?.remove()

new ChartWidget(host, {
  chartMenuItems: ({ area, price, time }) => area === 'plot' && price !== undefined
    ? [{ label: \`Copy \${price.toFixed(2)}\`, icon: 'check', onSelect: () => copy(price) }]
    : [],
})`}</code></pre>
<p>Ngoài ra còn nút menu trên toolbar, nút trên thanh công cụ vẽ, mục trên thanh trạng thái, chỗ riêng cho bạn trong từng thanh và trên biểu đồ, và mục ở cuối menu của một hình vẽ hay một chỉ báo (xem <a href={href('/docs/customization#parts')}>Tùy biến</a>):</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // được hỏi lại mỗi lần mở
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // một lớp trên biểu đồ
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // phím tắt của riêng bạn, thay phím tắt của widget nếu trùng phím

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  Nhiều widget biểu đồ đặt cạnh nhau, mỗi biểu đồ có mã, khung thời gian, chỉ báo và
  hình vẽ riêng. Một thanh phía trên chọn cách sắp xếp, liên kết các biểu đồ và lưu cả
  lưới thành một bố cục có tên. Biểu đồ được bấm gần nhất là biểu đồ đang chọn (có viền).
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x1' '1x2' '2x1' '2x2' '1x3' '3x1' '2x3' '3x2'
  widget: { timeframe: '1h' },                    // cho mọi biểu đồ
  adapter: () => new BinanceAdapter(),            // mỗi biểu đồ một adapter: một adapter giữ một luồng
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // đưa các biểu đồ khác về cùng khung với biểu đồ đang chọn
grid.applyOverrides({ 'grid.vertical.visible': false })   // giao diện của mọi biểu đồ, kể cả biểu đồ thêm sau
grid.setFeatures({ 'toolbar.replay': false })               // công tắc của mọi biểu đồ, kể cả biểu đồ thêm sau
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// Từng biểu đồ ngay khi được tạo (lúc đầu và khi lưới thêm ô)
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  Đồng bộ con trỏ chữ thập hiện thời điểm dưới con trỏ chuột trên mọi biểu đồ; đồng bộ
  thời gian cuộn và phóng to/thu nhỏ các biểu đồ khác theo biểu đồ đang dùng; hình vẽ được
  sao chép sang các biểu đồ đang hiện cùng mã (bật mục này sẽ gộp hình vẽ của các biểu đồ
  đó lại, không mất hình nào); đồng bộ phát lại cho các biểu đồ khác phát lại đến cùng thời điểm
  với biểu đồ đang phát lại (biểu đồ có nến dài hơn các bước phát lại sẽ hiện trọn nến chứa thời điểm đó).
  Các biểu đồ bị bớt đi khi lưới thu nhỏ sẽ được cất đi, vẫn
  được giữ trong bố cục đã lưu, và trở lại nguyên như cũ khi lưới mở rộng lại; một biểu đồ
  hoàn toàn mới sẽ mở theo mã và khung thời gian của biểu đồ đang chọn nếu hai mục đó đang
  được đồng bộ.
</p>

<h2>ChartGrid</h2>
<p>Bố cục nhiều biểu đồ headless (không có thanh công cụ) đồng bộ với nhau; xem <code>ChartWidgetGrid</code> nếu cần giao diện đầy đủ.</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// Mỗi biểu đồ một adapter: một adapter giữ một luồng
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>Bố cục: <code>'1x1'</code>, <code>'1x2'</code>, <code>'2x1'</code>, <code>'2x2'</code>, <code>'1x3'</code>, <code>'3x1'</code>, <code>'2x3'</code>, <code>'3x2'</code>.</p>
