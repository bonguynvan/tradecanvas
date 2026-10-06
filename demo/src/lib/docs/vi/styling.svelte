<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Giao diện — Tài liệu TradeCanvas</title>
  <meta name="description" content="Giao diện của widget dưới dạng token: góc bo, kích thước, kiểu chữ, đường viền, bóng đổ và các thanh. Ba preset — Studio, Terminal, Capsule — cùng giao diện riêng của bạn dựng trên chúng." />
</svelte:head>

<h1>Tuỳ biến giao diện widget</h1>
<p>
  Giao diện của widget là một bộ token: góc bo của từng loại thành phần, kích thước nút và thanh, kiểu chữ,
  đường viền, bóng đổ, cách hiện nút đang chọn, và việc thanh công cụ cùng công cụ vẽ nằm sát cạnh hay nổi lên.
  Bắt đầu từ một preset rồi đổi những gì bạn muốn. Màu sắc vẫn do chủ đề màu quyết định (<code>dark</code> /
  <code>light</code>, xem <a href={href('/docs/api')}>Tham chiếu API</a>); giao diện nào cũng dùng được với cả hai.
</p>

<h2>Các preset</h2>
<table>
  <thead><tr><th>Preset</th><th>Giao diện</th></tr></thead>
  <tbody>
    <tr><td><code>studio</code> (mặc định)</td><td>
      Nút bo góc 7 px, menu 11 px và hộp thoại 16 px. Các nhóm cách nhau bằng khoảng trống thay vì đường kẻ, menu
      nổi trên bóng đổ mềm, các nút khung thời gian nằm trong một rãnh phân đoạn, và nút đang chọn được tô màu nhạt.
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      Dày đặc và vuông vức: góc 2 px, nút cao 26 px, đường kẻ giữa các nhóm, nhãn chữ in hoa, và gạch chân dưới nút
      đang chọn. Nhãn giá trên biểu đồ có góc vuông.
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      Hình viên thuốc ở khắp nơi, kể cả nhãn giá. Thanh công cụ và công cụ vẽ nổi thành những hòn đảo, menu là kính
      mờ, và nút đang chọn là một viên thuốc tô đặc.
    </td></tr>
  </tbody>
</table>

<h2>Chọn giao diện</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2>Giao diện của riêng bạn</h2>
<p>
  Một giao diện tự định nghĩa bắt đầu từ một preset (Studio nếu bạn không chỉ định) và chỉ đổi những gì nó nêu ra.
  Góc bo đặt trên thang sẽ áp dụng cho mọi thành phần đi theo thang đó, trừ khi bạn đặt riêng cho thành phần ấy.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · comfortable · spacious
  sizes: { toolbar: 40 },                            // px; wins over density
  font: {
    family: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    size: 13, weight: 500, strongWeight: 600,
    labelCase: 'uppercase', labelTracking: 0.06,      // small labels
  },
  borders: { width: 1, separators: true },           // rules between toolbar groups
  shadows: { menu: '0 12px 30px rgba(0, 0, 0, 0.4)' },
  blur: 12,                                          // frosted floating surfaces, px
  active: 'solid',                                   // tint · solid · underline
  toolbar: 'floating',                               // docked · floating
  sidebar: 'floating',
  intervals: 'segmented',                            // plain · segmented
  tagRadius: 999,                                    // the chart's price tags and pills
})`}</code></pre>

<table>
  <thead><tr><th>Trường</th><th>Đặt gì</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>Thang góc bo <code>xs</code>, <code>sm</code>, <code>md</code>, <code>lg</code>, <code>xl</code>, tính bằng px (0–999).</td></tr>
    <tr><td><code>components</code></td><td>
      Góc bo riêng của từng thành phần: <code>control</code> (nút), <code>input</code>, <code>menu</code>, <code>dialog</code>,
      <code>panel</code> (cảnh báo, cửa sổ dữ liệu, phiếu đặt lệnh), <code>tooltip</code>, <code>tag</code>, <code>toast</code>,
      <code>toolbar</code> và <code>sidebar</code> (khung của chính chúng, thấy được khi chúng nổi). Mặc định, nút và ô
      nhập theo <code>md</code>, menu và bảng theo <code>lg</code>, hộp thoại theo <code>xl</code>, tooltip và nhãn theo <code>sm</code>.
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      Chiều cao <code>toolbar</code>, chiều cao <code>control</code> và <code>controlSmall</code>, <code>icon</code>,
      độ rộng <code>sidebar</code> và chiều cao <code>menuItem</code>, tính bằng px.
    </td></tr>
    <tr><td><code>font</code></td><td>
      Họ font (danh sách CSS), <code>size</code> của chữ thân (11–20 px; các cỡ nhỏ đi theo nó), độ đậm, cùng kiểu chữ hoa/thường
      và khoảng cách chữ (em) của các nhãn nhỏ như tiêu đề mục.
    </td></tr>
    <tr><td><code>borders</code></td><td>Độ dày đường viền, và có kẻ đường phân cách giữa các nhóm trên thanh công cụ và giữa các công cụ vẽ hay không.</td></tr>
    <tr><td><code>shadows</code></td><td>Bóng đổ CSS của menu, hộp thoại và tooltip.</td></tr>
    <tr><td><code>blur</code></td><td>Menu kính mờ, tính bằng px: lớn hơn 0 thì menu để lộ một phần biểu đồ phía sau, đã làm mờ.</td></tr>
    <tr><td><code>active</code></td><td>Cách hiện nút đang chọn: tô màu nhạt, viên thuốc tô đặc, hoặc gạch chân.</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>Gắn dọc theo cạnh, hoặc nổi như một hòn đảo.</td></tr>
    <tr><td><code>intervals</code></td><td>Các nút khung thời gian để nguyên, hoặc đặt trong một rãnh phân đoạn.</td></tr>
    <tr><td><code>tagRadius</code></td><td>Góc bo của nhãn giá, nhãn trên trục và huy hiệu lệnh do biểu đồ vẽ.</td></tr>
  </tbody>
</table>
<p>Giá trị nào không dùng được (nằm ngoài khoảng cho phép, hoặc CSS có thể thoát khỏi khai báo của nó) sẽ bị bỏ qua và giữ giá trị của preset.</p>

<h2>Font chữ</h2>
<p>
  Widget không tải font nào: nó chỉ gọi tên, và trình duyệt lần lượt thử từng font trong danh sách. Studio dùng
  Manrope, rồi đến Inter; Terminal dùng IBM Plex Sans Condensed và IBM Plex Mono; Capsule dùng Sora. Hãy tự tải
  những font bạn muốn:
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>Biến CSS</h2>
<p>
  Các token là biến CSS trên phần tử gốc của widget (và trên các hộp thoại của nó). Khi không có tuỳ chọn
  <code>ui</code>, chúng vẫn thuộc về stylesheet — tức là của Studio — nên CSS của bạn có thể đặt chúng: widget đặt
  stylesheet của nó lên đầu trang, nên một quy tắc của bạn trên <code>.tcw-root</code> sẽ được ưu tiên. Khi có
  <code>ui</code>, widget ghi chúng thẳng lên phần tử, và chúng sẽ được ưu tiên.
</p>
<pre><code>{`.tcw-root {
  --tcw-radius: 4px;            /* the md corner: buttons and fields follow it */
  --tcw-dialog-radius: 12px;
  --tcw-control-h: 28px;
  --tcw-font: 'Inter', system-ui, sans-serif;
}`}</code></pre>
<table>
  <thead><tr><th>Biến</th><th>Lấy từ</th></tr></thead>
  <tbody>
    <tr><td><code>--tcw-radius-xs</code>, <code>-sm</code>, <code>--tcw-radius</code>, <code>-lg</code>, <code>-xl</code></td><td><code>radius</code></td></tr>
    <tr><td><code>--tcw-control-radius</code>, <code>--tcw-input-radius</code>, <code>--tcw-menu-radius</code>, <code>--tcw-dialog-radius</code>, <code>--tcw-panel-radius</code>, <code>--tcw-tooltip-radius</code>, <code>--tcw-tag-radius</code>, <code>--tcw-toast-radius</code>, <code>--tcw-toolbar-radius</code>, <code>--tcw-sidebar-radius</code></td><td><code>components</code></td></tr>
    <tr><td><code>--tcw-toolbar-h</code>, <code>--tcw-control-h</code>, <code>--tcw-control-h-sm</code>, <code>--tcw-icon</code>, <code>--tcw-sidebar-w</code>, <code>--tcw-menu-item-h</code></td><td><code>sizes</code></td></tr>
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code> (và <code>-sm</code>, <code>-xs</code>, <code>-lg</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
  </tbody>
</table>
<p>
  Các công tắc bố cục là thuộc tính data trên cùng các phần tử đó, để bạn viết CSS riêng:
  <code>data-tcw-ui</code> (preset), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code> và <code>data-tcw-separators</code> (<code>on</code> / <code>off</code>).
</p>

<h2 id="overrides">Giao diện của biểu đồ: override style</h2>
<p>
  Theme đặt màu cho cả biểu đồ. Bất kỳ phần nào biểu đồ vẽ cũng có thể đặt riêng, theo khoá: các đường lưới
  theo từng chiều, crosshair, các trục, pane, legend, giá cuối, volume, đường ngắt phiên và chuỗi chính theo cách
  từng loại biểu đồ vẽ nó. Khoá nào để nguyên thì theo theme, nên đổi theme vẫn đổi màu mọi thứ bạn không đặt.
</p>
<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  overrides: { 'grid.vertical.visible': false },       // để bắt đầu
})

chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',              // mọi loại tăng/giảm đều lấy theo đây
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'crosshair.labelBackground': '#2962ff',
  'lastPrice.style': 'solid',
  'panes.background': '#0d1117',
  'legend.textColor': '#c9d1d9',
})
chart.applyOverrides({ 'legend.textColor': null })      // null bỏ một khoá
chart.resetOverrides(['grid.horizontal.style'])         // hoặc nêu tên các khoá
chart.setOverrides({ 'background.color': '#000' })      // cả một lớp một lúc

chart.getStyleValue('series.bar.upColor')               // '#26a69a': giá trị một khoá ra
chart.getStyle().grid.vertical                          // { visible: false, color, style, width }
chart.on('styleChange', (e) => e.payload.layer)         // 'host' | 'user'`}</code></pre>

<h3>Các khoá</h3>
<table>
  <thead><tr><th>Khoá</th><th>Đặt gì</th></tr></thead>
  <tbody>
    <tr><td><code>background.color</code></td><td>Nền biểu đồ (và nền các pane, trừ khi pane có nền riêng).</td></tr>
    <tr><td><code>panes.background</code>, <code>.separatorColor</code>, <code>.titleColor</code></td><td>Pane chỉ báo: nền, thanh ở đỉnh pane, tên pane.</td></tr>
    <tr><td><code>grid.horizontal.*</code>, <code>grid.vertical.*</code></td><td><code>visible</code>, <code>color</code>, <code>style</code> (<code>solid</code> · <code>dashed</code> · <code>dotted</code>), <code>width</code> — riêng từng chiều.</td></tr>
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>Bốn thuộc tính đó cho các đường crosshair (mặc định là nét đứt).</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>Pill giá và thời gian trên các trục, và trên thang của pane.</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>Đường và nhãn của từng trục (thang của pane lấy theo trục giá).</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>Giá trị trong legend, và nhãn của nó (O, H, L, Vol).</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>Đường và nhãn giá cuối; màu theo chuỗi chính nếu không đặt.</td></tr>
    <tr><td><code>volume.upColor</code>, <code>.downColor</code></td><td>Cột volume.</td></tr>
    <tr><td><code>sessionBreaks.color</code>, <code>.style</code>, <code>.width</code></td><td>Đường ngắt ngày, tuần và tháng.</td></tr>
    <tr><td><code>highLow.color</code>, <code>watermark.color</code></td><td>Đường cao nhất và thấp nhất, watermark.</td></tr>
    <tr><td><code>trading.buyColor</code>, <code>.sellColor</code>, <code>.profitColor</code>, <code>.lossColor</code>, <code>.entryColor</code></td><td>Lệnh (mua, bán) và vị thế (lãi, lỗ, giá vào), trên biểu đồ và trên trục giá, đè lên màu trong cấu hình giao dịch.</td></tr>
    <tr><td><code>markers.longColor</code>, <code>.shortColor</code>, <code>.neutralColor</code></td><td>Điểm tín hiệu, đè lên style riêng của chúng.</td></tr>
    <tr><td><code>tradeZones.profitColor</code>, <code>.lossColor</code>, <code>.activeColor</code></td><td>Vùng lệnh: thắng, thua và đang mở.</td></tr>
    <tr><td><code>drawings.handleColor</code></td><td>Tay nắm của hình vẽ đang chọn (không đặt thì màu trắng).</td></tr>
    <tr><td><code>series.&lt;type&gt;.*</code></td><td>Chuỗi chính khi được vẽ theo loại đó: <code>upColor</code>, <code>downColor</code>, <code>wickUpColor</code>,
      <code>wickDownColor</code> (nến, Heikin-Ashi, nến volume, equivolume), <code>color</code> / <code>lineColor</code>
      và <code>lineWidth</code> (line, step line, line có điểm, area, HLC area, baseline), <code>topColor</code> và
      <code>bottomColor</code> (area, HLC area).</td></tr>
  </tbody>
</table>
<p>
  <code>CHART_STYLE_KEYS</code> liệt kê mọi khoá cùng kiểu giá trị của nó, và TypeScript kiểm tra khoá lẫn giá trị
  ngay khi bạn gõ. Màu tăng/giảm lấy theo <code>series.candlestick.*</code>, màu và độ dày đường lấy theo
  <code>series.line.*</code>, vùng tô lấy theo <code>series.area.*</code>, rồi đến theme; râu nến lấy màu thân nến khi màu
  thân đã được đặt. Khoá hay giá trị không hợp lệ bị bỏ qua kèm cảnh báo.
</p>

<h3>Của ứng dụng và của người dùng</h3>
<p>
  Override có hai lớp. Của bạn (<code>layer: 'host'</code>, mặc định) giữ qua mọi lần đổi theme và không bao giờ được
  lưu. Của người dùng (<code>layer: 'user'</code>) thắng của bạn, được giữ theo theme mà họ đặt — màu chọn trên theme tối
  quay lại cùng theme tối — và được lưu bằng <code>saveState()</code>. Phần Settings của widget ghi vào lớp người dùng,
  và nút Reset đưa về màu của theme, theme nào cũng vậy.
</p>
<pre><code>{`chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' })
chart.getOverrides({ layer: 'user' })                 // của người dùng, cho theme hiện tại
chart.getTheme()                           // theme như đã đặt: override nằm riêng`}</code></pre>
<p>
  Các tuỳ chọn lưới và crosshair (<code>grid.hLineColor</code>, <code>crosshair.vLine.style</code>…) là cách viết tắt
  của các khoá tương ứng. Một lưới nhiều biểu đồ nhận override cho mọi biểu đồ của nó: <code>grid.applyOverrides(patch)</code>.
  Component React, Vue và Svelte nhận chúng qua prop <code>overrides</code>.
</p>

<h3>Đường của chỉ báo và pane</h3>
<pre><code>{`// Kiểu nét và ẩn/hiện riêng của từng đường, theo khoá (màu và độ dày vẫn ở colors / lineWidths)
chart.updateIndicatorStyle(macdId, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } })

// Style mà mọi chỉ báo cùng loại bắt đầu với, từ nay
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] })

// Nền và đường phân cách riêng của một pane, lưu cùng chỉ báo của nó
chart.setPaneStyle(rsiId, { background: '#101418', separator: '#f5a623' })`}</code></pre>
<p>
  Đường bị ẩn không có nhãn giá trị và không có giá trị trong legend. Mọi chỉ báo đều bỏ qua đường bị ẩn, và
  hầu hết nhận kiểu nét của các đường; vài chỉ báo vẽ hình riêng (chấm Parabolic SAR, Supertrend, Zig Zag,
  volume profile) giữ nét vẽ của mình.
</p>

<h2>Nhãn trên biểu đồ</h2>
<p>
  Widget chuyển <code>tagRadius</code> cho biểu đồ của nó (hình dạng đặt trong <code>chartOptions.shapes</code> được
  giữ cho đến khi bạn gọi <code>setUI</code>). Với một <code>Chart</code> dùng riêng, hãy tự đặt hình dạng; thiết lập
  này được giữ nguyên khi đổi chủ đề màu. Nhãn giá, nhãn trên trục và nhãn của con trỏ chữ thập, nhãn lệnh, vị thế và
  lệnh bracket, cùng nhãn mức của kỳ trước đều theo hình dạng này.
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2>Màu volume</h2>
<p>
  Thanh volume lấy màu <code>volumeUp</code> và <code>volumeDown</code> (hoặc các khoá <code>volume.*</code>) của theme. <code>volumeColor(candleColor)</code> trả về màu nến với độ trong suốt của volume, nên trong theme của riêng bạn các thanh vẫn chỉ là nền phía sau nến. Widget tự làm việc này khi phần cài đặt đổi màu nến, và một theme dựa trên preset chỉ đổi <code>candleUp</code> / <code>candleDown</code> cũng có volume theo màu đó.
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
