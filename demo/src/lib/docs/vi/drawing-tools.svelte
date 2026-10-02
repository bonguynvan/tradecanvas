<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Công cụ vẽ — Tài liệu TradeCanvas</title>
  <meta name="description" content="69 công cụ vẽ có sẵn, mỗi công cụ có cài đặt riêng: công cụ Fibonacci và Gann, sóng Elliott, mô hình harmonic, ghi chú, bút vẽ, Vị thế Long/Short kèm tính khối lượng, cảnh báo trên hình vẽ, nhóm và thứ tự lớp." />
</svelte:head>

<h1>Công cụ vẽ</h1>
<p>
  69 công cụ vẽ có sẵn. Mỗi công cụ đều hút vào các nến nhờ nam châm, hỗ trợ
  hoàn tác và làm lại, có cài đặt riêng, và được lưu cùng bố cục.
</p>

<h2>Vẽ bằng con trỏ</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // các lần bấm tiếp theo vẽ một đường xu hướng
chart.setDrawingTool(null)          // quay về con trỏ
chart.setStayInDrawingMode(true)    // giữ công cụ sau mỗi hình vẽ`}</code></pre>
<p>Một công cụ được vẽ theo một trong ba cách:</p>
<ul>
  <li><b>Bấm</b> — mỗi điểm một lần bấm (hai lần với đường xu hướng, năm lần với mô hình XABCD).</li>
  <li><b>Vẽ tay</b> — nhấn và kéo; <code>brush</code> và <code>highlighter</code>.</li>
  <li><b>Đường nhiều điểm</b> — mỗi điểm một lần bấm, rồi bấm đúp, nhấn <kbd>Enter</kbd> hoặc bấm vào điểm cuối để kết thúc; <code>path</code> và <code>polyline</code>.</li>
</ul>
<p><kbd>Escape</kbd> bỏ hình vẽ đang vẽ dở.</p>

<h2>Thêm hình vẽ từ code</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reverse: true, extendRight: true },
})

chart.autoFib()   // một Fibonacci thoái lui trên con sóng chính đang hiện, hoặc null`}</code></pre>

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

<h2>Vị thế Long/Short</h2>
<p>
  <code>riskReward</code>: kéo từ điểm vào lệnh đến điểm dừng lỗ. Mục tiêu nằm cách
  đó theo tỷ lệ lời:lỗ, và điểm kéo của nó dùng để đổi tỷ lệ này. Từ vốn tài
  khoản và mức rủi ro (một phần trăm của vốn, hoặc một số tiền), công cụ tính ra
  khối lượng, và hiện giá, khoảng cách cùng lãi hoặc lỗ của từng đường.
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>Cảnh báo trên hình vẽ</h2>
<p>
  Một cảnh báo có thể bám theo đường xu hướng, tia, đường kéo dài hoặc đường
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
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // một bước hoàn tác
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)`}</code></pre>
<p>Bấm vào một hình vẽ trong nhóm sẽ chọn cả nhóm.</p>

<h2>Tẩy, phóng to và nam châm</h2>
<pre><code>{`chart.setEraserMode(true)          // mỗi lần bấm vào một hình vẽ sẽ xoá nó, cho đến khi nhấn Escape
chart.setZoomAreaMode(true)        // lần kéo tiếp theo phóng to vào các nến trong khung của nó
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>Nam châm yếu hút một điểm vào giá mở cửa, cao, thấp hoặc đóng cửa của nến khi con trỏ ở gần một trong số đó; nam châm mạnh thì luôn làm vậy.</p>

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
chart.on('drawingDoubleClick', (e) => e.payload)  // { id }
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
  <li><code>parallelChannel</code> — kèm đường giữa tuỳ chọn, kéo dài được về cả hai phía.</li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code>, <code>fibExtension</code> — các mức, giá và phần trăm có thể sửa, nhãn bên trái hoặc phải, nền, đảo chiều.</li>
  <li><code>fibChannel</code>, <code>fibTimeZones</code>, <code>fibSpeedResistanceFan</code></li>
  <li><code>fibArcs</code> — các cung quanh điểm bắt đầu của một nhịp, nửa hoặc cả vòng tròn.</li>
  <li><code>fibCircles</code> — các vòng tròn ở bội số Fibonacci của một bán kính.</li>
  <li><code>fibSpiral</code> — xoắn ốc vàng từ tâm của nó.</li>
  <li><code>fibWedge</code> — các cung giữa hai đường xuất phát từ một đỉnh.</li>
</ul>

<h3>Gann và Pitchfork</h3>
<ul>
  <li><code>pitchfork</code>, <code>schiffPitchfork</code>, <code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — các tia từ một điểm pivot đi qua các mức nằm giữa hai điểm.</li>
  <li><code>gannFan</code>, <code>gannBox</code>, <code>gannSquare</code></li>
</ul>

<h3>Hình</h3>
<ul>
  <li><code>rectangle</code>, <code>circle</code>, <code>ellipse</code>, <code>triangle</code></li>
  <li><code>polyline</code> — một hình khép kín, mỗi lần bấm một điểm.</li>
  <li><code>curve</code> — uốn cong qua điểm thứ ba; <code>arc</code> — một cung tròn đi qua ba điểm.</li>
</ul>

<h3>Bút vẽ</h3>
<ul>
  <li><code>brush</code>, <code>highlighter</code> — vẽ tay.</li>
  <li><code>path</code> — một đường đi qua các điểm, có mũi tên ở cuối.</li>
</ul>

<h3>Mô hình</h3>
<ul>
  <li><code>xabcdPattern</code>, <code>cypherPattern</code>, <code>abcdPattern</code>, <code>threeDrives</code> — kèm các tỷ lệ của chúng.</li>
  <li><code>headAndShoulders</code> — kèm đường viền cổ.</li>
</ul>

<h3>Sóng Elliott</h3>
<ul>
  <li><code>elliottWave</code> (1–5, A–C), <code>elliottImpulse</code>, <code>elliottCorrection</code>, <code>elliottTriangle</code>, <code>elliottDoubleCombo</code>, <code>elliottTripleCombo</code> — nhãn theo kiểu của cấp sóng: ①, (1), 1 hoặc i.</li>
</ul>

<h3>Chu kỳ</h3>
<ul>
  <li><code>cyclicLines</code>, <code>timeCycles</code>, <code>sineLine</code></li>
</ul>

<h3>Đo lường</h3>
<ul>
  <li><code>measure</code>, <code>priceRange</code>, <code>dateRange</code>, <code>dateAndPriceRange</code></li>
</ul>

<h3>Chú thích và đánh dấu</h3>
<ul>
  <li><code>text</code>, <code>note</code> (một chiếc ghim kèm chữ), <code>callout</code>, <code>priceLabel</code></li>
  <li><code>arrow</code>, <code>arrowMark</code> (lên, xuống, trái hoặc phải, kèm nhãn), <code>flag</code>, <code>icon</code> (ngôi sao, trái tim, dấu tích, dấu chéo, hình tròn, tam giác, tia sét)</li>
</ul>

<h3>Dự báo</h3>
<ul>
  <li><code>riskReward</code> — Vị thế Long/Short (ở trên).</li>
  <li><code>forecast</code> — chuyển xanh khi giá chạm mục tiêu, chuyển đỏ khi hết thời gian trước đó.</li>
  <li><code>projection</code> — một nhịp được chiếu tiếp từ điểm thứ ba.</li>
  <li><code>barsPattern</code> — bản sao của một số nến, dưới dạng nến, đường hoặc cao-thấp, đảo chiều thời gian hoặc lật ngược.</li>
  <li><code>anchoredVWAP</code>, <code>volumeProfileRange</code></li>
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
