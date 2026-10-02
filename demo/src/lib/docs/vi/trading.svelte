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
<pre><code>{`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`}</code></pre>

<h2>Lệnh</h2>
<pre><code>{`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`}</code></pre>

<p>Kéo đường giá để sửa lệnh; đăng ký nghe thay đổi qua <code>chart.on('orderModify', ...)</code>.</p>

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
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()`}</code></pre>

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
})`}</code></pre>

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
  Tuỳ chỉnh nhãn trên biểu đồ cho từng vị thế. <code>positionLabel</code> nhận một
  chuỗi mẫu hoặc một hàm trả về chuỗi.
</p>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  Các token có sẵn:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>Mốc màu chuyển sắc theo P&amp;L</h2>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`}</code></pre>
