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
