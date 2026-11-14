<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Công cụ vẽ — Tài liệu TradeCanvas</title>
  <meta name="description" content="76 công cụ vẽ có sẵn, mỗi công cụ có cài đặt riêng: công cụ Fibonacci và Gann, sóng Elliott, mô hình harmonic, ghi chú, bút vẽ, Vị thế Long/Short kèm tính khối lượng, cảnh báo trên hình vẽ, nhóm và thứ tự lớp." />
</svelte:head>

<h1>Công cụ vẽ</h1>
<p>
  76 công cụ vẽ có sẵn. Mỗi công cụ đều hút vào các nến nhờ nam châm, hỗ trợ
  hoàn tác và làm lại, có cài đặt riêng, và được lưu cùng bố cục.
</p>

<h2>Vẽ bằng con trỏ</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // các lần bấm tiếp theo vẽ một đường xu hướng
chart.setDrawingTool(null)          // quay về con trỏ
chart.setStayInDrawingMode(true)    // giữ công cụ sau mỗi hình vẽ`}</code></pre>
<p>Một công cụ được vẽ theo một trong ba cách:</p>
<ul>
  <li><b>Bấm</b> — mỗi điểm một lần bấm (hai lần với trend line, năm lần với mô hình XABCD).</li>
  <li><b>Vẽ tay</b> — nhấn và kéo; <code>brush</code> và <code>highlighter</code>.</li>
  <li><b>Đường nhiều điểm</b> — mỗi điểm một lần bấm, rồi bấm đúp, nhấn <kbd>Enter</kbd> hoặc bấm vào điểm cuối để kết thúc; <code>path</code> và <code>polyline</code>.</li>
</ul>
<p><kbd>Escape</kbd> bỏ hình vẽ đang vẽ dở.</p>

<h2>Thêm hình vẽ từ code</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reversed: true, extendRight: true },
})

chart.autoFib()   // một Fibonacci thoái lui trên con sóng chính đang hiện, hoặc null`}</code></pre>

<h2 id="panes">Trên pane chỉ báo</h2>
<p>
  Hình vẽ bắt đầu trên một pane chỉ báo (RSI, MACD…) thì nằm trên pane đó: giá của các điểm neo là giá trị của pane, nam châm bám vào các đường của pane, và hình vẽ đi theo thang của pane. Hình vẽ không ra ngoài pane của nó. Pane bên cạnh và pane đang thu gọn thì không vẽ được, và các công cụ đọc giá của nến (Anchored VWAP, Volume Profile, Long/Short Position) chỉ dùng trên pane giá. Hình vẽ trên pane không gắn được cảnh báo giá.
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // 70 trên thang RSI
  paneId: rsi,                          // id của panel, như getIndicatorPanes() liệt kê
})`}</code></pre>
<p>
  Khi chỉ báo sở hữu pane bị xoá và một chỉ báo khác trong pane nhận lại pane, các hình vẽ đi theo pane. Khi pane mất, các hình vẽ của nó bị ẩn và quay lại cùng pane khi hoàn tác. Layout đã lưu đặt chúng lại đúng pane.
</p>

<h2 id="text">Chữ</h2>
<p>
  Các công cụ chữ (Text, Note, Callout, Price Label, Arrow Mark) dùng chung một kiểu chữ: cỡ chữ, chữ đậm, chữ nghiêng và màu chữ riêng. Text, Note và Callout còn căn các dòng sang trái, giữa hoặc phải, có thể có nền và viền, và xuống dòng ở một độ rộng. Text giữ nguyên các chỗ xuống dòng của nó và chạy dài nếu không được đặt độ rộng; Note và Callout xuống dòng ở 240 px. Note, Callout, Signpost và Balloon viết chữ trong một bong bóng tô bằng chính màu của chúng, với màu mực đọc rõ trên nền đó, nên nến bên dưới không xuyên qua chữ; <code>fillColor</code> hoặc <code>textColor</code> đặt riêng vẫn được giữ. Phần chỉ của Callout là đuôi của bong bóng: nó đi ra từ cạnh hướng về điểm được chỉ.
</p>
<p>
  Khi không có cỡ riêng, chữ được đặt ở 14 px và số liệu (giá của một mức, một tỉ lệ, một hộp thống kê) ở 12 px, cả hai lớn hơn chữ trên trục ít nhất một bậc và lớn lên theo nó (<code>chart.setFont</code>, và widget trên màn hình rộng). Cỡ 12 được lưu từ phiên bản trước được đọc như không có cỡ. Chữ người dùng viết dùng font sans của hệ thống, số liệu dùng font của biểu đồ; <code>font: {'{'} textFamily {'}'}</code> (hoặc <code>chart.setFont({'{'} textFamily {'}'})</code>) đặt cho chữ một font của riêng bạn, còn widget đặt cho chúng font của preset đang dùng.
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // giữ nguyên các chỗ xuống dòng
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px; 0: chỉ xuống dòng nơi chữ xuống dòng
  },
})`}</code></pre>
<p>
  Trong widget, chữ, ghi chú, chú thích, biển chỉ dẫn, bóng chú thích hay chữ và ghi chú cố định mở một ô ngay trên chữ của nó khi vừa vẽ xong và khi nhấp đúp: gõ đè lên, Enter hoặc nhấp ra ngoài để giữ, Shift+Enter xuống dòng, Escape trả lại như cũ (hình vừa vẽ thì bị bỏ, và cả khi không có chữ). Một lần hoàn tác bỏ cả hình vừa vẽ lẫn chữ của nó. Cài đặt vẫn chỉ cách một cú nhấp, trên thanh công cụ phía trên hình hoặc trong menu của nó. Thanh công cụ trên vùng chọn đặt màu nền và màu chữ cho các công cụ có chúng. <code>chart.getDrawingTextRect(id)</code> cho biết ô chữ nằm đâu, để đặt trình sửa của riêng bạn lên trên.
</p>

<h3 id="line-text">Chữ trên đường và hình chữ nhật</h3>
<p>
  Trend line, tia, đường kéo dài, đường thông tin, đường góc, mũi tên, đường ngang, đường dọc và hình chữ nhật cũng nhận chữ, cùng kiểu chữ ấy. <code>textAlign</code> đặt chữ ở đầu trái, giữa hoặc đầu phải của đường, còn <code>textVAlign</code> đặt trên đường, trên chính đường hoặc dưới đường; trong hình chữ nhật, hai khóa này đặt chữ bên trong, ở trên, giữa hoặc dưới. Chữ nghiêng theo độ dốc của đường và luôn đọc từ trái sang phải, từ dưới lên trên với đường dọc. Trong widget, tab Chữ có hai hàng này. Chữ của chúng cũng được gõ ngay tại chỗ: nút Text trên thanh công cụ của drawing đang chọn, mục Text trong menu của nó, hoặc double-click vào chữ sẽ mở ô gõ (double-click vào chính đường vẽ thì mở phần cài đặt). Enter hoặc nhấp ra ngoài để giữ, Escape để trả lại như cũ; xoá hết chữ thì đường vẽ trở lại không có chữ.
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
  Đường ngang và tia ngang ẩn giá bằng <code>showPrice: false</code>. Đường dọc hiện thời gian của nến bằng <code>showTime: true</code>, viết như crosshair viết. Hình chữ nhật có tám tay nắm: mỗi góc một cái và giữa mỗi cạnh một cái, kéo cạnh đó riêng. Fibonacci retracement và Fibonacci mở rộng vẽ một đường đứt nét qua các điểm của nó (<code>trendLine</code>, bật sẵn) và vẽ mọi mức bằng màu của hình vẽ với <code>oneColor</code>. Nhấp vào chữ cũng chọn được đường hoặc hình chữ nhật đó. Fibonacci retracement đặt mức 0 ở nơi nhịp giá kết thúc, tức điểm thứ hai, nên 38.2% là mức giá trả lại 38.2% của nhịp đó; <code>reversed: true</code> đo từ điểm thứ nhất. Các mức của retracement và extension nằm giữa các điểm của chúng, trừ khi đặt <code>extendLeft</code> hoặc <code>extendRight</code>, và mỗi nhãn nằm cạnh đầu đường của nó. Parallel channel có đường giữa, trừ khi đặt <code>middleLine: false</code>. Giá của horizontal line và thời gian của vertical line được gắn tag trên hai trục, dù có đang được chọn hay không. Drawing đã lưu trước khi các mặc định này thay đổi được nạp lại đúng như lúc vẽ.
</p>

<h2 id="look">Hình vẽ trông thế nào</h2>
<p>
  Mọi công cụ được vẽ theo cùng một cách:
</p>
<ul>
  <li>Tay nắm của hình vẽ đang được chọn là các vòng tròn mang màu của hình, tô bằng màu nền của biểu đồ (khóa kiểu <code>drawings.handleColor</code> tô chúng bằng màu của bạn), lớn hơn nét một bậc: rộng 9 px với nét 1 px, lớn hơn với nét dày hơn. Tay nắm dưới con trỏ to lên, còn tay nắm đang kéo được tô kín bằng màu đó. Chỉ hình vẽ mà một lần kéo sẽ đổi dạng mới hiện vòng tròn; các hình khác trong vùng chọn, và hình vẽ đã khóa, hiện chấm nhỏ.</li>
  <li>Hình vẽ dưới con trỏ sáng lên một chút, để thấy rõ cú nhấp sẽ chọn hình nào.</li>
  <li>Trong lúc vẽ, các điểm đã đặt hiện thành tay nắm.</li>
  <li>Gạch và chấm lớn theo độ dày nét, chấm thì tròn, và hai đầu của nét liền được bo tròn. Đầu mũi tên cũng lớn theo nét.</li>
  <li>Màu nền là màu của nét, pha nhạt, trừ khi được đặt riêng: hình vẽ đổi sang đỏ thì tô đỏ. Nhãn trên thẻ có màu được viết bằng đen hoặc trắng, màu nào dễ đọc hơn; hộp thống kê dùng màu bề mặt và màu chữ của chính biểu đồ, ở cả theme sáng lẫn tối; chữ mang màu của hình vẽ được làm đậm hơn ở chỗ nó khó đọc trên nền sáng.</li>
  <li>Các đường chính của một công cụ theo kiểu nét của nó; lưới, đường dẫn và các góc phụ dày 1 px và nhạt hơn. Một mức, một góc hay một phần chia mà nhãn sẽ che nhãn khác thì được để trống nhãn, nhưng không bao giờ là mức 0 và 1. Phần trăm được viết số tròn khi tròn (50%, không phải 50.0%), và mỗi tỷ lệ Fibonacci vẽ cùng các tỷ lệ khác có màu riêng.</li>
  <li>Tăng và giảm (một vùng giá, mục tiêu và điểm cắt lỗ của Vị thế Long/Short, kết quả của một dự báo) dùng màu lãi và màu lỗ của theme (các khóa kiểu <code>trading.profitColor</code> và <code>trading.lossColor</code>), không có chúng thì là xanh và đỏ.</li>
  <li>Một chữ, một biểu tượng hay một dấu mũi tên không hiện tay nắm, vì tay nắm sẽ đè lên chữ hay hình của nó: khi được chọn, nó được đóng khung, và nhấn vào bất cứ đâu trên nó là di chuyển được.</li>
</ul>

<h2>Cài đặt</h2>
<p>
  Ngoài kiểu (màu, độ dày nét, kiểu nét, màu nền, chữ), một công cụ có thể có
  cài đặt riêng: các mức Fibonacci, kéo dài đường sang trái hoặc phải, nhãn,
  nền, biểu tượng, cấp sóng. Hộp thoại cài đặt của widget được dựng từ các cài
  đặt này.
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // công cụ có những cài đặt nào
chart.getDrawingOptions(id)                   // giá trị của nó, đã điền mặc định
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// nhiều thay đổi gộp thành một bước hoàn tác
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// hộp thoại xem trước thay đổi: một bước hoàn tác, hoặc khôi phục khi huỷ
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// giá trị ban đầu của mỗi Fibonacci thoái lui mới
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>Cài đặt lấy từ bố cục đã lưu hoặc từ hình vẽ được dán vào sẽ được kiểm tra theo công cụ; giá trị mà công cụ không nhận sẽ bị bỏ.</p>

<h3 id="settings-dialog">Hộp thoại cài đặt</h3>
<p>
  Trong widget, bấm đúp vào một hình vẽ (hoặc chọn Cài đặt trên thanh công cụ của nó, trong menu của nó hay trong cây
  đối tượng) sẽ mở cài đặt của nó theo từng tab. <strong>Kiểu</strong>: đường (màu, độ dày, kiểu nét) trên một hàng,
  hai đầu đường, màu nền, rồi các công tắc và lựa chọn của công cụ, và các mức của nó. <strong>Chữ</strong>, với các
  công cụ có chữ: nội dung chữ và cỡ chữ. <strong>Toạ độ</strong>: giá, ngày và giờ của từng điểm, theo múi giờ của
  biểu đồ. <strong>Hiển thị</strong>: các khung thời gian mà hình vẽ hiện trên đó. Mọi thay đổi hiện ra ngay;
  <strong>OK</strong> giữ chúng lại thành một bước hoàn tác, <strong>Huỷ</strong> (hoặc Escape) trả hình vẽ về như cũ.
  Menu <strong>Mẫu</strong> áp dụng hoặc xoá một mẫu đã lưu, lưu giao diện của hình vẽ thành một mẫu, lưu các cài đặt
  làm mặc định của công cụ, và đặt lại chúng.
</p>

<h3 id="drawing-intervals">Chỉ hiện trên một số khung thời gian</h3>
<p>
  Có thể giới hạn một hình vẽ trong một số khung thời gian, theo cùng các quy tắc như với chỉ báo: tắt cả một loại khung
  (<code>minutes: false</code>), hoặc chỉ bật trong một khoảng của loại đó (<code>hours: [1, 4]</code>). Trên các khung
  khác, hình vẽ không được vẽ, không bấm trúng được và không được chọn. Các quy tắc được lưu cùng bố cục.
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // không hiện trên biểu đồ phút
chart.isDrawingShown(id)                                    // false trên biểu đồ 5m
chart.updateDrawing(id, { intervals: null })                // lại hiện trên mọi khung

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>Với Chart dùng trực tiếp, không có luồng dữ liệu, hãy cho biết khung thời gian của nến bằng <code>chart.setDataTimeframe('5m')</code>.</p>

<h3 id="line-stats">Hai đầu, điểm giữa và thống kê của một đường</h3>
<p>
  Trend line, tia và đường kéo dài có thể hiện điểm giữa, và thống kê giữa hai điểm của chúng: mức thay đổi giá và
  phần trăm của nó, số nến và khoảng thời gian giữa hai điểm, góc. Thống kê hiện khi đường đang được chọn, hoặc hiện
  luôn, cạnh đầu phải, điểm giữa hoặc đầu trái của đường. Hai đầu của trend line có thể là mũi tên. Tất cả đều tắt
  cho đến khi được bật.
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // đường xu hướng: leftEnd, rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">Thanh công cụ trên hình được chọn</h2>
<p>
  Trong widget, bấm vào một hình vẽ là một thanh công cụ nhỏ hiện ngay trên nó: màu, độ dày và kiểu nét, rồi đến cài đặt, cảnh báo trên đường của nó, khoá, menu đầy đủ của hình (giống chuột phải) và xoá. Khi chọn nhiều hình, thanh nằm trên tất cả và thay đổi áp cho từng hình. Nó đi theo hình khi hình được kéo, khi cuộn hay zoom, tạm ẩn khi đang bật công cụ vẽ, cục tẩy hoặc zoom vùng, và là một điểm dừng Tab, di chuyển bằng phím mũi tên.
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

<h2>Vị thế Long/Short</h2>
<p>
  <code>riskReward</code>: kéo từ điểm vào lệnh đến điểm cắt lỗ. Mục tiêu nằm cách
  đó theo tỷ lệ lời:lỗ, và điểm kéo của nó dùng để đổi tỷ lệ này. Từ vốn tài
  khoản và mức rủi ro (một phần trăm của vốn, hoặc một số tiền), công cụ tính ra
  khối lượng, và hiện giá, khoảng cách cùng lãi hoặc lỗ của từng đường.
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>Cảnh báo trên hình vẽ</h2>
<p>
  Một cảnh báo có thể bám theo trend line, tia, đường kéo dài hoặc đường
  ngang, hay các đường của kênh song song: nó kích hoạt khi giá cắt qua đường
  tại giá trị của đường ở nến mới nhất, đúng như được vẽ trên biểu đồ (thẳng
  qua các nến, và theo giá logarit trên thang logarit).
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>Cảnh báo đi cùng hình vẽ của nó, quay lại cùng hình vẽ khi hoàn tác, và được lưu cùng bố cục.</p>

<h2>Thứ tự và nhóm</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // một bước hoàn tác
chart.removeAll('drawings')         // mọi hình vẽ; 'indicators', hoặc 'all' cho cả hai: một bước hoàn tác, hình vẽ đã khoá thì giữ lại
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // những hình đang chọn (Ctrl+C)
chart.pasteDrawings()                // Ctrl+V, tại đây hoặc trên biểu đồ khác trong trang
chart.canPasteDrawings()             // có gì để dán hay không`}</code></pre>
<p>Bấm vào một hình vẽ trong nhóm sẽ chọn cả nhóm.</p>
<p>Trong cây đối tượng của widget, các hình vẽ được liệt kê theo thứ tự chồng lớp, hình nằm trên cùng đứng đầu. Nhấp vào tên một hình vẽ để chọn nó, nhấp đúp để đổi tên. Hàng của nó có nút nhân bản, và tay kéo của nó kéo hình vẽ tới vị trí của một hàng khác; phím mũi tên trên tay kéo dời nó lên hoặc xuống một hàng, trong danh sách và trong thứ tự lớp cùng lúc.</p>

<h2>Tẩy, phóng to và nam châm</h2>
<pre><code>{`chart.setEraserMode(true)          // mỗi lần bấm vào một hình vẽ sẽ xoá nó, cho đến khi nhấn Escape
chart.setZoomAreaMode(true)        // lần kéo tiếp theo phóng to vào các nến trong khung của nó
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>Nam châm yếu hút một điểm vào giá mở cửa, cao, thấp hoặc đóng cửa của nến khi con trỏ ở gần một trong số đó; nam châm mạnh thì luôn làm vậy. Trong widget, nam châm tắt khi bắt đầu: hình vẽ nằm đúng chỗ được đặt cho đến khi bật nút nam châm.</p>

<h2 id="cursors">Con trỏ, và dải của hình vẽ trên trục</h2>
<pre><code>{`new Chart(el, { crosshair: { mode: 'magnet', cursor: 'dot' } })
chart.setCrosshairCursor('arrow')        // 'cross' | 'dot' | 'arrow'
chart.on('crosshairCursorChange', (e) => e.payload)  // { cursor }
widget.setCrosshairCursor('dot')         // the widget's, a Chart Setting
chart.setDrawingAxisSpansVisible(false)  // or features: { drawingAxisSpans: false }`}</code></pre>
<p><strong>Cross</strong> vẽ hai đường crosshair, con trỏ chuột là dấu chữ thập. <strong>Dot</strong> vẽ hai đường đó, con trỏ là một chấm nhỏ theo màu crosshair. <strong>Arrow</strong> không vẽ đường nào và giữ con trỏ mũi tên, nhưng giá và thời gian vẫn chạy theo con trỏ trên hai trục. Trong widget, nút con trỏ ở đầu thanh công cụ vẽ mở menu ba kiểu này, và Chart Settings cũng có dòng chọn. Kiểu con trỏ là lựa chọn riêng của người xem: <code>persistSettings</code> giữ nó, còn bố cục hay link chia sẻ không bao giờ mang theo.</p>
<p>Khi một hình vẽ đang được chọn, kéo hoặc đang vẽ, trục giá được tô từ giá thấp nhất tới giá cao nhất của nó, trục thời gian từ thời điểm đầu tới thời điểm cuối, và mỗi đầu có nhãn theo màu của hình. Đường ngang chỉ đánh dấu giá, đường dọc chỉ đánh dấu thời gian; hình gắn theo màn hình thì không đánh dấu gì. Eraser làm sáng hình vẽ mà cú bấm sẽ xoá.</p>

<h2 id="editing">Sửa bằng chuột và bàn phím</h2>
<ul>
  <li>Nam châm cũng tác dụng khi kéo một tay nắm hay di chuyển cả hình vẽ: điểm gần chỗ nắm nhất rơi vào một mức giá, các điểm còn lại giữ nguyên khoảng cách với nó. Nam châm yếu với tới 50 px.</li>
  <li>Giữ <kbd>Ctrl</kbd>/<kbd>⌘</kbd> khi vẽ hoặc kéo để lật nam châm trong lúc đó: đang tắt thì bật, đang bật thì tắt.</li>
  <li>Giữ <kbd>Shift</kbd> khi vẽ hoặc kéo tay nắm để đường nằm ngang, thẳng đứng hoặc nghiêng 45° trên màn hình. Trên vùng trống của biểu đồ, <kbd>Shift</kbd> + kéo vẫn là đo. Điều này áp dụng cho đường thẳng và đường nhiều điểm; hình chữ nhật, độ rộng kênh hay điểm của pitchfork vẫn tự do.</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> di chuyển các hình vẽ đang chọn một nến sang ngang hoặc một pixel lên xuống; kèm <kbd>Shift</kbd> thì mười. Nhấn liền nhiều lần chỉ là một bước hoàn tác, và hình vẽ đã khóa không di chuyển.</li>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + kéo trên một hình vẽ kéo ra một bản sao (của cả vùng chọn nếu hình vẽ nằm trong đó), một bước hoàn tác. <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + nhấp vẫn thêm nó vào vùng chọn hoặc bỏ ra, và <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + kéo trên vùng trống vẫn vẽ khung chọn. Trên tay nắm của hình vẽ đang chọn, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + kéo thì nắn lại hình đó với nam châm được lật.</li>
  <li><kbd>Escape</kbd> khi đang kéo một hình vẽ thì hủy thao tác kéo: hình đang di chuyển hoặc đang nắn quay về chỗ cũ, bản sao đang kéo ra thì bị bỏ, không để lại bước hoàn tác nào.</li>
</ul>

<h2>Bàn phím</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> hoàn tác, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> hoặc <kbd>Ctrl</kbd> + <kbd>Y</kbd> làm lại.</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> sao chép và dán hình vẽ, <kbd>Ctrl</kbd> + <kbd>D</kbd> nhân bản, <kbd>Delete</kbd> xoá.</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> nhóm các hình vẽ đang chọn, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> bỏ nhóm.</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> đưa lên / xuống một lớp; kèm <kbd>Shift</kbd> thì đưa lên trên cùng / xuống dưới cùng.</li>
  <li><kbd>Enter</kbd> kết thúc đường nhiều điểm; <kbd>Escape</kbd> thoát khỏi công cụ, tẩy hoặc vùng chọn.</li>
</ul>

<h2>Sự kiện</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id, x, y }: where on the chart it was
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } hoặc { zoomArea }`}</code></pre>
<p>Hoàn tác và làm lại phát ra <code>drawingCreate</code>, <code>drawingRemove</code> và <code>drawingUpdate</code> cho các hình vẽ mà chúng khôi phục, xoá đi hoặc thay đổi.</p>

<h2>Danh mục</h2>

<h3>Đường</h3>
<ul>
  <li><code>trendLine</code> — kéo dài sang trái hoặc phải khi cần.</li>
  <li><code>ray</code>, <code>extendedLine</code></li>
  <li><code>horizontalLine</code>, <code>horizontalRay</code> (về phía tương lai tính từ điểm của nó), <code>verticalLine</code>, <code>crossLine</code></li>
  <li><code>infoLine</code> — kèm hộp thay đổi giá, số nến, thời gian và góc.</li>
  <li><code>trendAngle</code> — kèm góc hiển thị trên màn hình.</li>
</ul>

<h3>Kênh</h3>
<ul>
  <li><code>parallelChannel</code> — đường qua hai điểm đầu được dời thẳng lên hoặc xuống tới điểm thứ ba (đúng như cảnh báo của nó đọc), kèm đường giữa tuỳ chọn, kéo dài được về cả hai phía.</li>
  <li><code>regressionChannel</code> — đường bình phương tối thiểu qua giá đóng cửa giữa hai điểm của nó, với dải cách hai độ lệch chuẩn ở mỗi bên; các điểm quyết định những nến được tính, và tay nắm nằm trên đường.</li>
  <li><code>disjointChannel</code> — hai đường trên cùng các bar, nghiêng ngược chiều nhau: đường thứ nhất qua hai điểm đầu, đường thứ hai đi qua giá của điểm thứ ba ở chính giữa. Một cái nêm hẹp dần hoặc mở rộng; kéo dài được về hai phía và trả cả hai giá cho cảnh báo.</li>
  <li><code>flatTopBottom</code> — một đường dốc qua hai điểm và một đường nằm ngang tại giá của điểm thứ ba, trên cùng các bar: đỉnh phẳng trên các đáy tăng dần, hoặc đáy phẳng dưới các đỉnh giảm dần.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — các mức, giá và phần trăm có thể sửa, nhãn bên trái hoặc phải, nền, đảo chiều.</li>
  <li><code>fibChannel</code>, <code>fibSpeedResistanceFan</code> — các tia của quạt mang màu của mức tương ứng, các tia thời gian là nét đứt, cả hai đều có nhãn.</li>
  <li><code>fibTimeZones</code> — tính từ điểm bắt đầu của vùng (0) trở đi; tay nắm của nó, và của <code>cyclicLines</code>, nằm trên đường của chúng, ở giữa chiều cao vùng vẽ.</li>
  <li><code>fibArcs</code> — các cung quanh điểm bắt đầu của một nhịp, nửa hoặc cả vòng tròn.</li>
  <li><code>fibCircles</code> — các vòng tròn ở bội số Fibonacci của một bán kính.</li>
  <li><code>fibSpiral</code> — xoắn ốc vàng từ tâm của nó.</li>
  <li><code>fibWedge</code> — các cung giữa hai đường xuất phát từ một đỉnh.</li>
</ul>

<h3>Gann và Pitchfork</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code> — đường B–C nối các nhánh, và phần giữa các nhánh được tô màu nhạt đến mép vùng vẽ.</li>
  <li><code>pitchfan</code> — các tia từ một điểm pivot đi qua các mức nằm giữa hai điểm.</li>
  <li><code>gannFan</code> — mỗi góc có nhãn ở chỗ nó rời vùng vẽ; <code>gannBox</code> — các phần chia có nhãn theo giá và theo thời gian; <code>gannSquare</code></li>
</ul>

<h3>Hình</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code> — tay nắm của hình elip nằm trên chính đường cong, mỗi tay nắm kéo một cạnh.</li>
  <li><code>rotatedRectangle</code> — hình chữ nhật ở góc bất kỳ: một cạnh qua hai điểm đầu, bề sâu bằng khoảng cách từ điểm thứ ba tới cạnh đó. Nó vuông góc trên màn hình, nên cạnh đối diện đi theo thang đo khi chart được zoom.</li>
  <li><code>polyline</code> — một hình khép kín, mỗi lần bấm một điểm.</li>
  <li><code>curve</code> — uốn cong qua điểm thứ ba; <code>arc</code> — một cung tròn đi qua ba điểm.</li>
</ul>

<h3>Bút vẽ</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — vẽ tay; khi được chọn, nét vẽ có khung như một đoạn text, và nhấn vào đâu trên nó cũng kéo đi được.</li>
  <li><code>path</code> — một đường đi qua các điểm, có mũi tên ở cuối.</li>
</ul>

<h3>Mô hình</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — kèm các tỷ lệ của chúng. Tên điểm nằm bên ngoài điểm, tránh các tay nắm; mỗi tỷ lệ nằm trên đường dẫn của nó, hoặc ngay cạnh đường khi chỗ trên đường đã kín, không bao giờ che một tên, một tay nắm hay một tỷ lệ khác.</li>
  <li><code>headAndShoulders</code> — kèm đường viền cổ, các đỉnh có tên ghi phía trên, rút gọn thành LS, H và RS khi tên đầy đủ chạm nhau.</li>
</ul>

<h3>Sóng Elliott</h3>
<ul>
  <li><code>elliottWave</code> (1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — nhãn theo kiểu của cấp sóng: một chữ số trong vòng tròn, (1), 1 hoặc i, nằm bên ngoài các điểm.</li>
</ul>

<h3>Chu kỳ</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>Đo lường</h3>
<ul>
  <li><code>priceRange</code> — một hộp mang màu tăng hoặc màu giảm (hoặc màu bạn chọn cho nó), có mũi tên lên hoặc xuống dọc theo nó và mức thay đổi trên một thẻ ngay sau đầu của nó.</li>
  <li><code>dateRange</code> — các nến giữa hai thời điểm, một mũi tên chạy ngang qua, số nến và thời gian trên một thẻ; tay nắm của nó ở hai đầu mũi tên, giữa chiều cao vùng vẽ.</li>
  <li><code>dateAndPriceRange</code> — cả hai cùng lúc, mỗi phép đo một mũi tên và khối lượng ở bên trong; <code>measure</code> — mức thay đổi và số nến giữa hai điểm.</li>
</ul>

<h3>Chú thích và đánh dấu</h3>
<ul>
  <li><code>text</code>, <code>note</code> (một chiếc ghim kèm chữ), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (lên, xuống, trái hoặc phải, kèm nhãn), <code>flag</code>, <code>icon</code> (ngôi sao, trái tim, dấu tích, dấu chéo, hình tròn, tam giác, tia sét)</li>
  <li><code>signpost</code> (chữ trên tấm biển ở đầu một cột cắm vào nến), <code>balloon</code> (chữ trong bóng chú thích chỉ vào một nến)</li>
  <li><code>anchoredText</code>, <code>anchoredNote</code>: gắn vào một chỗ trên màn hình, chúng đứng yên khi biểu đồ cuộn, phóng to hay đổi mã. Điểm của chúng là tỉ lệ trên vùng vẽ (<code>{'{'} time: 0.5, price: 0.25 {'}'}</code> là giữa chiều ngang, một phần tư từ trên xuống), và cài đặt không có tab Tọa độ.</li>
</ul>

<h3>Dự báo</h3>
<ul>
  <li><code>riskReward</code> — Vị thế Long/Short (ở trên).</li>
  <li><code>forecast</code> — chuyển sang màu tăng khi giá chạm mục tiêu, sang màu giảm khi hết thời gian trước đó.</li>
  <li><code>projection</code> — một nhịp được chiếu tiếp từ điểm thứ ba.</li>
  <li><code>barsPattern</code> — bản sao của một số nến, dưới dạng nến, đường hoặc cao-thấp, đảo chiều thời gian hoặc lật ngược; các nến được sao chép nằm dưới một dải nhạt.</li>
  <li><code>anchoredVWAP</code> — tay nắm của nó nằm trên VWAP, tại chỗ đường bắt đầu; <code>volumeProfileRange</code> — khối lượng tại mỗi mức giá dưới dạng histogram trong hộp của vùng, vùng giá trị (70% khối lượng) được tô bóng, điểm kiểm soát (POC) vẽ ngang qua; tay nắm của nó ở các góc hộp.</li>
</ul>

<h2>Lưu</h2>
<pre><code>{`const json = chart.saveState()   // hình vẽ cùng cài đặt và nhóm của chúng, chỉ báo, cảnh báo…
chart.loadState(json)            // kiểm tra từng hình vẽ; hình vẽ sai định dạng bị bỏ`}</code></pre>

<h2>Công cụ của riêng bạn</h2>
<p>
  Một công cụ là một <code>DrawingPlugin</code> được đăng ký bằng
  <code>chart.registerDrawingTool(plugin)</code>. Descriptor của nó liệt kê các cài đặt
  (<code>options</code>), cách vẽ (<code>creation</code>), và việc có màu nền hay chữ
  hay không; nó có thể cho biết giá của các đường (<code>priceAt</code>, dùng cho
  cảnh báo), các điểm kéo di chuyển không phải điểm neo
  (<code>moveHandle</code>), và nhận các nến của biểu đồ
  (<code>setDataGetter</code>). Xem <a href={href('/docs/plugins')}>Plugin</a>.
</p>
