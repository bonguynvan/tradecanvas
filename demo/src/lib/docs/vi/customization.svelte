<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Tuỳ biến — Tài liệu TradeCanvas</title>
  <meta name="description" content="Mọi cách tuỳ biến TradeCanvas: màu, look của widget, hiển thị của biểu đồ theo key, 133 công tắc cho các phần của widget, nút, menu và mục trạng thái tự thêm, chữ hiển thị, plugin và Chart headless." />
</svelte:head>

<h1>Tuỳ biến</h1>
<p>
  Mọi cách tuỳ biến biểu đồ, từ chỉnh nhẹ nhất đến sâu nhất. Phần lớn ứng dụng chỉ cần hai hoặc ba
  cách: một theme, vài công tắc, một nút riêng.
</p>

<h2>Cách nào cho việc gì</h2>
<table>
  <thead><tr><th>Cần thay đổi</th><th>Dùng</th></tr></thead>
  <tbody>
    <tr><td>Màu</td><td><code>theme</code> (<code>'dark'</code>, <code>'light'</code> hoặc theme tự định nghĩa), <code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>Góc bo, kích thước, font chữ và các thanh của widget</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>Styling</a></td></tr>
    <tr><td>Một phần hiển thị của biểu đồ: lưới, crosshair, màu của một loại biểu đồ</td><td><code>applyOverrides</code> theo key — <a href={href('/docs/styling#overrides')}>Styling</a></td></tr>
    <tr><td>Các đường của chỉ báo, nền của pane</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>, <code>setPaneStyle</code></td></tr>
    <tr><td>Phần nào của widget được hiện</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">bên dưới</a></td></tr>
    <tr><td>Người dùng làm được gì trên biểu đồ: vẽ, giao dịch, zoom</td><td>Feature của chính biểu đồ: <code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>Nút, menu và mục trạng thái tự thêm</td><td><code>addToolbarButton</code>, <code>addToolbarDropdown</code>, <code>addSidebarButton</code>, <code>addStatusBarItem</code>, <code>getSlot</code>, các hook menu — <a href="#parts">bên dưới</a>; một trang trong dock, <code>addDockPage</code> — <a href={href('/docs/api#dock')}>API</a></td></tr>
    <tr><td>Phím tắt tự thêm</td><td><code>addHotkey</code> — <a href="#parts">bên dưới</a></td></tr>
    <tr><td>CSS riêng</td><td>Các hook ổn định: <code>--tcw-*</code>, <code>data-tcw-part</code> — <a href="#css">bên dưới</a></td></tr>
    <tr><td>Chữ hiển thị của widget</td><td><code>locale</code>, <code>messages</code> — <a href="#words">bên dưới</a></td></tr>
    <tr><td>Chỉ báo, hình vẽ hoặc loại biểu đồ tự viết</td><td><a href={href('/docs/plugins')}>Plugin</a></td></tr>
    <tr><td>Toàn bộ giao diện</td><td><code>Chart</code> headless, với giao diện riêng bao quanh — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">Công tắc tính năng</h2>
<p>
  Mỗi phần của widget có một công tắc, và mọi công tắc đều bật cho đến khi bạn tắt. Tên không có dấu chấm là
  cả một tính năng, tắt ở mọi chỗ nó xuất hiện: <code>alerts</code> bỏ nút chuông, các mục cảnh báo trong menu
  và các thông báo cảnh báo. Tên có dấu chấm là một vị trí: <code>toolbar.alerts</code> chỉ bỏ nút chuông, còn
  menu vẫn có mục cảnh báo. Công tắc đổi được khi widget đang chạy.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // one button
    'sidebar.patterns': false,        // a section of drawing tools
    'menu.chart.exportData': false,   // one menu entry
    hotkeys: false,                   // every key of the widget's
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // a clean chart, while it runs
widget.isFeatureOn('sidebar')        // false
widget.isFeatureOn('toolbar.alerts') // one switch as set: true after setFeatures({ alerts: false }) too, though the button goes
widget.getFeatures()                 // every switch, on or off
grid.setFeatures({ toasts: false })  // every chart of a ChartWidgetGrid`}</code></pre>
<p>
  Các tên là một cam kết: có thể thêm tên mới, không tên nào bị đổi. Chúng được liệt kê trong <code>WIDGET_FEATURES</code>, và
  TypeScript kiểm tra chúng; tên không xác định bị bỏ qua kèm cảnh báo.
</p>
<p>
  Công tắc hiện và ẩn các phần của widget. Để chặn một việc trên chính biểu đồ (vẽ, giao dịch,
  zoom, một khung thời gian), dùng feature của biểu đồ (<code>chartOptions.features</code>). Các phần cần dữ liệu
  hoặc bộ lưu trữ đi kèm vẫn là tuỳ chọn: <code>trading</code>, <code>watchlist</code>, <code>depthLadder</code> và
  <code>layouts</code> quyết định chúng có tồn tại hay không, còn công tắc ẩn các nút của chúng. Bật công tắc không thêm phần nào trong số đó: chỉ <code>features: &#123; depthLadder: true &#125;</code> thì không tạo ra ladder.
</p>
<p>Các tuỳ chọn bật/tắt cũ là chính các công tắc này, giữ nguyên như trước:</p>
<table>
  <thead><tr><th>Tuỳ chọn</th><th>Công tắc</th></tr></thead>
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
    <tr><td>Các thanh</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code> <code>dock</code></td></tr>
    <tr><td>Tính năng</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>marks</code> <code>intervalTyping</code> <code>symbolTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code> <code>favoritesBar</code>
    </td></tr>
    <tr><td>Toolbar</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code> <code>toolbar.compare</code>
      <code>toolbar.undo</code> <code>toolbar.redo</code> <code>toolbar.trade</code>
    </td></tr>
    <tr><td>Dock</td><td>
      <code>dock.watchlist</code> <code>dock.alerts</code> <code>dock.objectTree</code> <code>dock.dataWindow</code>
      <code>dock.symbolInfo</code> <code>dock.depthLadder</code>
    </td></tr>
    <tr><td>Sidebar công cụ vẽ</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code> <code>sidebar.lockAll</code>
      <code>sidebar.hideAll</code>
    </td></tr>
    <tr><td>Thanh trạng thái</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code> <code>statusBar.rangeTimeframe</code>
      <code>statusBar.clock</code> <code>statusBar.scale</code>
    </td></tr>
    <tr><td>Trên biểu đồ</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code> <code>selectionToolbar</code>
    </td></tr>
    <tr><td>Menu</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code> <code>menu.chart.indicators</code> <code>menu.chart.timezone</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>Phím</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code> <code>hotkeys.resetView</code>
    </td></tr>
  </tbody>
</table>
<p>
  Một số công tắc làm nhiều hơn tên gọi: tắt <code>indicatorLegend</code> thì các pane có lại tiêu đề,
  còn khi bật, dòng của mỗi chỉ báo hiện các nút khi hover hoặc khi có focus bàn phím, và trên màn hình cảm ứng khi một lần chạm
  mở dòng đó (chạm vào tên khi đó mở phần cài đặt), nên trên điện thoại các nút không che nến;
  <code>menu.chart.*</code> áp dụng cho cả nút "+" cạnh trục giá lẫn menu chuột phải; <code>compare</code>
  bỏ nút thêm trong object tree, còn các mã so sánh đang có vẫn được liệt kê; <code>toasts</code> tắt
  thông báo của widget (lỗi vẫn hiện), còn thông báo của bạn qua <code>widget.toast()</code> vẫn hiện.
  Tắt <code>selectionToolbar</code> thì ẩn toolbar của hình vẽ đang chọn; menu chuột phải vẫn còn.
  Tắt <code>statusBar.rangeTimeframe</code> thì giữ nguyên khung thời gian khi một khoảng trên range bar dài hơn số nến có thể chứa; bật thì chuyển sang tuần hoặc tháng rồi chuyển lại.
  Các công cụ giao dịch gom vào một menu Giao dịch trên toolbar: <code>toolbar.bracketOrders</code>, <code>toolbar.depthLadder</code>,
  <code>toolbar.accountPanel</code> và các tính năng tương ứng bỏ mục của chúng khỏi menu, còn <code>toolbar.trade</code>
  bỏ cả menu; menu cũng mất khi không còn mục nào. Undo và redo đã chuyển từ công cụ vẽ sang
  toolbar; <code>sidebar.undo</code> và <code>sidebar.redo</code> vẫn tắt được chúng. <code>statusBar.symbol</code>
  không còn gì để tắt: dòng tiêu đề của legend đã ghi mã.
</p>

<p id="toast-icons">
  Thông báo của bạn có thể kèm một icon trong bộ icon của widget, theo tên (<code>'bell'</code>, <code>'check'</code>, <code>'info'</code>…), giống như thông báo cảnh báo của widget kèm icon chuông. Widget không vẽ emoji ở bất kỳ đâu: mọi icon, kể cả nhãn trên biểu đồ, đều lấy từ một bộ.
</p>
<pre><code>{`widget.toast('Order filled at 64,200', 'info', 'check')  // the icon set's check before the text
widget.toast('Feed lost', 'error', 'info')`}</code></pre>

<h2 id="parts">Phần tự thêm</h2>
<p>
  Nút, menu và mục của bạn nằm trong các thanh của widget, hiển thị giống các phần có sẵn và theo theme và look của widget. Mỗi
  hàm trả về một handle để sửa hoặc xoá phần đó, và phần đó hiện khi thanh chứa nó hiện.
  Khi toolbar hết chỗ, nút và menu của bạn được gom vào menu “Thêm” cùng các nút có sẵn của widget, các phần
  bên trái gom sau cùng; khi rộng dưới 641 px thì tất cả đều vào đó. Menu của bạn chọn từ “Thêm” mở ngay bên dưới nó.
  Bấm “Thêm” lần nữa để đóng. <code>onClick</code> của bạn khi được chọn từ “Thêm” nhận nút đã bị gom, không có kích thước
  (<code>getClientRects()</code> rỗng): khi đó hãy đặt popover theo nút “Thêm” (<code>.tcw-toolbar-more</code>).
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // with the chart controls
  items: () => [                             // asked for each time it opens
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')                    // reads in its own direction: "15 ms", right to left too
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => addNote() })   // replaces a widget shortcut on the same keys; listed in the shortcut sheet (?)

// Anything else of yours: beside the toolbar's controls, under the sidebar's,
// on either end of the status bar, or over the chart
widget.getSlot('chart')?.append(myOverlay)   // the layer lets the pointer through; give yours pointer-events: auto`}</code></pre>
<p>Các slot: <code>toolbar.left</code>, <code>toolbar.right</code>, <code>sidebar</code>, <code>statusBar.left</code>, <code>statusBar.right</code>, <code>chart</code>.</p>

<h3>Mục menu tự thêm</h3>
<p>Các mục của bạn nằm cuối các menu của widget, được lấy mỗi lần menu mở, kèm vị trí menu được mở.</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="css">CSS riêng</h2>
<p>Widget là một phần của trang, không phải frame, nên CSS của trang áp dụng được cho nó. Các hook sau giữ nguyên trong suốt 1.x:</p>
<ul>
  <li>Biến <code>--tcw-*</code> trên <code>.tcw-root</code>: các token của look (xem <a href={href('/docs/styling')}>Styling</a>).</li>
  <li><code>[data-tcw-part~="toolbar.screenshot"]</code>: mỗi phần mang tên các công tắc của nó, nên một rule tìm được phần đó bằng cùng tên.</li>
  <li><code>.tcw-root[data-tcw-off~="sidebar"]</code>: các công tắc đang tắt, đặt trên phần tử gốc của widget.</li>
  <li><code>[data-host-button="id"]</code>, <code>[data-host-item="id"]</code>: nút và mục trạng thái của bạn, theo id bạn đặt.</li>
</ul>
<p>Các tên class khác thuộc nội bộ widget và có thể thay đổi: hãy style qua các hook.</p>
<pre><code>{`/* your toolbar button in the accent colour */
.tcw-root [data-host-button="news"] { color: var(--tcw-accent); }
/* a wider panel of yours while the drawing tools are switched off */
.my-layout:has(.tcw-root[data-tcw-off~="sidebar"]) .my-panel { width: 320px; }`}</code></pre>

<h2 id="words">Chữ hiển thị</h2>
<p>
  Widget có 30 ngôn ngữ (<code>locale</code>; tiếng Anh và tiếng Việt có sẵn, các ngôn ngữ khác tải từ
  <code>@tradecanvas/chart/widget/locales</code>). <code>messages</code> thay bất kỳ chuỗi nào của widget, đè lên bản dịch
  của ngôn ngữ đang dùng. Tên chỉ báo giữ nguyên.
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>Sâu hơn</h2>
<p>
  Chỉ báo, công cụ vẽ và loại biểu đồ tự viết được đăng ký dưới dạng <a href={href('/docs/plugins')}>plugin</a> và
  sau đó hoạt động như các loại có sẵn, kể cả trong menu. Với giao diện hoàn toàn của riêng bạn, dùng
  <code>Chart</code> headless: cùng engine, không có widget.
</p>
