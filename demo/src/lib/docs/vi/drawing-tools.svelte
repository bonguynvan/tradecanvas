<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Công cụ vẽ — Tài liệu TradeCanvas</title>
  <meta name="description" content="76 công cụ vẽ có sẵn, mỗi công cụ có cài đặt riêng: công cụ Fibonacci và Gann, sóng Elliott, mô hình harmonic, ghi chú, brush, Long/Short Position kèm tính khối lượng, cảnh báo trên hình vẽ, nhóm và lớp." />
</svelte:head>

<h1>Công cụ vẽ</h1>
<p>
  76 công cụ vẽ có sẵn. Mỗi công cụ bám vào nến khi bật magnet, hỗ trợ
  undo và redo, giữ cài đặt riêng, và được lưu cùng layout.
</p>

<h2>Vẽ bằng con trỏ</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // the next clicks draw a trend line
chart.setDrawingTool(null)          // back to the cursor
chart.setStayInDrawingMode(true)    // keep the tool after each drawing`}</code></pre>
<p>Một công cụ được vẽ theo một trong ba cách:</p>
<ul>
  <li><b>Click</b> — mỗi click một điểm (hai điểm cho trend line, năm điểm cho mô hình XABCD).</li>
  <li><b>Vẽ tay</b> — nhấn và kéo; <code>brush</code> và <code>highlighter</code>.</li>
  <li><b>Path</b> — mỗi click một điểm, rồi double-click, <kbd>Enter</kbd>, hoặc click vào điểm cuối để kết thúc; <code>path</code> và <code>polyline</code>.</li>
</ul>
<p><kbd>Escape</kbd> bỏ một hình vẽ chưa vẽ xong.</p>

<h2>Thêm hình vẽ từ code</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reversed: true, extendRight: true },
})

chart.autoFib()   // a retracement over the dominant swing in view, or null`}</code></pre>

<h2 id="panes">Trên pane chỉ báo</h2>
<p>
  Hình vẽ bắt đầu trên một pane chỉ báo (RSI, MACD…) thuộc về pane đó: giá của các điểm neo là giá trị của pane, magnet bám vào các đường của pane, và hình vẽ theo thang của pane. Hình vẽ nằm trong pane của nó. Pane bên cạnh và pane đang thu gọn không nhận hình vẽ, và các công cụ đọc giá của nến (Anchored VWAP, Volume Profile, Long/Short Position) chỉ nằm trên pane giá. Hình vẽ trên pane chỉ báo không nhận cảnh báo giá.
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // 70 on the RSI scale
  paneId: rsi,                          // a pane’s id, as getIndicatorPanes() lists them
})`}</code></pre>
<p>
  Khi chỉ báo sở hữu pane bị xoá và một chỉ báo khác trong pane tiếp quản, các hình vẽ đi theo pane. Khi pane bị xoá, các hình vẽ của nó bị ẩn và quay lại cùng pane khi undo. Layout đã lưu đặt chúng lại đúng pane.
</p>

<h2 id="text">Chữ</h2>
<p>
  Các công cụ chữ (Text, Note, Callout, Price Label, Arrow Mark) dùng chung một kiểu chữ: cỡ chữ, đậm, nghiêng và màu riêng. Text, Note và Callout còn căn dòng trái, giữa hoặc phải, có thể có nền và viền, và xuống dòng theo một độ rộng. Text giữ các ngắt dòng của nó và không tự xuống dòng trừ khi được đặt độ rộng; Note và Callout xuống dòng ở 240 px. Note, Callout, Signpost và Balloon viết chữ trong một bong bóng tô màu của chúng, bằng màu chữ đọc được trên nền đó, nên các nến bên dưới không lộ qua chữ; <code>fillColor</code> hoặc <code>textColor</code> riêng được giữ nguyên. Mũi chỉ của Callout là đuôi của bong bóng: nó đi ra từ cạnh hướng về điểm.
</p>
<p>
  Khi không đặt cỡ riêng, chữ có cỡ 14 px và chữ số (giá của một mức, một tỷ lệ, một hộp thống kê) 12 px, cả hai lớn hơn chữ trên trục một bậc trở lên và lớn theo nó (<code>chart.setFont</code>, và widget trên màn hình rộng). Cỡ 12 được lưu bởi phiên bản trước được coi như không đặt. Chữ do người dùng viết dùng font sans của hệ thống, chữ số dùng font của biểu đồ; <code>font: {'{'} textFamily {'}'}</code> (hoặc <code>chart.setFont({'{'} textFamily {'}'})</code>) đặt font riêng cho chữ, và widget dùng font của look.
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // its own line breaks are kept
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px; 0: only where the text breaks
  },
})`}</code></pre>
<p>
  Trong widget, text, note, callout, signpost, balloon, anchored text hoặc anchored note mở một ô nhập ngay trên chữ khi vừa vẽ xong và khi double-click: gõ đè lên chữ, Enter hoặc click ra ngoài để giữ, Shift+Enter xuống dòng, và Escape trả lại chữ cũ (một text vừa vẽ mà chưa có chữ thì bị bỏ). Một lần undo xoá cả text vừa vẽ lẫn chữ của nó. Cài đặt của nó chỉ cách một click, trên toolbar phía trên hoặc trong menu của nó. Toolbar phía trên vùng chọn đặt màu nền và màu chữ cho các công cụ có hai thuộc tính này. <code>chart.getDrawingTextRect(id)</code> trả về vị trí ô chữ, để đặt một trình soạn riêng lên trên.
</p>

<h3 id="line-text">Chữ trên đường và hộp</h3>
<p>
  Trend line, ray, extended line, info line, trend angle, arrow, đường ngang hoặc đường dọc và rectangle cũng nhận chữ, cùng kiểu chữ trên. <code>textAlign</code> đặt chữ ở đầu trái, giữa hoặc đầu phải của đường, và <code>textVAlign</code> đặt chữ trên đường, trên đúng đường hoặc dưới đường; trong rectangle, hai thuộc tính này đặt chữ bên trong, ở trên, giữa hoặc dưới. Chữ theo độ dốc của đường và luôn đọc từ trái sang phải, và từ dưới lên trên với đường dọc. Trong widget, tab Chữ có hai dòng này. Chữ cũng được gõ tại chỗ: nút Chữ trên toolbar phía trên hình vẽ đang chọn, mục Chữ trong menu của nó, hoặc double-click vào chữ sẽ mở ô nhập (double-click vào chính đường thì mở cài đặt). Enter hoặc click ra ngoài để giữ, Escape trả lại chữ cũ, và đường không còn chữ thì lại là đường thường.
</p>
<pre><code>{`chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 98 }, { time: t2, price: 104 }],
  style: { color: '#4c8dff', lineWidth: 2, lineStyle: 'solid',
    text: 'Breakout', textAlign: 'right', textVAlign: 'top' },  // 'top' | 'middle' | 'bottom'
})
chart.addDrawing({ type: 'verticalLine', anchors: [{ time: t3, price: 0 }], options: { showTime: true } })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b], options: { trendLine: false, oneColor: true } })`}</code></pre>
<p>
  Đường ngang và horizontal ray ẩn giá bằng <code>showPrice: false</code>. Đường dọc hiện thời gian của nến bằng <code>showTime: true</code>, viết như crosshair viết. Rectangle có tám tay nắm: một ở mỗi góc và một ở giữa mỗi cạnh, tay nắm giữa cạnh chỉ di chuyển cạnh đó. Fibonacci retracement và extension vẽ một đường nét đứt qua các điểm của chúng (<code>trendLine</code>, bật mặc định) và vẽ mọi mức theo màu của hình vẽ khi có <code>oneColor</code>. Click vào chữ cũng chọn đường hoặc hộp. Retracement đặt mức 0 ở nơi con sóng kết thúc, tại điểm thứ hai, nên 38.2% là mức giá trả lại 38.2% con sóng; <code>reversed: true</code> đo từ điểm thứ nhất. Các mức của nó và của extension nằm giữa các điểm trừ khi đặt <code>extendLeft</code> hoặc <code>extendRight</code>, mỗi nhãn nằm cạnh đầu đường của nó. Parallel channel có đường giữa trừ khi <code>middleLine: false</code>. Giá của đường ngang và thời gian của đường dọc được gắn tag trên trục, dù có đang chọn hay không. Hình vẽ lưu trước khi các giá trị này thành mặc định được nạp như lúc vẽ.
</p>

<h2 id="look">Cách hiển thị hình vẽ</h2>
<p>
  Mọi công cụ được vẽ theo cùng một cách:
</p>
<ul>
  <li>Tay nắm của hình vẽ đang chọn là các vòng tròn màu của hình vẽ, tô bằng màu nền biểu đồ (style key <code>drawings.handleColor</code> tô chúng bằng màu riêng), lớn hơn nét vẽ một bậc: rộng 9 px với nét 1 px, lớn hơn với nét dày hơn. Tay nắm dưới con trỏ phóng to, và tay nắm đang kéo được tô màu. Chỉ hình vẽ mà thao tác kéo sẽ đổi hình mới hiện vòng tròn; các hình vẽ khác trong vùng chọn, và hình vẽ bị khoá, hiện chấm nhỏ.</li>
  <li>Hình vẽ dưới con trỏ phát sáng nhẹ, để thấy rõ click sẽ chọn hình nào.</li>
  <li>Trong lúc vẽ, các điểm đã đặt hiện thành tay nắm.</li>
  <li>Nét đứt và nét chấm lớn theo độ dày nét, chấm tròn, và đầu nét liền bo tròn. Đầu mũi tên cũng lớn theo độ dày nét.</li>
  <li>Màu tô là màu của nét, nhạt đi, trừ khi được đặt riêng: hình vẽ đổi sang đỏ thì tô màu đỏ. Nhãn trên tag có màu được viết màu đen hoặc trắng, màu nào đọc được; hộp thống kê dùng màu nền và màu chữ của biểu đồ, ở cả hai theme; chữ mang màu của hình vẽ được làm đậm hơn ở chỗ khó đọc trên nền sáng.</li>
  <li>Các đường chính của công cụ theo kiểu nét của nó; lưới, đường dẫn và các góc phụ dày 1 px và nhạt hơn. Mức, góc hoặc vạch chia có nhãn đè lên nhãn khác thì không ghi nhãn, trừ mức 0 và 1. Phần trăm viết số nguyên khi có thể (50%, không phải 50.0%), và mỗi tỷ lệ Fibonacci vẽ cùng các tỷ lệ khác có màu riêng.</li>
  <li>Tăng và giảm (price range, target và stop của Long/Short position, kết quả của forecast) dùng màu lãi và lỗ của theme (style key <code>trading.profitColor</code> và <code>trading.lossColor</code>), xanh và đỏ nếu không đặt.</li>
  <li>Text, icon hoặc arrow mark không hiện tay nắm, vì tay nắm sẽ đè lên chữ hoặc ký hiệu: khi được chọn, nó được đóng khung, và nhấn vào bất kỳ chỗ nào trên nó để di chuyển.</li>
</ul>

<h2>Cài đặt</h2>
<p>
  Ngoài style (màu, độ dày, kiểu nét, màu tô, chữ), một công cụ có thể có
  cài đặt riêng: các mức Fibonacci, kéo dài đường sang trái hoặc phải,
  nhãn, nền, icon, bậc sóng. Dialog cài đặt của
  widget được dựng từ các cài đặt này.
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // what the tool offers
chart.getDrawingOptions(id)                   // its values, defaults filled in
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// several changes as one undo step
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// a dialog previewing changes: one undo step, or put back on cancel
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// what every new Fibonacci retracement starts with
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>Cài đặt từ layout đã lưu hoặc từ hình vẽ được dán được kiểm tra theo công cụ; giá trị công cụ không nhận bị bỏ.</p>

<h3 id="settings-dialog">Dialog cài đặt</h3>
<p>
  Trong widget, double-click vào hình vẽ (hoặc Cài đặt trên toolbar, menu của nó hoặc cây đối tượng) mở
  cài đặt của nó theo tab. <strong>Kiểu</strong>: nét vẽ (màu, độ dày, nét đứt) trên một dòng, hai đầu, màu tô, rồi các
  công tắc và lựa chọn của công cụ, và các mức của nó. <strong>Chữ</strong>, cho các công cụ có viết chữ: nội dung và
  cỡ chữ. <strong>Toạ độ</strong>: giá, ngày và giờ của từng điểm, theo múi giờ của biểu đồ.
  <strong>Hiển thị</strong>: các khung thời gian mà hình vẽ hiện. Mọi thay đổi hiện ngay; <strong>OK</strong> giữ chúng
  thành một bước undo, <strong>Huỷ</strong> (hoặc Escape) trả hình vẽ về như cũ. Menu <strong>Mẫu</strong>
  áp dụng hoặc xoá một mẫu đã lưu, lưu look của hình vẽ thành mẫu, giữ các tuỳ chọn làm mặc định của công cụ,
  và đặt lại chúng.
</p>

<h3 id="drawing-intervals">Chỉ hiện ở một số khung thời gian</h3>
<p>
  Một hình vẽ có thể chỉ hiện ở một số khung thời gian, theo cùng quy tắc như chỉ báo: tắt một đơn vị
  (<code>minutes: false</code>), hoặc một khoảng của đơn vị đó (<code>hours: [1, 4]</code>). Ở các khung thời gian khác, hình vẽ không
  được vẽ, không nhận click và không được chọn. Quy tắc được lưu cùng layout.
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // not on minute charts
chart.isDrawingShown(id)                                    // false on a 5m chart
chart.updateDrawing(id, { intervals: null })                // every interval again

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>Với Chart thuần không có stream, đặt khung thời gian của dữ liệu nến bằng <code>chart.setDataTimeframe('5m')</code>.</p>

<h3 id="line-stats">Đầu, điểm giữa và thống kê của đường</h3>
<p>
  Trend line, ray và extended line có thể hiện điểm giữa, và thống kê giữa hai điểm: mức thay đổi
  giá và phần trăm, số nến và thời gian giữa hai điểm, góc. Thống kê hiện khi đường
  đang được chọn, hoặc luôn hiện, cạnh đầu phải, điểm giữa hoặc đầu trái. Hai đầu trend line có thể là mũi tên.
  Tất cả đều tắt cho đến khi được bật.
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // trend lines: leftEnd, rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">Toolbar phía trên vùng chọn</h2>
<p>
  Trong widget, click vào hình vẽ sẽ hiện một toolbar nhỏ ngay phía trên nó: màu, độ dày nét và kiểu nét, rồi cài đặt, cảnh báo trên đường, khoá, menu đầy đủ của hình vẽ (giống menu chuột phải) và xoá. Khi chọn nhiều hình vẽ, toolbar nằm phía trên tất cả, và thay đổi áp dụng cho từng hình. Toolbar đi theo hình vẽ khi hình vẽ được di chuyển, pan hoặc zoom, tránh sang bên khi đang bật công cụ vẽ, eraser hoặc zoom vùng, và là một điểm dừng tab, di chuyển trong đó bằng phím mũi tên.
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

<h2>Long/Short Position</h2>
<p>
  <code>riskReward</code>: kéo từ giá vào đến stop. Target nằm cách theo
  tỷ lệ reward:risk. Từ quy mô tài khoản và mức rủi ro (phần trăm tài
  khoản, hoặc một số tiền), công cụ tính ra khối lượng, và hiện giá,
  khoảng cách và lãi hoặc lỗ của từng đường.
</p>
<p>
  Khi được chọn, nó có bốn tay nắm: giá vào, stop và target trên cạnh
  của giá vào, và cạnh còn lại trên đường giá vào. Giá vào di chuyển theo thời gian
  và giá, stop đổi giá của stop, target đổi tỷ lệ reward:risk, và
  cạnh còn lại đổi thời gian giao dịch kéo dài.
</p>
<p>
  Trên các nến trong khoảng đó, công cụ mô phỏng giao dịch. Giao dịch vào lệnh ở
  nến đầu tiên tại hoặc sau thời điểm vào. Mỗi nến sau đó được kiểm tra stop và
  target; nến chạm cả hai được tính là stop, vì nến không cho biết cái nào đến trước,
  và nến mở cửa vượt qua một mức thì đóng giao dịch tại giá mở cửa.
  Phần giao dịch đã đi qua được tô theo màu của kết quả,
  với một đường nét đứt từ giá vào đến chỗ đóng và một tag ở đó:
  <code>Target hit</code>, <code>Stop hit</code>, <code>Closed</code> ở
  cạnh phải, hoặc <code>Open</code> ở nến cuối, kèm lãi hoặc lỗ.
  Mô phỏng dùng giá của chính chuỗi dữ liệu (kể cả khi xem Heikin Ashi), và bị bỏ
  với hộp vẽ lùi về trước giá vào và với các loại biểu đồ có nến không phải của chuỗi
  (Renko, Kagi, line break, point &amp; figure). <code>showOutcome: false</code>
  tắt mô phỏng.
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })
chart.setDrawingOptions(id, { showOutcome: false })   // the zones and their tags only`}</code></pre>
<p>
  <code>positionLevels(drawing)</code> đọc hình vẽ như một giao dịch, cho ứng dụng
  đặt order từ nó: chiều (<code>'buy'</code> với long), giá vào,
  cắt lỗ, chốt lời và khối lượng mà mức rủi ro cho phép, chưa làm tròn, kèm
  số chữ số thập phân mà hình vẽ dùng. Hàm trả về <code>null</code> với mọi hình vẽ
  khác, với position có stop còn nằm ở giá vào, với position chưa đặt
  rủi ro (không có khối lượng), và với giá không phải số hữu hạn.
</p>
<p>
  Trong widget, Long/Short Position đang chọn hiện nút <b>Tạo order</b>
  trên toolbar khi bật trading: nút mở order ticket điền sẵn các
  mức này (chiều, giá vào làm giá, cắt lỗ, chốt lời và khối lượng mà mức
  rủi ro cho phép), để điều chỉnh rồi đặt lệnh. Không bao giờ đặt order chỉ bằng một click.
</p>
<p>
  Làm tròn xuống khối lượng theo mức broker chấp nhận, để order không rủi ro
  nhiều hơn hình vẽ cho biết. Giá vào là lệnh giới hạn hay lệnh stop
  tuỳ vào vị trí của nó so với giá hiện tại. <code>placeOrderIntent</code>
  cần bật tính năng <code>trading</code>: hàm phát <code>orderPlace</code>,
  để execution adapter đã kết nối đặt lệnh (xem Trading).
</p>
<pre><code>{`import { positionLevels } from '@tradecanvas/chart'

const levels = positionLevels(chart.getDrawings().find((d) => d.id === id))
if (levels) {
  const { side, entry, stopLoss, takeProfit, quantity, quantityDecimals } = levels
  const step = 10 ** quantityDecimals
  const last = chart.getData().at(-1)?.close ?? entry
  // A buy below the price now waits as a limit, one above it as a stop; a sell the other way round.
  const type = (side === 'buy') === (entry <= last) ? 'limit' : 'stop'
  chart.placeOrderIntent({
    side, type, price: entry, stopPrice: type === 'stop' ? entry : undefined,
    quantity: Math.floor(quantity * step) / step, stopLoss, takeProfit,
  })
}`}</code></pre>

<h2>Cảnh báo trên hình vẽ</h2>
<p>
  Một cảnh báo có thể theo trend line, ray, extended line hoặc đường ngang, hoặc
  các đường của parallel channel: cảnh báo kích hoạt khi giá cắt đường tại vị trí
  của đường ở nến mới nhất, đúng như vẽ trên biểu đồ (thẳng qua các nến, và theo
  giá log trên thang log).
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>Cảnh báo đi theo hình vẽ, quay lại cùng hình vẽ khi undo, và được lưu cùng layout.</p>

<h2>Thứ tự và nhóm</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // one undo step
chart.removeAll('drawings')         // every drawing; 'indicators', or 'all' for both: one undo step, locked drawings stay
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // the selected ones (Ctrl+C)
chart.pasteDrawings()                // Ctrl+V, here or on another chart of the page
chart.canPasteDrawings()             // whether there is something to paste`}</code></pre>
<p>Click vào một hình vẽ trong nhóm sẽ chọn cả nhóm.</p>
<p>Trong cây đối tượng của widget, các hình vẽ được liệt kê theo thứ tự chồng lớp, hình trên cùng đứng đầu. Click vào tên hình vẽ để chọn, double-click để đổi tên. Dòng của nó có nút nhân bản, và tay kéo của nó kéo hình vẽ vào vị trí của dòng khác; phím mũi tên trên tay kéo di chuyển hình vẽ lên hoặc xuống một dòng, đồng thời trong danh sách và trong thứ tự chồng lớp.</p>

<h2>Eraser, zoom và magnet</h2>
<pre><code>{`chart.setEraserMode(true)          // each click on a drawing removes it, until Escape
chart.setZoomAreaMode(true)        // the next drag zooms to the bars in its box
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>Magnet yếu bám điểm vào giá open, high, low hoặc close của nến khi con trỏ ở gần; magnet mạnh luôn bám. Trong widget, magnet tắt khi khởi động: hình vẽ nằm đúng chỗ được đặt cho đến khi bật magnet bằng nút magnet.</p>

<h2 id="cursors">Con trỏ, và khoảng của hình vẽ trên trục</h2>
<pre><code>{`new Chart(el, { crosshair: { mode: 'magnet', cursor: 'dot' } })
chart.setCrosshairCursor('arrow')        // 'cross' | 'dot' | 'arrow'
chart.on('crosshairCursorChange', (e) => e.payload)  // { cursor }
widget.setCrosshairCursor('dot')         // the widget's, a Chart Setting
chart.setDrawingAxisSpansVisible(false)  // or features: { drawingAxisSpans: false }`}</code></pre>
<p><strong>Chữ thập</strong> vẽ các đường của crosshair với con trỏ hình chữ thập. <strong>Chấm</strong> vẽ cùng các đường đó, con trỏ là một chấm nhỏ màu của crosshair. <strong>Mũi tên</strong> không vẽ đường và giữ con trỏ mũi tên, còn giá và thời gian vẫn theo con trỏ trên trục. Trong widget, nút con trỏ ở đầu cột công cụ vẽ mở menu gồm ba loại này, và Cài đặt biểu đồ có dòng tương ứng. Loại con trỏ là lựa chọn riêng của người xem: <code>persistSettings</code> lưu nó, còn layout hay link chia sẻ không bao giờ mang theo.</p>
<p>Khi một hình vẽ đang được chọn, di chuyển hoặc đang vẽ, trục giá được tô từ giá thấp nhất đến giá cao nhất của nó và trục thời gian từ thời điểm đầu đến thời điểm cuối, mỗi đầu có nhãn theo màu của hình vẽ. Đường ngang chỉ đánh dấu giá và đường dọc chỉ đánh dấu thời gian; hình vẽ cố định trên màn hình không đánh dấu gì. Eraser làm sáng hình vẽ mà click sẽ xoá.</p>

<h2 id="editing">Chỉnh sửa bằng con trỏ và bàn phím</h2>
<ul>
  <li>Magnet cũng hoạt động khi kéo tay nắm và khi di chuyển hình vẽ: điểm gần chỗ nắm nhất bám vào một mức giá, các điểm còn lại giữ vị trí tương đối với nó. Magnet yếu có tầm 50 px.</li>
  <li>Giữ <kbd>Ctrl</kbd>/<kbd>⌘</kbd> khi vẽ hoặc kéo để đảo trạng thái magnet trong lúc đó: bật khi đang tắt, tắt khi đang bật.</li>
  <li>Giữ <kbd>Shift</kbd> khi vẽ hoặc kéo tay nắm để giữ đường nằm ngang, thẳng đứng hoặc 45° trên màn hình. Trên vùng trống của biểu đồ, <kbd>Shift</kbd> + kéo vẫn là đo. Áp dụng cho đường và path; hộp, độ rộng của channel hoặc điểm của pitchfork vẫn tự do.</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> di chuyển các hình vẽ đang chọn sang ngang một nến hoặc lên xuống một pixel; với <kbd>Shift</kbd>, mười. Một chuỗi lần nhấn là một bước undo, và hình vẽ bị khoá đứng yên.</li>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + kéo trên hình vẽ kéo ra một bản sao (của cả vùng chọn khi hình vẽ nằm trong đó), một bước undo. <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + click vẫn thêm hoặc bỏ hình vẽ khỏi vùng chọn, và <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + kéo trên vùng trống vẽ một hộp chọn. Trên tay nắm của hình vẽ đang chọn, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + kéo thay vào đó đổi hình với magnet bị đảo.</li>
  <li><kbd>Escape</kbd> khi đang kéo hình vẽ sẽ huỷ thao tác kéo: hình vẽ đã di chuyển hoặc đổi hình quay về chỗ cũ, và bản sao đang kéo ra bị bỏ, không để lại gì để undo.</li>
</ul>

<h2>Bàn phím</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> undo, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> hoặc <kbd>Ctrl</kbd> + <kbd>Y</kbd> redo.</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> sao chép và dán hình vẽ, <kbd>Ctrl</kbd> + <kbd>D</kbd> nhân bản, <kbd>Delete</kbd> xoá.</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> nhóm vùng chọn, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> bỏ nhóm.</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> đưa lên một lớp / đưa xuống một lớp; với <kbd>Shift</kbd>, lên trên cùng / xuống dưới cùng.</li>
  <li><kbd>Enter</kbd> kết thúc path; <kbd>Escape</kbd> bỏ công cụ, eraser, hoặc vùng chọn.</li>
</ul>

<h2>Sự kiện</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id, x, y }: where on the chart it was
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } or { zoomArea }`}</code></pre>
<p>Undo và redo phát <code>drawingCreate</code>, <code>drawingRemove</code> và <code>drawingUpdate</code> cho các hình vẽ mà chúng khôi phục, xoá hoặc thay đổi.</p>

<h2>Danh mục</h2>

<h3>Đường</h3>
<ul>
  <li><code>trendLine</code> — kéo dài sang trái hoặc phải khi được bật.</li>
  <li><code>ray</code>, <code>extendedLine</code></li>
  <li><code>horizontalLine</code>, <code>horizontalRay</code> (kéo về phía sau theo thời gian từ điểm của nó), <code>verticalLine</code>, <code>crossLine</code></li>
  <li><code>infoLine</code> — kèm hộp hiện mức thay đổi giá, số nến, thời gian và góc.</li>
  <li><code>trendAngle</code> — kèm góc trên màn hình.</li>
</ul>

<h3>Channel</h3>
<ul>
  <li><code>parallelChannel</code> — đường qua hai điểm đầu được dời thẳng lên hoặc xuống đến điểm thứ ba (đúng như cảnh báo đọc), có đường giữa tuỳ chọn, kéo dài về hai phía.</li>
  <li><code>regressionChannel</code> — đường bình phương tối thiểu qua các giá đóng cửa giữa hai điểm, với dải cách hai độ lệch chuẩn mỗi bên; các điểm xác định khoảng nến, và tay nắm nằm trên đường.</li>
  <li><code>disjointChannel</code> — hai đường trên cùng khoảng nến, nghiêng ngược chiều nhau: đường thứ nhất qua hai điểm của nó, đường thứ hai qua giá của điểm thứ ba ở giữa khoảng. Một hình nêm thu hẹp hoặc mở rộng; kéo dài về hai phía và cung cấp cả hai giá cho cảnh báo.</li>
  <li><code>flatTopBottom</code> — một đường dốc qua hai điểm và một đường ngang ở giá của điểm thứ ba, trên cùng khoảng nến: đỉnh phẳng trên các đáy đi lên, hoặc đáy phẳng dưới các đỉnh đi xuống.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — mức, giá và phần trăm chỉnh được, nhãn bên trái hoặc phải, nền, đảo chiều.</li>
  <li><code>fibChannel</code>, <code>fibSpeedResistanceFan</code> — các tia của fan theo màu của mức tương ứng, các tia thời gian nét đứt, cả hai có nhãn.</li>
  <li><code>fibTimeZones</code> — tính từ đầu vùng (0) trở đi; tay nắm của nó, và của <code>cyclicLines</code>, nằm trên các đường ở giữa chiều cao vùng vẽ.</li>
  <li><code>fibArcs</code> — các cung quanh điểm đầu của con sóng, nửa vòng hoặc cả vòng.</li>
  <li><code>fibCircles</code> — các vòng tròn có bán kính theo bội số Fibonacci.</li>
  <li><code>fibSpiral</code> — xoắn ốc vàng tính từ tâm.</li>
  <li><code>fibWedge</code> — các cung giữa hai đường từ một đỉnh.</li>
</ul>

<h3>Gann và pitchfork</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code> — đường B–C nối các nhánh, và phần giữa các nhánh được tô đến mép vùng vẽ.</li>
  <li><code>pitchfan</code> — các tia từ một điểm xoay qua các mức giữa hai điểm.</li>
  <li><code>gannFan</code> — mỗi góc có nhãn ở chỗ rời vùng vẽ; <code>gannBox</code> — các vạch chia có nhãn theo giá và theo thời gian; <code>gannSquare</code></li>
</ul>

<h3>Hình</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code> — tay nắm của ellipse nằm trên đường cong, mỗi tay nắm di chuyển một cạnh.</li>
  <li><code>rotatedRectangle</code> — hình chữ nhật ở góc bất kỳ: một cạnh qua hai điểm đầu, sâu bằng khoảng cách từ điểm thứ ba đến cạnh đó. Nó vuông trên màn hình, nên cạnh xa theo thang khi zoom biểu đồ.</li>
  <li><code>polyline</code> — một hình khép kín, mỗi click một điểm.</li>
  <li><code>curve</code> — uốn qua một điểm thứ ba; <code>arc</code> — một cung tròn qua ba điểm.</li>
</ul>

<h3>Brush</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — vẽ tay; khi được chọn, nét vẽ được đóng khung như text, và di chuyển bằng cách nhấn vào bất kỳ chỗ nào trên nó.</li>
  <li><code>path</code> — một đường qua các điểm, có mũi tên ở cuối.</li>
</ul>

<h3>Mô hình</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — kèm các tỷ lệ. Tên điểm nằm ngoài điểm, tránh tay nắm; mỗi tỷ lệ nằm trên đường dẫn của nó, hoặc lệch ra một chút khi chỗ đó đã có đường, không bao giờ đè lên tên, tay nắm hoặc tỷ lệ khác.</li>
  <li><code>headAndShoulders</code> — kèm đường viền cổ, tên các đỉnh ghi phía trên, rút gọn thành LS, H và RS khi tên đầy đủ chạm nhau.</li>
</ul>

<h3>Sóng Elliott</h3>
<ul>
  <li><code>elliottWave</code> (1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — nhãn theo kiểu của bậc sóng: số trong vòng tròn, (1), 1 hoặc i, nằm ngoài các điểm.</li>
</ul>

<h3>Chu kỳ</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>Đo lường</h3>
<ul>
  <li><code>priceRange</code> — một hộp màu tăng hoặc giảm (hoặc màu tự chọn) với mũi tên lên hoặc xuống và mức thay đổi trên một tag ở sau đầu mũi tên.</li>
  <li><code>dateRange</code> — số nến giữa hai thời điểm, một mũi tên ngang và số nến cùng thời gian trên một tag; tay nắm ở hai đầu mũi tên, giữa chiều cao vùng vẽ.</li>
  <li><code>dateAndPriceRange</code> — cả hai cùng lúc, mỗi phép đo một mũi tên và khối lượng ở bên trong; <code>measure</code> — mức thay đổi và số nến giữa hai điểm.</li>
</ul>

<h3>Ghi chú và đánh dấu</h3>
<ul>
  <li><code>text</code>, <code>note</code> (một ghim kèm chữ), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (lên, xuống, trái hoặc phải, kèm nhãn), <code>flag</code>, <code>icon</code> (sao, tim, dấu tích, dấu chéo, tròn, tam giác, tia sét)</li>
  <li><code>signpost</code> (chữ trên một tấm biển đặt trên cột tại một nến), <code>balloon</code> (chữ trong một bong bóng chỉ vào một nến)</li>
  <li><code>anchoredText</code>, <code>anchoredNote</code>: cố định ở một vị trí trên màn hình, đứng yên khi biểu đồ cuộn, zoom hoặc đổi mã. Các điểm của chúng là tỷ lệ của vùng vẽ (<code>{'{'} time: 0.5, price: 0.25 {'}'}</code> là giữa chiều ngang, một phần tư từ trên xuống), và cài đặt không có tab Toạ độ.</li>
</ul>

<h3>Dự báo</h3>
<ul>
  <li><code>riskReward</code> — Long/Short Position (ở trên).</li>
  <li><code>forecast</code> — màu tăng khi giá chạm target, màu giảm khi hết thời gian trước.</li>
  <li><code>projection</code> — một con sóng được chuyển sang từ điểm thứ ba.</li>
  <li><code>barsPattern</code> — bản sao của một số nến, dạng nến, đường hoặc high-low, phản chiếu hoặc lật; các nến được sao chép nằm dưới một dải nhạt.</li>
  <li><code>anchoredVWAP</code> — tay nắm nằm trên VWAP tại điểm bắt đầu; <code>volumeProfileRange</code> — khối lượng tại từng mức giá dạng histogram trong hộp của khoảng, value area (70% khối lượng) được tô, point of control kẻ ngang; tay nắm ở các góc hộp.</li>
</ul>

<h2>Lưu</h2>
<pre><code>{`const json = chart.saveState()   // drawings, their settings and groups, indicators, alerts…
chart.loadState(json)            // checks every drawing; malformed ones are left out`}</code></pre>

<h2>Công cụ riêng</h2>
<p>
  Một công cụ là một <code>DrawingPlugin</code> đăng ký bằng
  <code>chart.registerDrawingTool(plugin)</code>. Descriptor của nó liệt kê
  cài đặt (<code>options</code>), cách vẽ (<code>creation</code>), và
  có màu tô hoặc chữ hay không; nó có thể cung cấp giá của các đường
  (<code>priceAt</code>, cho cảnh báo), di chuyển các tay nắm không phải điểm neo
  (<code>moveHandle</code>), và nhận dữ liệu nến của biểu đồ
  (<code>setDataGetter</code>). Xem <a href={href('/docs/plugins')}>Plugin</a>.
</p>
