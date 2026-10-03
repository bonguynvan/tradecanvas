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
