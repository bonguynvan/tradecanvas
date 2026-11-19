<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugin — Tài liệu TradeCanvas</title>
  <meta name="description" content="Mở rộng TradeCanvas bằng chỉ báo, công cụ vẽ, loại biểu đồ và overlay tự viết qua plugin SDK." />
</svelte:head>

<h1>Plugin</h1>
<p>
  Mở rộng biểu đồ bằng <strong>chỉ báo</strong>, <strong>công cụ vẽ</strong>,
  <strong>loại biểu đồ</strong> và <strong>overlay</strong> tự viết, đăng ký toàn cục hoặc cho từng biểu đồ.
</p>

<h2>Đăng ký</h2>
<p>Có ba cách đăng ký, theo thứ tự ưu tiên: mặc định toàn cục, constructor, rồi gọi trực tiếp trên instance.</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>
<p>
  <code>ChartWidget</code> nhận plugin qua <code>plugins</code> (có kiểu, và gộp với <code>chartOptions.plugins</code> nếu có):
  chúng được đăng ký với biểu đồ của widget trước khi widget khôi phục bất cứ thứ gì, nên layout đã lưu
  (<code>persistLayouts</code>), template hoặc view được chia sẻ có nhắc đến chỉ báo tự viết sẽ khôi phục được nó.
  Với cùng một id, <code>plugins</code> của widget được ưu tiên hơn <code>chartOptions.plugins</code>, và <code>plugins</code>
  riêng của một ô trong grid thay cho plugin dùng chung của grid. Nếu đăng ký trên <code>widget.getChart()</code> sau khi layout đã
  được khôi phục thì chỉ báo đến quá muộn: layout đã bỏ nó ra.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>Các loại plugin</h2>
<table>
  <thead><tr><th>Loại</th><th>Giao kèo</th><th>Vẽ ở</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>overlay hoặc panel</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>lớp overlay</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + <code>transform()</code> tuỳ chọn</td><td>chuỗi dữ liệu chính</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>Chỉ báo tự viết</h2>
<p>
  Một chỉ báo là một <code>IndicatorPlugin</code>: một <code>descriptor</code> mô tả chỉ báo là gì và hiển thị
  ra sao, và một hàm <code>calculate()</code> trả về giá trị cho từng nến. Kế thừa <code>IndicatorBase</code> thì biểu đồ
  làm phần còn lại dựa trên descriptor: vẽ các plot, co giãn pane, gắn nhãn giá trị trên trục, và liệt kê
  chỉ báo trong legend, phần cài đặt và dialog Chỉ báo. Dưới đây là một chỉ báo đầy đủ, một MACD đánh dấu chỗ
  đường đổi hướng:
</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart'

const ema = (prev, value, period) => (prev === undefined ? value : prev + (2 / (period + 1)) * (value - prev))

class TurningMacd extends IndicatorBase {
  descriptor = {
    id: 'turning-macd', name: 'Turning MACD', shortName: 'TMACD',
    placement: 'panel',               // a pane of its own; 'overlay' draws on the price pane
    category: 'oscillators',          // its group in the Indicators dialog
    defaultConfig: { fast: 12, slow: 26, source: 'close' },
    inputs: {
      fast: { kind: 'int', min: 2, label: 'Fast' },
      slow: { kind: 'int', min: 3, label: 'Slow' },
      source: { kind: 'choice', label: 'Price', options: [{ value: 'close', label: 'Close' }, { value: 'hl2', label: 'Median' }] },
    },
    plots: [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers', tone: { field: 'up' }, downColor: 2 },
    ],
    scale: { zero: true },
    levels: [0],
    defaultStyle: (theme) => ({ colors: theme.name === 'light' ? ['#1f4e8c', '#0a7d3b', '#b3261e'] : ['#8ab4f8', '#4cc38a', '#f28b82'] }),
  }

  calculate(data, config) {
    const { fast, slow, source } = config.params
    const values = new IndicatorValueMap()
    const series = new Array(data.length).fill(null)
    let f, s
    for (let i = 0; i < data.length; i++) {
      const bar = data[i]
      const price = source === 'hl2' ? (bar.high + bar.low) / 2 : bar.close
      f = ema(f, price, fast)
      s = ema(s, price, slow)
      if (i < slow) continue
      const point = { value: f - s }
      const a = series[i - 2]?.value, b = series[i - 1]?.value
      // The bar before this one is a turn when the line changed direction there.
      if (a !== undefined && b !== undefined && (b - a) * (point.value - b) < 0) {
        series[i - 1] = { ...series[i - 1], turn: b, up: point.value > b ? 1 : 0 }
        values.set(data[i - 1].time, series[i - 1])
      }
      series[i] = point
      values.set(bar.time, point)
    }
    return { values, series }
  }
}`}</code></pre>
<p>
  <code>calculate(data, config)</code> nhận các nến và tham số của instance (<code>config.params</code>), và
  trả về giá trị hai lần: theo chỉ số nến (<code>series</code>, <code>null</code> trước giá trị đầu tiên) và theo thời gian
  của nến (<code>values</code>). Dùng <code>new IndicatorValueMap()</code> cho <code>values</code>: một <code>Map</code>
  điền theo thứ tự thời gian rẻ hơn nhiều lần, mà mỗi lần đổi mã hoặc khung thời gian đều phải điền lại. Trường không có plot nào nhắc tới
  (<code>up</code> ở trên) không được vẽ, không ảnh hưởng thang và không hiển thị; nó tồn tại để <code>tone</code> của một plot đọc.
</p>

<h3>Descriptor</h3>
<ul>
  <li><strong>Plot</strong>: mỗi plot vẽ một trường: <code>'line'</code> (mặc định), <code>'step'</code>,
    <code>'histogram'</code>, <code>'dots'</code> (đường vẽ bằng các chấm), hoặc <code>'markers'</code>, một hình
    (<code>shape</code>: <code>'dot'</code>, <code>'triangleUp'</code>, <code>'triangleDown'</code>) trên các nến mà trường
    có giá trị, đặt tại giá trị đó hoặc, trên pane giá, phía trên hay phía dưới nến (<code>position</code>). <code>color</code> là
    chỉ số trong danh sách màu của style; <code>tone</code> và <code>downColor</code> vẽ một plot bằng hai màu;
    <code>width</code>, <code>lineStyle</code>, <code>opacity</code> và <code>breakOn</code> đặt kiểu hiển thị của đường.
    <code>fills</code> tô màu giữa hai plot.</li>
  <li><strong>Input</strong>: khai báo cách sửa từng tham số trong <code>defaultConfig</code>: <code>kind</code>,
    <code>label</code>, <code>min</code>, <code>max</code>, <code>step</code>, và <code>options</code> của một choice, dạng giá trị thuần hoặc
    kèm nhãn cho từng giá trị (<code>{'{ value, label }'}</code>). <code>{'{ source: true }'}</code> cho phép tính trên một
    giá khác hoặc trên đường của chỉ báo khác.</li>
  <li><strong>Pane</strong>: <code>scale</code> cố định biên của pane hoặc luôn giữ mức 0 trong vùng nhìn, <code>levels</code> vẽ
    các đường tham chiếu mà người xem sửa được.</li>
  <li><strong>Kiểu hiển thị</strong>: <code>defaultStyle</code>, một style hoặc một style cho mỗi theme (xem bên dưới).</li>
</ul>

<h3>Tick thời gian thực: update và revisesBefore</h3>
<p>
  Mỗi tick chỉ làm thay đổi nến mới nhất. Không có <code>update()</code>, biểu đồ chạy lại <code>calculate()</code> trên
  toàn bộ lịch sử; có nó, biểu đồ trả lại output gần nhất của bạn (<code>prev</code>) và nến đầu tiên
  thay đổi (<code>from</code>), và bạn tính lại từ đó. Trả về <code>null</code> để biểu đồ chạy <code>calculate()</code>
  thay thế; các giá trị phải trùng với kết quả mà hàm đó cho ra. <code>canResume</code> và <code>writePoint</code> có sẵn trong
  <code>IndicatorBase</code>.
</p>
<p>
  Mỗi nến của chỉ báo như dưới đây được tính từ các nến xung quanh nó, không phải từ trạng thái tích luỹ như
  các đường trung bình của TurningMacd (loại đó sẽ tự giữ trạng thái, hoặc bỏ <code>update</code> đi):
</p>
<pre><code>{`// A swing high: the bar is higher than the n bars either side of it.
pointAt(data, i, n) {
  if (i < n || i + n >= data.length) return null
  for (let k = 1; k <= n; k++) if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null
  return { high: data[i].high }
}

update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null
  const n = config.params.strength
  // A new bar decides the bar n back: rewrite from there.
  for (let i = Math.max(0, from - n); i < data.length; i++) this.writePoint(prev, data, i, this.pointAt(data, i, n))
  return prev
}

revisesBefore(config) { return config.params.strength }`}</code></pre>
<p>
  <code>from</code> luôn là nến đầu tiên thay đổi. Khi một nến mới có thể làm thay đổi các nến trước nó (swing point,
  điểm đảo chiều, fractal được xác định bởi các nến sau nó), <code>update</code> tự ghi lại các nến đó, và
  <code>revisesBefore(config)</code> cho biết bao nhiêu nến, để các chỉ báo đọc đường của chỉ báo này cũng được tính lại từ
  đó. Bỏ hàm này đi khi chỉ các nến từ <code>from</code> trở đi thay đổi.
</p>

<h3>Vẽ chỉ báo</h3>
<p>
  <code>render()</code> của <code>IndicatorBase</code> vẽ <code>plots</code> và <code>fills</code> theo thang của
  pane, nên phần lớn chỉ báo không cần code vẽ. Để vẽ thêm, override hàm này và gọi bản gốc trước. Tham số thứ năm
  chứa theme mà biểu đồ đang dùng, để lấy màu và font mà style không có: <code>theme.candleUp</code>,
  <code>theme.candleDown</code>, <code>theme.text</code>, <code>theme.font</code>.
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>Màu theo theme</h3>
<p>
  <code>defaultStyle</code> trong descriptor là kiểu hiển thị ban đầu của chỉ báo: một style, hoặc một hàm nhận
  theme và trả về style cho từng theme. Instance dùng style này sẽ đổi theo <code>chart.setTheme()</code>; màu do người dùng chọn
  cho nó thì giữ nguyên. Nó nằm dưới mặc định mà người xem đã lưu (<code>chart.setIndicatorDefaults()</code>, mục
  <em>Save as default</em> của widget), nên màu của ứng dụng không bao giờ thay màu của người xem. Layout đã lưu bỏ qua phần
  do theme quy định, và khi mở ở theme khác thì nhận màu của theme đó.
</p>

<h3>Đăng ký trước khi đọc layout</h3>
<p>
  Layout đã lưu gọi chỉ báo bằng id, và chỉ báo chưa được đăng ký lúc đọc layout sẽ bị bỏ ra. Truyền
  chỉ báo của bạn cho <code>ChartWidget</code> qua <code>plugins</code>: chúng được đăng ký trước khi widget khôi phục layout
  (<code>persistLayouts</code>), template hoặc view được chia sẻ. Với <code>Chart</code>, truyền <code>plugins</code> vào
  constructor, hoặc đăng ký trước khi gọi <code>loadState()</code>.
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>Biểu đồ đọc gì từ chỉ báo</h3>
<ul>
  <li><strong>Legend</strong> gọi tên chỉ báo bằng <code>shortName</code> cùng các tham số khác với
    <code>defaultConfig</code> (choice hiện theo nhãn), và hiện giá trị của từng plot trừ markers, theo màu của plot.</li>
  <li><strong>Trục giá</strong> gắn nhãn giá trị mới nhất của các plot đó.</li>
  <li><strong>File CSV export</strong> có một cột cho mỗi plot, đặt tên theo tên trên legend và, khi có
    nhiều hơn một plot, theo <code>title</code> của plot.</li>
  <li><strong>Dialog cài đặt</strong> sửa các tham số, liệt kê từng plot với màu, trạng thái hiện/ẩn, và kiểu
    nét đứt cho line hoặc step, và sửa các mức.</li>
  <li><strong>Dialog Chỉ báo</strong> liệt kê chỉ báo theo <code>name</code> trong nhóm <code>category</code> của nó.</li>
  <li><strong>Chỉ báo khác</strong> có thể đọc các đường của nó (chính các plot đó) làm nguồn dữ liệu.</li>
</ul>
<p>
  Coding agent nhận cùng hướng dẫn này, với code được kiểm tra kiểu theo các package đã phát hành, qua tool
  <code>custom_indicator</code> của MCP server và
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">recipe chỉ báo tự viết</a> của skill.
</p>

<h2>Công cụ vẽ tự viết</h2>
<p>
  Kế thừa <code>DrawingBase</code> để dùng các hàm hỗ trợ của nó (đổi anchor sang pixel, kiểu
  đường, handle), mô tả công cụ, rồi đăng ký. Các thiết lập khai báo trong
  <code>descriptor.options</code> hiện trong dialog cài đặt của widget và
  được lưu cùng hình vẽ.
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* at this.anchorToPixel(state.anchors[0], viewport) */ }
  hitTest(point, state, viewport, tolerance) { /* is the pointer on it? */ return false }
  // optional: the prices of its lines, so an alert can follow them
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  Tên công cụ dùng được ở mọi chỗ biểu đồ nhận tên công cụ (<code>setDrawingTool</code>, <code>addDrawing</code>…), cả trong TypeScript:
  <code>DrawingToolType</code> nhận mọi tên và vẫn gợi ý các tên có sẵn, được liệt kê trong <code>BuiltInDrawingToolType</code>.
</p>
<p>
  Descriptor cũng có thể khai báo cách vẽ công cụ (<code>creation</code>:
  <code>'clicks'</code>, <code>'freehand'</code> hoặc <code>'path'</code>, cùng
  <code>maxAnchors</code>) và dialog có ô tô màu
  (<code>fill</code>) hay ô chữ (<code>text</code>) hay không. Công cụ có thể di chuyển các handle
  không phải anchor bằng <code>moveHandle()</code>, và nhận các nến của biểu đồ
  qua <code>setDataGetter(getter, revision)</code> khi cần vẽ từ chúng.
  <code>revision()</code> thay đổi khi một nến được sửa trong cùng mảng
  (<code>updateBar</code>): công cụ nào giữ kết quả tính từ các nến
  thì khi đó tính lại.
</p>

<h2>Loại biểu đồ tự viết</h2>
<p><code>ChartTypePlugin</code> cung cấp một renderer và một hàm biến đổi dữ liệu tuỳ chọn; chuyển sang loại này giống như loại có sẵn:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Overlay tự viết</h2>
<p><code>OverlayPlugin</code> vẽ mỗi frame trên lớp bạn chọn, nhận viewport, dữ liệu và theme hiện tại:</p>
<pre><code>{`import { overlayScale, registerPlugin } from '@tradecanvas/chart'

registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'high-marks', name: 'High marks', layer: 'main' },
    render(ctx, context) {
      const s = overlayScale(context)
      ctx.fillStyle = '#f2a93b'
      for (let i = s.visible.from; i <= s.visible.to; i++) {
        const bar = context.data[i]
        ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(bar.high) - 1, s.barWidth, 2)
      }
    },
  },
})`}</code></pre>
<p>
  <code>overlayScale(context)</code> đặt mọi thứ đúng chỗ biểu đồ vẽ: <code>timeToX</code> / <code>xToTime</code>
  theo thời gian của nến (giữa các nến và sau nến mới nhất thì nội suy theo tỉ lệ), <code>indexToX</code> / <code>xToIndex</code>,
  <code>priceToY</code> / <code>yToPrice</code> (cả trên thang log hoặc thang đảo ngược), <code>barWidth</code>, và
  <code>visible</code>, các nến đang hiện trên màn hình. Với các hàng trên lưới giá, <code>chart.getPriceStep()</code> là
  bước giá nhỏ nhất của mã (<code>minTick</code>), đơn vị của giá dạng phân số, hoặc một đơn vị của số chữ số thập phân mà giá đang hiển thị.
  Renderer của loại biểu đồ chỉ nhận viewport, còn chỉ báo nhận viewport và theme: <code>priceToY</code>, <code>barIndexToX</code>,
  <code>timeToX</code> và các hàm ngược của chúng được export cho các trường hợp này. Các nến là những nến trên màn hình: trên biểu đồ Renko hoặc
  Kagi, đó là các brick (<code>chart.isTimeAligned()</code> cho biết khi nào chúng là nến của feed).
  Để viết giá giống như trục giá, viewport mang định dạng giá riêng của biểu đồ nếu có
  (<code>formatPrice</code>), <code>numberLocale</code> của biểu đồ, và số chữ số thập phân của thị trường hoặc của mã nếu có
  quy định (<code>pricePrecision</code>); pane của chỉ báo không đặt định dạng và số chữ số thập phân.
</p>
<p>
  Overlay có thiết lập riêng (chế độ hiển thị, một công tắc) có thể hiện thay đổi ngay, kể cả khi không có
  tick nào đến để vẽ lại biểu đồ: đặt <code>enabled: false</code> trên plugin để ẩn nó mà vẫn giữ
  đăng ký, và gọi <code>chart.requestRender()</code> sau khi thay đổi một trong hai. Các yêu cầu trước frame
  tiếp theo gộp thành một frame.
</p>

<p>Xem <a href={href('/docs/api')}>tham chiếu API</a> để biết đầy đủ chữ ký kiểu của plugin.</p>
