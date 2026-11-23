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
  Khi một đường đang được kéo tới một mức giá, crosshair không vẽ đường ngang và không ghi giá trên trục: tag của
  chính đường đó đã có giá.
  Giá đặt bằng tay luôn bám lưới giá của thị trường: order, stop, target hay level được kéo, các đường của bracket và của order nháp, alert được kéo, giá mà click chuột phải hoặc nút “+” cạnh trục đưa ra. Giá nằm trên bước giá của thị trường (<code>setMarket</code>, hoặc <code>minTick</code> của mã), còn không thì theo số chữ số thập phân trục giá đang hiển thị: <code>chart.roundPrice</code>. Crosshair ghi giá dưới con trỏ trên cùng lưới đó, nên giá nó hiển thị chính là giá mà nút “+” bên cạnh sẽ đặt.
  Trên thị trường có giá trần và giá sàn trong ngày (<code>setPriceLimits</code>), giá của chính order cũng nằm trong biên độ đó: đường của order dừng ở trần hoặc sàn khi bị kéo vượt qua, entry của bracket và order nháp bắt đầu và ở lại trong biên độ, và menu không đưa ra order nào ngoài biên độ, DOM ladder cũng không đặt order nào ở đó. Stop, target và các level của position thì không bị giữ: chúng không phải order của hôm nay.
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

<h3 id="order-outcome">Order đã ra sao</h3>
<p>
  Mỗi order được yêu cầu đi ra kèm một <code>clientOrderId</code>, mã riêng của nó: mã nó mang sẵn, nếu không thì mã
  chart cấp, và <code>placeOrderIntent</code> trả về order đúng như đã gửi. Cho tới khi adapter trả lời, order đang trên
  đường đi. <code>orderPlaced</code> báo adapter đã nhận, kèm order mà nó tạo ra; <code>executionError</code> với
  <code>command: 'orderPlace'</code> và cùng <code>clientOrderId</code> báo order bị từ chối. <code>placeOrder</code> của
  một adapter phải kết thúc theo một trong hai cách: resolve với order, hoặc reject kèm lý do. Hãy chuyển mã này cho
  broker nào nhận nó, và trả lời một lần gửi lặp bằng order đã tạo, để một lần bấm bị gửi hai lần vẫn là một order
  (tài khoản paper làm vậy).
</p>
<pre><code>{`const sent = chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1 })
chart.on('orderPlaced', (e) => { if (e.payload.intent.clientOrderId === sent?.clientOrderId) done(e.payload.order) })
chart.on('executionError', (e) => { if (e.payload.clientOrderId === sent?.clientOrderId) failed(e.payload.cause) })`}</code></pre>

<h3 id="order-kinds">Order hoạt động cùng nhau, và có hiệu lực trong bao lâu</h3>
<p>
  Intent của một order (<code>chart.placeOrderIntent</code>, <code>placeOrder</code> của adapter) cho biết nhiều hơn
  giá của nó:
</p>
<ul>
  <li>
    <strong><code>ocoGroup</code></strong>: một tên dùng chung cho các order trong đó một order huỷ các order còn lại, như một target
    và một stop cho cùng một lần thoát. Khi một order khớp, phần còn lại của nhóm bị huỷ. Tag của chúng trên biểu đồ ghi
    OCO.
  </li>
  <li>
    <strong><code>timeInForce</code></strong>: <code>'gtc'</code> (hiệu lực đến khi huỷ), <code>'day'</code>,
    <code>'gtd'</code> (hiệu lực đến một ngày: <code>expireTime</code>, tính bằng mili giây), và <code>'ioc'</code> hoặc
    <code>'fok'</code> cho order khớp ngay hoặc không khớp.
  </li>
  <li>
    <strong><code>type: 'stopLimit'</code></strong>: <code>stopPrice</code> là mức mà order bắt đầu hoạt động và
    <code>price</code> là giá giới hạn mà sau đó order hoạt động. Đường của order trên biểu đồ là giá giới hạn của nó, còn stop có một đường riêng nét gạch chấm, gắn tag STOP, với giá của nó trên
    trục. Kéo đường của order thì dời cả hai, giữ nguyên khoảng cách; kéo đường của stop, hoặc tag của nó, thì chỉ dời stop.
    Khi đó <code>orderModify</code> mang <code>newStopPrice</code> bên cạnh <code>newPrice</code>, và tài khoản paper làm theo.
  </li>
</ul>
<pre><code>{`// A target and a stop for one exit: whichever fills first takes the other off
chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 66_000, quantity: 1, ocoGroup: 'exit' })
chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 63_000, stopPrice: 63_000, quantity: 1, ocoGroup: 'exit' })

// Works until midnight UTC
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1, timeInForce: 'gtd', expireTime: Date.UTC(2027, 0, 1) })`}</code></pre>
<p>
  Tài khoản paper xử lý từng loại như một broker. Trong một nhóm, order khớp đầu tiên huỷ các order còn lại. Một
  stop-limit thành lệnh giới hạn tại <code>price</code> của nó khi giá chạm stop của nó, và chỉ khớp
  trong giới hạn đó (tại giá đã chạm stop, khi giá đó nằm trong giới hạn). Order <code>'gtd'</code>
  được gỡ khi thời gian truyền cùng <code>setMarkPrice</code> tới ngày của nó (thời gian của đồng hồ, khi không truyền
  thời gian), và order có ngày đã qua thì bị từ chối. Lệnh giới hạn <code>'ioc'</code> hoặc <code>'fok'</code> khớp
  ngay, tại giá đang có, khi giá đó nằm trong giới hạn, và bị từ chối khi không (<code>executionError</code>). Thị trường paper không có khối lượng riêng, nên ở đó hai loại này
  giống nhau, trừ khi nó được cho một khối lượng (<a href="#partial-fills">bên dưới</a>). Order ticket của widget có cả hai cho lệnh giới hạn, và panel tài khoản của widget ghi OCO cạnh
  order thuộc một nhóm và ghi ngày của order có ngày. Tài khoản paper để <code>'day'</code> cho app, vì app biết khi nào ngày giao dịch của thị trường kết thúc.
  Ticket có lựa chọn good till date cho lệnh giới hạn và lệnh dừng: một ngày và một giờ theo đồng hồ của chart, ban đầu là một ngày kể từ bây giờ, và ticket không đặt lệnh nào hết hạn trong quá khứ.
  Lệnh giới hạn IOC hoặc FOK có thể đặt giá qua giá thị trường: nó khớp ở giá thị trường, và ticket tính giá trị, rủi ro và các mục tiêu của lệnh từ giá đó.
  Ticket cũng nhận lệnh stop-limit, với giá stop và giá giới hạn, hiệu lực đến khi huỷ, trong ngày hoặc đến một ngày. Lệnh có thể khớp ở bất kỳ giá nào từ stop đến giá giới hạn, nên stop-loss phải nằm ngoài stop và take-profit nằm ngoài giá giới hạn; panel tài khoản ghi tên loại lệnh và cả hai giá, giá stop trước.
</p>
<p>
  <strong>Một position net.</strong> Mặc định tài khoản paper mở một position cho mỗi order đã khớp, position mua
  nằm cạnh position bán (<code>positions: 'hedge'</code>). <code>{`new PaperExecutionAdapter({ positions: 'net' })`}</code>
  giữ một position, như tài khoản futures: fill cùng chiều cộng thêm vào position tại giá trung bình của chúng,
  fill ngược chiều trừ bớt position và thực hiện lãi/lỗ của phần đó (<code>pnl</code> trên fill), còn fill lớn hơn thì đảo chiều
  position, phần còn lại mở tại giá của fill. Fill cộng thêm vào position mang theo stop của nó khi có; fill
  trừ bớt giữ nguyên stop của position; fill đảo chiều mang stop của chính nó.
</p>
<h3 id="partial-fills">Order khớp từng phần</h3>
<p>
  Một lệnh giới hạn nằm chờ trên thị trường và được khớp khi các lệnh khác tới với nó, thường là từng phần một. Khi có
  <code>fillSize</code>, tài khoản paper khớp không quá chừng đó của một lệnh giới hạn tại một giá: lệnh lớn hơn
  khớp một phần tại mỗi giá chạm giới hạn của nó (mỗi lần <code>setMarkPrice</code>), và tiếp tục chờ cho
  phần còn lại. Order ở lại trong <code>chart.getOrders()</code> cùng <code>filledQuantity</code> của nó; mỗi phần là một
  fill riêng (<code>executionFill</code>), với <code>remaining</code> là phần nó để lại còn chờ, và
  phần cuối gỡ order. Biểu đồ ghi phần đã khớp trên tag của order (<code>2/5</code>), và
  panel tài khoản của widget ghi trong dòng của order; các tag trên stop và target của order ghi mức lãi/lỗ của phần còn lại,
  vì phần đã khớp là một position có tag riêng.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({ fillSize: 2 })   // two of a limit order at each price
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 })

chart.on('executionFill', (e) => console.log(e.payload.quantity, e.payload.remaining))   // 2 3, then 2 1, then 1 undefined
chart.on('ordersChange', (e) => console.log(e.payload.orders[0]?.filledQuantity))        // 2, 4, then no order`}</code></pre>
<p>
  Các phần của một order dựng thành một position, tại giá trung bình của chúng; trên tài khoản net, chúng cộng thêm vào
  position của tài khoản, hoặc trừ bớt. Position có cắt lỗ, chốt lời và các mức của order từ phần
  đầu tiên, và phần sau không mang chúng tới lần thứ hai: stop mà bạn đã dời sau đó, hoặc đã bỏ, giữ nguyên như bạn
  để. Phần khớp sau khi position của nó đã đóng thì mở một position khác, lại kèm các stop của order. Một mức là
  một khối lượng của cả kế hoạch, nên các phần đầu có thể chưa đủ cho nó: mức không lấy nhiều hơn phần đang mở. Stop-limit
  cũng khớp từng phần, khi nó đã hoạt động như một lệnh giới hạn. Mỗi phần trả phí giao dịch riêng, và phần mà tài khoản không còn đủ tiền để nhận thì huỷ phần còn lại của
  order (<code>executionError</code>). Phần còn lại có thể được dời, huỷ, hoặc kết thúc vào ngày của nó, và phần
  đầu tiên huỷ các order còn lại trong nhóm của order. Với order <code>'ioc'</code>, phần khớp được ngay thì khớp và
  phần còn lại bị bỏ (fill của nó cho biết bao nhiêu: <code>dropped</code>, cạnh một <code>quantity</code> ít hơn khối lượng đã yêu cầu, và
  order mà <code>placeOrder</code> trả về có <code>filledQuantity</code> của nó; nhật ký ghi phần còn lại là
  đã huỷ, và widget báo đã khớp bao nhiêu); order <code>'fok'</code> lớn hơn khối lượng đó thì bị từ chối. Lệnh market và
  lệnh stop khớp toàn bộ, lệnh đóng cũng vậy: thị trường paper nhận chúng tại giá đang có, và không mô phỏng slippage.
  Adapter của riêng bạn báo các phần của broker theo cùng cách: order cùng
  <code>filledQuantity</code> trong <code>orders</code>, và một <code>fill</code> cho mỗi phần.
</p>

<h3 id="take-profit-levels">Chốt lời từng phần</h3>
<p>
  Một position có thể được đóng từng phần. <code>takeProfits</code> trên intent của một order, hoặc trên một position
  (<code>chart.modifyPositionIntent</code>), là danh sách các mức, mỗi mức gồm một <code>price</code> và
  <code>quantity</code> đóng tại đó. Khi giá chạm một mức, phần của mức đó được đóng tại giá của mức
  và mức đó biến mất; phần mà các mức để lại vẫn mở để <code>takeProfit</code> đóng, hoặc cắt lỗ đóng.
  Cắt lỗ đóng toàn bộ phần còn lại dù còn mức nào đang chờ, mức nằm quá chốt lời thì không bao giờ
  được chạm tới, và một mức không lấy nhiều hơn phần còn mở.
  Biểu đồ vẽ một đường và một tag cho mỗi mức (TP1 là mức gần nhất), kèm phần của nó và mức lãi của phần đó, và
  panel tài khoản của widget ghi mức gần nhất và còn bao nhiêu mức nữa.
</p>
<pre><code>{`chart.placeOrderIntent({
  side: 'buy', type: 'market', price: 64_000, quantity: 3,
  stopLoss: 63_000,
  takeProfits: [{ price: 65_000, quantity: 1 }, { price: 66_000, quantity: 1 }],   // a third at each
  takeProfit: 67_000,                                                              // the rest
})

chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: [{ price: 65_500, quantity: 2 }] })   // all of them, anew
chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: null })                               // none`}</code></pre>
<p>
  Tài khoản paper đóng các phần (mỗi phần một fill, với <code>reason: 'takeProfit'</code> và lãi/lỗ nó
  đã thực hiện) và tính chúng vào <code>closedQuantity</code> của position. Nó chỉ nhận các mức có
  lãi so với entry, và trên tài khoản net, order mang theo các mức sẽ đưa các mức đó cho position, như cách nó
  đưa stop cho position. TP1 trên biểu đồ là mức gần nhất còn đang chờ. Adapter của riêng bạn báo các mức của
  broker. Trong order ticket của widget, chốt lời có thể đạt qua một, hai hoặc ba mục tiêu
  (<strong>Số mục tiêu</strong>): khi nhiều hơn một, một phần đều nhau của khối lượng được đóng tại mỗi mục tiêu trên
  đường đi, cách đều nhau tính từ entry, và chốt lời đóng phần còn lại. Ticket liệt kê phần nào đóng
  ở đâu trước khi order được đặt.
</p>
<p>
  Mức của một position được kéo trên biểu đồ như cắt lỗ và chốt lời của nó, bằng đường hoặc bằng tag của mức:
  đường đi theo con trỏ, vị trí cũ của nó hiện mờ phía sau, và thả ra sẽ phát
  <code>positionModify</code> với toàn bộ <code>takeProfits</code> của position, mức đó đã dời, mức gần nhất
  trước. Một mức là một khoản lãi, nên mức được thả tại entry hoặc vượt qua entry về phía lỗ sẽ quay về chỗ cũ, và
  không có gì được phát. Trong hai mức cùng nằm trong tầm một lần nhấn, mức gần hơn được chọn; đường của một order, cắt lỗ
  hoặc chốt lời ở cùng chỗ được chọn trước một mức, và tag của mức đó vẫn dời được nó. Các mức của một
  order còn đang chờ là kế hoạch mà order mang theo và không phải là handle; khi các đường bị khoá thì cũng
  không mức nào là handle.
</p>

<h3 id="account">Tài khoản có tiền</h3>
<p>
  Khi có <code>balance</code>, tài khoản paper giữ tiền như một broker. Lãi hoặc lỗ của một lần đóng
  được cộng vào số dư, các position đang mở giữ margin (giá trị của chúng, chia cho <code>leverage</code>), và mỗi fill
  trả <code>commission</code> của nó. Order mà margin khả dụng không đủ cho nó thì bị từ chối
  (<code>executionError</code>), một lần đảo position cũng vậy; order đang chờ mà tiền đã hết khi
  giá của nó tới thì bị huỷ, và <code>executionError</code> cũng báo việc đó. <code>multiplier</code> là giá trị của một
  điểm giá cho một đơn vị, cho hợp đồng futures: hãy truyền
  <code>contractMultiplier</code> của thị trường, giá trị mà panel của widget dùng để tính lãi của các position. Tài khoản được báo
  trước fill đã làm nó thay đổi, nên <code>chart.getAccount()</code> trong listener <code>executionFill</code>
  đọc được tài khoản như fill để lại. Không có <code>balance</code> thì không có tài khoản, và mọi order đều được nhận, như
  trước.
</p>
<p>
  Khi các position đang giữ margin, tài khoản cho biết equity của nó so với margin thế nào: <code>marginLevel</code>,
  equity tính theo tỷ lệ so với margin đã dùng (<code>1.5</code> là 150%). Hai mức tác động lên nó, mỗi mức không có trừ khi
  được truyền. Dưới <code>marginCallLevel</code>, tài khoản cảnh báo một lần, event <code>marginCall</code>, và
  chỉ cảnh báo lại sau khi equity đã trở lại trên mức đó; nó không đóng gì. Dưới
  <code>stopOutLevel</code>, tài khoản đóng các position tại giá đang có, position lỗ nhiều nhất trước, cho đến khi
  trở lại trên mức đó hoặc không còn giữ position nào: đóng một position giải phóng margin của nó, và có thể vậy là đủ. Mỗi lần đóng là một fill có
  <code>reason: 'liquidation'</code>. Cả hai được tính khi mỗi giá tới, sau các order và các stop mà giá đó
  chạm, nên cắt lỗ đóng position của nó trước, và fill đưa equity xuống dưới một mức thì được xử lý
  ở giá kế tiếp. Margin của một position được giữ theo giá entry của nó, nên mức margin chỉ thay đổi theo
  equity. Stop-out để các order đang chờ tiếp tục chờ: order mà tiền đã hết thì bị huỷ khi giá của nó
  tới. Không có mức nào trong hai mức thì không có gì bị đóng và số dư có thể xuống dưới 0.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({
  balance: 10_000,
  leverage: 10,                                 // a position holds a tenth of its value
  commission: { rate: 0.0004, min: 0.1 },       // 0.04% of each fill's value, no less than 0.1; perUnit: an amount a unit
  positions: 'net',
  marginCallLevel: 1,                           // warn when the equity falls under the margin held
  stopOutLevel: 0.5,                            // close positions when it falls under half of it
})
chart.connectExecution(broker)

chart.getAccount()   // { balance, equity, unrealisedPnl, realisedPnl, marginUsed, freeMargin, commission, marginLevel? } or null
chart.on('accountChange', (e) => console.log(e.payload.account?.equity))
chart.on('executionFill', (e) => console.log(e.payload.commission, e.payload.reason))   // 'liquidation' for a stop-out
chart.on('marginCall', (e) => warn(e.payload))   // { marginLevel: 0.9, level: 1, equity, marginUsed }`}</code></pre>
<p>
  Panel tài khoản của widget đặt số dư, equity và margin khả dụng ở đầu phần tổng, cùng mức
  margin khi có; panel hiện một margin call dưới dạng cảnh báo, và ghi tên fill của một stop-out trong lịch sử của nó.
  Adapter của riêng bạn làm điều tương tự bằng cách implement <code>getAccount()</code> và phát <code>account</code>
  kèm một <code>AccountSummary</code> khi tiền của nó thay đổi, và <code>marginCall</code> khi broker của nó cảnh báo.
</p>

<h3 id="symbols">Tài khoản giao dịch nhiều symbol</h3>
<p>
  Một chart hiển thị một symbol, còn một tài khoản có thể giữ nhiều symbol. Mỗi order, position và fill có thể ghi
  symbol của nó (<code>symbol</code>). Chart vẽ những cái thuộc symbol đang hiển thị và những cái không ghi symbol;
  cái nào ghi symbol khác thì chart giữ lại, và vẽ lại khi symbol đó được hiển thị. <code>getOrders()</code>,
  <code>getPositions()</code> và <code>getFills()</code> trả về toàn bộ tài khoản, <code>ordersChange</code> và
  <code>positionsChange</code> cũng vậy; <code>chart.getSymbol()</code> cho biết phần nào đang ở trên chart. Order
  do chart yêu cầu sẽ ghi symbol đang hiển thị (<code>symbol</code> trong <code>orderPlace</code>), và tài khoản
  paper giữ nó trên order, trên position mà order mở ra và trên các fill của chúng. Adapter của riêng bạn cho một
  tài khoản nhiều symbol thì ghi symbol trên từng cái. Chart không bao giờ đoán: cái nào không ghi symbol thì được
  vẽ trên mọi symbol, như trước. Hai tên là cùng một symbol bất kể chữ hoa hay thường, và theo ticker khi chỉ một bên
  ghi sàn (<code>BTCUSDT</code> và <code>BINANCE:BTCUSDT</code>); hai tên đều ghi sàn thì phải cùng sàn.
</p>
<p>
  Một fill là một dấu trên các bar của một symbol, nên chart gán cho mỗi fill một symbol: của chính nó, nếu không
  thì của position hoặc order của nó, nếu không nữa thì symbol đang hiển thị lúc fill tới. Panel tài khoản của
  widget liệt kê các dòng của mọi symbol và ghi tên symbol khi có một dòng thuộc symbol khác; position của symbol
  khác hiện giá mà adapter đưa cho nó (<code>markPrice</code> trên position) và lãi lỗ tính theo giá đó, hoặc
  không hiện cả hai: giá của chart không phải giá của nó. Depth ladder đánh dấu các order của symbol mà nó đang
  hiển thị sổ lệnh.
</p>
<p>
  Khi có stream (<code>connect</code>, <code>switchStream</code>) chart biết symbol của mình. Với các bar do bạn tự
  đặt, hãy báo symbol khi bạn đổi chúng; <code>ChartWidget</code> tự làm việc đó khi symbol của nó được chọn.
</p>
<pre><code>{`chart.setData(barsOf('ETHUSDT'))
chart.setSymbol('ETHUSDT')        // vẽ order và position của ETHUSDT; '' thì vẽ lại tất cả
chart.getSymbol()                 // 'ETHUSDT'

chart.setPositions([
  { id: 'p1', symbol: 'BTCUSDT', side: 'buy', entryPrice: 64_000, quantity: 1, markPrice: 64_250 },   // được giữ, không vẽ
  { id: 'p2', symbol: 'ETHUSDT', side: 'sell', entryPrice: 3_150, quantity: 2 },                      // được vẽ
])`}</code></pre>
<p>
  Một mức giá cũng thuộc về một symbol. Hãy ghi symbol khi bạn đưa giá cho tài khoản paper: mỗi mức giá chỉ khớp
  order và stop của symbol đó, và chỉ định giá các position của nó; một position được đóng, đảo chiều và stop-out
  theo giá mới nhất của chính symbol của nó, và tài khoản net giữ một position cho mỗi symbol. Mức giá không ghi
  symbol là giá của mọi thứ tài khoản đang giữ, như trước. Hãy ghi symbol trên mọi mức giá bạn đưa vào, hoặc không ghi trên
  mức nào: một mức giá không ghi symbol khiến tài khoản lại là một thị trường. Trong replay, chart ghi symbol trên các mức giá nó đưa
  vào.
</p>
<pre><code>{`feed.onTrade((trade) => broker.setMarkPrice(trade.price, trade.time, trade.symbol))`}</code></pre>

<h3 id="live-price">Giá không còn là giá trực tiếp</h3>
<p>
  Giá trên chart là giá trực tiếp khi feed của widget đang kết nối và còn gửi dữ liệu. Feed mất kết nối, hoặc còn kết
  nối nhưng không gửi gì trong một phút (<code>feedQuietAfter</code>, tính bằng giây), thì mức giá cuối cùng vẫn nằm
  đó: status bar khi ấy nói rõ thay cho “Live”, và ticket không gửi order thị trường, còn các loại khác thì cảnh báo vì
  giá là do trader tự nhập. Trong lúc feed mất kết nối, order đặt bằng một lần nhấn (menu chuột phải, depth ladder) và
  bracket hay draft order được xác nhận trên chart cũng bị giữ lại, kèm thông báo (<code>chart.setOrderGate</code> là
  thứ giữ hai loại sau). Đóng position và huỷ order không bao giờ bị giữ lại. Thị trường đang đóng cửa
  (<code>sessions</code> của symbol) vốn im lặng nên không bị xét, replay và các bar do bạn tự đặt (không có
  <code>adapter</code>) cũng vậy: ở đó hãy tự giữ order trong handler <code>orderPlace</code> của bạn.
</p>
<pre><code>{`new ChartWidget(host, { adapter, symbol: 'BTCUSDT', trading: true, feedQuietAfter: 30 })   // seconds; 0: never
chart.getFeedTime()   // when the stream last told anything, ms; null before it has`}</code></pre>

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
  một khoảng cách trailing, được chuyển sang position mà order mở.
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
  kèm lãi/lỗ, các order đang chờ, các fill tới nay kèm P&amp;L
  đã thực hiện, và nhật ký những gì đã xảy ra với các order. Mỗi dòng có thể đóng, đảo hoặc huỷ. <strong>Order mới</strong> mở
  order ticket: mua hoặc bán, market, limit hoặc stop, khối lượng, giá, cắt lỗ và
  chốt lời tuỳ chọn, và time in force. Ticket kiểm tra order trong lúc nhập
  (lệnh giới hạn mua phải dưới giá thị trường, cắt lỗ phải ở phía lỗ của entry…)
  và hiển thị tỷ lệ reward:risk. Đặt order sẽ gửi intent <code>orderPlace</code>. Khi có
  thị trường được đặt (<code>chart.setMarket</code>), ticket còn giữ giá theo bước giá của thị trường và
  giá của order trong khoảng giá trần và giá sàn của ngày, bắt đầu ở một lô, và nhận số lô chẵn khi lớn hơn một lô
  (số cổ phiếu ít hơn là một lệnh lô lẻ riêng).
</p>
<p>
  Khi feed cho cả bid và ask, ticket tính giá trị, kiểm tra và gửi lệnh Mua theo ask và lệnh Bán theo bid; nếu không thì
  cả hai theo giá cuối. Khi có execution adapter đang kết nối, ticket chờ adapter trả lời: nó vẫn mở, nút đặt lệnh đổi
  thành <strong>Đang gửi…</strong> và không gì sửa được, đóng lại khi order được nhận, còn khi order bị từ chối thì giữ
  nguyên những gì đã nhập và nói lý do cho tới khi order được sửa. Sau mười giây chưa có trả lời, ticket nói rõ điều đó và chờ tiếp: hãy kiểm tra các order của bạn trước khi gửi lại. Bấm ra ngoài ticket không đóng nó; Escape, Cancel và
  dấu chéo mới đóng. Một order đặt bằng một lần bấm, từ menu chuột phải hay một nấc của DOM ladder, có khối lượng bằng
  một lot của thị trường (<code>volumeUnit</code>) nếu thị trường có lot, nếu không thì bằng một.
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
<p>
  Widget báo điều xảy ra với order nó đã gửi: order bị adapter từ chối, bằng chính lời của adapter, và order
  khớp một phần rồi bỏ phần còn lại, đã khớp bao nhiêu.
</p>
<p>
  <strong>Tab Nhật ký</strong> liệt kê những gì đã xảy ra với các order, mới nhất trước: từng order được đặt, dời,
  huỷ hoặc khớp, và những gì broker từ chối kèm lý do. Biểu đồ giữ nhật ký này, cho cả biểu đồ của riêng
  bạn: <code>chart.getActivityLog()</code> trả về 200 mục mới nhất, cũ nhất trước, mỗi mục là
  <code>{`{ time, kind, orderId, side, type, quantity, price, reason, pnl, message }`}</code> với những gì
  <code>kind</code> của nó có (<code>'placed'</code>, <code>'moved'</code>, <code>'cancelled'</code>,
  <code>'filled'</code>, <code>'rejected'</code>). Nhật ký được đọc từ các order, fill và lỗi mà biểu đồ được báo,
  qua execution adapter hoặc qua <code>setOrders</code> và <code>addFill</code>. Các order đã có khi nhật ký bắt đầu
  thì không nằm trong đó, và các order đã có khi một adapter được kết nối hoặc gỡ ra, hoặc (khi không có adapter) khi mã
  thay đổi, cũng không: chúng là những gì đang có, không phải order được đặt. Order đã khớp một phần rồi được gỡ thì được ghi là
  đã huỷ. <code>chart.clearActivityLog()</code> xoá hết nhật ký.
</p>
<p>
  <strong>Bán và Mua trên biểu đồ.</strong> Khi có execution adapter đang kết nối, widget hiện hai
  nút dưới legend của biểu đồ, mỗi nút kèm giá mà nó sẽ giao dịch: bid tốt nhất trên Bán và ask tốt nhất
  trên Mua, với spread ở giữa (<code>chart.setBidAsk</code>, hoặc một feed có tick mang theo chúng), nếu không thì
  giá cuối trên cả hai, như trong replay hoặc khi feed chỉ cho một phía. Nhấn nút sẽ mở order ticket ở
  chiều đó. <code>executionChange</code> báo khi một adapter được kết nối hoặc gỡ ra, <code>bidAskChange</code>
  báo khi bid và ask thay đổi, và công tắc <code>tradeButtons</code> tắt các nút này.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
  features: { tradeButtons: true },   // default: Sell and Buy under the legend, with a broker connected
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.

widget.getChart().getActivityLog().at(-1)   // { time, kind: 'filled', side: 'buy', quantity: 1, price: 64_000, reason: 'order' }`}</code></pre>
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
  phát một event <code>bracketPlace</code> duy nhất, và gửi bracket tới execution adapter đang
  kết nối (bên dưới); khi không có adapter, event này để backend của bạn xử lý.
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
