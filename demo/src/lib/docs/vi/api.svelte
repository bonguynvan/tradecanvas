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
    <tr><td><code>getData()</code></td><td>Đọc chuỗi OHLC gốc.</td></tr>
  </tbody>
</table>

<h3>Loại biểu đồ &amp; giao diện</h3>
<table>
  <thead><tr><th>Phương thức</th><th>Công dụng</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>Một trong 18 loại — xem <a href={href('/docs/chart-types')}>Loại biểu đồ</a>.</td></tr>
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
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>Màu, độ dày, độ mờ, và kiểu nét, ẩn/hiện của từng đường (<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>).</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>Style mà các chỉ báo cùng loại bắt đầu với, từ nay.</td></tr>
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
  <strong>Múi giờ.</strong> Nhãn trục thời gian và nhãn giờ của con trỏ chữ thập mặc định theo
  múi giờ cục bộ của trình duyệt; chuyển sang một độ lệch UTC cố định (hoặc trở về
  giờ máy) từ bảng cài đặt hoặc gọi trực tiếp:
</p>
<pre><code>{`chart.setTimezoneOffset(-300)  // EST (UTC-5), in minutes
chart.setTimezoneOffset(330)   // IST (UTC+5:30)
chart.setTimezoneOffset(null)  // back to browser-local`}</code></pre>

<p>Các tác dụng trên cũng có thể gọi bằng code:</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)`}</code></pre>

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
  <code>roundPrice</code> làm tròn theo chúng. Các bảng chỉ báo giữ cách hiển thị số riêng. Thời
  gian cũng hiển thị được theo cách của bạn; hàm định dạng được cho biết nhãn đang in là loại nào.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'date' (a daily bar), 'day' (a new day), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3>So sánh các mã</h3>
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
  Trong ChartWidget, nút so sánh trong cây đối tượng hỏi mã, rồi hỏi cách so sánh: thay đổi
  phần trăm, thang riêng, pane riêng, chênh lệch, tỷ lệ, hoặc tương quan theo giá hay theo lợi suất.
</p>

<h3>Xuất dữ liệu</h3>
<p>
  Xuất các nến dưới dạng CSV hoặc JSON, mỗi đường chỉ báo nằm trong một cột riêng, đặt tên theo
  tên trên chú thích. ChartWidget có mục <strong>Xuất dữ liệu (CSV)</strong> trong menu chuột phải
  của biểu đồ.
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
  (<code>SymbolInfo.sessions</code> theo <code>timezone</code> của mã) rời khỏi biểu đồ; chúng được
  cất riêng, cả nến trực tiếp lẫn các trang lịch sử, và trở lại khi bật lên. Nến từ một ngày trở
  lên được giữ nguyên.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
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

// pure computation is exported
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day')  // [{ id, label, price }]`}</code></pre>

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

// split into one mini-profile per calendar-day session
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax)  // per-day TPO`}</code></pre>

<h3>Cảm ứng &amp; di động</h3>
<table>
  <thead><tr><th>Cử chỉ</th><th>Thao tác</th></tr></thead>
  <tbody>
    <tr><td>Kéo 1 ngón (vùng biểu đồ)</td><td>Kéo biểu đồ + di chuyển con trỏ chữ thập</td></tr>
    <tr><td>Chụm 2 ngón</td><td>Phóng to quanh điểm giữa</td></tr>
    <tr><td>Nhấn giữ (~500 ms)</td><td>Ghim chú thích OHLC tại nến (bản di động của Alt+bấm)</td></tr>
    <tr><td>Kéo 1 ngón trong dải trục giá / thời gian</td><td>Co giãn trục tương ứng</td></tr>
  </tbody>
</table>
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
chart.on('dataUpdate', e => /* { length } */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* hình vẽ, chỉ báo, cảnh báo, loại biểu đồ hoặc giao diện có thể đã thay đổi */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
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
  độ chính xác của mã. Các menu và phiếu đặt lệnh của ChartWidget đều làm như vậy.
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
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3>Phím tắt của widget</h3>
<table>
  <thead><tr><th>Phím tắt</th><th>Thao tác</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>Bảng lệnh (chỉ báo, loại biểu đồ, công cụ vẽ…)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>Tìm mã — tìm gần đúng trong danh sách mã đã cấu hình</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>Lưu bố cục (lần đầu sẽ hỏi tên)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>Gõ một khung thời gian (<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>) rồi nhấn Enter (<code>intervalTyping: false</code> để tắt)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>Đường xu hướng, đường ngang, tia ngang, đường dọc, đường chữ thập, Fibonacci thoái lui</td></tr>
    <tr><td><kbd>?</kbd></td><td>Hiện bảng phím tắt</td></tr>
    <tr><td><kbd>Alt</kbd> + bấm vào biểu đồ</td><td>Ghim chú thích OHLC tại nến đang rê chuột (kèm chênh lệch so với vị trí con trỏ chữ thập hiện tại)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Bỏ ghim chú thích / huỷ hình đang vẽ</td></tr>
    <tr><td>Bấm vào mã trên thanh công cụ</td><td>Mở hộp thoại tìm mã</td></tr>
    <tr><td>Bấm nút phát trên thanh công cụ</td><td>Mở thanh điều khiển phát lại nến (phát/từng bước/tua/tốc độ)</td></tr>
  </tbody>
</table>
<p>Cập nhật danh sách mã có thể tìm lúc chạy bằng <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>.</p>

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
  chỉ báo (kèm tham số) và hình vẽ — thành một chuỗi gọn, an toàn cho URL để
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
  thang giá, loại biểu đồ, chỉ báo, hình vẽ và cảnh báo (không gồm giao diện, vì đó
  là lựa chọn của người xem). Mở, đổi tên và xoá bố cục từ menu của nút này; bố cục
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
  khi người dùng rời trang.
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

// Or use the pure function directly
import { resampleOHLCV, inferTimeframeMs } from '@tradecanvas/chart'

const hourly = resampleOHLCV(oneMinuteBars, '1h')   // OHLC merged, volume summed
const fourHour = resampleOHLCV(oneMinuteBars, '4h', { weekStartsOn: 1 })`}</code></pre>
<p>
  Gom nhóm theo lịch: khung trong ngày và khung ngày neo theo các mốc epoch
  UTC, tuần theo ngày đầu tuần đã cấu hình, còn tháng / quý / năm
  theo ranh giới lịch. Nến đầu vào không bao giờ bị sửa đổi.
</p>

<h3>Danh mục theo dõi</h3>
<p>
  Bảng bên phải gồm các danh sách mã, mỗi dòng có giá cuối, % thay đổi và một sparkline. Chuyển, tạo,
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
  Một bảng mở từ nút ⓘ trên thanh công cụ (hoặc từ bảng lệnh): tên của mã, giá cuối và mức thay đổi, trạng thái
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
  hiện ra khi chuột nằm trên biểu đồ (<code>navigation: false</code> để bỏ chúng). Thay đổi cài đặt và đổi loại
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
  Nút lớp (layers) trên thanh công cụ mở bảng cây đối tượng liệt kê mọi chỉ báo
  và hình vẽ đang có. Chỉ báo có thể xoá; mỗi hình vẽ có nút
  hiện / ẩn, khoá / mở khoá, cài đặt và xoá, còn các nhóm được liệt kê cùng
  các hình vẽ của chúng bên dưới. Bật sẵn theo mặc định — tắt bằng
  <code>objectTree: false</code>. Các nút cho hình vẽ tương ứng với:
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
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
  cài đặt: kiểu, các cài đặt riêng của công cụ (mức Fibonacci, phần kéo dài,
  nhãn…) và các điểm của nó theo múi giờ của biểu đồ. Bấm chuột phải vào một
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
  Phần <strong>So sánh</strong> trong cây đối tượng vẽ chồng các mã khác thành
  các đường đã chuẩn hoá. Khi có adapter dữ liệu trực tiếp, nút + mở bộ chọn mã,
  tải lịch sử của mã đó qua <code>adapter.fetchHistory</code> và thêm
  vào ở chế độ phần trăm (để các mã có mức giá khác nhau dùng chung một trục). Các mã so sánh
  tự tải lại khi đổi khung thời gian. Các lệnh tương đương trong code:
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
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
<p>112 công tắc, cái nào cũng bật cho tới khi tắt: tên không có dấu chấm là cả một tính năng, tắt ở mọi nơi nó xuất hiện; tên có dấu chấm là một chỗ. Công tắc đổi được khi widget đang chạy. Danh sách đầy đủ và các option cũ tương ứng nằm ở <a href={href('/docs/customization')}>Tùy biến</a>.</p>
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
