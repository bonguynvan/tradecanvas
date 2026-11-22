<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Tham chiếu API — Tài liệu TradeCanvas</title>
  <meta name="description" content="Tham chiếu API cho Chart, ChartWidget, ChartGrid và các API chính của TradeCanvas." />
</svelte:head>

<h1>Tham chiếu API</h1>
<p>API public của các class cấp cao nhất: <code>Chart</code>, <code>ChartWidget</code>, <code>ChartWidgetGrid</code> và <code>ChartGrid</code>.</p>

<h2>Chart</h2>
<p>Renderer headless. Bạn tự làm UI, đăng ký event và thay đổi state bằng lời gọi trực tiếp.</p>

<h3>Khởi tạo</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>Dữ liệu</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>Thay toàn bộ chuỗi dữ liệu.</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>Thêm một nến mới; tự cuộn nếu được bật.</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>Thêm theo lô; tính lại chỉ báo một lần.</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>Cập nhật nến đang hình thành.</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>Gộp một tick vào nến cuối.</td></tr>
    <tr><td><code>updateBar(bar)</code></td><td>Sửa một nến đã nạp: nến có cùng time, ở bất kỳ vị trí nào trong chuỗi. View giữ nguyên; trả về false khi không có nến đã nạp nào có time đó.</td></tr>
    <tr><td><code>getData()</code></td><td>Đọc chuỗi OHLC gốc.</td></tr>
  </tbody>
</table>

<p id="live-price">
  Nến từ <code>appendBar</code>, <code>appendBars</code> hoặc <code>updateLastBar</code>, và tick, là giá hiện tại: đường giá, cảnh báo và P&amp;L của các order đi theo nó, giống như khi đi theo một stream đã kết nối và <code>setCurrentPrice</code>. Một nến mới gửi <code>dataUpdate</code>; tick trên nến đang hình thành thì không gửi.
</p>

<p id="corrections">
  Nến mà feed sửa lại được đưa vào bằng <code>updateBar(bar)</code>: nó thay nến đã nạp có cùng <code>time</code>, ở bất kỳ đâu trong chuỗi, và trả về <code>true</code>. Chỉ báo được tính lại từ nến đó trở đi, Heikin-Ashi, Renko và các kiểu khác dựng từ nến cũng cập nhật theo, view giữ nguyên vị trí; các lần sửa trước frame kế tiếp được tính một lần, từ nến sớm nhất. Hàm trả về <code>false</code> và không thay đổi gì khi không có nến đã nạp nào có time đó (nến mới thuộc về <code>appendBar</code>, nến cũ hơn thuộc về <code>prependBars</code>) hoặc khi chart không nhận được nến đó. Đây không phải giá hiện tại: order và cảnh báo không đi theo nó, không cảnh báo nào kích hoạt từ nó, và cảnh báo trên đường chỉ báo không được kiểm tra lại với giá trị đã sửa. Sửa nến cuối thì đường giá di chuyển, như sau <code>setData</code>. Trong replay, hàm sửa chuỗi dữ liệu thực: nến mà replay đã đi qua hiển thị bản sửa ngay, nến phía sau hiển thị khi replay đến đó; nến trong giờ mở rộng, khi giờ mở rộng đang ẩn, hiển thị khi giờ mở rộng được bật lại. Gửi lại đúng nến đã nạp thì không thay đổi gì; volume thiếu được tính là 0, như với <code>setData</code>, nên hãy gửi đủ nến. Hàm gửi <code>dataUpdate</code> với <code>{'{'} kind: 'correction', time, index {'}'}</code>. Trong ChartWidget, <code>widget.getChart().updateBar(bar)</code> sửa nến của feed đã kết nối; nến đưa cho widget bằng <code>setData</code> là bản sao mà widget dùng để dựng lại các timeframe, nên bản sửa trên chúng chỉ có hiệu lực đến lần đổi timeframe tiếp theo (phương thức widget cho trường hợp này sẽ có sau).
</p>

<p id="bar-times">
  Thời gian của nến là epoch tính bằng mili giây hoặc giây, một đơn vị cho cả chuỗi. Chart đọc đơn vị một lần, từ nến mới nhất: <code>barTimeUnit(data)</code> trả về 1 (mili giây, từ 1e11 trở lên) hoặc 1000 (giây). Vì vậy chuỗi tính bằng mili giây vẫn giữ đúng các ngày trước 2001, dù chúng nhỏ hơn 1e12. Hãy giữ chuỗi trong một đơn vị; các thời gian mà chart trả lại (event, <code>getData()</code>) dùng đơn vị đó.
</p>

<h3>Loại biểu đồ &amp; theme</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>Một trong 18 loại — xem <a href={href('/docs/chart-types')}>Loại biểu đồ</a>.</td></tr>
    <tr><td><code>getChartType()</code></td><td>Loại mà chart đang vẽ (mặc định <code>'candlestick'</code>).</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>Đổi giữa các theme có sẵn, hoặc đặt theme riêng. <code>getTheme()</code> trả lại theme như đã đặt.</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>Đặt style cho bất kỳ phần nào của chart theo key (<code>'grid.vertical.visible'</code>, <code>'series.candlestick.upColor'</code>…); <code>null</code> bỏ một key. Xem <a href={href('/docs/styling#overrides')}>Styling</a>.</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>Đặt toàn bộ một layer cùng lúc; bỏ các key (hoặc tất cả).</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>Override của một layer; style sau khi resolve; giá trị resolve của một key.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>Đổi timeframe đang dùng; kết nối lại stream.</td></tr>
  </tbody>
</table>

<h3>Renderer</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td>Tuỳ chọn <code>renderer</code></td><td><code>'canvas'</code> (mặc định), <code>'webgl'</code>, hoặc <code>'auto'</code> (chỉ dùng WebGL trên GPU phần cứng).</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>Đổi khi đang chạy. Trả về renderer đang vẽ: <code>'canvas'</code> khi không có WebGL 2.</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> hoặc <code>'webgl'</code>.</td></tr>
  </tbody>
</table>
<p>GPU vẽ những gì, và số liệu đo: <a href={href('/docs/performance')}>Hiệu năng → WebGL renderer</a>.</p>

<h3>Chỉ báo</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Mục đích</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>Thêm chỉ báo overlay hoặc chỉ báo ở pane riêng. Trả về instance id.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>Thay đổi một chỉ báo đang chạy.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>Xoá và giải phóng.</td></tr>
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>Xoá nhiều chỉ báo, gộp thành một bước undo.</td></tr>
    <tr><td><code>removeAll(what?)</code></td><td>Mọi hình vẽ (<code>'drawings'</code>), mọi chỉ báo (<code>'indicators'</code>) hoặc cả hai (<code>'all'</code>), gộp thành một bước undo; hình vẽ đã khoá được giữ lại. Trả về số lượng đã xoá của mỗi loại.</td></tr>
    <tr><td><code>takeBackDrawing(id)</code></td><td>Huỷ một hình vẽ vừa tạo, như bấm Cancel ngay sau khi vẽ: bỏ luôn bước đã tạo nó nếu đó là bước cuối, nên không còn gì để undo hay redo. Event <code>drawingCreate</code> có <code>drawn: true</code> với hình vẽ vừa được vẽ bằng con trỏ.</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>Màu, độ dày đường, độ mờ, và kiểu nét đứt cùng trạng thái hiển thị của từng plot (<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>), và <code>shape</code> cùng <code>size</code> của một plot markers.</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>Style ban đầu cho các chỉ báo cùng loại được thêm từ đây về sau.</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>Các khung thời gian mà chỉ báo hiển thị (<code>{`{ minutes: false, hours: [1, 4] }`}</code>); <code>null</code>: tất cả. Được lưu cùng layout.</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td>Khung thời gian của các nến đặt bằng <code>setData</code>: legend ghi tên nó, và các chỉ báo giới hạn theo khung thời gian đi theo nó.</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>Style riêng của một pane, được lưu cùng chỉ báo của pane đó.</td></tr>
  </tbody>
</table>

<h3>Trục &amp; thang</h3>
<p>
  Trục giá (dải bên phải) và trục thời gian (dải bên dưới) nhận thao tác
  trực tiếp bằng con trỏ, với các thao tác quen thuộc với trader:
</p>
<table>
  <thead><tr><th>Thao tác</th><th>Tác dụng</th></tr></thead>
  <tbody>
    <tr><td>Kéo trục giá lên / xuống</td><td>Thu hẹp / mở rộng khoảng giá theo chiều dọc (tắt auto-scale).</td></tr>
    <tr><td>Kéo trục thời gian sang trái / phải</td><td>Zoom vào / ra trên trục thời gian.</td></tr>
    <tr><td>Double-click trục giá</td><td>Bật lại auto-scale.</td></tr>
    <tr><td>Double-click trục thời gian</td><td>Hiển thị toàn bộ dữ liệu trong viewport.</td></tr>
  </tbody>
</table>
<p>
  <strong>Múi giờ.</strong> Trục thời gian, thời gian của crosshair, tooltip, các mốc
  ngày và các preset khoảng thời gian mặc định theo múi giờ của trình duyệt. Có thể đặt cho chart một
  múi giờ IANA (có tính giờ mùa hè), một độ lệch cố định tính bằng phút về phía đông UTC, hoặc
  <code>'exchange'</code> để dùng múi giờ của mã (<code>SymbolInfo.timeZone</code>), nếu không có thì dùng
  múi giờ của thị trường: qua tuỳ chọn <code>timeZone</code>, trong phần cài đặt của widget, hoặc gọi trực tiếp:
</p>
<pre><code>{`new Chart(host, { timeZone: 'America/New_York' }) // from the start

chart.setTimeZone('America/New_York')  // New York's time, daylight saving included
chart.setTimeZone(330)                 // UTC+5:30, in minutes
chart.setTimeZone(null)                // the browser's
chart.setTimeZone('exchange')          // the symbol's zone, else its market's
chart.getTimeZone()                    // 'exchange', as set
chart.getEffectiveTimeZone()           // the zone it stands for: 'Asia/Ho_Chi_Minh' on HOSE`}</code></pre>
<p>
  Các phương thức và kiểu của chart viết là <code>timeZone</code>, giống <code>Intl.DateTimeFormat</code>.
  Cách viết của 1.x (<code>setTimezone</code> và các hàm cùng nhóm, <code>SymbolInfo.timezone</code>) đã bị xoá
  ở 2.0: xem <a href={href('/docs/migration#removed')}>Chuyển sang 2.0</a>.
</p>

<p>Các tác dụng trên cũng gọi được bằng code:</p>
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
  <strong>Khoảng thời gian dài.</strong> Mỗi ô nến không bao giờ hẹp hơn 0.25 px, nên khoảng thời gian dài hơn mức đó cho phép (26 năm nến ngày trên laptop) chỉ hiển thị phần mới nhất. Trong widget, chọn khoảng dài trên thanh khoảng thời gian sẽ chuyển sang timeframe có số nến vừa màn hình, mỗi nến từ 2 px trở lên: 5Y nến ngày chuyển sang tuần, All chuyển sang tháng; khoảng ngắn quay về timeframe đã chọn, không bao giờ nhỏ hơn. Widget chỉ chuyển sang các timeframe mà feed cung cấp (hoặc các nến hiện có resample được). <code>{`features: { 'statusBar.rangeTimeframe': false }`}</code> giữ nguyên timeframe. Trên <code>Chart</code> thuần, <code>minBarUnit</code> (tuỳ chọn, hoặc <code>setMinBarUnit</code>) cho phép ô nến nhỏ đến 0.02 px, vẽ theo từng cột pixel.
</p>

<p>
  <strong>Chế độ thang giá.</strong> Ngoài thang thường và thang log, trục
  có thể tính lại nhãn so với nến đầu tiên đang hiển thị — <code>percentage</code>
  hiển thị % thay đổi, <code>indexedTo100</code> đặt mốc cơ sở bằng 100. Thang thường,
  phần trăm và indexed dùng chung hình học tuyến tính; chỉ nhãn là khác nhau.
  Đặt được từ panel cài đặt chart hoặc gọi trực tiếp:
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>Định dạng giá và thời gian</h3>
<p>
  Giá có thể hiển thị theo định dạng riêng, hoặc dạng phân số của một điểm như cách yết giá trái phiếu và
  hợp đồng tương lai trái phiếu (<code>101'16</code> là 101 và 16/32). Định dạng áp dụng cho
  mọi chỗ in giá theo thang giá: trục, crosshair, tag giá cuối,
  legend, tooltip, order, cảnh báo và nhãn hình vẽ; trục đặt các vạch chia ở các phân số
  tròn và <code>roundPrice</code> làm tròn theo chúng. Pane chỉ báo giữ cách hiển thị số
  riêng. Khi không có định dạng riêng, giá được nhóm theo number locale; nhãn vạch chia
  của trục chỉ hiển thị số chữ số thập phân mà bước chia cần (73,500), còn giá cuối,
  crosshair và các tag cạnh trục hiển thị đủ mọi chữ số thập phân. Khi mã hoặc thị trường không đặt số chữ số thập phân, số đó bằng số mà bước chia của thang cần cộng thêm một, và với giá dưới 1 thì có ít nhất bốn chữ số có nghĩa (0.000004349, trong khi chỉ theo bước chia thì là 0.00000435). Thời gian cũng định dạng riêng được; hàm định dạng được cho biết nhãn đó là loại gì.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: typeof timeZone === 'string' ? timeZone : undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">Cách các trục chọn nhãn</h3>
<p>
  Trục thời gian gắn nhãn cho các nến mở đầu bước lịch lớn nhất: năm (in đậm), tháng, ngày, giờ chẵn, cách nhau ít nhất 80 px. Vì vậy ở 5Y trục hiển thị <code>2022 · Jul · 2023</code>, ở một tháng là <code>Oct · 8 · 15</code>, trong một ngày là <code>12:00 · 18:00</code>. Nhãn gắn với nến, không gắn với màn hình: khi pan, nhãn di chuyển cùng nến, và dữ liệu lịch sử nạp thêm phía trước không làm nhãn đổi chỗ. Bên trái nến cũ nhất không có nhãn. Khi không có nhãn năm mới nào, một tag ở đầu trái, cùng kiểu với tag múi giờ ở bên phải, ghi phần mà các nhãn bỏ qua, tính theo nến đầu tiên đang hiển thị: năm khi nhãn là tháng, <code>Mar 2023</code> khi nhãn là ngày, ngày đầy đủ khi nhãn là giờ trong một ngày. Nếu đè lên một nhãn ở đầu trái thì tag thay cho nhãn đó và ghi cả nội dung của nó (<code>Mar 2023</code> thay cho <code>Mar</code>). Khi pan về quá khứ, năm luôn có trên trục. Tên tháng theo <code>setNumberLocale</code>, và các đường lưới nằm ở vị trí của nhãn.
</p>
<p>
  Thang giá đặt số nhãn vừa với chiều cao của nó, cách nhau ít nhất 30 px, theo bước giá của thị trường. Trên thang log, bước chia tăng theo giá, nên phần dưới cũng có nhãn như phần trên; trên thang phần trăm hoặc indexed, nhãn là các mức phần trăm hoặc điểm chỉ số tròn tính từ mốc cơ sở. Pane chỉ báo cũng tính số nhãn theo chiều cao của pane.
</p>

<h3>Thị trường: bước giá, biên độ và phiên</h3>
<p>
  <code>setMarket</code> đặt cho chart quy tắc của một sàn: màu nến, số chữ số thập phân,
  bước giá (có thể phụ thuộc vào giá), giá trần và giá sàn trong ngày, và lô.
  <code>roundPrice</code> và <code>getPriceStep</code> theo bước giá của vùng giá tương ứng, nên
  giá từ các menu của chart rơi đúng vào giá hợp lệ, và order ticket của widget kiểm tra
  lệnh theo bước giá, biên độ trong ngày và số lô chẵn. Preset cũng chứa các phiên
  và múi giờ của sàn, dùng cho <code>getCurrentSession</code> và code của bạn; phần
  tô màu phiên và giờ mở rộng của chart lấy từ <code>setSymbolInfo</code>. Có preset cho các sàn Việt Nam theo quy định tháng 5/2025: HOSE (10, 50 hoặc
  100 đồng mỗi bước tuỳ giá, ±7%), ETF và chứng quyền có bảo đảm của HOSE (10 đồng), HNX (±10%, có
  phiên sau giờ đóng cửa), UPCoM (±15%) và hợp đồng tương lai chỉ số VN30 (0.1 điểm mỗi bước, ±7%, từ 8:45);
  cổ phiếu và lô 100, xanh khi tăng và đỏ khi giảm, tím cho giá trần, xanh lơ cho giá sàn và vàng cho
  giá tham chiếu. Giá tính bằng nghìn đồng, như trên bảng giá;
  <code>scaleMarketPrices(preset, 1000)</code> đọc giá theo đồng.
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // or scaleMarketPrices(MARKET_HOSE, 1000) for 25350
chart.setTimeZone('exchange')                // the axis in the market's zone: Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35)                  // the reference: yesterday's close
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35, a 50-dong step
chart.getPriceStep(9.5)                      // 0.01 below 10,000 dong

// The rules on their own
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }, by the clock only

// VN30 futures: the four listed contracts and their last trading days
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // the third Thursday, earlier on a holiday`}</code></pre>
<p>
  Hàn Quốc, theo quy định tháng 9/2026: <code>MARKET_KRX</code> cho cổ phiếu KOSPI và KOSDAQ tính bằng won
  (1 đến 1,000 won mỗi bước tuỳ giá; ±30%, mức biến động được làm tròn xuống theo bước giá của giá tham chiếu
  trước, như cách KRX làm tròn; phiên khớp lệnh mở cửa và đóng cửa, phiên liên tục và
  phiên After-Market đến 20:00), <code>MARKET_NXT</code> cho Nextrade (bước giá và biên độ của KRX,
  phiên riêng từ 8:00 đến 20:00) và <code>MARKET_UPBIT_KRW</code> cho thị trường KRW của Upbit
  (bước giá từ 1,000 won xuống đến một phần trăm triệu won, không có biên độ). Các preset này vẽ
  giá tăng màu đỏ và giá giảm màu xanh dương (<code>KR_COLORS</code>);
  <code>createMarketTheme(theme, KR_COLORS)</code> áp màu nến đó cho bất kỳ theme nào, và
  <code>formatVolumeLoc(value, 'ko')</code> rút gọn khối lượng theo 만, 억 và 조.
  Với <code>numberLocale: 'ko-KR'</code> chart cũng hiển thị khối lượng như vậy: ở legend,
  tooltip của crosshair, data window của ChartWidget và hộp Date and Price Range.
</p>
<pre><code>{`import { MARKET_KRX, KR_COLORS, createMarketTheme, LIGHT_THEME, formatVolumeLoc } from '@tradecanvas/chart'

chart.setMarket(MARKET_KRX)                  // red up, blue down
chart.setPriceLimits(9980)                   // the reference: yesterday's close
chart.getPriceLimits()                       // { ceiling: 12970, floor: 6990, reference: 9980 }
chart.roundPrice(72340)                      // 72300, a 100-won step
createMarketTheme(LIGHT_THEME, KR_COLORS)    // a theme with Korea's candles
formatVolumeLoc(345_000_000, 'ko')           // '3.45억'`}</code></pre>
<p>
  Thị trường riêng là một <code>MarketConfig</code>: <code>priceStep</code>, hoặc
  <code>priceSteps: [{'{'} from, step {'}'}]</code> cho các vùng giá, <code>priceLimits</code>,
  <code>volumeUnit</code> (lô), <code>sessions</code>, <code>timeZone</code> và
  <code>colorScheme</code>. <code>minTick</code> riêng của mã được ưu tiên hơn bước giá
  của thị trường. Các sàn thỉnh thoảng thay đổi quy định; hãy đối chiếu preset với quy định
  hiện hành của sàn trước khi dùng.
</p>

<p>
  Biên độ được vẽ bằng các đường nét đứt có tên CE, FL và REF, kèm tag trên trục, theo màu
  <code>colorScheme</code> của thị trường, nếu không có thì theo <code>priceLimits</code> của theme. Màu
  nào không đạt độ tương phản 4.5:1 trên nền của theme sẽ được đẩy về phía màu chữ cho đến khi đạt, nên
  màu hồng, xanh lơ và vàng sáng của bảng giá vẫn giữ sắc độ trên theme sáng.
  Theme riêng không có <code>priceLimits</code> dùng màu của theme sáng trên nền sáng, của theme tối trên nền tối.
</p>

<h3 id="comparing-symbols">So sánh mã</h3>
<p>
  Phần trăm thay đổi của một mã khác trên thang giá (<code>addCompareSymbol</code>), hoặc
  giá của mã đó trên thang riêng, trong pane riêng, hoặc spread hay tỷ lệ giữa giá đóng cửa của
  chart với mã đó — các trường hợp sau là chỉ báo (<code>compareSymbol</code>, <code>compareSymbolPane</code>,
  <code>spread</code>), có legend, tag giá trị, cảnh báo và được lưu trong layout như mọi
  chỉ báo khác. Nến của mã kia được khớp với nến của chart theo thời gian. Chart yêu cầu
  các nến nó cần; hãy cung cấp lại sau khi đổi timeframe. <code>correlation</code> (theo giá đóng cửa)
  và <code>correlationlog</code> (theo lợi nhuận giữa các nến) đọc mã kia theo cùng cách, từ −1 đến 1.
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('compareSymbolPane', { symbol: 'ETHUSDT' })                         // own pane, own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  Đường phần trăm bắt đầu tại giá đóng cửa của chính chart ở nến đầu tiên trên màn hình, là mức giá mà
  thang phần trăm đọc là 0%, tính từ nến đầu tiên của mã kia tại đó; mã có nến bắt đầu muộn hơn
  cũng bắt đầu từ 0%. Khi thang giá ở chế độ phần trăm (<code>chart.setScaleMode('percentage')</code>)
  mỗi đường hiển thị mức thay đổi của riêng nó kể từ nến đầu tiên trên màn hình, mốc này dịch chuyển khi pan.
  Nhãn nằm ở cuối đường. <code>chart.getCompareValues(barIndex?)</code> trả về giá trị của từng đường tại một
  nến (mặc định là nến cuối), để làm legend riêng: <code>{'{'} id, label, color, visible, close, change, stale {'}'}</code>, trong đó <code>close</code> là
  giá đóng cửa của mã kia tại nến đó hoặc trước đó và <code>change</code> là mức thay đổi tính bằng phần trăm, đúng như
  đường hiển thị. Sau nến cuối của mã kia (nến chỉ tải một lần, còn chart vẫn tiếp tục
  stream) hàm trả về giá đóng cửa cuối, với <code>stale: true</code>. <code>chart.setCompareVisible(id, false)</code>
  ẩn một đường và loại nó khỏi auto scale.
</p>
<p>
  Renko, Kagi, Line Break, P&amp;F và Range Bars không vẽ đường so sánh: nến của các loại này chỉ đếm tiếp từ
  nến đầu, không có thời gian riêng, nên đường so sánh sẽ đọc mã kia ở sai
  nến. Trên các loại này các đường không tham gia auto scale, và <code>getCompareValues()</code>
  trả về giá đóng cửa của từng mã tại nến dữ liệu mới nhất, bất kể yêu cầu nến nào, với <code>change: null</code>.
  Các chỉ báo đọc mã khác theo thời gian (mã trên thang riêng hoặc pane riêng, spread,
  tỷ lệ, correlation) cũng không được vẽ ở đó, và không tham gia fit thang: <code>getActiveIndicators()</code> trả về
  chúng với <code>shown: false</code> và <code>offChartType: true</code>, và ChartWidget làm mờ dòng của chúng như với
  mã so sánh. Quay lại nến thì chúng hiện lại.
  Pane không còn gì khác bên trong bị bỏ đi ở các loại đó, phần chỗ trống dành cho vùng vẽ, và hiện lại cùng chúng.
</p>
<pre><code>{`chart.setScaleMode('percentage')       // each line reads its change on the axis
chart.getCompareValues()               // [{ id: 'eth', label: 'ETHUSDT', color, visible, close: 2650.4, change: -1.82, stale: false }]
chart.getCompareValues(barIndex)       // at a bar: the one under the cursor
chart.setCompareVisible('eth', false)  // hidden, and out of the auto scale`}</code></pre>
<p>
  Trong ChartWidget, nút So sánh trên toolbar (và dấu + trong cây đối tượng) mở dialog so sánh: tìm một
  mã, chọn cách thêm trong <strong>Thêm dạng</strong> (phần trăm thay đổi, thang riêng, pane riêng, spread, tỷ lệ, hoặc
  correlation của giá hay của lợi nhuận) và thêm bao nhiêu mã tuỳ ý. Các mã đang so sánh được liệt kê trước,
  mỗi mã kèm cách thêm và một nút để bỏ. Lần mở sau, dialog dùng cách thêm đã chọn lần trước.
</p>
<p>
  ChartWidget chuyển thang giá sang phần trăm khi có mã so sánh theo phần trăm, và trả về
  thang cũ khi mã cuối cùng bị bỏ. Thang log, phần trăm hoặc indexed-to-100 được
  giữ nguyên, và thang bạn chọn trong lúc so sánh (% hoặc log trên thanh trạng thái, menu của
  chart, phần cài đặt) cũng được giữ, kể cả sau khi bỏ mã so sánh cuối cùng. Thang phần trăm không bao giờ được lưu:
  layout và link chia sẻ giữ thang của bạn. Legend liệt kê từng mã so sánh theo phần trăm
  phía trên các chỉ báo, đánh dấu bằng màu đường của mã, kèm giá và mức thay đổi tại nến dưới
  con trỏ (nếu không thì tại nến cuối), một biểu tượng mắt để ẩn và một nút để bỏ. Nến của mã được tải sâu bằng
  nến của chart và, khi chart tải thêm nến cũ hơn, cả đoạn nến thêm đó (với feed không có <code>fetchHistoryBefore</code>,
  mỗi lần tải lại toàn bộ, sâu bằng chart, khi feed còn nến cũ hơn), nên đường của mã bắt đầu cùng chỗ với chart.
  Trên loại biểu đồ không vẽ đường so sánh, widget giữ nguyên thang của bạn và làm mờ dòng của từng mã
  so sánh, giải thích lý do trong tooltip và cho trình đọc màn hình; khi quay lại loại có vẽ, thang phần trăm được bật lại.
</p>

<h3>Xuất dữ liệu</h3>
<p>
  Xuất nến dạng CSV hoặc JSON, mỗi đường chỉ báo một cột riêng, đặt tên như
  tên trong legend. ChartWidget có mục <strong>Xuất dữ liệu (CSV)</strong> trong menu chuột phải
  của chart. Số có phần thập phân được ghi với 15 chữ số có nghĩa, nên
  khối lượng cộng từ các nến nhỏ hơn hiển thị 40.37 thay vì 40.370000000000005.
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

<h3>Volume Profile</h3>
<p>
  Histogram ngang của khối lượng giao dịch, chia theo vùng giá trong khoảng đang
  hiển thị. Mặc định tắt — bật bằng code hoặc trong phần cài đặt
  của widget:
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>Đánh dấu swing (pivot)</h3>
<p>
  Đánh dấu đỉnh/đáy swing dạng fractal bằng tam giác nhỏ (▼ phía trên pivot high
  đã xác nhận, ▲ phía dưới pivot low). Độ mạnh (strength) quy định số nến thấp hơn
  cần có ở mỗi bên. Bật/tắt trong phần cài đặt, hoặc:
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>Tô màu phiên (giờ giao dịch chính)</h3>
<p>
  Làm mờ các nến ngoài phiên chính (pre/post-market hoặc thời gian nghỉ qua đêm)
  để phiên chính nổi bật. Mặc định là giờ giao dịch chính của cổ phiếu Mỹ (09:30–16:00 giờ New
  York, có tính giờ mùa hè); cấu hình khung giờ bằng số phút trong ngày
  cùng múi giờ của thị trường. Mã có feed báo các phiên của nó thì tự đặt
  các phiên đó.
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>
<p>
  <strong>Giờ mở rộng.</strong> Khi tắt, các nến ngoài giờ giao dịch chính của mã
  (<code>SymbolInfo.sessions</code> theo <code>timeZone</code> của mã) bị bỏ khỏi
  chart; chúng được giữ riêng, kể cả nến realtime và các trang dữ liệu lịch sử, và hiện lại khi
  bật. Nến từ một ngày trở lên được giữ nguyên.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

<h3>Mức của kỳ trước (PDH / PDL / PDC)</h3>
<p>
  Vẽ giá cao nhất, thấp nhất và giá đóng cửa của ngày (hoặc tuần) trước cùng giá mở cửa
  của kỳ hiện tại thành các đường ngang có nhãn — các mức hỗ trợ/kháng cự
  mà trader trong ngày theo dõi. Bật/tắt trong phần cài đặt, hoặc gọi trực tiếp:
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported; the chart passes the exchange's zone (left out, the days are UTC's)
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day', 'Australia/Sydney')  // [{ id, label, price }]`}</code></pre>

<h3>Market Profile (TPO)</h3>
<p>
  Histogram thời gian tại mức giá: mỗi nến đóng góp một TPO cho mỗi vùng giá
  mà biên độ của nến chạm tới, từ đó cho ra Point of Control (mức giá giao dịch nhiều nhất) và
  value area (≈70% số TPO). Khác với Volume Profile — tính trọng số theo thời gian,
  không theo khối lượng — và được ghim bên trái để hiển thị được cùng lúc với Volume Profile. Mặc định tắt;
  bật/tắt trong phần cài đặt hoặc gọi trực tiếp:
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
  <thead><tr><th>Thao tác</th><th>Hành động</th></tr></thead>
  <tbody>
    <tr><td>Kéo một ngón (vùng chart)</td><td>Pan + di chuyển crosshair</td></tr>
    <tr><td>Chụm hai ngón</td><td>Zoom quanh điểm giữa</td></tr>
    <tr><td>Nhấn giữ (~500 ms)</td><td>Ghim tooltip OHLC tại nến (tương đương Alt-click trên di động)</td></tr>
    <tr><td>Kéo một ngón trong dải trục giá / trục thời gian</td><td>Co giãn trục tương ứng</td></tr>
    <tr><td>Chạm</td><td>Click: <code>click</code>, <code>barClick</code>, một signal marker; trên hình vẽ thì chọn hình vẽ đó</td></tr>
    <tr><td>Chạm hai lần</td><td>Double-click: trên trục thì đặt lại trục; trên hình vẽ thì mở phần cài đặt của nó</td></tr>
    <tr><td>Kéo một ngón trên hình vẽ</td><td>Di chuyển hình vẽ, hoặc đổi hình dạng bằng một handle của hình vẽ đang chọn</td></tr>
    <tr><td>Với công cụ vẽ: chạm, chạm — hoặc nhấn, kéo, nhấc</td><td>Đặt các điểm; nhấn, kéo và nhấc vẽ một đường hai điểm trong một lần</td></tr>
    <tr><td>Nhấn giữ trên hình vẽ</td><td>Menu của hình vẽ (như chuột phải)</td></tr>
    <tr><td>Kéo một ngón trên đường cảnh báo, order hoặc bracket, hoặc đường chia pane</td><td>Kéo đối tượng đó</td></tr>
  </tbody>
</table>
<p>
  Ngón tay có vùng chạm rộng hơn chuột: khoảng 16 px tới một đường và 22 px tới một handle, so với 8. Trên trang có cuộn, <code>pageScroll: true</code> để thao tác vuốt dọc và cuộn chuột thường cho trang: chart pan bằng vuốt ngang và zoom bằng hai ngón hoặc Ctrl + cuộn chuột (pinch trên trackpad), còn thao tác nhấn trên hình vẽ, đường và trục vẫn thuộc về chart. <code>chart.setPageScroll(on)</code> bật/tắt khi đang chạy.
</p>
<p>
  Các modal (cài đặt, bảng phím tắt, command palette, tìm mã) tự động
  chuyển sang dạng bottom sheet có tay nắm kéo và padding theo safe area
  khi viewport dưới 640 px.
</p>

<h3>Công cụ đo</h3>
<p>
  Giữ <kbd>Shift</kbd> và kéo trên chart để đo số nến × giá giữa
  hai điểm — overlay hiển thị Δ giá (tuyệt đối + %), số nến và khoảng
  thời gian. Overlay biến mất ngay khi nhả chuột; nó không
  được lưu vào state.
</p>

<h3>Event</h3>
<p>Mọi event đều có kiểu qua <code>ChartEventMap</code>:</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { kind: 'bars', length } on setData and new bars; { kind: 'correction', time, index } on a corrected bar; or kind 'alert' | 'bracket' | 'connection' | 'error' */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* drawings, indicators, alerts, chart type or theme may have changed */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('crosshairMove', e => /* { point, bar, barIndex, time, prevClose }: time is when the bar stands as the axis dates it (on Renko, the bar a brick was finished on); prevClose the close of the bar drawn before */)
chart.on('crosshairSync', e => /* { barIndex, bar, time, prevClose }: a linked chart's crosshair (setCrosshairTime, a grid) is on this bar here; barIndex null when it goes. Never fires as crosshairMove */)
chart.on('legendResize', e => /* { bottom }: the legend drawn taller or shorter, hidden or shown; content stacked under it moves to getLegendBottom() */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('marketChange', e => /* { market }: setMarket */)
chart.on('compareChange', e => /* { id, change: 'add' | 'remove' | 'data' | 'visible' }: addCompareSymbol and the rest */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>
<p>
  Nhãn riêng đặt dưới legend bắt đầu tại <code>getLegendBottom()</code> và di chuyển
  theo <code>legendResize</code>. Báo kích thước của chúng cho chart bằng
  <code>setLegendStack({'{'} width, height {'}'})</code>, đo từ mép trái vùng vẽ và
  mép dưới đó (<code>null</code> khi không có nhãn nào): nhãn hình vẽ, như giá của đường
  ngang hay mục tiêu của một position, tránh chúng như tránh legend.
  ChartWidget làm việc này cho các dòng chỉ báo.
  Nhãn bị che sẽ trượt sang cạnh chúng trên một dòng riêng, nằm dưới chúng nếu chỗ đó
  gần đường của nhãn, nếu không thì nằm trên đường của nó cạnh trục giá ở chỗ trống; các nhãn đã dời tránh
  nhau, và các tag của một position giữ đúng thứ tự giá.
</p>

<h3>Undo cho thay đổi của riêng bạn</h3>
<p>
  <code>recordUndo</code> đưa một thay đổi của bạn vào lịch sử undo của chart, cùng với hình vẽ và
  chỉ báo: Ctrl/Cmd+Z gọi <code>undo</code>, redo gọi <code>redo</code>. Các thay đổi cùng
  <code>subject</code> diễn ra sát nhau được gộp thành một bước. ChartWidget ghi phần cài đặt và loại biểu đồ theo cách này.
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>Bàn phím và trình đọc màn hình</h3>
<p>
  Khi chart đang được focus, các phím mũi tên cuộn chart (Shift để cuộn mười nến), ↑/↓ hoặc +/− để zoom, Home và End để
  về đầu và cuối. Với trình đọc màn hình, chart là một application có phần tóm tắt
  (mã, loại, timeframe, giá cuối); sau khi các phím di chuyển view, nó đọc những gì đang trên màn hình, và
  dấu phẩy và dấu chấm đọc từng nến. <code>a11y.labels</code> đặt nội dung này theo ngôn ngữ của bạn;
  <code>a11y: false</code> tắt nó. <code>scrollBars(n)</code> và <code>selectDrawing(id)</code>
  làm từ code những việc mà phím và click làm.
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  Giá lấy từ con trỏ có thể đưa về lưới giá của thị trường bằng
  <code>chart.roundPrice(price)</code>: bội số của <code>minTick</code> của mã, nếu không có thì theo
  độ chính xác (precision) của mã. Menu, order ticket và tab Toạ độ trong cài đặt hình vẽ của ChartWidget làm việc này.
  <code>chart.getPriceStep()</code> trả về chính bước đó.
</p>

<h2>ChartWidget</h2>
<p>Bọc <code>Chart</code> trong một UI đầy đủ. <code>widget.getChart()</code> trả về chính instance đó.</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),   // or feed: a DataFeed it pulls from (see Realtime)
  historyLimit: 500,
  trading: true,
  features: { 'toolbar.replay': false },   // the widget's switches: see Customization
  onReady: (chart, widget) => { /* once built, just after new ChartWidget() returns */ },
})

widget.getChart().setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">Các thanh</h3>
<table>
  <thead><tr><th>Thanh</th><th>Nội dung</th></tr></thead>
  <tbody>
    <tr><td>Toolbar</td><td>
      Mã và thông tin của mã; các khung thời gian (những khung đã ghim hiển thị thành nút, cùng một menu chứa tất cả theo đơn vị, từ phút đến
      tháng, mỗi mục có ngôi sao để ghim); loại biểu đồ hiển thị bằng icon; Chỉ báo (một dialog: xem <a href={href('/docs/indicators')}>Chỉ báo</a>), và So sánh khi có adapter dữ liệu; undo và redo. Bên
      phải: layout, bar replay, menu Giao dịch (lệnh mới, bracket long và short, depth ladder và
      panel tài khoản), sau đó là chụp màn hình, cài đặt, theme và toàn màn hình; cả cảnh báo và cây đối tượng nếu
      không có rail (trên điện thoại, hoặc <code>{`features: { dock: false }`}</code>). Phần không đủ chỗ được gộp vào “Thêm”.
    </td></tr>
    <tr><td>Công cụ vẽ</td><td>
      Menu của mỗi nhóm ghi phím tắt của từng công cụ (Alt+T cho trend line) và có ngôi sao trên mỗi dòng để ghim lên
      đầu. Ở dưới cùng: style hình vẽ, magnet, tẩy, zoom vùng, giữ chế độ vẽ, khoá,
      ẩn, và nút thùng rác: menu của nút này xoá hình vẽ, chỉ báo hoặc cả hai, kèm số lượng mỗi loại, trong một bước undo.
      Các nút magnet, khoá và ẩn mỗi nút có một menu ở góc (hoặc chuột phải, hoặc phím mũi tên): menu
      magnet chọn mức yếu hoặc mạnh, và nút bật magnet ở mức đó hoặc tắt; menu khoá khoá hình vẽ,
      position và order, hoặc tất cả; menu ẩn ẩn hình vẽ, chỉ báo, position và order, hoặc
      tất cả, đánh dấu những gì đang ẩn. Mục được chọn trong menu là việc mà nút làm từ đó về sau. Ẩn chỉ báo
      chỉ ẩn các chỉ báo đang hiển thị, và hiện lại thì chỉ hiện lại đúng các chỉ báo đó.
    </td></tr>
    <tr><td>Thanh trạng thái</td><td>
      Preset khoảng thời gian và chuyển đến ngày; trạng thái thị trường, kết nối, đồng hồ theo múi giờ hiển thị (bấm vào
      để chọn múi giờ) và các nút <code>%</code> · <code>log</code> · <code>auto</code> của
      thang giá.
    </td></tr>
    <tr><td>Cho hình vẽ đang chọn</td><td>
      Màu, độ dày và kiểu đường, cài đặt, cảnh báo, khoá, thêm và xoá. Thanh này nằm gần mép trên của
      pane giá, tránh các hình đã vẽ (ở mép dưới khi chart hẹp), bất kể hình vẽ nằm ở pane nào. Kéo thanh bằng tay nắm thì nó giữ
      vị trí đó cho hình vẽ tiếp theo; double-click tay nắm để đưa về chỗ cũ.
    </td></tr>
    <tr><td>Dock</td><td>
      Một rail ở mép ngoài với mỗi nút cho một panel: watchlist, cảnh báo, cây đối tượng, data
      window và thông tin mã. Xem <a href="#dock">Dock</a>.
    </td></tr>
  </tbody>
</table>

<h3 id="dock">Dock</h3>
<p>
  Các panel của widget nằm cạnh chart, mỗi lần một panel, mở từ rail ở mép ngoài (bên trái trong
  widget viết từ phải sang trái). Nút trên rail mở panel của nó, hoặc đóng lại nếu panel đó đang mở; nút đóng của mỗi
  panel cũng vậy. Không panel nào tự mở: chart chiếm toàn bộ chỗ cho đến khi có yêu cầu mở panel
  (<code>widget.openPanel('watchlist')</code> mở panel từ code). Kéo mép panel, hoặc dùng phím mũi tên trên đó, để đặt độ rộng từ 233 đến 377 px (ban đầu 262),
  được lưu trong trình duyệt này; panel không bao giờ chiếm quá 38.2% chiều ngang của hàng, phần còn lại dành cho chart.
</p>
<p>
  Trên điện thoại, hoặc trong widget hẹp hơn 641 px, không có rail: panel trượt lên từ dưới, che chart,
  ban đầu đóng và đóng khi nhấn Escape; panel đang mở khi widget chuyển sang hẹp (xoay tablet) sẽ đóng lại. Khi đó cảnh báo và cây đối tượng mở từ toolbar, thông tin mã mở từ
  <strong>ⓘ</strong> cạnh mã, và mọi panel đều mở được từ code. Mỗi chart trong
  <code>ChartWidgetGrid</code> không có rail riêng, trừ khi <code>widget.features</code> của grid bật <code>dock</code>.
</p>
<p>
  Trang riêng được đưa vào cùng dock bằng <code>addDockPage</code>: nút của trang nằm trên rail sau các nút
  có sẵn, và element của bạn nằm dưới header của dock (nhãn và nút đóng), dùng các token
  <code>--tcw-*</code> của widget. <code>openPanel(id)</code> mở trang, <code>getOpenPanel()</code> trả về trang đang mở, và
  <code>onShow</code> được gọi mỗi lần trang mở, sau khi đã có kích thước. <code>remove()</code> bỏ trang,
  đóng trước nếu đang mở. Trên điện thoại không có rail, giống các panel có sẵn: mở trang từ một control
  của bạn. Id trùng với panel có sẵn hoặc trang khác thì trả về <code>null</code>. Tuỳ chọn <code>onPanelChange</code>
  nhận id của panel đang mở, hoặc <code>null</code>, dù thay đổi đến từ đâu: rail, nút đóng, code của bạn,
  hay widget chuyển sang hẹp.
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo' | 'depthLadder', or a page's id; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

const figures = document.createElement('div')
const page = widget.addDockPage({
  id: 'figures', label: 'Key figures', icon: 'info', element: figures,   // icon: a built-in name or an <svg> of yours
  onShow: () => drawFigures(figures, widget.getSymbol()),
  onHide: () => {},
})
widget.openPanel('figures')
page.remove()

new ChartWidget(host, { onPanelChange: (panel) => keepOpenPanel(panel) })   // 'figures', 'watchlist'… or null

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">Tìm mã, So sánh và Đi tới</h3>
<p>
  <strong>Tìm mã</strong> mở từ mã trên toolbar, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>,
  hoặc khi gõ một chữ cái trên chart, chữ đó thành ký tự đầu của ô tìm. Dialog liệt kê <code>symbols</code> của bạn cho đến khi
  có nội dung được gõ, sau đó gọi hàm tìm của feed (<code>searchSymbols</code>, hoặc của adapter) khi ngừng gõ. Mỗi dòng bắt đầu
  bằng một badge (logo của mã, nếu không có thì chữ cái đầu của ticker theo màu của loại mã), tiếp theo là mã, tên,
  loại và sàn theo cột, mã đang hiển thị trên chart được đánh dấu. Trên điện thoại, sàn nằm dưới
  ticker, nên tên sàn dài (SIMULATED, ALL VENUES) hiện đầy đủ và phân biệt được dòng của hai sàn. Các tab lọc danh sách theo một loại (cổ phiếu, crypto)
  và giữ nguyên khi gõ; khi các dòng đến từ hai sàn trở lên, một danh sách bên cạnh lọc theo một sàn. Cả hai
  chỉ lọc các dòng đang có, không tìm lại: một lần tìm trả về một trang kết quả (adapter được yêu cầu
  50 kết quả), nên chọn HNX sau khi gõ <code>V</code> sẽ hiển thị các mã HNX trong số đó, không phải mọi mã HNX có chữ V.
  Danh sách hiển thị 200 dòng khớp nhất, và một dòng bên dưới cho biết còn bao nhiêu dòng nữa có thể lọc bằng cách gõ thêm. Khi không có hàm tìm, gõ sẽ tìm trong các mã của bạn theo ticker và theo
  tên, có dấu hoặc không dấu tiếng Việt (<code>ngan hang</code> tìm ra “Ngân hàng”).
  <code>{`features: { symbolTyping: false }`}</code> bỏ qua chữ cái gõ trên chart.
</p>
<p>
  Truyền <code>symbols</code> dạng <code>SymbolInfo</code> thì danh sách mở ra với tên, loại, sàn và logo;
  mã trên toolbar và panel thông tin mã lấy tên và sàn từ đó khi chart không có thông tin này.
  Kết quả tìm của feed được ưu tiên hơn các thông tin này và giữ logo của bạn; thông tin chart biết về mã của nó chỉ bổ sung cho kết quả tìm tên hoặc logo còn thiếu, vì nó có thể ghi loại và sàn bằng từ khác với danh sách của bạn (stock thay cho Cổ phiếu, tên công ty chứng khoán thay cho sàn). Bước giá và giờ giao dịch đặt ở đây không áp dụng cho chart: chúng đến từ
  <code>resolveSymbol</code> của adapter hoặc <code>chart.setSymbolInfo</code>.
</p>
<pre><code>{`new ChartWidget(el, {
  symbols: [
    { symbol: 'VNM', description: 'Vinamilk', type: 'stock', exchange: 'HOSE', logo: '/logos/vnm.svg' },
    'FPT',   // a ticker alone, as before
  ],
})`}</code></pre>
<p>
  Giá <code>last</code> và <code>changePercent</code> trong ngày của một mã, truyền cùng
  <code>symbols</code> hoặc trong kết quả tìm, hiện ở hai cột riêng cuối dòng (trên điện thoại, mức thay đổi nằm
  dưới giá), mức thay đổi theo màu tăng hoặc màu giảm; khi không dòng nào có một trong hai giá trị, hai cột này bị
  bỏ. Số được ghi với số chữ số thập phân theo <code>pricePrecision</code> của mã, nếu không có thì theo độ lớn của số,
  theo locale số của widget; chuỗi được ghi nguyên văn. Widget không tự lấy các giá trị này: app của bạn truyền
  những gì nó có. Số liệu của một lần tìm hiện cùng kết quả của lần tìm đó và không được giữ cho lần mở tìm kiếm sau.
</p>
<pre><code>{`widget.setSymbols([
  { symbol: 'BTCUSDT', exchange: 'Binance', last: 61668.46, changePercent: 0.37 },
  { symbol: 'VCB', exchange: 'HOSE', last: 61.2, pricePrecision: 2, changePercent: -0.65 },
])`}</code></pre>
<p>
  <code>logo</code> là một địa chỉ <code>https:</code> hoặc <code>http:</code>, một đường dẫn trên site của bạn, một
  URL <code>blob:</code> hoặc ảnh viết bằng <code>data:</code> (PNG, JPEG, GIF, WebP, AVIF hoặc SVG); giá trị
  khác bị bỏ qua. Logo chỉ được tải dưới dạng ảnh, không gửi referrer, nên policy <code>img-src</code> của trang
  phải cho phép host của nó; logo tải lỗi thì hiển thị chữ cái. Các chữ cái lấy màu từ <code>--tcw-kind-1</code> … <code>--tcw-kind-5</code> (cổ phiếu, hợp đồng tương lai, chỉ số, crypto và perpetual, forex, theo từ tiếng Anh, tiếng Việt, tiếng Nhật, tiếng Trung hoặc tiếng Hàn; chứng quyền lấy màu của hợp đồng tương lai, quỹ hoặc ETF lấy màu của chỉ số, trái phiếu lấy màu của forex; loại khác được gán một màu theo từ của nó), đặt cho theme tối và theme sáng.
</p>
<p>
  Khi một lần tìm đã trả về thông tin của một mã, thông tin của feed cũng đặt tên cho mã đó trong danh sách lúc mở tìm, không chỉ
  trong kết quả. Tên, loại, sàn hoặc logo không phải dạng text (<code>null</code> của feed JSON, mã sàn
  dạng số), trong kết quả của feed hoặc trong thông tin chart biết, được coi như không có: không hiển thị và không xoá thông tin của bạn. Mã hiển thị theo ticker,
  bỏ phần nơi giao dịch trước dấu hai chấm (<code>BINANCE:BTCUSDT</code> hiển thị BTCUSDT; <code>HYPERLIQUID:xyz:NVDA</code> hiển thị NVDA) trên toolbar, trong legend, các dòng và panel thông tin: phần nơi giao dịch đưa vào cột sàn khi feed không ghi sàn, và toàn bộ mã hiển thị khi hover; trên điện thoại các tab loại
  cuộn trên một dòng và mờ dần ở đầu còn nội dung phía sau. Thông tin chart biết về mã của nó dùng để đặt tên mã trên
  toolbar và trong panel thông tin khi đó là cùng mã (không phân biệt hoa thường, có hoặc không có phần nơi giao dịch trước dấu hai chấm)
  hoặc được đặt sau khi đổi mã, nên cách viết riêng của feed (<code>BTC-USD</code> cho <code>BTCUSD</code>)
  vẫn được tính.
</p>
<p>
  <strong>So sánh</strong> là cùng dialog đó, có <strong>Thêm dạng</strong> dưới ô tìm và các mã đang so sánh
  được liệt kê trước (xem <a href="#comparing-symbols">So sánh mã</a>).
</p>
<p>
  <strong>Đi tới</strong> (biểu tượng lịch trên thanh trạng thái, <kbd>Alt</kbd>+<kbd>G</kbd>, hoặc menu của chart) có hai
  tab. <strong>Ngày</strong> đưa nến của một ngày và giờ vào giữa; <strong>Khoảng tuỳ chọn</strong> hiển thị các nến
  giữa hai mốc thời gian vừa khít màn hình, giá trị ban đầu lấy theo các nến đang hiển thị. Lịch tháng dưới các ô nhập điền vào ô ngày
  đang nhập, và sau khi chọn mốc đầu của khoảng thì chuyển sang mốc cuối. Với nến ngày trở lên thì không có giờ để
  nhập, và không chọn được ngày sau hôm nay. Ngày giờ đọc theo múi giờ hiển thị.
</p>

<h3>Phím tắt của widget</h3>
<table>
  <thead><tr><th>Phím tắt</th><th>Hành động</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Command palette: các lệnh của widget kèm phím tắt (go to, đặt lại view, lưu layout, các panel…), công cụ vẽ, loại biểu đồ, khung thời gian và chỉ báo; các mục dùng gần nhất đứng đầu</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Tìm mã: các mã của bạn, hoặc hàm tìm của feed khi gõ</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>Tìm mã, bắt đầu bằng chữ cái vừa gõ (<code>{`features: { symbolTyping: false }`}</code> tắt tính năng này)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Lưu layout (hỏi tên ở lần đầu)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Gõ khung thời gian (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) và nhấn Enter (<code>intervalTyping: false</code> tắt tính năng này)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Trend line, đường ngang, tia ngang, đường dọc, đường chữ thập, Fibonacci retracement</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>Đặt lại view: mọi nến trong tầm nhìn, thang giá fit theo chúng</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>Đảo ngược thang giá</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>Chuyển đến một ngày</td></tr>
    <tr><td><kbd>?</kbd></td><td>Bảng phím tắt, tìm được theo chức năng của phím hoặc theo phím</td></tr>
    <tr><td><kbd>Alt</kbd> + click chart</td><td>Ghim tooltip OHLC tại nến đang hover (hiển thị chênh lệch so với crosshair hiện tại)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Bỏ ghim tooltip / huỷ vẽ</td></tr>
    <tr><td><kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd></td><td>Lùi / tiến replay một bước</td></tr>
    <tr><td><kbd>Space</kbd></td><td>Chạy hoặc tạm dừng replay (trên chart hoặc thanh tiến trình của replay; ngoài replay thì fit chart)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Thôi chọn nến bắt đầu replay</td></tr>
    <tr><td>Click mã trên toolbar</td><td>Mở modal tìm mã</td></tr>
    <tr><td>Click nút play trên toolbar</td><td>Mở thanh điều khiển bar replay (play/step/seek/speed)</td></tr>
  </tbody>
</table>
<p>
  Đổi danh sách mã khi đang chạy bằng <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>, ticker hoặc
  <code>SymbolInfo</code> như trong <code>symbols</code>. Watchlist tạo từ <code>symbols</code> (không có <code>lists</code>,
  không có gì được lưu) được thay bằng danh sách mới, và lấy quote cho từng mã: với danh sách dài từ server, hãy cho
  watchlist danh sách riêng.
</p>
<pre><code>{`const widget = new ChartWidget(el, {
  adapter: feed,
  watchlist: { lists: [{ id: 'main', name: 'Main', symbols: ['VNM', 'FPT'] }] },
})
widget.setSymbols(await loadMarkets())   // your server's SymbolInfo[]: the search opens with them, the watchlist stays`}</code></pre>

<h3>Data Window</h3>
<p>
  Bảng nổi hiển thị chính xác O/H/L/C/V, mức thay đổi của nến, và giá trị của mọi
  chỉ báo đang bật tại nến đang hover — cập nhật liên tục khi di chuyển
  crosshair. Bật/tắt từ command palette (<kbd>Ctrl/⌘ K</kbd> →
  "Bật/tắt cửa sổ dữ liệu"). Trên màn hình cảm ứng, chạm vào chart để đặt
  crosshair lên một nến. Giá, mức thay đổi và giá trị của chỉ báo trên
  pane giá hiển thị theo cách chart ghi giá; giá trị của chỉ báo ở pane
  riêng hiển thị như dòng legend của chúng; tất cả theo number locale của chart.
  Mã so sánh, spread hoặc tỷ lệ, và đường trên thang riêng, hiển thị số chữ số
  thập phân theo độ lớn của chúng, không theo giá của chart. Trên Renko, Kagi và các loại
  tương tự, data window hiển thị brick dưới con trỏ và mức thay đổi so với
  brick trước.
</p>

<h3>View chia sẻ được (deep link)</h3>
<p>
  Mã hoá toàn bộ view — mã, timeframe, loại biểu đồ, thang giá,
  chỉ báo (kèm tham số), hình vẽ, và các mục Cài đặt biểu đồ đã thay đổi so với
  mặc định (không gồm múi giờ và định dạng số) — thành một chuỗi ngắn, an toàn cho URL,
  dùng cho deep link. Với <code>shareUrl: true</code> widget khôi phục
  hash <code>#tcw=…</code> khi tải, và lệnh "Chia sẻ khung nhìn" trong command palette
  copy link vào clipboard.
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>Layout có tên</h3>
<p>
  Nút layout trên toolbar lưu chart dưới một tên: mã,
  khung thời gian, thang giá, loại biểu đồ, chỉ báo, hình vẽ, cảnh báo và
  <a href="#chart-settings">Cài đặt biểu đồ</a> (không gồm theme, múi giờ và
  định dạng số, các mục này giữ theo người xem). Mở, đổi tên và xoá layout từ
  menu của nút; layout đang mở tự lưu khi thay đổi, và <kbd>Ctrl/⌘ S</kbd> lưu
  layout. Layout được lưu trong <code>localStorage</code> của trình duyệt này, trừ khi bạn truyền
  <code>storage</code>: bốn hàm, mỗi hàm có thể trả về promise.
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } or null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // or false for none
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } or null
layouts.setAutoSave(false)

// The content alone, to keep wherever you like
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  <code>localStorageLayouts(prefix)</code> và <code>memoryLayouts()</code> là
  hai storage có sẵn. Nội dung đã lưu được đọc một cách thận trọng: layout không
  parse được sẽ bị từ chối, không áp dụng một nửa. Mỗi layout ghi
  <code>kind</code> của nó (<code>'chart'</code> hoặc <code>'grid'</code>), nên widget và
  grid có thể dùng chung một storage và mỗi bên chỉ liệt kê layout của mình. Lưu, mở và
  tự lưu chạy lần lượt từng việc, nên một lần lưu không bao giờ ghi vào layout được mở sau nó.
</p>

<h3 id="chart-settings">Cài đặt biểu đồ</h3>
<p>
  Các công tắc và lựa chọn trong dialog cài đặt (volume profile và market profile,
  đánh dấu swing, tô màu phiên, mức của kỳ trước, lưới, legend, crosshair,
  thang, múi giờ, định dạng số) là Cài đặt biểu đồ (Chart Settings) của widget. Đọc chúng
  bằng <code>getSettings()</code>, trả về một bản sao; đổi một số mục bằng
  <code>setSettings(patch)</code>, hàm này bỏ qua giá trị không đọc được, giữ số
  trong khoảng giá trị của dialog và không ghi bước undo; và nhận thông báo mỗi lần thay đổi bằng
  <code>onSettingsChange(listener)</code>, hàm này trả về hàm để huỷ đăng ký.
  Listener được gọi một lần khi dialog đóng bằng OK, không bao giờ được gọi khi Cancel hoặc khi
  thay đổi không làm gì khác đi. Khi chart chưa có nến, <code>setSettings</code>
  giữ auto-scale bật, vì tắt auto-scale nghĩa là giữ khoảng giá trên màn hình mà lúc đó chưa có
  khoảng giá nào: các cài đặt mà <code>onSettingsChange</code> trả về, kể cả auto-scale tắt sau khi kéo
  trục giá, có thể truyền lại ngay sau constructor. Với <code>persistSettings: true</code>
  widget lưu chúng trong trình duyệt này và khôi phục ở lần truy cập sau.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  chartOptions: { timeZone: 'UTC' },
  persistSettings: true,            // or { key: 'myapp:settings' }
})

widget.setSettings({ volumeProfileVisible: true, timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'

const stop = widget.onSettingsChange((settings) => {
  api.put('/me/chart-settings', settings)   // your server, say
})
stop()`}</code></pre>
<p>
  <code>getSettings()</code> cũng đọc lại những gì đã đặt trên <code>getChart()</code>,
  nên layout hoặc link lưu đúng trạng thái hiện tại. Chart trả về các cài đặt này qua
  <code>isVolumeVisible()</code>, <code>isLegendVisible()</code>,
  <code>isBarCountdownVisible()</code>, <code>isIndicatorValueLabelsVisible()</code>,
  <code>isLeftPriceScaleVisible()</code>, <code>getMarketProfileConfig()</code>,
  <code>getDepthHeatmapConfig()</code>, <code>getPivotMarkersConfig()</code> và
  <code>getPeriodLevelsPeriod()</code>, cùng với <code>is…Visible()</code> của từng overlay.
</p>
<ul>
  <li><strong>persistSettings</strong> lưu, theo từng trình duyệt, những gì người dùng đã đổi
    so với giá trị của bạn. Giá trị đã lưu được ưu tiên hơn <code>chartOptions</code>, và Về mặc định
    trả về giá trị của bạn. Tuỳ chọn này không lưu cờ log và auto-scale cũng như cài đặt riêng
    của loại biểu đồ (box của Renko và các cài đặt tương tự), vì đó là state của chart.
    Hãy cho mỗi widget trên trang một <code>key</code> riêng; grid tự cho mỗi
    chart của nó một key. Tuỳ chọn này không phân biệt ai thực hiện thay đổi: những gì bạn đặt bằng
    <code>setSettings</code> (ví dụ trong <code>onReady</code>), và những gì một
    layout được mở mang theo, cũng được lưu như của người dùng, và được ưu tiên hơn
    <code>chartOptions</code> ở lần truy cập sau kể cả khi code của bạn đã thôi đặt
    chúng. Đặt một mục về đúng giá trị <code>chartOptions</code> của bạn thì mục đó bị bỏ khỏi
    phần đã lưu. Những gì một share link mang theo là lựa chọn của người khác: chỉ
    hiển thị trong lần truy cập đó, không được lưu, và không gọi listener
    <code>onSettingsChange</code> nào (lần thay đổi kế tiếp sẽ báo toàn bộ).</li>
  <li><strong>Layout có tên</strong> lưu tất cả trừ múi giờ và
    định dạng số, vốn giữ theo người xem, và auto-scale, vốn bị tắt khi kéo
    trục giá. Trong JSON của layout chúng nằm dưới
    <code>settings</code>, trừ thang giá và trạng thái đảo ngược, vốn có trường
    riêng, và cài đặt riêng của loại biểu đồ, vốn nằm trong state của chart.
    Layout lưu từ trước khi có tính năng này không chứa cài đặt nào, và mở nó thì
    cài đặt giữ nguyên. Phiên bản cũ hơn của thư viện mở layout mới hơn
    mà không có các cài đặt này, và tự lưu của nó ghi lại layout mà không có chúng.</li>
  <li><strong>Share link</strong> mang theo các mục người gửi đã đổi so với
    mặc định, trừ múi giờ, định dạng số và auto-scale. Cài đặt riêng của loại
    biểu đồ trong link chỉ đặt cho các loại người gửi đã đặt và
    loại đang hiển thị (về giá trị mặc định nếu người gửi để mặc định); cài đặt của người xem
    cho các loại khác được giữ nguyên. Với các
    công tắc mà <code>features</code> của bạn đặt (legend, volume, đếm ngược
    nến, nhãn giá trị của chỉ báo), giá trị mặc định là giá trị do chính các công tắc đó đặt,
    nên công tắc mà ứng dụng của người gửi đã tắt không bị gửi đi như một thay đổi.</li>
  <li><strong>Tính năng đã tắt</strong>: khi <code>features</code> của bạn
    tắt legend, volume, đếm ngược nến hoặc thang log, không có gì
    được lưu, chia sẻ, mở, đặt hoặc áp dụng từ chart template có thể bật lại chúng,
    và dialog cài đặt không hiển thị công tắc và màu của legend hay volume.</li>
  <li><strong>Layout theo mã</strong> (<code>persistLayouts</code>) và
    <code>chart.saveState()</code> chứa cài đặt riêng của loại biểu đồ, vốn là
    một phần state của chart, và không chứa các cài đặt khác.</li>
</ul>

<h3>Layout theo mã</h3>
<p>
  Ngoài ra, có thể tự động lưu danh sách chỉ báo, hình vẽ, cảnh báo và loại biểu đồ theo từng mã
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
  Layout được ghi khi đổi mã và khi huỷ widget, nên không mất dữ liệu
  khi người dùng rời trang. Trong Cài đặt biểu đồ, layout theo mã chỉ chứa
  cài đặt riêng của loại biểu đồ; <code>persistSettings</code> lưu các cài đặt còn lại.
</p>

<h3>Nhập dữ liệu bằng kéo thả</h3>
<p>
  Thả file CSV hoặc JSON vào chart để nạp ngay. Mặc định bật —
  tắt bằng <code>dragDropImport: false</code>. Parser
  xử lý các cách sắp cột thông dụng (<code>time, open, high, low, close, volume</code>),
  timestamp ISO 8601, và unix giây/ms.
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>Resample timeframe</h3>
<p>
  Truyền cho widget chuỗi dữ liệu có độ phân giải nhỏ nhất bằng <code>widget.setData()</code>
  và các nút timeframe trên toolbar gộp nến ở phía client — một bộ dữ liệu
  cho mọi độ phân giải, không cần tải lại. Có hiệu lực khi không gắn adapter
  realtime nào; tắt bằng <code>resampleTimeframes: false</code>. Nến tuần
  mặc định bắt đầu từ thứ Hai (<code>weekStartsOn: 0</code> cho Chủ nhật).
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
  Gộp nến theo lịch: phút và giờ (1h trở xuống) làm tròn xuống bội số của
  khung kể từ Unix epoch. Ngày, tuần (từ ngày đầu tuần đã cấu hình), tháng,
  quý và năm bắt đầu lúc nửa đêm theo giờ của sàn, các khung giờ chia hết
  một ngày (2h, 3h, 4h, 6h, 8h, 12h) cũng vậy. Với nến truyền vào <code>widget.setData</code>,
  đó là nửa đêm theo <code>timeZone</code> của mã (<code>setSymbolInfo</code>), nếu không có thì
  theo múi giờ của thị trường (<code>setMarket</code>), nếu không có nữa thì theo UTC. Các timeframe mà feed không có bắt đầu lúc
  nửa đêm theo múi giờ mà <code>resolveSymbol</code> của feed trả về, nếu không có thì theo UTC: múi giờ của thị trường
  không làm chúng dịch chuyển. Ngày đổi giờ dài 23 hoặc 25
  giờ. Nến ngày có timestamp 00:00 UTC được đọc theo đúng ngày ghi trên đó, nên thứ Hai vẫn
  ở đúng tuần của nó tại các múi giờ phía tây UTC và nến tuần giữ timestamp 00:00 UTC. Nến đầu vào không bao giờ
  bị thay đổi.
</p>
<p>
  Nến ngày hiển thị đúng ngày mà nó đại diện, bất kể chart hiển thị theo múi giờ nào: nến có timestamp
  00:00 UTC hiển thị ngày theo UTC, nến dựng lúc nửa đêm theo giờ sàn hiển thị ngày theo sàn (trên
  trục thời gian, crosshair và thẻ của nó, tooltip được ghim bằng Alt-click, và thời gian nến mà trình đọc màn hình đọc). Với nến tự dựng, <code>timeframeBucketStart(time, timeframe, {'{'} timeZone {'}'})</code> trả về
  thời điểm bắt đầu của nến chứa một thời điểm.
</p>

<h3>Watchlist</h3>
<p>
  Một panel của dock: các danh sách mã, mỗi mã một dòng gồm giá cuối, mức thay đổi và % thay đổi dưới tên cột (sparkline thay cho mức thay đổi với <code>sparkline: true</code>; phần nơi giao dịch trước ticker, như trong <code>HYPERLIQUID:xyz:NVDA</code>, hiển thị khi hover). Chuyển,
  tạo, đổi tên và xoá danh sách từ menu của panel; thêm mã từ tìm mã
  (+), xoá, và sắp xếp lại bằng kéo thả hoặc Alt+↑/↓. Các dòng lấy quote từ
  <code>subscribeQuotes</code> của adapter, một nguồn quote của bạn, hoặc dữ liệu bạn đẩy vào.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser; a list added here later joins them
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code> hiển thị một danh sách gồm <code>symbols</code>, như trước; <code>setWatchlistEntry</code>
  vẫn đẩy giá, mức thay đổi và sparkline cho một dòng.
</p>

<h3>Thông tin mã</h3>
<p>
  Một panel của dock, mở từ ⓘ cạnh mã, từ rail hoặc command palette: tên mã, giá cuối và
  mức thay đổi, trạng thái thị trường kèm đếm ngược đến lần mở cửa hoặc đóng cửa tiếp theo, giá mở cửa trong ngày, biên độ dao động, khối lượng,
  giá đóng cửa trước, bid và ask, bước giá, đơn vị tiền tệ, múi giờ và giờ giao dịch, và tin tức. Thanh trạng thái hiển thị
  khi thị trường đóng cửa.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>
<p>
  Các tiêu đề tin cũng hiển thị trên chart dưới dạng mark, tại nến mà tin được đăng
  (<code>newsMarks: false</code> tắt chúng); xem <em>Marks</em> trong phần Trading.
</p>

<h3>Điều hướng, undo và hướng hiển thị</h3>
<p>
  Các nút trên chart — zoom ra và vào, cuộn về trước và về sau (giữ nút thì cuộn liên tục), đặt lại —
  hiển thị khi chuột ở gần mép dưới vùng vẽ, không che dữ liệu, hoặc khi một nút đang được focus
  (<code>navigation: false</code> tắt chúng). Thay đổi cài đặt và
  đổi loại biểu đồ được undo bằng Ctrl/Cmd+Z, cùng với hình vẽ và chỉ báo. Với tiếng Ả Rập, Do Thái,
  Ba Tư hoặc Urdu, widget đảo chiều giao diện (<code>dir: 'auto'</code>; hoặc <code>'rtl'</code> / <code>'ltr'</code>);
  chart vẫn giữ thời gian chạy từ trái sang phải.
</p>

<h3>Công cụ vẽ yêu thích</h3>
<p>
  Ghim các công cụ vẽ hay dùng vào một dải ở đầu sidebar.
  Chuột phải vào bất kỳ công cụ nào (trong flyout của nhóm hoặc trên chính dải đó) để ghim hoặc bỏ ghim;
  danh sách được lưu vào localStorage. Đặt các công cụ ghim ban đầu bằng
  <code>drawingFavorites</code>:
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>
<p>
  Nút ngôi sao trên sidebar hiển thị các công cụ đã ghim thành một <strong>Toolbar yêu thích</strong> nổi trên
  chart thay vì trên dải: kéo tay nắm để đặt nó ở bất kỳ đâu trên chart, nhấn một công cụ để chọn, chuột phải vào một công cụ để
  bỏ ghim. Trạng thái hiển thị và vị trí của toolbar được lưu trong trình duyệt này, một cài đặt chung cho các widget trên một trang, và
  dải trên sidebar ẩn đi khi toolbar hiển thị; khi tắt toolbar, các công cụ ghim vẫn nằm trên dải. Lần đầu toolbar hiện ở giữa mép trên của chart. <code>{`features: { favoritesBar: false }`}</code>
  bỏ toolbar này và nút của nó.
</p>

<h3>Style &amp; template hình vẽ</h3>
<p>
  Nút bảng màu trên sidebar công cụ vẽ mở popover style — chọn màu,
  độ dày và kiểu đường cho hình vẽ tiếp theo (và hình vẽ đang chọn), và
  lưu các <strong>template</strong> có tên vào localStorage để dùng lại bằng một
  click. Các lời gọi tương đương bằng code:
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>Cây đối tượng</h3>
<p>
  Nút layer trên rail (trên toolbar, nếu không có rail) mở
  cây đối tượng trong dock, liệt kê mọi chỉ báo đang bật, đặt tên như trên chip của nó (EMA 20, Compare ETHUSDT),
  và mọi hình vẽ. Chỉ báo có thể xoá; mỗi hình vẽ có
  hiện / ẩn, khoá / mở khoá, cài đặt và xoá, và các nhóm được liệt kê với
  hình vẽ bên dưới. Mặc định bật — tắt bằng
  <code>objectTree: false</code>. Các điều khiển hình vẽ tương ứng với:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // not hidden, and on this interval
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // hidden, locked and selected together
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>Cài đặt và menu của hình vẽ</h3>
<p>
  Double-click một hình vẽ, hoặc dùng biểu tượng bánh răng của nó trong cây đối tượng, để mở
  phần cài đặt theo tab: Kiểu (đường, hai đầu đường, phần tô, cài đặt riêng của công cụ
  như các mức Fibonacci, phần mở rộng và nhãn), Chữ cho các công cụ
  có chữ, Toạ độ (các điểm theo múi giờ của chart) và Hiển thị
  (các khung thời gian mà hình vẽ hiển thị), với menu Mẫu, Huỷ và OK ở dưới cùng.
  Chuột phải vào hình vẽ để mở
  menu của nó: cài đặt, cảnh báo trên đường của hình vẽ, thứ tự, nhóm, khoá, ẩn,
  nhân bản và xoá. Sidebar cũng có tẩy, công cụ zoom và
  magnet, mức yếu hoặc mạnh chọn từ menu. Xem
  <a href={href('/docs/drawing-tools')}>Công cụ vẽ</a> để biết API bên dưới.
</p>

<p>
  Nút bánh răng trên mỗi dòng chỉ báo mở <strong>dialog cài đặt</strong>
  đọc các tham số của chỉ báo (số, công tắc, màu) và
  áp dụng thay đổi ngay qua <code>updateIndicator</code> — không cần xoá rồi
  thêm lại để đổi period hoặc màu.
</p>
<p>
  Mục <strong>So sánh</strong> của cây đối tượng liệt kê mọi mã so sánh, giống dialog
  so sánh: mỗi mã kèm cách thêm (phần trăm thay đổi, thang riêng, pane riêng, spread, tỷ lệ
  hoặc correlation) và một nút để bỏ. Khi có adapter realtime, nút + của mục mở
  dialog so sánh. Với mọi cách thêm, widget tải nến của mã kia qua
  <code>adapter.fetchHistory</code> trước khi thêm, và không thêm gì nếu nến
  không về (tải lỗi, hoặc không có nến ở khung thời gian này); một toast cho biết lý do.
  Mã so sánh được khôi phục từ state đã lưu vẫn ở trên chart khi nến của nó tải lỗi, và
  được điền dữ liệu ở khung thời gian có nến. Mã so sánh tự tải lại khi đổi
  timeframe. Các lời gọi tương đương bằng code:
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
  Ngoài một mức giá, cảnh báo có thể so sánh một đường với một đường khác (giá cắt
  đường trung bình động, MACD cắt đường signal), kích hoạt khi giá biến động một số phần trăm trong một số
  nến (2 đến 500), chỉ xét nến đã đóng (không kích hoạt bởi bóng nến rồi giá quay lại), và
  hết hạn. Panel cảnh báo của widget có tất cả các tuỳ chọn này; trong code chúng là tham số cuối
  của <code>addAlert</code>. Cảnh báo được kiểm tra với mọi giá, từ
  <code>setCurrentPrice</code> hoặc feed đã kết nối, cùng với các đường mà cảnh báo theo dõi:
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
  Biểu tượng chuông trên toolbar mở một panel nổi để thêm, liệt kê và xoá cảnh báo
  giá; một toast hiện lên khi cảnh báo kích hoạt. Đường cảnh báo cũng
  <strong>kéo được</strong> — nắm một đường trên chart và kéo để đổi giá
  (di chuyển cảnh báo sẽ kích hoạt lại nó). Mặc định bật — tắt bằng
  <code>alerts: false</code>. Điều khiển bằng code qua API
  <code>Chart</code> và các event cảnh báo có kiểu:
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
  Có thể bật âm thanh và/hoặc thông báo desktop khi cảnh báo kích hoạt (cả hai mặc định
  tắt). <code>sound: true</code> phát tiếng beep có sẵn; truyền URL để dùng âm
  riêng. <code>desktop: true</code> dùng Notification API và xin
  quyền ở lần dùng đầu tiên.
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>Công tắc tính năng</h3>
<p>132 công tắc, tất cả đều bật cho đến khi bị tắt: tên không có dấu chấm là cả một tính năng, tắt ở mọi chỗ nó xuất hiện; tên có dấu chấm là một vị trí cụ thể. Công tắc thay đổi được khi widget đang chạy. Danh sách đầy đủ, cùng các tuỳ chọn cũ mà chúng thay thế, có trong <a href={href('/docs/customization')}>Tuỳ biến</a>.</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // one button, a section of drawing tools, every key

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // every switch, on or off`}</code></pre>

<h3>Nút và mục menu riêng</h3>
<p>
  Thêm nút vào toolbar (icon có sẵn hoặc element của bạn, text, hoặc
  công tắc) và mục vào các menu chuột phải của chart, sau các mục của widget.
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // or an <svg> element; or text: 'News'
  side: 'right',           // 'left' sits with the chart controls
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
<p>Ngoài ra còn có nút menu trên toolbar, nút trên sidebar công cụ vẽ, mục trên thanh trạng thái, vị trí riêng trong mỗi thanh và trên chart, và mục ở cuối menu của hình vẽ hoặc chỉ báo (xem <a href={href('/docs/customization#parts')}>Tuỳ biến</a>):</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // asked for each time it opens
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // a layer over the chart
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // a shortcut of yours; it replaces a widget shortcut on the same keys

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  Nhiều chart widget đặt cạnh nhau, mỗi chart có mã, khung thời gian,
  chỉ báo và hình vẽ riêng. Một thanh phía trên chọn cách sắp xếp, liên kết các
  chart và lưu cả grid thành một layout có tên. Chart được nhấn gần nhất là
  chart đang active (có viền).
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x2', '2x2', '3x3', '1+2', '1/3'… (all under ChartGrid)
  widget: { timeframe: '1h' },                    // every chart
  adapter: () => new BinanceAdapter(),            // one per chart: an adapter keeps one stream
  // or widget: { timeframe: '1h', feed }: one DataFeed serves every chart
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // lines the others up with the active chart
grid.applyOverrides({ 'grid.vertical.visible': false })   // every chart's look, and the charts it adds
grid.setFeatures({ 'toolbar.replay': false })               // every chart's switches, and the charts it adds
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// Each chart as it is made (at the start, and when the grid grows)
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  Đồng bộ crosshair hiển thị thời gian dưới con trỏ trên mọi chart; đồng bộ thời gian
  cuộn và zoom các chart khác theo chart đang thao tác; hình vẽ được copy
  sang các chart đang hiển thị cùng mã (bật đồng bộ này sẽ gộp hình vẽ của các chart đó,
  không mất hình vẽ nào); đồng bộ replay đưa các chart khác về cùng thời điểm với chart
  đang replay (chart có nến dài hơn bước replay hiển thị toàn bộ
  nến chứa thời điểm đó).
  Các chart bị bớt đi khi grid thu nhỏ được cất đi, giữ trong
  layout đã lưu, và quay lại như cũ khi grid mở rộng lại; chart hoàn toàn mới
  mở với mã và khung thời gian của chart đang active khi hai mục đó được đồng bộ.
</p>

<h2>ChartGrid</h2>
<p>Layout nhiều chart headless được đồng bộ (không có toolbar); xem <code>ChartWidgetGrid</code> để có UI đầy đủ.</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// One adapter per chart: an adapter keeps one stream
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>
  Các layout, giống nhau cho <code>ChartGrid</code> và <code>ChartWidgetGrid</code>.
  Grid đơn giản được đặt tên theo hàng × cột (<code>'1x2'</code> là một hàng hai chart): <code>'1x1'</code>, <code>'1x2'</code>, <code>'2x1'</code>, <code>'1x3'</code>, <code>'3x1'</code>, <code>'2x2'</code>, <code>'1x4'</code>, <code>'4x1'</code>, <code>'2x3'</code>, <code>'3x2'</code>, <code>'2x4'</code>, <code>'3x3'</code>.
  Các layout còn lại có một chart lớn: <code>'1+2'</code> và <code>'1+3'</code> (chart lớn bên trái, hai hoặc ba chart
  xếp chồng bên phải), <code>'2+1'</code> (hai chart xếp chồng bên trái, chart lớn bên phải),
  <code>'1/2'</code> và <code>'1/3'</code> (chart lớn ở trên, hai hoặc ba chart bên dưới), <code>'2/1'</code> (hai chart ở trên, một chart rộng bên dưới).
  Chart lớn là chart đầu tiên, trừ <code>'2+1'</code> và <code>'2/1'</code>, nơi nó là chart cuối.
  <code>GRID_SHAPES</code> cho biết <code>cols</code>, <code>rows</code> của mỗi layout và, với các
  layout còn lại, các <code>areas</code> mà chart chiếm (<code>[col, row, colSpan, rowSpan]</code>, theo thứ tự chart).
  Thanh của <code>ChartWidgetGrid</code> hiển thị layout đang dùng thành một nút mở bảng chọn
  layout, mỗi hàng ứng với một số lượng chart; <code>layoutChoices</code> giới hạn các lựa chọn.
</p>
