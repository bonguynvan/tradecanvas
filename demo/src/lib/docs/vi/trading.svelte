<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Lớp phủ giao dịch — Tài liệu TradeCanvas</title>
  <meta name="description" content="Hiển thị vị thế, lệnh, điểm đánh dấu tín hiệu và vùng giao dịch ngay trên biểu đồ với lớp phủ giao dịch của TradeCanvas." />
</svelte:head>

<h1>Lớp phủ giao dịch</h1>
<p>
  Hiển thị vị thế, lệnh, điểm đánh dấu tín hiệu và vùng giao dịch ngay trên biểu đồ.
  Được thiết kế để tích hợp với cả quy trình giao dịch thủ công lẫn giao dịch thuật toán.
</p>

<h2>Tắt giao dịch</h2>
<p>
  Lớp phủ giao dịch bật sẵn theo mặc định; menu đặt lệnh khi bấm chuột phải thì không (kể từ 1.3).
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  Khi không bật menu này, thao tác bấm chuột phải mặc định của trình duyệt vẫn hoạt động bình thường trên biểu đồ.
</p>

<h2>Vị thế</h2>
<pre><code>{`chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
}])`}</code></pre>

<p>
  Mỗi đường có một nhãn ở đầu bên phải, sát trục giá. Nhãn của giá vào lệnh ghi khối lượng, chiều và
  lãi/lỗ đang mở, rồi đến <strong>⇅</strong> và <strong>×</strong>; nhãn của dừng lỗ và chốt lời ghi vị thế sẽ lãi
  hay lỗ bao nhiêu nếu giá chạm tới đó. Mọi mức giá cũng hiện trên trục. Các nhãn có thể che nhau thì đứng cạnh nhau,
  và nhãn trên trục tự giãn ra. Kéo dừng lỗ hay chốt lời bằng chính đường hoặc nhãn của nó.
</p>

<h2>Lệnh</h2>
<pre><code>{`chart.setOrders([{
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
  stopLoss: 66_000,      // dotted until it fills
  takeProfit: 64_500,
}])`}</code></pre>

<p>
  Nhãn của lệnh ghi khối lượng và loại lệnh (<code>0.25</code>, <code>Sell limit</code>), rồi đến
  <strong>×</strong> để huỷ; nhãn trên trục giá mang giá, viết theo đúng cách trục viết giá. Lệnh mở kèm dừng lỗ
  và chốt lời hiện chúng bằng đường chấm, cùng số lãi/lỗ tại đó. Kéo đường hoặc nhãn để sửa lệnh; đăng ký nghe thay
  đổi qua <code>chart.on('orderModify', ...)</code>.
</p>

<h2>Khớp lệnh thật (kết nối một adapter)</h2>
<p>
  Mặc định biểu đồ chỉ <em>phát ra</em> ý định đặt lệnh/vị thế (<code>orderPlace</code>,
  <code>orderModify</code>, <code>orderCancel</code>, <code>positionModify</code>,
  <code>positionClose</code>) cho backend của bạn — nó không bao giờ tự giao dịch. Khi kết nối một
  <code>ExecutionAdapter</code>, biểu đồ sẽ chuyển các ý định đó vào
  adapter và hiển thị các lệnh/vị thế chính thức mà adapter phát lại (adapter là
  nguồn dữ liệu chuẩn duy nhất).
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))
// chart.disconnectExecution()`}</code></pre>
<p>
  Cài đặt <code>ExecutionAdapter</code> (nó tương tự <code>DataAdapter</code>) để nối với một
  broker / OMS thật: <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, cùng các sự kiện <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code>.
  <code>PaperExecutionAdapter</code> là môi trường khớp lệnh ảo dùng cho demo và test.
</p>

<h2>Thao tác với lệnh và vị thế ngay trên biểu đồ</h2>
<p>
  Đường lệnh và đường vị thế có các nút nhỏ ở đầu bên phải: <strong>×</strong>
  huỷ lệnh hoặc đóng vị thế, <strong>⇅</strong> đảo chiều vị thế, còn dấu
  × trên đường dừng lỗ hoặc chốt lời sẽ gỡ mức đó. Các nút này phát ra cùng những ý định như
  API (<code>orderCancel</code>, <code>positionClose</code>, <code>positionReverse</code>,
  <code>positionModify</code> với <code>null</code>), nên adapter đã kết nối sẽ xử lý chúng,
  còn ứng dụng không kết nối adapter thì nhận các sự kiện. Nút chỉ thực hiện khi bạn
  nhả ra ngay trên nút: nhấn rồi trượt ra ngoài thì không có tác dụng gì. Tắt bất kỳ nút nào bằng
  <code>lineButtons</code> trong <code>setTradingConfig</code>.
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop`}</code></pre>
<p>
  Adapter nào đảo chiều được trong một bước thì cài đặt <code>reversePosition</code>;
  nếu không có, biểu đồ sẽ đóng vị thế rồi gửi một lệnh thị trường theo chiều ngược lại.
  Lệnh nhận <code>stopLoss</code>, <code>takeProfit</code> và
  <code>timeInForce</code> (<code>'gtc'</code> hoặc <code>'day'</code>); các giá trị này được chuyển sang
  vị thế mà lệnh mở ra.
</p>
<p>
  <strong>Dành cho người viết adapter:</strong> trong <code>PositionModifyIntent</code>,
  <code>stopLoss: null</code> (hoặc <code>takeProfit: null</code>) nghĩa là gỡ mức đó, còn
  khi thiếu trường thì giữ nguyên. Code viết kiểu
  <code>intent.stopLoss ?? position.stopLoss</code> sẽ giữ lại mức dừng lỗ mà người dùng đã gỡ.
</p>

<h2>Lệnh khớp trên biểu đồ</h2>
<p>
  Mỗi lần khớp hiện thành một dấu nhỏ trên nến của nó: tô đặc khi mở vị thế,
  để rỗng khi đóng vị thế. Biểu đồ ghi lại các lần khớp mà adapter báo về và
  phát ra <code>executionFill</code> kèm lý do khớp (<code>'order'</code>,
  <code>'close'</code>, <code>'reverse'</code>, <code>'stopLoss'</code>,
  <code>'takeProfit'</code>) cùng khoản lãi/lỗ đã chốt.
</p>
<pre><code>{`chart.on('executionFill', (e) => {
  const { side, price, quantity, reason, pnl } = e.payload
})

chart.addFill({ orderId: 'o-7', side: 'buy', price: 64_150, quantity: 1, time: Date.now() })
chart.getFills()        // the latest 1000
chart.getRealisedPnl()  // every fill's P&L since the last clearFills
chart.clearFills()
chart.setTradingConfig({ fillMarks: false })  // no marks`}</code></pre>

<h2>Menu chuột phải và nút “+” cạnh trục giá</h2>
<p>
  Bấm chuột phải trên biểu đồ sẽ phát ra <code>chartContextMenu</code> kèm vùng được
  bấm (<code>'plot'</code>, <code>'pane'</code>, <code>'priceAxis'</code> hoặc
  <code>'timeAxis'</code>) cùng giá và thời gian tại đó. Với
  <code>features.priceAxisAddButton</code>, một nút “+” chạy theo con trỏ chữ thập dọc trục
  giá; bấm vào nó sẽ phát ra <code>priceAxisAdd</code> kèm mức giá đó.
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget dựng các menu của nó trên những sự kiện này. Bấm chuột phải vào vùng biểu đồ để
  đặt cảnh báo, mua và bán tại mức giá đó (lệnh giới hạn khi mức giá nằm ở phía lệnh phải chờ
  so với giá thị trường, lệnh dừng khi nằm ở phía còn lại), mở phiếu đặt lệnh và vẽ đường ngang;
  tiếp theo là đặt lại khung nhìn, dán các hình vẽ đã sao chép, ẩn hoặc xoá hình vẽ, xoá chỉ báo
  (phần so sánh với mã khác vẫn được giữ), xuất dữ liệu và mở bảng cài đặt.
</p>
<p>
  Bấm chuột phải vào trục giá để đặt lại thang, bật tự co giãn thang, dùng thang đảo ngược hay
  thang bên trái, chọn một trong bốn chế độ (thường, logarit, phần trăm, quy về 100), chỉnh nhãn
  trên trục và các đường chạy ngang biểu đồ trong hai menu con, đặt cảnh báo tại mức giá đó, và
  mở bảng cài đặt ở tab Thang đo. Trục thời gian có mục đặt lại, đi tới ngày và múi giờ.
</p>
<p>
  Khi phím tắt của widget đang bật, mục tương ứng hiện phím đó: <kbd>Alt</kbd> + <kbd>R</kbd>
  đặt lại khung nhìn, <kbd>Alt</kbd> + <kbd>I</kbd> đảo ngược thang, <kbd>Alt</kbd> +
  <kbd>G</kbd> đi tới ngày. Menu con mở khi bấm vào, khi nhấn <kbd>Enter</kbd> hoặc
  <kbd>→</kbd>, hay khi con trỏ dừng trên nó; <kbd>←</kbd> hoặc <kbd>Escape</kbd> để quay lại.
  Trên điện thoại, nơi menu mở từ dưới lên, dòng đầu tiên của menu con đưa bạn quay lại. Thêm
  mục của riêng bạn bằng <code>chartMenuItems</code> (xem <a href={href('/docs/api')}>Tham chiếu API</a>).
</p>

<h2>Phiếu đặt lệnh và bảng tài khoản (ChartWidget)</h2>
<p>
  Mục <strong>Tài khoản</strong> trong menu <strong>Giao dịch</strong> của thanh công cụ mở bảng tài khoản bên dưới biểu đồ: các vị thế đang mở
  kèm lãi/lỗ, các lệnh đang chờ, và các lần khớp từ trước đến giờ kèm lãi/lỗ (P&amp;L)
  đã chốt. Mỗi dòng có thể đóng, đảo chiều hoặc huỷ. <strong>Lệnh mới</strong> mở
  phiếu đặt lệnh: mua hoặc bán, lệnh thị trường, giới hạn hoặc dừng, khối lượng, giá, mức
  dừng lỗ và chốt lời (tuỳ chọn), và hiệu lực của lệnh. Phiếu kiểm tra lệnh ngay khi bạn nhập
  (mua giới hạn phải nằm dưới giá thị trường, dừng lỗ phải nằm ở phía lỗ so với điểm vào…)
  và hiện tỷ lệ lời:lỗ. Đặt lệnh sẽ gửi đi một ý định <code>orderPlace</code>.
  Khi đã đặt thị trường (<code>chart.setMarket</code>), phiếu còn giữ các mức giá theo bước giá
  của thị trường và giá đặt lệnh trong khoảng giá trần, giá sàn của ngày, bắt đầu với một lô, và trên một
  lô thì chỉ nhận lô chẵn (số cổ phiếu ít hơn là một lệnh lô lẻ riêng).
</p>
<p>
  Phiếu ghi mã cạnh tiêu đề. Loại lệnh và hiệu lực là các lựa chọn trên một hàng (phím mũi tên chuyển
  giữa chúng); nút − và + đổi khối lượng theo lô và giá theo bước giá của thị trường, còn giá lấy từ biểu đồ được làm
  tròn theo bước đó. Dừng lỗ hay chốt lời khi bật sẽ ghi cách điểm vào bao nhiêu phần trăm và lãi hay lỗ bao nhiêu;
  bên dưới, một tờ biên lai tóm tắt lệnh: giá trị, rủi ro, lợi nhuận và lời trên lỗ. Đổi giữa mua và bán vẫn giữ lệnh
  chờ ở chỗ đã đặt (mua dừng trên giá thị trường thành bán giới hạn), và nút đặt lệnh mang màu của chiều mua hay bán.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.`}</code></pre>
<p>
  Các dấu khớp lệnh gắn với mã đang hiện trên biểu đồ: đổi mã trong widget thì mã
  tiếp theo bắt đầu mà không có dấu nào.
</p>

<h2>Kéo để tạo lệnh</h2>
<p>
  Tạo một đường lệnh kéo được, kéo nó tới một mức giá rồi xác nhận — loại lệnh
  (limit hay stop) được suy ra từ vị trí bạn thả so với giá hiện tại. Dùng cùng
  <code>connectExecution</code> để bản nháp đã xác nhận được khớp ngay.
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>Lệnh bracket (kéo để đặt)</h2>
<p>
  Tạo một lệnh bracket kéo được — điểm vào lệnh cùng vùng dừng lỗ và chốt lời — rồi
  kéo ba đường để chỉnh điểm vào, mức rủi ro và lợi nhuận. Xác nhận bằng
  <kbd>Enter</kbd> (hoặc nút Đặt lệnh), huỷ bằng <kbd>Esc</kbd>. Trong
  widget, các mũi tên xanh/đỏ trên thanh công cụ tạo một bracket Long/Short. Biểu đồ
  phát ra một sự kiện <code>bracketPlace</code> duy nhất để backend của bạn xử lý —
  nó không bao giờ tự đặt lệnh.
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, riskReward } = e.payload
  // submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

chart.confirmBracket()  // same as Enter
chart.cancelBracket()   // same as Esc`}</code></pre>

<h2>Sổ lệnh (bấm để giao dịch)</h2>
<p>
  Sổ lệnh dạng thang độ sâu thị trường (bật khi cần) hiển thị sổ lệnh thành các hàng giá với
  cột khối lượng bid/ask — bấm vào một ô ask để mua, một ô bid để bán tại mức
  giá đó. Bật bằng <code>depthLadder: true</code> và cấp dữ liệu sổ lệnh qua
  <code>widget.setDepth</code>; mỗi cú bấm phát ra ý định <code>orderPlace</code> cho
  OMS của bạn (biểu đồ không bao giờ tự giao dịch). Cùng dữ liệu đó cũng điều khiển
  lớp phủ độ sâu trên biểu đồ.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>Bản đồ nhiệt thanh khoản</h2>
<p>
  Tích luỹ các ảnh chụp sổ lệnh thành một bản đồ nhiệt phía sau nến — mỗi
  ảnh chụp là một dải dọc, trong đó khối lượng lệnh chờ sáng lên theo từng mức giá
  (bid màu xanh lá, ask màu đỏ). Những bức tường thanh khoản tồn tại lâu sẽ nổi bật.
  Bật từ bảng cài đặt (hoặc <code>chart.setDepthHeatmapVisible</code>);
  <code>widget.setDepth</code> ghi lại một ảnh chụp mỗi khi sổ lệnh cập nhật.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

<h2>Điểm đánh dấu tín hiệu</h2>
<p>Các tích hợp bot hoặc giao dịch theo tín hiệu có thể đặt mũi tên chỉ hướng lên lớp phủ.</p>
<pre><code>{`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})

// A marker under the pointer, and a click on one
chart.on('signalMarkerHover', (e) => showNote(e.payload.marker, e.payload.x, e.payload.y))  // marker null: off it
chart.on('signalMarkerClick', (e) => openSignal(e.payload.marker))`}</code></pre>
<p>
  ChartWidget hiện một ghi chú cạnh điểm đánh dấu đang nằm dưới con trỏ: nhãn và nguồn, chiều,
  giá, độ tin cậy và thời gian của nó.
</p>

<h2>Vùng giao dịch</h2>
<p>Hiển thị hình chữ nhật từ điểm vào → điểm ra, tô màu theo lãi/lỗ (P&amp;L) và có huy hiệu hướng lệnh.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`}</code></pre>

<h2>Token cho nhãn vị thế</h2>
<p>
  Viết nhãn vị thế theo ý bạn: <code>positionLabel</code> thay cho chiều và lãi/lỗ đứng sau khối lượng.
  Nó nhận một chuỗi mẫu hoặc một hàm trả về chuỗi.
</p>
<pre><code>{`chart.setTradingConfig({
  positionLabel: '{side} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  Các token có sẵn:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>Mốc màu chuyển sắc theo P&amp;L</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  Số lãi/lỗ trên nhãn và dải màu tới giá hiện tại lấy màu của mốc cao nhất có <code>pnl</code> không vượt
  quá lãi/lỗ của vị thế, tính bằng tiền.
</p>
