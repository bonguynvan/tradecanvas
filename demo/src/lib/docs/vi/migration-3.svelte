<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Chuyển sang 3.0 — Tài liệu TradeCanvas</title>
  <meta name="description" content="Những gì thay đổi với code của bạn giữa TradeCanvas 2.x và 3.0: từng hành vi đã thay đổi và tuỳ chọn giữ lại hành vi cũ. 3.0 đang được phát triển trên branch riêng." />
</svelte:head>

<h1>Chuyển sang 3.0</h1>
<p>
  3.0 đang được phát triển trên branch <code>3.0</code>: chưa có trên npm, và trang này sẽ dài thêm theo nó. Trang
  liệt kê từng thay đổi có thể làm hỏng code viết cho 2.x và việc cần làm. Từ 1.x lên 2.0, xem
  <a href={href('/docs/migration')}>Chuyển sang 2.0</a>.
</p>

<h2 id="behaviour">Các hành vi đã thay đổi</h2>

<h3 id="brackets">Bracket đã xác nhận được gửi tới execution adapter</h3>
<p>
  Khi có execution adapter đang kết nối (<code>chart.connectExecution(adapter)</code>), một bracket đã xác nhận
  nay được gửi tới adapter như một order: entry cùng khối lượng, stop-loss và take-profit của nó. Ở 2.x, bracket
  chỉ là sự kiện <code>bracketPlace</code>, trừ khi adapter được kết nối với <code>brackets: 'place'</code>, và
  chart cảnh báo một lần trong console rằng bracket chưa được gửi.
</p>
<ul>
  <li>
    <strong>Code của bạn tự đặt bracket từ sự kiện.</strong> Hãy kết nối với <code>brackets: 'event'</code>, nếu
    không bracket sẽ được đặt hai lần: một lần bởi chart và một lần bởi bạn.
  </li>
  <li>
    <strong>Bạn đã truyền <code>brackets: 'place'</code>.</strong> Không cần làm gì; có thể bỏ tuỳ chọn này.
  </li>
  <li>
    <strong>Không có adapter nào kết nối.</strong> Không có gì thay đổi: bracket là sự kiện
    <code>bracketPlace</code>.
  </li>
</ul>
<pre><code>{`// 2.x: là sự kiện, trừ khi yêu cầu      // 3.0: là order, trừ khi yêu cầu
chart.connectExecution(broker)             chart.connectExecution(broker, { brackets: 'event' })
chart.connectExecution(broker, { brackets: 'place' })   →   chart.connectExecution(broker)`}</code></pre>
<p>
  Bracket được gửi kèm khối lượng theo kích cỡ của nó. Bracket không có khối lượng thì không được xác nhận: nó ở lại trên chart, và
  <code>executionError</code> nói rõ điều đó (<code>reason: 'noQuantity'</code>). Thanh bracket của widget nay có
  ô khối lượng, nên bracket bắt đầu từ toolbar luôn có khối lượng; bracket do code của bạn bắt đầu nhận kích cỡ ở
  tham số thứ ba (xem <a href={href('/docs/trading')}>Trading</a>):
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // khối lượng sẽ lỗ 50 tại stop`}</code></pre>

<h3 id="trade-buttons">Bán và Mua hiện trên biểu đồ khi có execution adapter</h3>
<p>
  Khi một execution adapter đang kết nối và order ticket đang bật, widget giờ hiện Bán và Mua dưới legend của biểu
  đồ. Host nào kết nối adapter chỉ để vẽ order và position của mình thì tắt chúng đi:
</p>
<pre><code>{`new ChartWidget(el, { features: { tradeButtons: false } });`}</code></pre>
<p>
  Khi <code>orderTicket</code> tắt, hoặc không có adapter, hai nút này không bao giờ hiện. Host nào tắt từng công tắc
  đặt lệnh theo tên thì có thêm một tên: <code>tradeButtons</code> là công tắc mới, và bật nếu không đặt.
</p>

<h3 id="stop-limit">Tài khoản paper khớp stop-limit trong giới hạn của nó</h3>
<p>
  <code>PaperExecutionAdapter</code> trước đây khớp order <code>stopLimit</code> tại stop, như một stop order.
  Nay khi giá chạm stop, order trở thành limit order tại <code>price</code> của nó: order tiếp tục chờ (type là
  <code>'limit'</code>) cho tới khi giá nằm trong giới hạn. Test nào chờ có position ngay khi chạm stop thì đưa
  giá vào trong giới hạn trước, hoặc đặt order <code>'stop'</code>.
</p>

<h3 id="hand-prices">Giá đặt bằng tay nằm trên lưới giá của thị trường</h3>
<p>
  <code>orderModify</code>, <code>positionModify</code>, <code>bracketPlace</code>, <code>orderPlace</code> của order nháp hoặc của
  menu chuột phải, <code>priceAxisAdd</code> và <code>chartContextMenu</code> trước đây mang giá dưới con trỏ đúng như pixel cho ra
  (<code>62549.71592675613</code>). Giờ chúng mang giá trên bước giá của thị trường, còn không thì theo số chữ số thập phân trục giá
  đang hiển thị: đúng giá trị <code>chart.roundPrice</code> trả về. Bracket và order nháp cũng bắt đầu trên lưới, dù được bắt đầu ở giá nào, và alert được kéo cũng rơi trên lưới. Một đường được thả đúng bước giá cũ thì không báo gì. Code tự làm tròn
  các giá này có thể bỏ phần đó.
  Trên thị trường có giá trần và giá sàn trong ngày, giá của chính order cũng được giữ trong biên độ: kéo vượt qua thì được báo ở đúng mức trần hoặc sàn.
</p>

<h3 id="finger">Dưới ngón tay, không control nào nhỏ hơn 32 px</h3>
<p>
  Trên thiết bị có con trỏ chính là coarse (điện thoại, tablet), các control của widget giờ có ít nhất 32 px mỗi
  chiều, ở mọi look và <code>density</code>: widget <code>compact</code> trên tablet không còn nút 24 px, và mỗi hàng
  của legend indicator cao 32 px thay vì 20. Dưới chuột, hình vẽ giữ nguyên, chỉ vùng bấm thay đổi: ít nhất 20 px mỗi
  chiều. Trang nào đo các phần của widget trên màn cảm ứng (chiều cao của legend, của một dialog) sẽ đọc được số lớn hơn.
</p>

<h3 id="order-answer">Order từ ticket chờ adapter trả lời</h3>
<p>
  Khi có execution adapter đang kết nối, order ticket không còn đóng ngay khi đặt lệnh: nó chờ tới khi
  <code>placeOrder</code> của adapter resolve (ticket đóng) hoặc reject (ticket ở lại và nói lý do). Adapter nào có
  <code>placeOrder</code> không bao giờ kết thúc sẽ để ticket chờ mãi: hãy resolve với order, hoặc reject kèm lý do.
  Ba thứ nữa đổi theo. Mọi payload <code>orderPlace</code> giờ mang một <code>clientOrderId</code>, và
  <code>placeOrderIntent</code> trả về order như đã gửi (trước đây không trả về gì). Một market order từ ticket mang ask
  cho lệnh Mua và bid cho lệnh Bán làm <code>price</code>, khi feed cho cả hai (trước đây là giá cuối). Và một order đặt
  bằng một lần bấm, từ menu chuột phải hay DOM ladder, có khối lượng bằng một lot của thị trường nếu có (trước đây là 1,
  còn order của ladder không có khối lượng).
</p>

<h3 id="orders-by-symbol">Order, position và fill được vẽ trên symbol của chính nó</h3>
<p>
  Order, position hoặc fill nào ghi <code>symbol</code> thì chỉ được vẽ khi chart đang hiển thị symbol đó. Ở symbol
  khác nó được giữ lại: <code>getOrders()</code>, <code>getPositions()</code> và <code>getFills()</code> trả về
  toàn bộ tài khoản, và <code>chart.getSymbol()</code> cho biết phần nào đang được vẽ. Giờ chart ghi symbol đang
  hiển thị trên mọi payload <code>orderPlace</code> và tài khoản paper giữ nó, nên position mở ở một symbol không
  còn bị vẽ ở symbol kế tiếp như trước, với lãi lỗ tính từ sai giá. Cái nào không ghi symbol thì được vẽ trên mọi
  symbol, như trước: adapter của riêng bạn cho tài khoản nhiều symbol hãy ghi symbol trên order, position và fill
  của nó.
</p>
<p>
  Ba thứ thay đổi theo. Mọi fill mà <code>executionFill</code> và <code>getFills()</code> báo đều có
  <code>symbol</code> khi chart đang hiển thị một symbol, và <code>ChartWidget</code> không còn xoá các fill khi
  symbol của nó đổi: lịch sử và lãi lỗ đã chốt là của tài khoản, và các dấu trở lại cùng symbol của chúng.
  <code>setMarkPrice</code> nhận symbol làm tham số thứ ba, chart đưa nó vào trong replay: được đưa giá có ghi
  symbol, tài khoản paper khớp và định giá từng symbol theo giá của riêng nó; được đưa giá không ghi symbol, nó
  là một thị trường, như trước. Và với các bar đặt bằng tay, chart không biết symbol cho tới khi được báo:
  <code>chart.setSymbol(symbol)</code>, việc mà <code>ChartWidget</code> tự gọi.
<h3 id="hold-tooltip">Click giữ trên chart thì hiện popup giá</h3>
<p>
  Trong <code>ChartWidget</code>, giữ nút chuột yên trên vùng plot nửa giây sẽ hiện tooltip OHLCV nổi cho nến dưới con
  trỏ, cho tới khi nhả nút: tooltip đi theo con trỏ và chart không pan trong lúc đó. Vì vậy một lần nhấn giữ lâu như thế
  không còn là một click, cũng không bắt đầu một lần pan. Feature <code>crosshairTooltip</code> của widget giờ là
  <code>'hold'</code>, trước là <code>false</code>: truyền
  <code>{`chartOptions: { features: { crosshairTooltip: false } }`}</code> nếu không muốn popup, như trước, hoặc
  <code>true</code> để popup hiện dưới con trỏ đang hover. <code>Chart</code> headless không đổi: tooltip của nó đi theo
  con trỏ trừ khi được chỉ định khác, và nó cũng nhận <code>'hold'</code>.
</p>

<h3 id="live-price">Order một lần nhấn chờ giá trực tiếp</h3>
<p>
  Khi có feed riêng (<code>adapter</code>), <code>ChartWidget</code> không còn gửi order đặt bằng một lần nhấn (menu
  chuột phải, depth ladder), cũng như bracket hay draft order được xác nhận, trong lúc feed đó mất kết nối: nó nói lý
  do. Trong lúc feed mất kết nối, hoặc không gửi gì trong một phút (<code>feedQuietAfter</code>), ticket không gửi order
  thị trường, và status bar ghi “Không có cập nhật giá” ở chỗ trước đây vẫn ghi “Live” trên một stream đã đứng.
  <code>feedQuietAfter: 0</code> thì feed đang kết nối không bao giờ bị coi là im lặng; feed mất kết nối vẫn giữ order
  lại như thường.
</p>

<h3 id="confirmations">Giao dịch một lần nhấn được hỏi xác nhận, và bid trên ladder là giá mua</h3>
<p>
  <code>ChartWidget</code> giờ hỏi trước khi đóng hoặc đảo chiều một position (panel tài khoản, các nút trên chart) và
  trước khi đặt order từ menu chuột phải hay depth ladder: trước đây chúng được gửi đi chỉ bằng một lần nhấn.
  <code>confirmOrders: false</code> giữ cách một lần nhấn. Trên depth ladder, nhấn vào một bid giờ đặt
  <strong>buy</strong> limit tại giá đó, và nhấn vào một ask đặt <strong>sell</strong> limit, trong khi trước đây là
  bán vào bid và mua ở ask: <code>orderPlace</code> từ cùng một ô giờ mang side ngược lại so với trước. Test hay script
  nào nhấn các ô đó, hoặc chờ một order ngay lập tức, cần nhấn nút của hộp xác nhận
  (<code>.tcw-confirm .tcw-done-btn</code>) hoặc dùng option trên.
</p>

<h3 id="graphite">Look mặc định của widget là Graphite</h3>
<p>
  <code>ChartWidget</code> không có <code>ui</code> giờ được vẽ theo look Graphite, trước đây là Modern: nền
  trung tính, góc bo 3 px, toolbar 40 px, và thứ đang chọn hiện trên nền sáng hơn thay vì nền amber. Màu của chart
  đổi theo (<code>GRAPHITE_DARK_THEME</code>, <code>GRAPHITE_LIGHT_THEME</code>) trừ khi <code>theme</code> là object
  của bạn. <code>ui: 'modern'</code> giữ nguyên look cũ, cả màu. Token mặc định của stylesheet là của Graphite, nên
  CSS từng đặt vài token <code>--tcw-*</code> đè lên Modern giờ đè lên Graphite. Ở mọi look, nút của order ticket
  giờ ghi rõ order (<code>Buy 100 HPG</code>), giá trị order là dòng cuối ngay trên nút, và nút Reverse, Close của
  một position nằm ngay sau P&amp;L trong bảng tài khoản: test đọc chữ trên nút hoặc đọc cột theo vị trí cần đổi
  theo.
</p>

<h3 id="money">Cổ phiếu Việt Nam được tính giá trị bằng đồng</h3>
<p>
  <code>MARKET_HOSE</code>, <code>MARKET_HOSE_ETF</code>, <code>MARKET_HNX</code> và <code>MARKET_UPCOM</code>
  ghi giá theo nghìn đồng (26.40 là 26.400 đồng) và giờ khai rõ điều đó: <code>contractMultiplier</code> của chúng
  là 1.000. Giá trị order trong ticket, lãi lỗ của position trong bảng tài khoản và các số tiền trên tag của chart
  đều tính theo hệ số này, nên 100 cổ phiếu giá 26.40 hiện 2.640.000 thay vì 2.640. Ở mọi thị trường, số tiền trên
  tag của chart (lãi lỗ của position, số tiền stop hoặc target mang lại) giờ tính theo hệ số của thị trường như
  bảng tài khoản vẫn làm: tag của một position VN30F hiện theo đồng, không theo điểm.
  <code>scaleMarketPrices</code> chia hệ số cho factor của nó, nên
  <code>scaleMarketPrices(MARKET_HOSE, 1000)</code>, với giá theo đồng, có hệ số 1. Nếu bạn đang tự nhân 1.000
  (trong <code>formatAmount</code>, hoặc ở chỗ bạn hiển thị cạnh chart), hãy bỏ đi.
  <code>PaperExecutionAdapter</code> nhận <code>multiplier</code> riêng: hãy truyền
  <code>contractMultiplier</code> của thị trường, nếu không số dư và lãi lỗ của fill sẽ nhỏ hơn bảng tài khoản một
  nghìn lần. Không có gì gửi tới broker thay đổi: giá và khối lượng vẫn như cũ.
</p>

<h2 id="types">Các type được mở rộng</h2>
<p>
  <code>TimeInForce</code> nay là <code>'gtc' | 'day' | 'gtd' | 'ioc' | 'fok'</code>. Code xử lý mọi giá trị
  (một <code>switch</code> không có default, một <code>Record&lt;TimeInForce, …&gt;</code>) cần thêm ba giá trị
  mới; execution adapter của riêng bạn có thể từ chối những loại nó không nhận.
</p>
<p>
  <code>FillReason</code> cũng có <code>'liquidation'</code>, cho position mà tài khoản paper đã đóng trong một
  stop-out, và <code>ExecutionEventType</code> có <code>'marginCall'</code>. Cả hai không xảy ra trừ khi tài khoản
  paper được truyền <code>stopOutLevel</code> hoặc <code>marginCallLevel</code>, nhưng code xử lý mọi giá trị
  thì cần chúng.
</p>

<h2 id="unchanged">Không thay đổi</h2>
<ul>
  <li>Dữ liệu, layout và thiết lập đã lưu từ 2.x vẫn tải như trước.</li>
  <li>Indicator, drawing, theme và style key giữ nguyên tên.</li>
</ul>
