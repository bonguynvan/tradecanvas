<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Plugin — Tài liệu TradeCanvas</title>
  <meta name="description" content="Mở rộng TradeCanvas bằng chỉ báo, công cụ vẽ, loại biểu đồ và lớp phủ tuỳ chỉnh qua plugin SDK." />
</svelte:head>

<h1>Plugin</h1>
<p>
  Mở rộng biểu đồ bằng <strong>chỉ báo</strong>, <strong>công cụ vẽ</strong>,
  <strong>loại biểu đồ</strong> và <strong>lớp phủ</strong> tuỳ chỉnh — đăng ký toàn cục hoặc cho từng biểu đồ.
</p>

<h2>Đăng ký</h2>
<p>Có ba cách đăng ký, theo thứ tự ưu tiên: mặc định toàn cục, qua constructor, rồi gọi trực tiếp trên instance.</p>
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
  Một <code>ChartWidget</code> nhận chúng qua <code>plugins</code> (có kiểu, và cùng với mọi <code>chartOptions.plugins</code>):
  chúng được đăng ký với chart của nó trước khi nó khôi phục bất cứ thứ gì, nên một bố cục đã lưu
  (<code>persistLayouts</code>), một mẫu hay một view được chia sẻ có nhắc tới một chỉ báo của bạn sẽ có lại chỉ báo đó.
  Với cùng một id, <code>plugins</code> của widget thắng <code>chartOptions.plugins</code>, và <code>plugins</code> riêng
  của một ô trong grid thay cho các plugin dùng chung của grid. Đăng ký trên <code>widget.getChart()</code> sau khi bố cục
  đã được khôi phục thì chỉ báo tới quá muộn: bố cục đã bỏ nó ra rồi.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>Các loại plugin</h2>
<table>
  <thead><tr><th>Loại</th><th>Interface</th><th>Vẽ ở</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>phủ lên biểu đồ hoặc pane riêng</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>lớp overlay</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + <code>transform()</code> tuỳ chọn</td><td>chuỗi chính</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>Chỉ báo tuỳ chỉnh</h2>
<p>
  Một chỉ báo là một <code>IndicatorPlugin</code>: một <code>descriptor</code> cho biết nó là gì và trông ra sao, cùng
  một <code>calculate()</code> cho ra một giá trị mỗi nến. Kế thừa <code>IndicatorBase</code> thì chart lo phần còn lại
  dựa trên descriptor: nó vẽ các đường, chia thang cho pane, gắn nhãn giá trị trên trục, và liệt kê chỉ báo trong
  legend, phần cài đặt và hộp thoại Indicators. Đây là một chỉ báo trọn vẹn, một MACD đánh dấu chỗ đường của nó
  đổi hướng:
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
  <code>calculate(data, config)</code> nhận các nến và input của instance (<code>config.params</code>) rồi trả về các
  giá trị của nó hai lần: theo chỉ số nến (<code>series</code>, <code>null</code> trước giá trị đầu tiên) và theo thời
  gian nến (<code>values</code>). Dùng <code>new IndicatorValueMap()</code> cho <code>values</code>: một <code>Map</code>
  rẻ hơn nhiều lần khi điền theo thứ tự thời gian, việc mà mỗi lần đổi mã hay đổi khung thời gian đều làm. Một trường
  không đường nào nhắc tới (<code>up</code> ở trên) thì không được vẽ, không tính vào thang và không hiện; nó ở đó để
  dùng cho <code>tone</code> của một đường.
</p>

<h3>Descriptor</h3>
<ul>
  <li><strong>Các đường</strong> (plots) mỗi đường vẽ một trường: <code>'line'</code> (mặc định), <code>'step'</code>,
    <code>'histogram'</code>, <code>'dots'</code> (một đường vẽ bằng chấm), hoặc <code>'markers'</code>, một hình
    (<code>shape</code>: <code>'dot'</code>, <code>'triangleUp'</code>, <code>'triangleDown'</code>) trên những nến mà trường
    có giá trị, tại giá trị đó hoặc, trên pane giá, phía trên hay phía dưới nến (<code>position</code>). <code>color</code>
    là chỉ số trong danh sách màu của style; <code>tone</code> và <code>downColor</code> vẽ một đường bằng hai màu;
    <code>width</code>, <code>lineStyle</code>, <code>opacity</code> và <code>breakOn</code> đặt dáng vẻ của một đường.
    <code>fills</code> tô vùng giữa hai đường.</li>
  <li><strong>Các input</strong> cho biết mỗi input trong <code>defaultConfig</code> được sửa thế nào: <code>kind</code>,
    <code>label</code>, <code>min</code>, <code>max</code>, <code>step</code>, và <code>options</code> của một lựa chọn, để
    trơn hoặc kèm nhãn cho từng cái (<code>{'{ value, label }'}</code>). <code>{'{ source: true }'}</code> cho nó chạy trên
    một giá khác hoặc trên đường của một chỉ báo khác.</li>
  <li><strong>Pane</strong>: <code>scale</code> cố định biên của nó hoặc giữ số 0 trong tầm nhìn, <code>levels</code> vẽ
    các đường tham chiếu mà người xem sửa được.</li>
  <li><strong>Dáng vẻ</strong>: <code>defaultStyle</code>, một style hoặc một style cho mỗi theme (xem dưới).</li>
</ul>

<h3>Tick trực tiếp: update và revisesBefore</h3>
<p>
  Mỗi tick chỉ nến mới nhất thay đổi. Không có <code>update()</code> thì chart chạy lại <code>calculate()</code> trên
  toàn bộ lịch sử; có nó, chart trả lại kết quả lần trước của bạn (<code>prev</code>) cùng nến đầu tiên đã thay đổi
  (<code>from</code>), và bạn tính lại từ đó. Trả về <code>null</code> để <code>calculate()</code> chạy thay; các giá trị
  phải đúng là những giá trị nó sẽ cho. <code>canResume</code> và <code>writePoint</code> có sẵn trong
  <code>IndicatorBase</code>.
</p>
<p>
  Mỗi nến của một chỉ báo như dưới đây được tính từ các nến xung quanh nó, không phải từ một trạng thái tích luỹ như
  các đường trung bình của TurningMacd (chỉ báo đó sẽ tự giữ trạng thái của mình, hoặc bỏ <code>update</code> đi):
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
  <code>from</code> luôn là nến đầu tiên đã thay đổi. Khi một nến mới có thể làm thay đổi các nến trước nó (một điểm
  swing, một điểm đảo chiều, một fractal được quyết định bởi các nến sau nó), <code>update</code> tự viết lại các nến
  đó, và <code>revisesBefore(config)</code> cho biết bao nhiêu nến, để các chỉ báo đọc đường của chỉ báo này cũng được
  tính lại từ đó. Bỏ nó đi khi chỉ các nến từ <code>from</code> trở đi thay đổi.
</p>

<h3>Vẽ chỉ báo</h3>
<p>
  <code>render()</code> của <code>IndicatorBase</code> vẽ <code>plots</code> và <code>fills</code> theo thang của pane,
  nên phần lớn chỉ báo không cần code vẽ nào. Muốn vẽ thêm, hãy override nó và gọi nó trước. Đối số thứ năm chứa
  theme mà chart đang dùng để vẽ, cho các màu và font mà style không có: <code>theme.candleUp</code>,
  <code>theme.candleDown</code>, <code>theme.text</code>, <code>theme.font</code>.
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>Màu theo theme</h3>
<p>
  <code>defaultStyle</code> trên descriptor là dáng vẻ ban đầu của chỉ báo: một style, hoặc một hàm của theme cho ra
  một style cho mỗi theme. Một instance dùng nó sẽ theo <code>chart.setTheme()</code>; màu mà ai đó chọn cho nó thì
  được giữ nguyên. Nó nằm dưới mặc định mà người xem đã lưu (<code>chart.setIndicatorDefaults()</code>, mục
  <em>Save as default</em> của widget), nên màu của ứng dụng bạn không bao giờ chiếm chỗ của người xem. Bố cục đã lưu
  bỏ ra những gì theme cho, và khi mở trong một theme khác thì nó lấy màu của theme đó.
</p>

<h3>Đăng ký trước khi bố cục được đọc</h3>
<p>
  Bố cục đã lưu gọi tên chỉ báo theo id, và chỉ báo nào chưa được đăng ký lúc bố cục được đọc sẽ bị bỏ ra. Hãy đưa
  các chỉ báo của bạn cho <code>ChartWidget</code> qua <code>plugins</code>: chúng được đăng ký trước khi nó khôi phục
  một bố cục (<code>persistLayouts</code>), một mẫu hay một view được chia sẻ. Với <code>Chart</code>, truyền
  <code>plugins</code> vào constructor, hoặc đăng ký trước <code>loadState()</code>.
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>Chart đọc gì từ nó</h3>
<ul>
  <li><strong>Legend</strong> gọi nó bằng <code>shortName</code> cùng các input khác với <code>defaultConfig</code>
    (một lựa chọn thì bằng nhãn của nó), và hiện giá trị của mỗi đường trừ markers, theo màu của đường đó.</li>
  <li><strong>Trục giá</strong> gắn nhãn giá trị mới nhất của các đường đó.</li>
  <li><strong>File CSV xuất ra</strong> có một cột cho mỗi đường, đặt tên theo tên trong legend và, khi có nhiều hơn
    một đường, theo <code>title</code> của đường.</li>
  <li><strong>Hộp thoại cài đặt</strong> sửa các input, liệt kê mỗi đường với màu của nó, việc nó có hiện hay không,
    và kiểu nét cho một line hay một step, và sửa các levels.</li>
  <li><strong>Hộp thoại Indicators</strong> liệt kê nó theo <code>name</code> trong nhóm <code>category</code> của nó.</li>
  <li><strong>Chỉ báo khác</strong> có thể đọc các đường của nó (cũng chính các đường ấy) làm nguồn.</li>
</ul>
<p>
  Coding agent nhận cùng hướng dẫn này, với code được type-check theo các package đã phát hành, từ tool
  <code>custom_indicator</code> của máy chủ MCP và
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">công thức chỉ báo tuỳ chỉnh</a> của skill.
</p>

<h2>Công cụ vẽ tuỳ chỉnh</h2>
<p>
  Kế thừa <code>DrawingBase</code> để có sẵn các hàm hỗ trợ (đổi điểm neo ra
  pixel, kiểu nét, điểm kéo), mô tả công cụ rồi đăng ký nó. Các cài đặt liệt kê
  trong <code>descriptor.options</code> sẽ hiện trong hộp thoại cài đặt của
  widget và được lưu cùng hình vẽ.
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* tại this.anchorToPixel(state.anchors[0], viewport) */ }
  hitTest(point, state, viewport, tolerance) { /* con trỏ có nằm trên nó không? */ return false }
  // tuỳ chọn: giá của các đường, để cảnh báo có thể bám theo
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  Tên của công cụ dùng được ở mọi chỗ chart nhận tên công cụ (<code>setDrawingTool</code>, <code>addDrawing</code>…), cả trong TypeScript:
  <code>DrawingToolType</code> nhận mọi tên mà vẫn gợi ý các công cụ có sẵn, liệt kê trong <code>BuiltInDrawingToolType</code>.
</p>
<p>
  Descriptor còn có thể cho biết công cụ được vẽ ra sao (<code>creation</code>:
  <code>'clicks'</code>, <code>'freehand'</code> hoặc <code>'path'</code>, kèm
  <code>maxAnchors</code>) và hộp thoại có cho chọn màu nền
  (<code>fill</code>) hay chữ (<code>text</code>) hay không. Công cụ có thể
  di chuyển các điểm kéo không phải điểm neo bằng <code>moveHandle()</code>, và
  nhận các nến của biểu đồ qua <code>setDataGetter(getter, revision)</code> khi
  nó vẽ dựa trên chúng. <code>revision()</code> thay đổi khi một nến được sửa
  ngay trong cùng mảng (<code>updateBar</code>): công cụ giữ lại kết quả đã tính
  từ các nến thì khi đó tính lại.
</p>

<h2>Loại biểu đồ tuỳ chỉnh</h2>
<p>Một <code>ChartTypePlugin</code> cung cấp bộ render và một phép biến đổi dữ liệu tuỳ chọn; chuyển sang nó như với một loại có sẵn:</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>Lớp phủ tuỳ chỉnh</h2>
<p>Một <code>OverlayPlugin</code> vẽ mỗi khung hình trên lớp bạn chọn, nhận khung nhìn, dữ liệu và giao diện (theme) hiện tại:</p>
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
  <code>overlayScale(context)</code> đặt mọi thứ đúng chỗ chart vẽ: <code>timeToX</code> / <code>xToTime</code>
  theo thời gian nến (giữa hai nến và sau nến mới nhất thì theo tỉ lệ), <code>indexToX</code> / <code>xToIndex</code>,
  <code>priceToY</code> / <code>yToPrice</code> (cả thang log và thang đảo ngược), <code>barWidth</code>, và
  <code>visible</code> là các nến đang hiện trên màn hình. Muốn chia hàng theo lưới giá thì dùng
  <code>chart.getPriceStep()</code>: bước giá nhỏ nhất của mã (<code>minTick</code>), đơn vị phân số, hoặc một
  đơn vị của số lẻ đang hiển thị. Renderer của loại chart chỉ nhận viewport, còn chỉ báo nhận viewport và theme; cho chúng,
  <code>priceToY</code>, <code>barIndexToX</code>, <code>timeToX</code> và các hàm ngược được export sẵn. Các nến là
  nến đang vẽ: trên chart Renko hay Kagi là các brick của nó (<code>chart.isTimeAligned()</code> cho biết khi nào
  chúng trùng với nến của nguồn dữ liệu). Để viết giá như trục giá, viewport mang định dạng giá riêng của chart khi
  có (<code>formatPrice</code>), <code>numberLocale</code> của nó, và số lẻ của thị trường hoặc của mã khi một trong
  hai đặt (<code>pricePrecision</code>); các pane chỉ báo để trống định dạng và số lẻ.
</p>
<p>
  Overlay có cài đặt riêng (kiểu hiển thị, công tắc) có thể hiện thay đổi ngay, kể cả khi không có tick nào
  tới để vẽ lại chart: đặt <code>enabled: false</code> trên plugin để ẩn nó mà vẫn giữ đăng ký, và gọi
  <code>chart.requestRender()</code> sau khi đổi một trong hai. Nhiều lần gọi trước khung hình kế tiếp chỉ vẽ một khung.
</p>

<p>Xem <a href={href('/docs/api')}>Tham chiếu API</a> để biết đầy đủ chữ ký kiểu của plugin.</p>
