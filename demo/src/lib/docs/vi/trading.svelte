<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Overlay giao dịch — Tài liệu TradeCanvas</title>
  <meta name="description" content="Vẽ position, order, signal marker và vùng giao dịch ngay trên biểu đồ bằng overlay giao dịch của TradeCanvas." />
</svelte:head>

<h1>Overlay giao dịch</h1>
<p>
  Vẽ position, order, signal marker và vùng giao dịch ngay trên biểu đồ.
  Được thiết kế để tích hợp với cả quy trình giao dịch thủ công lẫn giao dịch thuật toán.
</p>

<h2>Tắt giao dịch</h2>
<p>
  Overlay giao dịch bật mặc định; menu đặt order bằng chuột phải thì không (từ bản 1.3).
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  Khi không có menu này, chuột phải mặc định của trình duyệt hoạt động trên biểu đồ như bình thường.
</p>

<h2>Position</h2>
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
  Mỗi đường có một tag ở đầu bên phải, cạnh trục giá. Tag của entry ghi khối lượng, chiều
  và lãi/lỗ đang mở, rồi đến <strong>⇅</strong> và <strong>×</strong>; tag của stop và của target ghi
  position sẽ lãi hay lỗ bao nhiêu tại đó. Mọi mức giá cũng có trên trục. Các tag sẽ che nhau
  thì nằm cạnh nhau, và các nhãn trên trục tách ra. Kéo stop hoặc target bằng đường hoặc bằng tag của nó.
</p>
<p>
  Position chưa có cắt lỗ hoặc chốt lời có nút <strong>SL</strong> hoặc <strong>TP</strong> trên tag
  của entry. Nhấn nút rồi kéo đường mới tới vị trí cần đặt, hoặc chỉ click để đặt tại vị trí ban đầu. Stop
  bắt đầu cách entry 1% và target ở khoảng cách gấp đôi stop, như bracket, và cả hai bắt đầu
  cách giá hiện tại ít nhất 1%, nên không mức nào bị chạm ngay khi vừa đặt. Thả chuột sẽ gửi
  <code>positionModify</code>, giống như khi kéo stop, nên execution adapter đang kết nối sẽ áp dụng nó.
  <code>lineButtons: {'{'} addStops: false {'}'}</code> bỏ các nút này.
</p>
<p>
  Position, order và các fill của chúng có thể được ẩn, và các đường có thể được khoá. Khi ẩn, không có gì được vẽ và
  không nhấn được gì; chúng vẫn được giữ và vẫn theo execution adapter, và bracket hay order đang
  được đặt vẫn hiển thị. Khi khoá, không kéo được đường hay tag nào của chúng, và position không có SL hay TP để kéo
  ra; các nút của chúng (đóng, huỷ, đảo, trailing, bỏ stop) vẫn hoạt động. Trong widget, việc này nằm trong menu của nút ẩn và
  nút khoá trên sidebar công cụ vẽ.
</p>
<pre><code>{`chart.setTradingVisible(false)   // isTradingVisible()
chart.setTradingLocked(true)     // isTradingLocked()
chart.setIndicatorsVisible(ids, false)   // several indicators at once, one undo step`}</code></pre>

<h2>Order</h2>
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
  Tag của order ghi khối lượng và loại order (<code>0.25</code>, <code>Sell limit</code>), rồi
  <strong>×</strong> để huỷ; tag của order trên trục giá ghi giá, theo cách trục ghi giá.
  Order mở kèm stop và target hiển thị chúng bằng đường chấm, kèm mức lãi/lỗ tương ứng. Kéo
  đường hoặc tag của nó để sửa; subscribe qua <code>chart.on('orderModify', ...)</code>.
</p>

<h2>Giao dịch thực (kết nối adapter)</h2>
<p>
  Mặc định biểu đồ chỉ <em>phát</em> intent về order/position (<code>orderPlace</code>,
  <code>orderModify</code>, <code>orderCancel</code>, <code>positionModify</code>,
  <code>positionClose</code>) cho backend của bạn; biểu đồ không tự giao dịch. Khi kết nối một
  <code>ExecutionAdapter</code>, biểu đồ chuyển các intent đó vào
  adapter và vẽ các order/position chính thức mà adapter phát lại (adapter là
  nguồn dữ liệu duy nhất).
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))   // e.payload.command: the intent that failed
// A confirmed bracket goes to it too: see Bracket orders
// chart.disconnectExecution()`}</code></pre>
<p>
  Implement <code>ExecutionAdapter</code> (có cấu trúc tương tự <code>DataAdapter</code>) để nối với
  broker / OMS thật: <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, cùng các event <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code>.
  <code>PaperExecutionAdapter</code> là sandbox khớp lệnh ảo cho demo và test.
</p>

<h2>Thao tác với order và position trên biểu đồ</h2>
<p>
  Đường order và position có các nút nhỏ ở đầu bên phải: <strong>×</strong>
  huỷ order hoặc đóng position, <strong>⇅</strong> đảo position, và
  × trên đường cắt lỗ hoặc chốt lời sẽ bỏ đường đó. Các nút phát cùng intent như
  API (<code>orderCancel</code>, <code>positionClose</code>, <code>positionReverse</code>,
  <code>positionModify</code> với <code>null</code>), nên adapter đang kết nối sẽ xử lý chúng
  và host không có adapter sẽ nhận các event. Nút chỉ tác động khi thả chuột trên nút:
  nhấn rồi trượt ra ngoài thì không làm gì. Tắt nút bất kỳ bằng
  <code>lineButtons</code> trong <code>setTradingConfig</code>.
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop
chart.modifyPositionIntent({ positionId: 'pos-1', trailingStop: 150 }) // the stop trails the price by 150; null ends the trail`}</code></pre>
<p>
  Adapter đảo được position trong một bước thì implement <code>reversePosition</code>;
  nếu không có, biểu đồ đóng position và gửi một market order theo chiều ngược lại.
  Order nhận <code>stopLoss</code>, <code>takeProfit</code> và
  <code>timeInForce</code> (<code>'gtc'</code> hoặc <code>'day'</code>), được chuyển sang
  position mà order mở.
</p>
<p>
  <strong>Cho người viết adapter:</strong> trong <code>PositionModifyIntent</code>,
  <code>stopLoss: null</code> (hoặc <code>takeProfit: null</code>) nghĩa là bỏ mức đó, còn
  trường không có nghĩa là giữ nguyên. Code viết kiểu
  <code>intent.stopLoss ?? position.stopLoss</code> sẽ giữ lại stop mà người dùng đã bỏ.
</p>
<p>
  <strong>Trailing stop</strong> là cắt lỗ đi theo giá: <code>trailingStop</code> của position là khoảng cách, tính theo giá, mà stop giữ sau giá tốt nhất, đi lên với long và đi xuống với short, và không bao giờ lùi lại. Trên biểu đồ, tag của nó ghi TSL. Một nút trên tag của stop bắt đầu trailing ở khoảng cách hiện tại từ stop tới giá, hoặc kết thúc trailing; <code>lineButtons: {'{'} trailStop: false {'}'}</code> ẩn nút này. Tài khoản paper tự dời stop. Adapter cho broker chuyển tiếp <code>trailingStop</code> từ <code>modifyPosition</code> (một số thì bắt đầu trailing, <code>null</code> thì kết thúc và giữ stop tại chỗ) và báo <code>stopLoss</code> của position khi broker dời nó. Order cũng mang trường này: <code>trailingStop</code> trên order làm position mà order mở trailing ngay từ đầu, và stop của order đang chờ ghi TSL. Trong order ticket, đây là công tắc Trailing stop dưới cắt lỗ, trailing ở khoảng cách từ stop tới entry. Nút trailing trên tag của stop được tô đặc khi stop đang trailing.
</p>

<h2>Fill trên biểu đồ</h2>
<p>
  Mỗi fill hiển thị là một dấu nhỏ trên nến của nó: đặc khi fill mở position,
  rỗng khi fill đóng position. Biểu đồ ghi lại các fill mà adapter báo và
  phát <code>executionFill</code> kèm lý do (<code>'order'</code>,
  <code>'close'</code>, <code>'reverse'</code>, <code>'stopLoss'</code>,
  <code>'takeProfit'</code>) và lãi/lỗ đã thực hiện.
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
  Chuột phải trên biểu đồ phát <code>chartContextMenu</code> kèm phần được
  click (<code>'plot'</code>, <code>'pane'</code>, <code>'priceAxis'</code> hoặc
  <code>'timeAxis'</code>) cùng giá và thời gian tại đó. Với
  <code>features.priceAxisAddButton</code>, một nút “+” đi theo crosshair dọc trục giá;
  nhấn nút phát <code>priceAxisAdd</code> kèm giá của nó. Khi nút hiện, tag của order
  và position kết thúc ở bên trái nút, nên nút không bao giờ che các nút của chúng.
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget dựng menu của mình trên các event này. Chuột phải trên vùng vẽ để đặt cảnh báo, mua và
  bán tại giá đó (lệnh giới hạn ở phía thị trường mà lệnh sẽ chờ, lệnh stop ở
  phía còn lại), mở order ticket và vẽ đường ngang; sau đó là reset view, dán các hình vẽ
  đã copy, ẩn hoặc xoá hình vẽ, xoá chỉ báo (mã so sánh vẫn được giữ),
  xuất dữ liệu, và cài đặt.
</p>
<p>
  Chuột phải trên trục giá để reset trục, auto scale, đảo thang và thang
  bên trái, một trong bốn chế độ (thường, logarit, phần trăm, chỉ số hoá về 100), các
  nhãn trên trục và các đường ngang biểu đồ trong hai menu con, cảnh báo tại giá, và
  cài đặt mở ở tab Thang. Trục thời gian có reset, đi tới ngày và
  múi giờ.
</p>
<p>
  Mỗi mục hiển thị phím tắt tương ứng của widget khi phím đó đang bật: <kbd>Alt</kbd> +
  <kbd>R</kbd> reset view, <kbd>Alt</kbd> + <kbd>I</kbd> đảo thang, <kbd>Alt</kbd> +
  <kbd>G</kbd> đi tới ngày. Menu con mở khi click, nhấn <kbd>Enter</kbd>, <kbd>→</kbd> hoặc khi
  con trỏ dừng trên nó, và <kbd>←</kbd> hoặc <kbd>Escape</kbd> để quay lại; trên điện thoại, nơi
  menu mở từ phía dưới, dòng đầu tiên của menu con dùng để quay lại. Thêm mục riêng bằng
  <code>chartMenuItems</code> (xem <a href={href('/docs/api')}>tham chiếu API</a>).
</p>

<h2>Order ticket và panel tài khoản (ChartWidget)</h2>
<p>
  <strong>Tài khoản</strong> trong menu <strong>Giao dịch</strong> của toolbar mở panel tài khoản bên dưới biểu đồ: các position đang mở
  kèm lãi/lỗ, các order đang chờ, và các fill tới nay kèm P&amp;L
  đã thực hiện. Mỗi dòng có thể đóng, đảo hoặc huỷ. <strong>Order mới</strong> mở
  order ticket: mua hoặc bán, market, limit hoặc stop, khối lượng, giá, cắt lỗ và
  chốt lời tuỳ chọn, và time in force. Ticket kiểm tra order trong lúc nhập
  (lệnh giới hạn mua phải dưới giá thị trường, cắt lỗ phải ở phía lỗ của entry…)
  và hiển thị tỷ lệ reward:risk. Đặt order sẽ gửi intent <code>orderPlace</code>. Khi có
  thị trường được đặt (<code>chart.setMarket</code>), ticket còn giữ giá theo bước giá của thị trường và
  giá của order trong khoảng giá trần và giá sàn của ngày, bắt đầu ở một lô, và nhận số lô chẵn khi lớn hơn một lô
  (số cổ phiếu ít hơn là một lệnh lô lẻ riêng).
</p>
<p>
  Ticket ghi tên mã cạnh tiêu đề. Loại order và time in force là các lựa chọn trên một hàng
  (phím mũi tên di chuyển giữa chúng); − và + tăng giảm khối lượng theo lô và giá theo bước giá của thị trường, và
  giá lấy từ biểu đồ được làm tròn theo bước giá đó. Cắt lỗ hoặc chốt lời, khi bật, ghi khoảng cách tới
  entry tính theo phần trăm và mức lãi hoặc lỗ tại đó; bên dưới là phần tổng kết order: giá trị, rủi ro,
  lợi nhuận kỳ vọng và tỷ lệ giữa hai giá trị này. Chuyển giữa mua và bán giữ order đang chờ ở đúng mức giá đã đặt (lệnh stop mua
  trên giá thị trường thành lệnh giới hạn bán), và nút Đặt lệnh lấy màu của chiều giao dịch.
</p>
<p>
  Trong widget, khi giao dịch đang bật, hình vẽ Long/Short Position đang được chọn có <b>Tạo order</b> trên toolbar của nó. Nút này mở ticket ở trên, điền sẵn từ
  hình vẽ: chiều, entry làm giá, cắt lỗ và chốt lời, và
  khối lượng tương ứng với mức rủi ro của hình vẽ, làm tròn xuống theo số chữ số thập phân mà hình vẽ hiển thị.
  Loại order phụ thuộc vào vị trí của entry so với giá thị trường, và không có gì được gửi cho đến khi
  nhấn Đặt lệnh.
</p>
<p>
  Phần đầu của panel tài khoản luôn hiển thị P&amp;L đang mở và P&amp;L đã thực hiện ở mọi tab. Các con số được
  căn phải bằng font mono, tiền tệ theo số chữ số thập phân của bước giá và theo number locale; trên điện thoại mỗi dòng là một thẻ
  gồm các con số có tên.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.`}</code></pre>
<p>
  Dấu fill thuộc về mã đang hiển thị: khi chuyển mã trong widget, mã tiếp theo
  bắt đầu không có dấu nào.
</p>

<h2>Kéo để tạo order</h2>
<p>
  Tạo một đường order kéo được, kéo tới mức giá, rồi xác nhận. Loại order
  (limit hay stop) được suy ra từ vị trí thả so với giá hiện tại. Dùng cùng
  <code>connectExecution</code> để order nháp đã xác nhận được khớp ngay.
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>Bracket order (kéo để đặt)</h2>
<p>
  Tạo một bracket kéo được, gồm entry cùng vùng cắt lỗ và chốt lời, rồi
  kéo ba đường để chỉnh entry, rủi ro và lợi nhuận. Xác nhận bằng
  <kbd>Enter</kbd> (hoặc nút Đặt), huỷ bằng <kbd>Esc</kbd>. Trong
  widget, các mũi tên xanh/đỏ trên toolbar tạo bracket long/short. Biểu đồ
  phát một event <code>bracketPlace</code> duy nhất để backend của bạn xử lý.
</p>
<p>
  <strong>Kích cỡ.</strong> Bracket dành cho khối lượng theo kích cỡ của nó. <code>{`{ quantity: 2 }`}</code> là
  khối lượng đó. <code>{`{ risk: 50 }`}</code> là số tiền lỗ tại stop: khối lượng khi đó bằng 50 chia cho khoảng
  cách từ entry tới stop (nhân với <code>multiplier</code>, giá trị của một điểm giá cho một đơn vị), làm tròn
  xuống theo <code>quantityStep</code>, và thay đổi theo các đường khi kéo. Khối lượng được ghi trên tag của entry,
  và <code>bracketPlace</code> mang theo nó. Trong widget, khối lượng được gõ vào một ô trên thanh bracket; ô này
  bắt đầu bằng khối lượng gõ lần trước, nếu chưa có thì bằng lot của thị trường. <code>widget.startBracket(side, size)</code>
  cũng nhận kích cỡ: bracket tính theo rủi ro thì không có ô. <code>bracketQuantity(bracket, size)</code> là phép
  tính đó cho code của bạn.
</p>
<p>
  Khi có execution adapter đang kết nối, biểu đồ còn gửi bracket đã xác nhận tới
  adapter dưới dạng một order: entry, là lệnh giới hạn khi giá phải quay lại entry và lệnh stop khi giá phải
  chạy tiếp tới entry, khối lượng, và cắt lỗ cùng chốt lời gắn trên order. Khi adapter đã nhận, biểu đồ
  gửi <code>bracketOrder</code> kèm order. Nếu adapter từ chối, biểu đồ gửi
  <code>executionError</code> với <code>command: 'bracketPlace'</code>. Chỉ khi đó widget mới báo "đã đặt",
  và báo lý do khi bị từ chối. Bracket không có khối lượng thì không được xác nhận, vì chưa ai thấy khối lượng nào
  để đặt: <code>confirmBracket()</code> trả về false, và bracket ở lại trên biểu đồ để nhận khối lượng. Bracket
  được xác nhận trước khi biểu đồ có giá để phân biệt entry limit với entry stop thì không được gửi.
  <code>executionError</code> cho biết <code>reason</code> (<code>'noQuantity'</code>, <code>'noPrice'</code>),
  và widget báo điều đó. App tự đặt bracket của event thì kết nối với
  <code>brackets: 'event'</code>: bracket khi đó chỉ là một event, và widget báo là đã xác nhận.
  Trước 3.0 đó là mặc định (xem <a href={href('/docs/migration-3')}>Chuyển sang 3.0</a>).
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.startBracket('buy', undefined, { quantity: 2 })                   // for two
chart.startBracket('buy', undefined, { risk: 50, quantityStep: 0.001 }) // for what loses 50 at the stop
chart.setBracketSize({ quantity: 3 })   // while it is placed
chart.getBracket()                      // { side, entry, stopLoss, takeProfit, quantity } or null

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, quantity, riskReward } = e.payload
  // with no adapter (or brackets: 'event'): submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

// The connected adapter places it
chart.connectExecution(broker)
chart.placesBrackets()   // true
chart.on('bracketOrder', (e) => console.log(e.payload.order.id))
// chart.connectExecution(broker, { brackets: 'event' })   // only the event: your code places it

chart.confirmBracket()  // same as Enter
chart.cancelBracket()   // same as Esc`}</code></pre>

<h2>Depth ladder (click để giao dịch)</h2>
<p>
  DOM ladder, bật khi cần, hiển thị sổ lệnh thành các dòng giá với
  cột khối lượng bid/ask: click ô ask để mua, ô bid để bán tại mức
  giá đó. Bật bằng <code>depthLadder: true</code> và cấp dữ liệu sổ lệnh qua
  <code>widget.setDepth</code>; click sẽ phát intent <code>orderPlace</code> cho
  OMS của bạn (biểu đồ không tự giao dịch). Cùng dữ liệu đó cũng dùng cho
  depth overlay trên biểu đồ.
</p>
<p>
  Ladder là một trang của dock cạnh biểu đồ (một sheet trên điện thoại): mở từ menu Giao dịch, nút trên rail
  hoặc <code>widget.openPanel('depthLadder')</code>, và bỏ nút trên rail bằng
  <code>dock.depthLadder: false</code>. Ask nằm trên bid, spread ở giữa, mỗi khối lượng là một thanh mọc ra từ
  giá; các dòng có order đang chờ của bạn ghi khối lượng của order đó.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })
widget.openPanel('depthLadder')   // a page of the dock; the Trade menu opens it too

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>Sổ lệnh trên vùng vẽ</h2>
<p>
  <code>features.depth</code> vẽ sổ lệnh trên vùng vẽ, từ cạnh phải, cho biểu đồ chỉ hiển thị
  giá: không cần order hay UI giao dịch, và hoạt động với <code>trading: false</code>. Cấp dữ liệu bằng
  <code>chart.setDepthData</code> (<code>widget.setDepth</code> cũng làm việc này); overlay bật khi
  <code>features.depth</code> bật, và <code>setDepthOverlay</code> thay đổi cách hiển thị.
</p>
<ul>
  <li><code>mode</code>: <code>'cumulative'</code> (mặc định) cộng mỗi mức vào các mức gần thị trường hơn, nên các thanh dài dần khi xa thị trường; <code>'level'</code> vẽ riêng khối lượng tại mỗi mức giá, nên một bức tường lệnh hiện thành một thanh dài.</li>
  <li><code>rowSize</code>: chiều cao một thanh, tính theo giá. Các mức được cộng gộp thành các dòng cách nhau đúng khoảng đó, nên sổ lệnh dày dưới một thang thô, hoặc sổ lệnh có mức trống, vẫn vẽ ra các thanh đều nhau (đặt bằng kích thước dòng của footprint). Khi đó <code>markBest</code> kẻ đường ở giữa các dòng tốt nhất.</li>
  <li><code>rowOrigin</code>: nơi các dòng bắt đầu, tính theo giá. Dòng k chạy từ <code>rowOrigin + k × rowSize</code> tới điểm bắt đầu của dòng kế tiếp, và một mức nằm đúng điểm bắt đầu của dòng thuộc dòng đó. Footprint có ô bắt đầu tại bội số của kích thước dòng, mỗi tick canh giữa theo giá của nó, sẽ khớp với <code>rowOrigin: -tick / 2</code>. Không có tuỳ chọn này, mỗi dòng canh giữa tại một bội số của <code>rowSize</code>.</li>
  <li><code>markBest</code>: một đường tại bid tốt nhất và ask tốt nhất (<code>bestBidColor</code>, <code>bestAskColor</code>).</li>
  <li><code>maxWidth</code>: thanh dài nhất tính bằng pixel (không bao giờ vượt quá vùng vẽ), <code>bidColor</code>, <code>askColor</code>.</li>
</ul>
<p>
  Các thanh nằm đè lên các nến mới nhất. Để chừa chỗ, tăng <code>rightMargin</code> và đặt <code>maxWidth</code>
  bằng khoảng chừng đó nến. Khi giao dịch bật, <code>{`setTradingConfig({ depthOverlay: { enabled: true } })`}</code> vẫn bật overlay như trước.
</p>
<pre><code>{`const chart = new Chart(host, {
  features: { trading: false, depth: true },       // display only: no orders, no trading UI
  depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 },
  rightMargin: 14,                                  // empty slots past the newest bar, room for the bars
})
chart.setDepthData(orderBook)                       // { bids, asks }; null clears it
chart.setDepthOverlay({ mode: 'cumulative' })       // change the look later`}</code></pre>

<h2>Liquidity heatmap</h2>
<p>
  Tích luỹ các snapshot sổ lệnh thành heatmap phía sau nến: mỗi
  snapshot là một dải dọc, trong đó khối lượng đang chờ sáng lên theo từng mức giá
  (bid màu xanh, ask màu đỏ). Các bức tường thanh khoản tồn tại lâu sẽ nổi bật.
  Bật/tắt từ bảng cài đặt (hoặc <code>chart.setDepthHeatmapVisible</code>);
  <code>widget.setDepth</code> ghi một snapshot mỗi lần sổ lệnh cập nhật.
  Trong khi replay, sổ lệnh được ghi mà không có thời gian thuộc về nến cuối của series trực tiếp, heatmap
  chỉ hiển thị sổ lệnh của các nến mà replay đã hiển thị, và sổ lệnh ở cạnh vùng vẽ,
  vốn là của thị trường trực tiếp, bị ẩn cho đến khi replay kết thúc.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

<h2>Signal marker</h2>
<p>Bot hoặc tích hợp giao dịch theo tín hiệu có thể đặt mũi tên chỉ chiều lên overlay.</p>
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
  ChartWidget hiển thị ghi chú cạnh marker dưới con trỏ: nhãn và nguồn, chiều,
  giá, độ tin cậy và thời gian.
</p>

<h2>Mark</h2>
<p>
  Những gì xảy ra tại một thời điểm (tin tức, ngày công bố kết quả kinh doanh, cổ tức, chia tách) dưới dạng một huy hiệu nhỏ ở
  chân pane giá, trên nến chứa thời điểm đó. Con trỏ trên huy hiệu hiển thị
  tiêu đề và nội dung; các huy hiệu sẽ chồng lên nhau được gộp thành một kèm số đếm. Replay hiển thị mỗi
  mark khi tới nó. Renko, Kagi, line break, point &amp; figure và range bar không vẽ mark: nến
  của chúng không gắn với thời gian.
</p>
<pre><code>{`chart.setMarks([
  { id: 'q3', time: reportedAt, kind: 'earnings', title: 'Q3 earnings', text: 'EPS 1.42 vs 1.31 expected' },
  { id: 'div', time: exDate, kind: 'dividend', title: 'Dividend 0.24 a share' },
  { id: 'n1', time: publishedAt, kind: 'news', title: headline, text: source, url: 'https://example.com/story' },
])
const id = chart.addMark({ time: Date.now(), title: 'Trading halted', label: 'H', color: '#e5484d' })
chart.removeMark('div')
chart.getMarks()      // earliest first
chart.clearMarks()

chart.on('markClick', (e) => openStory(e.payload.marks))   // one mark, or the several a badge gathers
// a click on a badge is a markClick, not a click or a barClick
chart.on('markHover', (e) => e.payload.marks)              // null: the pointer left the badge
chart.on('marksChange', (e) => e.payload.count)

new Chart(host, { features: { marks: false } })            // or chart.setFeatures({ marks: false })`}</code></pre>
<p>
  <code>kind</code> chọn chữ cái và màu: <code>news</code> N, <code>earnings</code> E,
  <code>dividend</code> D, <code>split</code> S, và <code>event</code> (hoặc không có) i. <code>label</code>
  (một hoặc hai ký tự) và <code>color</code> thay thế chúng. Mark cần <code>title</code> và
  <code>time</code>; chỉ giữ liên kết http(s); mỗi biểu đồ giữ tối đa 2,000 mark. Mark là của feed,
  không phải của người dùng: <code>saveState</code> không lưu chúng, nên cần đặt lại sau khi load.
</p>
<p>
  ChartWidget đưa tin tức của mã lên biểu đồ từ nguồn tin của nó (<code>news</code>, hoặc
  <code>fetchNews</code> của adapter); <code>newsMarks: false</code> chỉ để tin trong panel thông tin
  mã. Click vào một mark mở liên kết trong tab mới; trên huy hiệu gộp nhiều mark, mở danh sách, mới nhất
  trước. Công tắc tính năng <code>marks</code> của widget ẩn mọi mark. <code>setMarks</code> và
  <code>clearMarks</code> của bạn không động tới tin tức mà widget đưa lên biểu đồ.
</p>

<h2>Vùng giao dịch</h2>
<p>Hiển thị các hình chữ nhật từ entry tới exit, tô màu theo P&amp;L và có nhãn chiều giao dịch.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  direction: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
})`}</code></pre>

<h2>Token cho nhãn position</h2>
<p>
  Tự định dạng tag của position: <code>positionLabel</code> thay cho phần chiều và lãi/lỗ
  sau khối lượng. Tuỳ chọn này nhận một chuỗi template hoặc một hàm trả về chuỗi.
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

<h2>Mốc màu gradient theo P&amp;L</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  Lãi đang mở trên tag và dải màu tới giá lấy màu của mốc cao nhất có
  <code>pnl</code> nhỏ hơn hoặc bằng lãi/lỗ của position, tính theo tiền.
</p>
