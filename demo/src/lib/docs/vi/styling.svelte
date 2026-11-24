<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Styling — Tài liệu TradeCanvas</title>
  <meta name="description" content="Look của widget dưới dạng token, với sáu preset — Modern, Print, Studio, Terminal, Capsule, Desk — trên pixel chẵn, và look của biểu đồ theo từng key: lưới, crosshair, trục, pane, legend, giá cuối, khối lượng và từng loại biểu đồ, đường vẽ và pane của chỉ báo." />
</svelte:head>

<h1>Styling cho widget</h1>
<p>
  Look của widget là một tập token: góc bo của từng loại thành phần, kích thước control và thanh, kiểu chữ, viền,
  bóng đổ, cách hiển thị nút đang chọn, và toolbar cùng công cụ vẽ nằm sát cạnh hay nổi.
  Bắt đầu từ một preset rồi đổi phần cần đổi. Màu sắc thuộc về theme (<code>dark</code> / <code>light</code>,
  xem <a href={href('/docs/api')}>API</a>); một look dùng được với cả hai. Graphite, preset mặc định, và Modern đều có dark và
  light riêng; các look khác dùng chung bộ màu mà widget dùng trước khi có Modern.
</p>

<h2>Preset</h2>
<table>
  <thead><tr><th>Preset</th><th>Look</th></tr></thead>
  <tbody>
    <tr><td><code>graphite</code> (mặc định)</td><td>
      Khung của một bàn giao dịch, không mang sắc màu riêng: các nền lệch nhau một bậc (<code>#131416</code> /
      <code>#ffffff</code>), ngăn bằng đường kẻ mảnh. Ít cỡ một cách có chủ ý: control cao 20, 24, 28, 36 hoặc
      40 px, mọi góc bo 3 px, một kiểu bóng cho lớp nổi và không bóng ở chỗ khác. Thứ đang chọn (interval, tool,
      tab) hiện trên nền sáng hơn với màu chữ thường; màu amber dành cho thứ bạn bấm để hành động. Công tắc là ô
      tick, và cột của bảng tài khoản rộng vừa bằng số liệu. Font là IBM Plex Sans nếu trang của bạn tải nó, nếu
      không thì font hệ thống. Trên chart, khi bạn không đưa theme object, màu là
      <code>GRAPHITE_DARK_THEME</code> và <code>GRAPHITE_LIGHT_THEME</code>.
    </td></tr>
    <tr><td><code>modern</code></td><td>
      Giống cửa sổ một trình soạn code, dùng bộ màu Dark Modern và Light Modern. Chart nằm trên nền của vùng soạn
      (<code>#1f1f1f</code> / <code>#ffffff</code>), toolbar và các thanh quanh chart đậm hoặc nhạt hơn nền một chút, ngăn cách bằng đường mảnh;
      icon 16 px trong nút 28 px trên toolbar 38 px; control bo 4 px, menu 6 px và dialog 8 px. Màu amber của logo
      (<code>#e8961e</code>) chỉ dùng cho nút bấm và thứ đang chọn, chữ trên nền amber màu tối; link và focus dùng một màu amber đậm hơn
      hoặc nhạt hơn. Nến màu teal
      (<code>#089981</code>) và đỏ (<code>#f23645</code>), đậm hơn hoặc nhạt hơn khi dùng làm chữ, để mức thay đổi giá
      có độ tương phản từ 5:1 trở lên. Font là Geist nếu trang của bạn đã tải font này, nếu không thì dùng font của hệ thống; chữ số
      dùng font của Print. Trên biểu đồ, khi không truyền object theme riêng, màu là
      <code>MODERN_DARK_THEME</code> và <code>MODERN_LIGHT_THEME</code>; một <code>Chart</code> tự tạo cũng dùng được hai theme này.
      Nút và công cụ đang chọn tô bằng màu nhấn dạng nền (<code>--tcw-accent-fill</code>) với màu chữ đi kèm, nên trang
      nào đặt các token màu nhấn thì cũng đặt luôn những màu này.
    </td></tr>
    <tr><td><code>print</code></td><td>
      Look mặc định trước khi có Modern, gồm cả bộ màu. Giấy và mực. Nền trắng ngà hoặc đen ngả xám, màu xám cho mọi thứ bình thường và chỉ dùng màu ở chỗ có ý nghĩa;
      đường mảnh, control bo 3 px, menu 5 px và dialog 8 px; icon lớn vẽ bằng nét mảnh;
      nhãn giữ nguyên cách viết, nhấn mạnh bằng độ đậm medium; font của hệ thống (Segoe UI Variable trên Windows 11);
      mọi chữ số, kể cả trên biểu đồ, dùng một font sans có chữ số cùng độ rộng (Segoe UI trên Windows, Helvetica Neue trên
      hệ thống Apple, Roboto trên Android), nên giá thẳng hàng theo cột. Nút đang chọn tô đặc màu mực, công cụ đang chọn màu xanh mực.
    </td></tr>
    <tr><td><code>studio</code></td><td>
      Control bo tròn 7 px, menu 11 px và dialog 16 px. Các nhóm cách nhau bằng khoảng trống thay vì đường kẻ, menu nổi trên bóng
      đổ mềm, các nút khung thời gian nằm trong một rãnh phân đoạn, và nút đang chọn có nền tô nhạt.
    </td></tr>
    <tr><td><code>terminal</code></td><td>
      Dày đặc và vuông: góc 2 px, control 26 px, đường kẻ giữa các nhóm, nhãn viết hoa, và một gạch dưới
      nút đang chọn. Tag giá trên biểu đồ là hình vuông.
    </td></tr>
    <tr><td><code>capsule</code></td><td>
      Dạng viên thuốc (pill) ở mọi chỗ, kể cả tag giá. Toolbar và công cụ vẽ nổi thành từng đảo, menu là
      kính mờ, và nút đang chọn là một pill tô đặc.
    </td></tr>
    <tr><td><code>desk</code></td><td>
      Cửa sổ của một nền tảng giao dịch desktop: Tahoma 12 px cho cả nhãn lẫn chữ số trên biểu đồ, góc
      và tag giá vuông, các thanh hẹp hơn một bậc (control 24 px), đường kẻ giữa các nhóm, và nút đang chọn có nền tô nhạt.
      Khi không có Tahoma thì dùng Verdana, Segoe UI hoặc DejaVu Sans.
    </td></tr>
  </tbody>
</table>

<h2>Chọn look</h2>
<pre><code>{`import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, { ui: 'terminal' })
widget.setUI('capsule')        // in place: nothing is rebuilt
widget.getUI()                 // every token, resolved

// A grid: every chart and the grid's bar, and the charts it adds later
const grid = new ChartWidgetGrid(host, { layout: '2x2', widget: { ui: 'terminal' } })
grid.setUI('studio')
grid.getUI()`}</code></pre>

<h2 id="density">Mật độ</h2>
<p>
  Biểu đồ và widget mở ra với khoảng trống quanh những gì chúng vẽ. Thân nến bằng slot × φ⁻¹ (62%) ở mọi
  mức zoom, phần còn lại là khoảng cách, và biểu đồ mở ở φ⁴ ≈ 6.85 px mỗi slot (<code>barLayout: 'golden'</code>), khoảng 250
  nến trên màn hình rộng 1920 px. Nến mới nhất cách trục giá 8 slot. Vùng giá chừa
  φ⁻⁴·⁵ (11.5%) chiều cao vùng vẽ trên đỉnh cao nhất và dưới đáy thấp nhất; khi bật khối lượng, dải khối lượng nằm
  dưới các nến, cách một khoảng φ⁻⁶ (5.6%), nên hai phần không bao giờ chồng lên nhau. Legend cách góc vùng vẽ
  12 px. Trong widget, mọi kích thước và khoảng cách là số pixel chẵn, và nút, thanh, dòng menu
  có 12 px hai bên chữ.
</p>
<p>
  <code>density</code> đặt tất cả cùng lúc, cho widget trong <code>ui</code> và cho biểu đồ tự dựng trong
  tuỳ chọn của nó:
</p>
<table>
  <thead><tr><th><code>ui.density</code></th><th>Widget</th><th>Biểu đồ của nó</th></tr></thead>
  <tbody>
    <tr><td><code>'comfortable'</code></td><td>Mặc định: kích thước chẵn (trong Modern nút 28 px và icon 16 px, trong Print 34 và 20), khoảng cách 2 · 4 · 6 · 8 · 12 · 20 · 32, padding 12 px trong control.</td><td>Comfortable, nến golden.</td></tr>
    <tr><td><code>'classic'</code></td><td>Kích thước của look trên khoảng cách trước 2.0: 2 · 3 · 5 · 8 · 13 · 21 · 34, padding 8 px trong control. Với Print (<code>{'{'} preset: 'print', density: 'classic' {'}'}</code>) là widget như trước 2.0 (ở tỷ lệ màn hình 100%, pixel giống hệt, trừ vạch chia của trục giá, nay sắc nét hơn), nút 33 px.</td><td>Compact, với nến golden như widget từng có.</td></tr>
    <tr><td><code>'compact'</code></td><td>Control nhỏ hơn (trong Modern nút 24 px, trong Print 26, icon 16 px) trên khoảng cách classic.</td><td>Compact, nến classic.</td></tr>
    <tr><td><code>'spacious'</code></td><td>Control lớn hơn (trong Modern nút 34 px và icon 20 px, trong Print 42 và 26).</td><td>Comfortable, nến golden.</td></tr>
    <tr><td><code>'airy'</code></td><td>Như spacious, với chữ số trên trục và trong legend dùng font sans của look.</td><td>Comfortable, nến golden.</td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th><code>density</code> của biểu đồ</th><th>Nến</th><th>Khoảng trống sau nến mới nhất</th><th>Trên và dưới vùng giá</th><th>Trên dải khối lượng</th><th>Legend cách góc</th></tr></thead>
  <tbody>
    <tr><td><code>'comfortable'</code> (mặc định)</td><td>golden</td><td>8 slot</td><td>φ⁻⁴·⁵ (11.5%)</td><td>φ⁻⁶ (5.6%)</td><td>vào 12 px, xuống 8 px</td></tr>
    <tr><td><code>'compact'</code> (như trước 2.0)</td><td>classic: khoảng cách 2 px, mở ở 10 px mỗi slot</td><td>5 slot</td><td>φ⁻⁵ (9%)</td><td>φ⁻⁷ (3.4%)</td><td>vào 8 px, xuống 6 px</td></tr>
  </tbody>
</table>
<pre><code>{`// The widget as it was before 2.0
new ChartWidget(host, { ui: { preset: 'print', density: 'classic' } })
widget.setUI({ preset: 'print', density: 'classic' })

// A chart of your own as it was before 2.0
import { Chart, CHART_SPACING, MONO_FONT_FAMILY } from '@tradecanvas/chart'
const chart = new Chart(host, { density: 'compact', font: { family: MONO_FONT_FAMILY } })
chart.setDensity('comfortable')  // and back
chart.getDensity()               // 'comfortable'
CHART_SPACING.comfortable        // the numbers each density sets

// One part of it
new Chart(host, { barLayout: 'classic' })   // a 2 px gap between bars, the rest comfortable
new Chart(host, { rightMargin: 5 })         // 5 slots past the newest bar
chart.setBarLayout('golden')
chart.setFont({ family: MONO_FONT_FAMILY, sizeSmall: 12 }) // the axes' and tags' face and size
chart.setFont(null)                         // the theme's own font again`}</code></pre>
<p>
  <code>barLayout</code> và <code>rightMargin</code> truyền vào khi tạo biểu đồ được giữ nguyên khi đổi density.
  Trong widget, <code>chartOptions.density</code>, <code>chartOptions.barLayout</code> và <code>family</code> trong
  <code>chartOptions.font</code> được ưu tiên hơn giá trị của look; nếu <code>chartOptions.font</code> chỉ có kích thước thì vẫn giữ
  font của look. Khi đã có nến trên màn hình, layout mới giữ mức zoom và chỉ chia lại từng slot.
</p>

<h3 id="whole-pixels">Về pixel nguyên</h3>
<p>
  Ở tỷ lệ màn hình 125% hoặc 150%, một pixel CSS bằng 1.25 hoặc 1.5 pixel thiết bị, và một đường rộng 1 px vẽ giữa
  hai pixel thiết bị sẽ bị nhoè. Biểu đồ đặt kích thước canvas theo số pixel thiết bị do chính trình duyệt tính và đặt
  các đường mảnh lên đúng các pixel đó: lưới, đường và vạch chia của trục, crosshair, đường giá cuối, đường order, cảnh báo
  và mức giá, bóng nến, đường chia pane và viền tag giá. Một đường 1 px rộng đúng một pixel thiết bị ở 125%
  và 150%, giống như trình duyệt vẽ viền 1 px. Trong widget, kích thước là số chẵn để icon cách viền nút một số
  pixel nguyên và nút cách viền thanh cũng vậy, và các nút chữ trên toolbar có độ rộng là số pixel nguyên
  ở những trình duyệt làm tròn được hộp có kích thước theo nội dung (Chrome và Edge 129
  trở lên), nên các icon phía sau chúng cũng sắc nét.
</p>

<h2>Tỷ lệ vàng</h2>
<p>
  Print giữ tỷ lệ theo tỷ lệ vàng, φ ≈ 1.618, nên các kích thước đứng cạnh nhau có cùng một quan hệ
  ở mọi chỗ:
</p>
<table>
  <thead><tr><th>Phần</th><th>Quy tắc</th><th>Giá trị (px)</th></tr></thead>
  <tbody>
    <tr><td>Kích thước</td><td>Các nửa bậc của φ, mỗi giá trị là số chẵn gần bậc của nó nhất (20.4, 25.9, 32.9, 41.9): icon, nút nhỏ của nó, nút của nó, thanh, và cột công cụ vẽ theo bậc của thanh; dòng menu cao bằng nút. Nút là ngoại lệ: 32 gần bậc của nó hơn, nhưng nút là 34, kích thước mà 33 của 1.x thực tế hiển thị, để icon 20 px còn 7 px mỗi bên. Icon công cụ vẽ lớn hơn các icon khác nửa bậc (26 so với 20), nút của chúng nhỏ hơn bậc đó một chút, để giữ 3 px hai bên trong cột.</td><td>20 · 26 · 34 · 42</td></tr>
    <tr><td>Khoảng cách</td><td>Các số Fibonacci trên lưới 4 px (1, 2, 3, 5, 8 lần 4), cộng thêm 2 và 6, nửa của 4 và 12, ở dưới. Từ 8 trở lên, hai giá trị liền nhau có tỷ lệ 1.5, 1.67 và 1.6, gần φ; các bậc nhỏ tăng 2 px một, vì tỷ lệ φ không rơi vào số chẵn nào. Density classic và compact giữ các số Fibonacci thuần, 2 · 3 · 5 · 8 · 13 · 21 · 34.</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32</td></tr>
    <tr><td>Góc bo</td><td>
      Các số Fibonacci. Góc lồng bên trong bằng góc bao ngoài trừ padding ở giữa, nên các đường cong chạy
      song song: góc 5 của menu bằng góc 1 của các dòng cộng padding 4.
    </td><td>1 · 2 · 3 · 5 · 8</td></tr>
    <tr><td>Kiểu chữ</td><td>
      Các bậc là căn bậc ba của φ, nên cứ ba bậc thì lớn hơn φ lần: tiêu đề dialog bằng φ lần chữ nội dung. Không bao giờ
      dưới 10 px, vì ở đó chữ có hai dấu (tiếng Việt ế, ộ) không còn đọc được.
    </td><td>10 · 11 · 13 · 15 · 18 · 21</td></tr>
  </tbody>
</table>
<p>
  Các bậc chữ theo cỡ chữ nội dung được đặt (<code>font.size</code>); một dòng chữ nội dung có chiều cao chẵn
  (18 px ở cỡ 13 px). <code>density</code> dời các kích thước xuống hoặc lên nửa bậc. <code>PHI</code>,
  <code>FIBONACCI</code>, <code>phiStep(base, steps, perPhi)</code> và <code>evenPx(n)</code> lấy từ
  <code>@tradecanvas/commons</code> để dựng look riêng.
</p>

<h3 id="wide-screens">Trên màn hình rộng</h3>
<p>
  Widget vẽ thanh, nút, icon và chữ to hơn khi nó rộng ra, để màn hình 4K không toàn chữ nhỏ:
  giữ nguyên đến full HD, rồi lớn hơn một phần sáu φ từ 1800 px, một phần ba từ 2560 (4K ở 150%) và một nửa từ
  3400 (4K ở 100%), mỗi kích thước làm tròn đến số chẵn gần nhất. Chữ trên trục của biểu đồ cũng lớn theo. <code>ui.scale</code> đặt một tỷ lệ cố định ở mọi
  độ rộng; <code>1</code> giữ nguyên kích thước.
</p>

<h2>Look riêng</h2>
<p>
  Một look bắt đầu từ một preset (Modern nếu không chỉ định) và đổi những gì nó nêu. Góc bo đặt trên thang
  áp dụng cho mọi thành phần dùng thang đó, trừ khi đặt góc riêng cho thành phần ấy.
</p>
<pre><code>{`widget.setUI({
  preset: 'studio',
  radius: { xs: 3, sm: 5, md: 10, lg: 12, xl: 18 },  // the scale, px (999: pills)
  components: { dialog: 20, tag: 0 },                // a part's own corners
  density: 'compact',                                // compact · classic · comfortable · spacious · airy
  sizes: { toolbar: 40 },                            // px; wins over density
  scale: 'auto',                                     // or a number; 'auto' grows with the widget's width
  font: {
    family: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    size: 13, smallSize: 12,                          // body; figures in tables, field names
    weight: 500, strongWeight: 600,
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
  iconStroke: 1,                                     // icon lines, CSS px at every size (0: as drawn)
})`}</code></pre>

<table>
  <thead><tr><th>Trường</th><th>Đặt gì</th></tr></thead>
  <tbody>
    <tr><td><code>radius</code></td><td>Thang góc bo <code>xs</code>, <code>sm</code>, <code>md</code>, <code>lg</code>, <code>xl</code>, px (0–999).</td></tr>
    <tr><td><code>components</code></td><td>
      Góc bo riêng của từng thành phần: <code>control</code> (nút), <code>input</code>, <code>menu</code>, <code>dialog</code>,
      <code>panel</code> (cảnh báo, data window, order ticket), <code>tooltip</code>, <code>tag</code>, <code>toast</code>,
      <code>toolbar</code> và <code>sidebar</code> (hộp riêng của chúng, thấy được khi nổi). Mặc định control và
      trường nhập dùng <code>md</code>, menu và panel <code>lg</code>, dialog <code>xl</code>, tooltip và tag <code>sm</code>.
    </td></tr>
    <tr><td><code>density</code> / <code>sizes</code></td><td>
      Chiều cao <code>toolbar</code>, chiều cao <code>control</code> và <code>controlSmall</code>, <code>icon</code>,
      độ rộng <code>sidebar</code> và chiều cao <code>menuItem</code>, px. <code>compact</code> và
      <code>spacious</code> là kích thước nhỏ hơn và lớn hơn của một look (của Print là dời xuống hoặc lên nửa bậc φ), còn
      <code>classic</code> là kích thước của look trên khoảng cách trước 2.0 (xem <a href="#density">Mật độ</a>, phần này cũng đặt khoảng cách và khoảng trống của biểu đồ). Nút và icon công cụ vẽ
      lớn hơn <code>control</code> và <code>icon</code> nửa bậc φ (bằng nhau trong <code>compact</code>). Chúng giữ
      khoảng trống hai bên trong cột <code>sidebar</code>, và khi cột không đủ cao cho tất cả thì chúng thu nhỏ,
      xuống đến cỡ <code>icon</code> và 2 px mỗi bên, trước khi cột cuộn.
    </td></tr>
    <tr><td><code>font</code></td><td>
      Họ font (danh sách CSS), <code>size</code> của chữ nội dung (11–20 px; các cỡ khác theo nó, cách nhau một phần ba φ), độ đậm,
      và kiểu chữ hoa và giãn chữ (em) của nhãn nhỏ như tiêu đề mục.
    </td></tr>
    <tr><td><code>borders</code></td><td>Độ dày viền, và có đường kẻ ngăn các nhóm của toolbar và công cụ vẽ hay không.</td></tr>
    <tr><td><code>shadows</code></td><td>Bóng đổ CSS của menu, dialog và tooltip.</td></tr>
    <tr><td><code>blur</code></td><td>Menu kính mờ, px: lớn hơn 0 thì menu để lộ một phần biểu đồ phía sau, đã làm mờ.</td></tr>
    <tr><td><code>active</code></td><td>Cách hiển thị nút đang chọn: nền tô nhạt, pill tô đặc, hoặc gạch dưới.</td></tr>
    <tr><td><code>toolbar</code> / <code>sidebar</code></td><td>Sát cạnh, hoặc nổi thành một đảo.</td></tr>
    <tr><td><code>intervals</code></td><td>Các nút khung thời gian để nguyên, hoặc trong một rãnh phân đoạn.</td></tr>
    <tr><td><code>tagRadius</code></td><td>Góc bo của tag giá, pill trên trục và badge order mà biểu đồ vẽ.</td></tr>
    <tr><td><code>iconStroke</code></td><td>
      Nét của icon, px CSS từ 0.5 đến 3, cùng độ dày ở mọi cỡ icon (tối đa 1 px với icon dưới 14 px). <code>0</code> vẽ như
      bộ icon gốc, nét dày lên khi icon lớn. Modern dùng 1.5 và Print dùng 1; các look khác vẽ như bộ icon gốc.
    </td></tr>
  </tbody>
</table>
<p>Giá trị không dùng được (ngoài khoảng, hoặc CSS có thể thoát ra khỏi khai báo của nó) bị bỏ qua và giữ giá trị của preset.</p>

<h2>Font</h2>
<p>
  Widget không tải font nào: nó chỉ nêu tên, và trình duyệt lần lượt thử theo từng danh sách. Modern nêu Geist, rồi các
  font của Print, nên cũng không cần tải gì. Print nêu các font mà mọi
  hệ thống đều có: Segoe UI, San Francisco hoặc Roboto cho nhãn, và cho chữ số là Segoe UI, Roboto, Helvetica Neue hoặc Arial,
  có các chữ số cùng độ rộng, nên không cần tải gì; Desk nêu Tahoma, rồi Verdana, cũng có sẵn trong
  hệ thống. Studio nêu Manrope, rồi Inter; Terminal là IBM Plex Sans Condensed và IBM Plex Mono; Capsule là Sora.
  Tự tải các font cần dùng:
</p>
<pre><code>{`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap">`}</code></pre>

<h2>Biến CSS</h2>
<p>
  Các token là biến CSS trên phần tử gốc của widget (và trên các dialog của nó). Khi không có tuỳ chọn <code>ui</code>, chúng
  giữ giá trị của stylesheet — của Modern — nên CSS riêng có thể đặt chúng: widget đặt stylesheet của nó đầu tiên trong
  trang, nên một rule riêng trên <code>.tcw-root</code> được ưu tiên. Khi có <code>ui</code>, widget ghi chúng trên
  phần tử, và chúng được ưu tiên.
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
    <tr><td><code>--tcw-font</code>, <code>--tcw-font-mono</code>, <code>--tcw-font-size</code> (và <code>-xs</code>, <code>-sm</code>, <code>-lg</code>, <code>-xl</code>, <code>-display</code>), <code>--tcw-weight</code>, <code>--tcw-weight-strong</code>, <code>--tcw-label-case</code>, <code>--tcw-label-tracking</code></td><td><code>font</code></td></tr>
    <tr><td><code>--tcw-border-w</code>, <code>--tcw-sep-w</code></td><td><code>borders</code></td></tr>
    <tr><td><code>--tcw-menu-shadow</code>, <code>--tcw-dialog-shadow</code>, <code>--tcw-tooltip-shadow</code></td><td><code>shadows</code></td></tr>
    <tr><td><code>--tcw-blur</code>, <code>--tcw-surface-opacity</code></td><td><code>blur</code></td></tr>
    <tr><td><code>--tcw-space-1</code> … <code>--tcw-space-7</code></td><td><code>density</code>: khoảng cách, 2 đến 32 px (2 đến 34 trong <code>classic</code> và <code>compact</code>)</td></tr>
    <tr><td><code>--tcw-control-pad</code>, <code>--tcw-bar-pad</code>, <code>--tcw-menu-row-pad</code></td><td><code>density</code>: khoảng trống cạnh nhãn của nút, trước nút đầu tiên của thanh và cạnh chữ của dòng menu</td></tr>
    <tr><td><code>--tcw-line-height</code>, <code>--tcw-line-xs</code>, <code>--tcw-legend-line</code>, <code>--tcw-legend-line-pane</code></td><td><code>density</code>: chiều cao một dòng chữ nội dung, một dòng chữ nhỏ nhất, và một dòng chỉ báo trên biểu đồ và trong pane</td></tr>
    <tr><td><code>--tcw-text-w</code></td><td><code>density</code>: các nút chữ của thanh rộng một số pixel nguyên (<code>auto</code>: rộng theo chữ)</td></tr>
    <tr><td><code>--tcw-kind-1</code> … <code>--tcw-kind-5</code></td><td>Stylesheet: màu của tìm mã cho từng loại mã (cổ phiếu, futures, chỉ số, crypto, forex), đặt cho theme tối và theme sáng. Đặt chúng trong bảng màu riêng, nếu không các badge giữ các màu này.</td></tr>
    <tr><td><code>--tcw-font-features</code></td><td>Stylesheet: <code>normal</code>, font hiển thị như thiết kế gốc. Tuỳ chọn <code>ui</code> không bao giờ đặt nó, nên một rule riêng trên <code>.tcw-root</code> bật được các tính năng OpenType của font (chữ a một tầng và chữ số mở của Inter: <code>'cv11', 'ss01'</code>). Chúng áp dụng cho chữ của widget, cả nút và trường nhập; chữ của biểu đồ (canvas và tooltip của nó) không bao giờ nhận chúng.</td></tr>
  </tbody>
</table>
<p>
  Các công tắc layout là data attribute trên cùng các phần tử đó, dùng cho CSS riêng:
  <code>data-tcw-ui</code> (preset), <code>data-tcw-active</code>, <code>data-tcw-toolbar</code>,
  <code>data-tcw-sidebar</code>, <code>data-tcw-intervals</code> và <code>data-tcw-separators</code> (<code>on</code> / <code>off</code>).
</p>

<h2 id="controls">Trường nhập, danh sách và lịch</h2>
<p>
  Mọi trường nhập trong widget (cảnh báo, cài đặt, order ticket, đi đến ngày, tham số của chỉ báo) có chung một look: nền nhạt và một đường mảnh, đường đậm hơn khi hover, và khi focus thì đường lấy màu nhấn, không có vòng bao quanh. Một select mở danh sách riêng của widget, có dấu chọn ở dòng đang chọn, nhóm hiển thị thành tiêu đề, hỗ trợ phím mũi tên, Enter, Escape và gõ một chữ cái; một trường ngày mở lịch của widget, tuần bắt đầu từ ngày mà ngôn ngữ đó dùng, ngày hôm nay gạch dưới, các ngày ngoài <code>min</code> và <code>max</code> của trường bị làm mờ. Checkbox, radio, slider và switch theo cùng các token, thanh cuộn cũng vậy: mảnh và bo tròn, chỉ có con trượt, không có rãnh.
</p>
<p>
  Các trường vẫn là <code>&lt;select&gt;</code> và <code>&lt;input&gt;</code> gốc của trình duyệt: giá trị, sự kiện và form hoạt động như trước, và trên màn hình cảm ứng thì bánh xe chọn và lịch của điện thoại mở ra, hợp với thao tác bằng ngón tay hơn.
</p>
<p>Look lấy từ các biến sau, đặt cho theme tối và theme sáng:</p>
<p><code>--tcw-field-bg</code>, <code>--tcw-field-bg-hover</code>, <code>--tcw-field-bg-focus</code>, <code>--tcw-field-line</code>, <code>--tcw-field-line-hover</code>, <code>--tcw-field-line-focus</code>, <code>--tcw-field-placeholder</code>, <code>--tcw-check-line</code>, <code>--tcw-scroll-thumb</code>, <code>--tcw-scroll-thumb-hover</code>.</p>
<pre><code>{`.tcw-root {
  --tcw-field-bg: transparent;            /* fields as lines, no fill */
  --tcw-field-line: rgba(255, 255, 255, 0.12);
  --tcw-field-line-focus: #5b8cff;        /* focus in your brand colour */
}`}</code></pre>

<h2 id="overrides">Look của biểu đồ: style override</h2>
<p>
  Theme đặt màu của biểu đồ nói chung. Từng phần riêng của những gì biểu đồ vẽ có thể đặt tách khỏi theme, theo
  key: đường lưới mỗi chiều, crosshair, trục, pane, legend, giá cuối, khối lượng, đường ngắt
  phiên và chuỗi chính theo cách từng loại biểu đồ vẽ nó. Key không đặt thì theo theme, nên khi đổi theme
  mọi thứ chưa đặt vẫn đổi màu theo.
</p>
<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  overrides: { 'grid.vertical.visible': false },       // to start with
})

chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',              // every up/down type falls back to it
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'crosshair.labelBackground': '#2962ff',
  'lastPrice.style': 'solid',
  'panes.background': '#0d1117',
  'legend.textColor': '#c9d1d9',
})
chart.applyOverrides({ 'legend.textColor': null })      // null takes a key away
chart.resetOverrides(['grid.horizontal.style'])         // or name the keys
chart.setOverrides({ 'background.color': '#000' })      // all of a layer at once

chart.getStyleValue('series.bar.upColor')               // '#26a69a': what a key resolves to
chart.getStyle().grid.vertical                          // { visible: false, color, style, width }
chart.on('styleChange', (e) => e.payload.layer)         // 'host' or 'user'`}</code></pre>

<h3>Key</h3>
<table>
  <thead><tr><th>Key</th><th>Đặt gì</th></tr></thead>
  <tbody>
    <tr><td><code>background.color</code></td><td>Nền biểu đồ (và nền các pane, trừ khi pane có nền riêng).</td></tr>
    <tr><td><code>panes.background</code>, <code>.separatorColor</code>, <code>.titleColor</code></td><td>Pane chỉ báo: nền, thanh ở đỉnh pane, tên pane.</td></tr>
    <tr><td><code>grid.horizontal.*</code>, <code>grid.vertical.*</code></td><td><code>visible</code>, <code>color</code>, <code>style</code> (<code>solid</code> · <code>dashed</code> · <code>dotted</code>), <code>width</code> — riêng cho từng chiều.</td></tr>
    <tr><td><code>grid.vertical.periodsOnly</code></td><td><code>true</code> kẻ lưới dọc tại chỗ một kỳ bắt đầu, không phải tại các nhãn của trục thời gian: tại nến đầu tiên của mỗi ngày trên biểu đồ trong ngày, của mỗi tháng trên biểu đồ ngày, của mỗi năm trên biểu đồ tuần hoặc tháng, theo múi giờ mà trục hiển thị. Ở chỗ các đường đó sẽ gần nhau hơn 40 px (biểu đồ ngày zoom ra tới nhiều năm), kỳ lớn hơn kế tiếp được kẻ, và không có đường nào được vẽ ở chỗ không có kỳ như vậy bắt đầu trong vùng đang hiển thị. Key này cần trục thời gian: khi trục bị tắt thì các đường giống như khi không có key.</td></tr>
    <tr><td><code>crosshair.horizontal.*</code>, <code>crosshair.vertical.*</code></td><td>Bốn thuộc tính trên cho các đường của crosshair (mặc định là đường mảnh liền).</td></tr>
    <tr><td><code>crosshair.labelBackground</code>, <code>.labelTextColor</code></td><td>Pill giá và thời gian trên trục, và trên thang của các pane.</td></tr>
    <tr><td><code>axis.price.lineColor</code>, <code>.textColor</code>, <code>axis.time.*</code></td><td>Đường và nhãn của từng trục (thang của pane dùng giá trị của trục giá).</td></tr>
    <tr><td><code>crosshair.labelChange</code></td><td><code>true</code> ghi, bên dưới giá mà crosshair chỉ trên trục giá, khoảng cách từ giá đó tới giá cuối, tính theo phần trăm (<code>+1.25%</code>), theo locale của biểu đồ. Không ghi khi chưa có giá cuối, hoặc trên thang đã tính theo phần trăm hay theo chỉ số. Trục được chừa chỗ cho dòng này. Các theme Graphite bật sẵn (<code>crosshairChange</code> của chính theme); các theme khác tắt.</td></tr>
    <tr><td><code>axis.price.valueTagsOutlined</code></td><td><code>true</code> vẽ các tag giá trị của chỉ báo trên trục giá ở dạng viền (nền của biểu đồ, hoặc nền riêng của pane, bên trong một viền theo màu của đường, chữ theo màu đó) thay vì tô đặc bằng màu của đường: trong pane giá, các pane chỉ báo và trên thang bên trái. Đường có màu quá gần màu nền nên không đọc được trên nền thì giá trị của nó được ghi bằng màu chữ của thang. Các theme Graphite vẽ chúng ở dạng viền, trừ khi key này là <code>false</code>.</td></tr>
    <tr><td><code>legend.textColor</code>, <code>.labelColor</code></td><td>Giá trị của legend, và nhãn của nó (O, H, L, Vol).</td></tr>
    <tr><td><code>legend.upColor</code>, <code>.downColor</code></td><td>Màu tăng và màu giảm ở những chỗ đọc giá trị của một nến: giá đóng cửa và mức thay đổi của legend, tooltip của crosshair và tooltip đã ghim, công cụ đo. Chúng theo màu của chuỗi nếu không đặt, nên biểu đồ ẩn nến của nó (một overlay tự vẽ nến riêng) đặt các key này và giữ được chúng.</td></tr>
    <tr><td><code>lastPrice.visible</code>, <code>.upColor</code>, <code>.downColor</code>, <code>.style</code>, <code>.width</code></td><td>Đường và tag giá cuối; màu theo chuỗi nếu không đặt. Thời gian còn lại của nến (<code>features.barCountdown</code>) nằm dưới tag.</td></tr>
    <tr><td><code>lastPrice.labelBackground</code>, <code>.labelTextColor</code></td><td>Tag giá cuối theo một màu dù chiều của ngày thế nào, và chữ của nó. Không đặt thì tag có màu tăng hoặc màu giảm và chữ có màu đọc được trên đó; đường vẫn giữ <code>upColor</code> và <code>downColor</code> trong cả hai trường hợp. Đếm ngược dưới tag nhận cả hai.</td></tr>
    <tr><td><code>volume.upColor</code>, <code>.downColor</code></td><td>Các cột khối lượng.</td></tr>
    <tr><td><code>sessionBreaks.color</code>, <code>.style</code>, <code>.width</code></td><td>Đường ngắt ngày, tuần và tháng.</td></tr>
    <tr><td><code>highLow.color</code>, <code>watermark.color</code></td><td>Đường cao nhất và thấp nhất, watermark.</td></tr>
    <tr><td><code>trading.buyColor</code>, <code>.sellColor</code>, <code>.profitColor</code>, <code>.lossColor</code>, <code>.entryColor</code></td><td>Order (mua, bán) và position (lãi, lỗ, giá vào), trên biểu đồ và trên trục giá, ghi đè màu trong cấu hình trading.</td></tr>
    <tr><td><code>markers.longColor</code>, <code>.shortColor</code>, <code>.neutralColor</code></td><td>Marker tín hiệu, ghi đè style riêng của chúng.</td></tr>
    <tr><td><code>tradeZones.profitColor</code>, <code>.lossColor</code>, <code>.activeColor</code></td><td>Vùng giao dịch: thắng, thua và còn mở.</td></tr>
    <tr><td><code>drawings.handleColor</code></td><td>Tay nắm của hình vẽ đang chọn (màu trắng nếu không đặt).</td></tr>
    <tr><td><code>series.&lt;type&gt;.*</code></td><td>
      Chuỗi chính khi nó được vẽ theo loại đó: <code>upColor</code>, <code>downColor</code>, <code>wickUpColor</code>,
      <code>wickDownColor</code> (nến, Heikin-Ashi, volume candles, equivolume), <code>color</code> / <code>lineColor</code>
      và <code>lineWidth</code> (line, step line, line with markers, area, HLC area, baseline), <code>topColor</code> và
      <code>bottomColor</code> (area, HLC area).
    </td></tr>
  </tbody>
</table>
<p>
  <code>CHART_STYLE_KEYS</code> liệt kê mọi key cùng loại giá trị nó nhận, và TypeScript kiểm tra key và
  giá trị khi viết. Màu tăng và giảm lùi về <code>series.candlestick.*</code>, màu và độ dày đường
  lùi về <code>series.line.*</code>, màu tô vùng lùi về <code>series.area.*</code>, rồi về theme; bóng nến lấy màu
  thân nến khi màu thân đã được đặt. Key và giá trị không hợp lệ bị bỏ qua kèm một cảnh báo.
</p>

<h3>Lớp của ứng dụng và lớp của người dùng</h3>
<p>
  Override có hai lớp. Lớp của ứng dụng (<code>layer: 'host'</code>, mặc định) giữ nguyên khi đổi theme và
  không bao giờ được lưu. Lớp của người dùng (<code>layer: 'user'</code>) được ưu tiên hơn, được giữ theo theme lúc tạo ra —
  màu chọn trên theme tối sẽ quay lại cùng theme tối — và được lưu bằng <code>saveState()</code>.
  Dialog cài đặt của widget ghi vào lớp của người dùng. Các tab dọc bên cạnh đặt mọi phần look của biểu đồ qua các
  key này: <strong>Mã</strong> (loại biểu đồ đang xem, giá cuối, khối lượng), <strong>Dòng trạng thái</strong>,
  <strong>Thang</strong>, <strong>Giao diện</strong> (nền, lưới, crosshair, đường ngắt phiên),
  <strong>Lớp</strong> và <strong>Giao dịch</strong> (order, position, marker tín hiệu, vùng giao dịch). Mọi thay đổi
  hiện ngay; <strong>Huỷ</strong> trả lại tất cả và <strong>OK</strong> giữ chúng thành một bước undo.
  Menu <strong>Mẫu</strong> lưu look dưới một tên, áp dụng hoặc xoá một mẫu đã lưu, và đặt lại về
  màu của theme hiện tại. Màu để thành phần tự quyết hiển thị là Tự động, và chọn Tự động sẽ trả màu về như vậy.
</p>
<pre><code>{`chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' })
chart.getOverrides({ layer: 'user' })                 // the user's, for the current theme
chart.getTheme()                           // the theme as set: the overrides go on it apart`}</code></pre>
<p>
  Các tuỳ chọn lưới và crosshair (<code>grid.hLineColor</code>, <code>crosshair.vLine.style</code>…) là cách viết tắt
  cho các key tương ứng. Một lưới biểu đồ nhận override cho mọi biểu đồ của nó: <code>grid.applyOverrides(patch)</code>.
  Component React, Vue và Svelte nhận chúng qua prop <code>overrides</code>.
</p>

<h3>Đường vẽ và pane của chỉ báo</h3>
<pre><code>{`// Each plot's own dash and visibility, by its key (colours and widths stay in colors / lineWidths)
chart.updateIndicatorStyle(macdId, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } })

// What every indicator of a kind starts with from now on
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] })

// A pane's own background and separator, saved with its indicator
chart.setPaneStyle(rsiId, { background: '#101418', separator: '#f5a623' })`}</code></pre>
<p>
  Một đường vẽ bị ẩn không hiện tag giá trị và không có giá trị trong legend. Mọi chỉ báo đều bỏ qua đường vẽ bị ẩn, và gần như
  mọi chỉ báo nhận kiểu nét đứt của đường vẽ; một số chỉ báo tự vẽ hình riêng (Zig Zag, các volume profile, dấu
  mẫu nến) giữ nét riêng. Những đường mà chỉ báo tự vẽ nét đứt (Chandelier Exit, các mức pivot,
  dải của Session VWAP) vẫn nét đứt cho đến khi style của đường vẽ nói khác.
</p>

<h2>Tag của biểu đồ</h2>
<p>
  Widget truyền <code>tagRadius</code> cho biểu đồ của nó (hình dạng trong <code>chartOptions.shapes</code> giữ nguyên cho đến khi
  gọi <code>setUI</code>). Với <code>Chart</code> thuần, tự đặt hình dạng; nó giữ nguyên qua các lần đổi
  theme. Tag giá, pill trên trục và của crosshair, tag order, position và bracket, và tag mức giá theo kỳ dùng giá trị này.
</p>
<pre><code>{`const chart = new Chart(host, { shapes: { tagRadius: 4 } })
chart.setShapes({ tagRadius: 999 })   // pill price tags, axis pills and order badges
chart.getShapes()`}</code></pre>

<h2 id="legend">Legend OHLCV</h2>
<p>
  Legend ở đỉnh biểu đồ mở đầu bằng một dòng tiêu đề: mã, khung thời gian và sàn, rồi đến nến dưới con trỏ (nếu không thì nến cuối) trên cùng dòng: open, high, low, close và mức thay đổi. Khối lượng nằm trên một dòng riêng. Khi vùng vẽ quá hẹp cho dòng tiêu đề, như trên điện thoại, dòng này xuống dòng, và khối lượng nằm cuối dòng cuối nếu vừa. Biểu đồ lấy tên mã và khung thời gian từ stream của nó và tên sàn từ thông tin của mã; <code>setSymbolName('Bitcoin')</code> tự đặt tên cho đến khi đổi mã, và <code>showSymbol: false</code> bỏ dòng tiêu đề. Mỗi giá trị giữ nguyên vị trí khi chữ số thay đổi, nên không bị giật khi có tick mới. Legend có thể tắt, hoặc chỉ giữ các dòng cần. Trong widget, nó dùng font chữ số của look, cùng cỡ với các dòng chỉ báo nằm dưới; <code>setUI</code> đặt lại giá trị đó, sau cả một lần <code>setLegend</code> riêng.
</p>
<pre><code>{`new Chart(host, { features: { legend: false } })   // no legend at all
chart.setLegend({ visible: false })                  // or at any time
chart.setLegend({
  showSymbol: false, showOHLC: true, showChange: true, showVolume: false,
  position: 'top-right',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',                   // null: the theme's font
  ground: false,                                     // no see-through ground under the rows
})

// The widget: no legend, and no switch for it in its Settings
new ChartWidget(host, { chartOptions: { features: { legend: false } } })
// Off to start, for the user to turn on in Settings
new ChartWidget(host).setSettings({ legendVisible: false })`}</code></pre>

<p>
  Mỗi dòng của legend nằm trên một nền trong suốt cùng màu nền biểu đồ, nên các đường vẽ ngang qua đỉnh vùng vẽ (đường trung bình động, VWAP) chạy phía sau chữ thay vì cắt qua chữ. <code>ground: false</code> bỏ nền này. Các dòng chỉ báo của widget phía dưới có cùng nền, là biến CSS <code>--tcw-legend-ground</code> (<code>transparent</code> để bỏ).
</p>

<h2 id="volume">Thang giá và dải khối lượng</h2>
<p>
  Các cột khối lượng nằm trong một dải dọc đáy vùng vẽ, cao φ^-4.5 (khoảng 11.5%) chiều cao vùng vẽ, và
  thang giá khi fit giữ các nến ở trên dải đó, cách một khoảng φ^-7 (3%). Trên đỉnh cao nhất chừa φ^-5
  (9%). Khi không có khối lượng hiển thị (đã tắt, hoặc dữ liệu nến không có khối lượng) thì nến chiếm lại dải đó. Thang
  cũng fit theo các chỉ báo overlay và đường so sánh đang hiển thị.
</p>

<h2>Màu khối lượng</h2>
<p>
  Cột khối lượng lấy <code>volumeUp</code> và <code>volumeDown</code> của theme (hoặc các key <code>volume.*</code>). Các theme có sẵn vẽ chúng bằng một màu trung tính, nhạt hơn dưới nến giảm: các nến phía trên đã cho thấy giá đi theo hướng nào, nên cột khối lượng chỉ làm nền. Chúng giữ màu trung tính khi màu nến đổi, dù do code hay do cài đặt của widget. Để cột có màu theo nến, <code>volumeColor(candleColor)</code> trả về màu nến ở độ trong suốt của khối lượng:
</p>
<pre><code>{`import { DARK_THEME, volumeColor } from '@tradecanvas/chart'

chart.setTheme({
  ...DARK_THEME,
  candleUp: '#26a17b',
  candleDown: '#e0525f',
  volumeUp: volumeColor('#26a17b'),
  volumeDown: volumeColor('#e0525f'),
})`}</code></pre>
