<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Tùy biến — Tài liệu TradeCanvas</title>
  <meta name="description" content="Mọi cách biến TradeCanvas thành của bạn: màu, giao diện widget, giao diện biểu đồ theo khoá, 112 công tắc cho các phần của widget, nút, menu và mục trạng thái của riêng bạn, chữ, plugin và biểu đồ headless." />
</svelte:head>

<h1>Tùy biến</h1>
<p>
  Mọi cách biến biểu đồ thành của bạn, từ chỉnh nhẹ nhất tới sâu nhất. Phần lớn ứng dụng chỉ cần hai, ba cách:
  một theme, vài công tắc, một nút của riêng mình.
</p>

<h2>Muốn đổi gì thì dùng gì</h2>
<table>
  <thead><tr><th>Bạn muốn đổi</th><th>Dùng</th></tr></thead>
  <tbody>
    <tr><td>Màu</td><td><code>theme</code> (<code>'dark'</code>, <code>'light'</code> hoặc theme của bạn), <code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>Góc bo, kích thước, kiểu chữ và các thanh của widget</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>Giao diện</a></td></tr>
    <tr><td>Một phần giao diện biểu đồ: lưới, crosshair, màu của một loại biểu đồ</td><td><code>applyOverrides</code> theo khoá — <a href={href('/docs/styling#overrides')}>Giao diện</a></td></tr>
    <tr><td>Các đường của một chỉ báo, nền của một pane</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>, <code>setPaneStyle</code></td></tr>
    <tr><td>Phần nào của widget được hiện</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">bên dưới</a></td></tr>
    <tr><td>Người dùng được làm gì trên biểu đồ: vẽ, giao dịch, zoom</td><td>Features riêng của biểu đồ: <code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>Nút, menu và mục trạng thái của riêng bạn</td><td><code>addToolbarButton</code>, <code>addToolbarDropdown</code>, <code>addSidebarButton</code>, <code>addStatusBarItem</code>, <code>getSlot</code>, các hook menu — <a href="#parts">bên dưới</a></td></tr>
    <tr><td>Phím tắt của riêng bạn</td><td><code>addHotkey</code> — <a href="#parts">bên dưới</a></td></tr>
    <tr><td>CSS của riêng bạn</td><td>Các móc ổn định: <code>--tcw-*</code>, <code>data-tcw-part</code> — <a href="#css">bên dưới</a></td></tr>
    <tr><td>Chữ của widget</td><td><code>locale</code>, <code>messages</code> — <a href="#words">bên dưới</a></td></tr>
    <tr><td>Chỉ báo, công cụ vẽ hay loại biểu đồ của riêng bạn</td><td><a href={href('/docs/plugins')}>Plugin</a></td></tr>
    <tr><td>Toàn bộ giao diện</td><td><code>Chart</code> headless, với giao diện của bạn bao quanh — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">Công tắc tính năng</h2>
<p>
  Mỗi phần của widget có một công tắc, và công tắc nào cũng bật cho tới khi bạn tắt. Tên không có dấu chấm là cả
  một tính năng, tắt ở mọi nơi nó xuất hiện: <code>alerts</code> bỏ cái chuông, các mục cảnh báo trong menu và các
  thông báo cảnh báo. Tên có dấu chấm là một chỗ: <code>toolbar.alerts</code> chỉ bỏ cái chuông, menu vẫn có cảnh
  báo. Công tắc đổi được khi widget đang chạy.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // một nút
    'sidebar.patterns': false,        // một nhóm công cụ vẽ
    'menu.chart.exportData': false,   // một mục menu
    hotkeys: false,                   // mọi phím tắt của widget
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // một biểu đồ gọn, ngay khi đang chạy
widget.isFeatureOn('sidebar')        // false
widget.getFeatures()                 // mọi công tắc, bật hay tắt
grid.setFeatures({ toasts: false })  // mọi biểu đồ của một ChartWidgetGrid`}</code></pre>
<p>
  Các tên là một cam kết: có thể thêm tên mới, không đổi tên cũ. Chúng nằm trong <code>WIDGET_FEATURES</code> và
  được TypeScript kiểm tra; tên lạ bị bỏ qua kèm một cảnh báo.
</p>
<p>
  Công tắc chỉ ẩn, hiện các phần của chính widget. Muốn chặn một việc trên biểu đồ — vẽ, giao dịch, zoom, một khung
  thời gian — hãy dùng features của biểu đồ (<code>chartOptions.features</code>). Những phần mang theo dữ liệu hay
  bộ nhớ vẫn là option: <code>trading</code>, <code>watchlist</code>, <code>depthLadder</code> và
  <code>layouts</code> quyết định chúng có mặt hay không, còn công tắc ẩn các nút của chúng.
</p>
<p>Các option bật/tắt cũ chính là những công tắc này, vẫn dùng như trước:</p>
<table>
  <thead><tr><th>Option</th><th>Công tắc</th></tr></thead>
  <tbody>
    <tr><td><code>toolbar: false</code></td><td><code>toolbar</code></td></tr>
    <tr><td><code>drawingTools: false</code></td><td><code>sidebar</code>, <code>drawingSettings</code>, <code>hotkeys.tools</code>, <code>menu.chart.horizontalLine</code></td></tr>
    <tr><td><code>statusBar: false</code></td><td><code>statusBar</code>, <code>goToDate</code></td></tr>
    <tr><td><code>rangeBar: false</code></td><td><code>statusBar.range</code>, <code>goToDate</code></td></tr>
    <tr><td><code>accountPanel: false</code></td><td><code>accountPanel</code>, <code>orderTicket</code></td></tr>
    <tr><td><code>indicatorLegend</code>, <code>settings</code>, <code>alerts</code>, <code>objectTree</code>, <code>indicatorTemplates</code>, <code>intervalTyping</code>, <code>symbolInfo</code>, <code>navigation</code>, <code>dragDropImport</code>, <code>customTimeframes</code>, <code>fullscreen</code></td><td>Công tắc cùng tên</td></tr>
  </tbody>
</table>

<h3>Tất cả công tắc</h3>
<table>
  <thead><tr><th>Nhóm</th><th>Công tắc</th></tr></thead>
  <tbody>
    <tr><td>Các thanh</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code></td></tr>
    <tr><td>Tính năng</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>intervalTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code>
    </td></tr>
    <tr><td>Toolbar</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code>
    </td></tr>
    <tr><td>Thanh công cụ vẽ</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code>
    </td></tr>
    <tr><td>Thanh trạng thái</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code>
    </td></tr>
    <tr><td>Trên biểu đồ</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code>
    </td></tr>
    <tr><td>Menu</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>Phím tắt</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code>
    </td></tr>
  </tbody>
</table>
<p>
  Vài công tắc làm nhiều hơn tên gọi: tắt <code>indicatorLegend</code> thì các pane lấy lại tiêu đề của mình;
  <code>menu.chart.*</code> áp cho cả nút "+" cạnh trục giá lẫn menu chuột phải; <code>compare</code> bỏ nút thêm
  trong cây đối tượng, còn các so sánh đang có vẫn nằm trong danh sách; <code>toasts</code> tắt thông báo của chính
  widget (thông báo lỗi vẫn hiện), còn thông báo của bạn qua <code>widget.toast()</code> vẫn hiện.
</p>

<h2 id="parts">Phần của riêng bạn</h2>
<p>
  Nút, menu và mục của bạn nằm trong các thanh của widget, trông như của widget và theo theme lẫn giao diện của
  nó. Mỗi hàm trả về một handle để đổi hoặc gỡ, và phần đó hiện khi thanh của nó hiện.
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // cạnh các nút điều khiển biểu đồ
  items: () => [                             // được hỏi lại mỗi lần mở
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => addNote() })   // thay phím tắt của widget nếu trùng phím; có trong bảng phím tắt (?)

// Bất cứ gì khác của bạn: cạnh các nút của toolbar, dưới các nút của sidebar,
// ở hai đầu thanh trạng thái, hoặc trên biểu đồ
widget.getSlot('chart')?.append(myOverlay)   // lớp này cho con trỏ đi qua; phần tử của bạn cần pointer-events: auto`}</code></pre>
<p>Các slot: <code>toolbar.left</code>, <code>toolbar.right</code>, <code>sidebar</code>, <code>statusBar.left</code>, <code>statusBar.right</code>, <code>chart</code>.</p>

<h3>Mục menu của bạn</h3>
<p>Mục của bạn nằm cuối các menu của widget, được hỏi lại mỗi lần một menu mở, kèm chỗ nó mở.</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="css">CSS của riêng bạn</h2>
<p>Widget là một phần của trang, không nằm trong iframe, nên CSS của bạn chạm được tới nó. Những móc sau giữ nguyên suốt 1.x:</p>
<ul>
  <li>Biến <code>--tcw-*</code> trên <code>.tcw-root</code>: các token giao diện (xem <a href={href('/docs/styling')}>Giao diện</a>).</li>
  <li><code>[data-tcw-part~="toolbar.screenshot"]</code>: mỗi phần mang tên các công tắc của nó, nên một rule tìm được nó bằng chính tên đó.</li>
  <li><code>.tcw-root[data-tcw-off~="sidebar"]</code>: các công tắc đang tắt, trên phần tử gốc của widget.</li>
  <li><code>[data-host-button="id"]</code>, <code>[data-host-item="id"]</code>: nút và mục trạng thái của riêng bạn, theo id bạn đặt.</li>
</ul>
<p>Các tên class khác là của riêng widget và có thể đổi: hãy style qua các móc trên.</p>
<pre><code>{`/* nút toolbar của bạn theo màu nhấn */
.tcw-root [data-host-button="news"] { color: var(--tcw-accent); }
/* một panel của bạn rộng hơn khi công cụ vẽ bị tắt */
.my-layout:has(.tcw-root[data-tcw-off~="sidebar"]) .my-panel { width: 320px; }`}</code></pre>

<h2 id="words">Chữ</h2>
<p>
  Widget nói 30 ngôn ngữ (<code>locale</code>; tiếng Anh và tiếng Việt có sẵn, các ngôn ngữ khác nạp từ
  <code>@tradecanvas/chart/widget/locales</code>). <code>messages</code> đổi bất kỳ chuỗi nào, đè lên chuỗi của
  ngôn ngữ. Tên chỉ báo giữ nguyên.
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>Sâu hơn</h2>
<p>
  Chỉ báo, công cụ vẽ và loại biểu đồ của riêng bạn đăng ký dưới dạng <a href={href('/docs/plugins')}>plugin</a>,
  rồi chạy như những cái có sẵn, kể cả trong menu. Muốn một giao diện hoàn toàn của bạn, hãy dùng <code>Chart</code>
  headless: cùng một engine, không có widget.
</p>
