<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
</script>

<svelte:head>
  <title>Chỉ báo — Tài liệu TradeCanvas</title>
  <meta name="description" content="{catalog.length} chỉ báo kỹ thuật có sẵn: đường trung bình động, dải, dao động, khối lượng và biến động, với nguồn dữ liệu, chỉ báo trên chỉ báo và mức chỉnh được." />
</svelte:head>

<h1>Chỉ báo</h1>
<p>
  {catalog.length} chỉ báo có sẵn. Thêm một chỉ báo bằng id của nó; tham số bạn bỏ qua sẽ lấy
  giá trị mặc định, và tham số không hợp lệ cũng quay về giá trị mặc định.
</p>

<h2>Thêm một chỉ báo</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> trả về một id instance: cùng một chỉ báo có thể thêm nhiều
  lần, mỗi instance có thông số, màu và mức riêng.
</p>

<h2>Nguồn dữ liệu và chỉ báo trên chỉ báo</h2>
<p>
  Các chỉ báo có đánh dấu <em>nguồn</em> bên dưới có thể chạy trên một giá khác giá đóng cửa
  (<code>open</code>, <code>high</code>, <code>low</code>, <code>hl2</code>, <code>hlc3</code>,
  <code>ohlc4</code>, <code>hlcc4</code>) hoặc trên đường của một chỉ báo khác. Đường trung bình động của RSI
  được vẽ trong bảng của RSI, trên thang của RSI, và bị xoá cùng lúc với RSI.
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  Các chỉ báo ở bảng riêng cũng có thể dùng chung một bảng:
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>.
</p>

<h2>Mức, màu và giá trị</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  Giá trị mới nhất của mỗi đường được gắn nhãn trên trục bằng màu của đường đó; tắt các nhãn này bằng
  <code>features.indicatorValueLabels: false</code> hoặc <code>setIndicatorValueLabelsVisible(false)</code>.
  Các đường, mức, trục và con trỏ chữ thập trong cùng một bảng dùng chung một thang.
</p>

<h2>Trên bảng giá chính ({overlays.length})</h2>
<table>
  <thead><tr><th>id</th><th>Tên</th><th>Tham số mặc định</th><th>Đường</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· nguồn</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> vẽ một đường trung bình động từ khung thời gian lớn hơn lên biểu đồ hiện tại — ví dụ
  MA50 khung ngày trên nến 1h. Nó chỉ lấy trung bình các giá đóng cửa <em>đã hoàn tất</em> của khung lớn hơn, nên
  đổi bậc tại mỗi ranh giới và không bao giờ vẽ lại (repaint).
</p>

<h2>Trong bảng riêng ({panes.length})</h2>
<table>
  <thead><tr><th>id</th><th>Tên</th><th>Tham số mặc định</th><th>Đường</th><th>Mức</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· nguồn</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code> (Volume Delta) ước lượng áp lực mua/bán từ OHLCV — nến đóng cửa tăng
  cộng khối lượng dương, nến giảm cộng khối lượng âm. <code>mode: 0</code> là histogram theo từng nến,
  <code>mode: 1</code> là delta luỹ kế. (Delta tick thực sự cần dữ liệu bid/ask theo từng giao dịch, thứ mà
  một chuỗi OHLCV không có.)
</p>

<h2>Chỉ báo của riêng bạn</h2>
<p>
  Kế thừa <code>IndicatorBase</code> và khai báo những gì nó vẽ (<code>plots</code>), thang của bảng,
  các mức và thông số; biểu đồ sẽ tự vẽ nó, co giãn bảng của nó, gắn nhãn giá trị và liệt kê nó trong
  chú thích và phần cài đặt của widget mà bạn không phải viết dòng code vẽ nào. Xem
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">hướng dẫn mẫu cho chỉ báo tuỳ chỉnh</a>.
</p>

<h2>Bảng: đổi kích thước, thu gọn, phóng to, sắp xếp lại</h2>
<p>
  <strong>Kéo đường phân cách</strong> phía trên một bảng để đổi kích thước. Trong ChartWidget, mỗi bảng
  có các nút ở góc phải trên: đưa bảng lên hoặc xuống, thu gọn chỉ còn dòng tiêu đề, phóng to
  (các bảng khác thu gọn lại, còn bảng giá chính giữ một dải hẹp). Bố cục đã lưu giữ kích thước, thứ tự,
  trạng thái thu gọn và phóng to của từng bảng. Làm điều tương tự bằng code:
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  Bấm chuột phải vào một bảng trong ChartWidget để bật thang logarit, thang đảo ngược hoặc thang phần trăm riêng cho bảng đó.
</p>

<h2>Chuyển một chỉ báo sang bảng khác</h2>
<p>
  Một chỉ báo có thể vào bảng của một chỉ báo khác (khi đó nó dùng chung thang của bảng đó),
  có bảng riêng, hoặc quay về bảng giá chính. Khi nó rời một bảng mà nó làm chủ, các chỉ báo khác
  trong bảng vẫn ở lại (chỉ báo kế tiếp trong bảng sẽ làm chủ bảng), và các chỉ báo đọc đường của nó
  sẽ đi theo nó. Trong ChartWidget, nút <strong>⋯</strong> trên một dòng chú thích cho chọn bảng phía
  trên, bảng phía dưới, một bảng mới và bảng giá chính.
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>Hoàn tác và mẫu</h2>
<p>
  Thêm, xoá, sửa và di chuyển chỉ báo đều là các bước hoàn tác, nằm chung lịch sử với hình vẽ
  (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>); một chỉ báo được khôi phục khi hoàn tác sẽ quay lại
  với đúng id cũ, nên các cảnh báo trên đường của nó vẫn khớp. Một loạt chỉnh sửa liền nhau trên cùng
  một chỉ báo (kéo chọn màu, gõ chu kỳ) tính là một bước. Khi tải một bố cục, lịch sử bắt đầu lại từ đầu.
</p>
<p>
  Có thể lấy ra và đặt lại toàn bộ chỉ báo cùng một lúc, và đó chính là việc mẫu chỉ báo của
  ChartWidget làm: <strong>Lưu indicator thành mẫu…</strong> trong menu Chỉ báo lưu chúng (thông số,
  kiểu, mức, bảng) dưới một cái tên, còn chọn một mẫu sẽ đặt chúng vào thay cho các chỉ báo hiện có
  của biểu đồ, trong một bước hoàn tác.
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>Tính toán bên ngoài biểu đồ</h2>
<p>
  <code>IndicatorWorkerHost</code> tính một chỉ báo từ dữ liệu nến bằng chính các thông điệp mà một Web Worker
  sẽ dùng. Script worker chưa có trong các gói đã phát hành, nên hãy truyền <code>null</code> và đăng ký
  các plugin để tính ngay tại chỗ (SSR, test, script):
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>
