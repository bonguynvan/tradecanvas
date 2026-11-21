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
  Bracket được gửi kèm khối lượng theo kích cỡ của nó. Bracket không có khối lượng thì không được gửi, và
  <code>executionError</code> nói rõ điều đó (<code>reason: 'noQuantity'</code>). Thanh bracket của widget nay có
  ô khối lượng, nên bracket bắt đầu từ toolbar luôn có khối lượng; bracket do code của bạn bắt đầu nhận kích cỡ ở
  tham số thứ ba (xem <a href={href('/docs/trading')}>Trading</a>):
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // khối lượng sẽ lỗ 50 tại stop`}</code></pre>

<h2 id="unchanged">Không thay đổi</h2>
<ul>
  <li>Dữ liệu, layout và thiết lập đã lưu từ 2.x vẫn tải như trước.</li>
  <li>Indicator, drawing, theme và style key giữ nguyên tên.</li>
</ul>
