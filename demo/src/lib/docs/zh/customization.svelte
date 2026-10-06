<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>定制 — TradeCanvas 文档</title>
  <meta name="description" content="把 TradeCanvas 变成你自己的所有方式：颜色、组件外观、按键名设置图表外观、组件各部分的 112 个开关、你自己的按钮、菜单和状态项、文字、插件以及无界面的 Chart。" />
</svelte:head>

<h1>定制</h1>
<p>
  从最轻的改动到最深的改造，这里列出让图表成为你自己的每一种方式。大多数应用只需其中两三种：一个主题、几个开关、
  一个自己的按钮。
</p>

<h2>想改什么，用什么</h2>
<table>
  <thead><tr><th>你想改变</th><th>使用</th></tr></thead>
  <tbody>
    <tr><td>颜色</td><td><code>theme</code>（<code>'dark'</code>、<code>'light'</code> 或你自己的主题）、<code>setTheme</code> — <a href={href('/docs/api')}>API</a></td></tr>
    <tr><td>组件的圆角、尺寸、字体和各个栏</td><td><code>ui</code> / <code>setUI</code> — <a href={href('/docs/styling')}>样式</a></td></tr>
    <tr><td>图表外观的某一部分：网格、十字光标、某种图表类型的颜色</td><td>按键名使用 <code>applyOverrides</code> — <a href={href('/docs/styling#overrides')}>样式</a></td></tr>
    <tr><td>指标的线条、窗格的背景</td><td><code>updateIndicatorStyle(id, {'{ plots }'})</code>、<code>setPaneStyle</code></td></tr>
    <tr><td>组件显示哪些部分</td><td><code>features</code> / <code>setFeatures</code> — <a href="#switches">见下文</a></td></tr>
    <tr><td>用户能在图表上做什么：绘图、交易、缩放</td><td>图表自身的 features：<code>chartOptions: {'{ features: { drawings: false } }'}</code></td></tr>
    <tr><td>你自己的按钮、菜单和状态项</td><td><code>addToolbarButton</code>、<code>addToolbarDropdown</code>、<code>addSidebarButton</code>、<code>addStatusBarItem</code>、<code>getSlot</code>、菜单钩子 — <a href="#parts">见下文</a></td></tr>
    <tr><td>你自己的快捷键</td><td><code>addHotkey</code> — <a href="#parts">见下文</a></td></tr>
    <tr><td>你自己的 CSS</td><td>稳定的挂钩：<code>--tcw-*</code>、<code>data-tcw-part</code> — <a href="#css">见下文</a></td></tr>
    <tr><td>组件的文字</td><td><code>locale</code>、<code>messages</code> — <a href="#words">见下文</a></td></tr>
    <tr><td>你自己的指标、绘图工具或图表类型</td><td><a href={href('/docs/plugins')}>插件</a></td></tr>
    <tr><td>整个界面</td><td>无界面的 <code>Chart</code>，外面套上你自己的界面 — <a href={href('/docs/api')}>API</a></td></tr>
  </tbody>
</table>

<h2 id="switches">功能开关</h2>
<p>
  组件的每个部分都有一个开关，所有开关默认开启，直到你关掉它。不带点的名称是一整项功能，在它出现的每个地方都会关闭：
  <code>alerts</code> 会去掉铃铛按钮、菜单里的警报项以及警报通知。带点的名称是一个位置：<code>toolbar.alerts</code>
  只去掉铃铛按钮，菜单里仍然可以添加警报。开关可以在组件运行时切换。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  features: {
    'toolbar.replay': false,          // 一个按钮
    'sidebar.patterns': false,        // 一组绘图工具
    'menu.chart.exportData': false,   // 一个菜单项
    hotkeys: false,                   // 组件的所有快捷键
  },
})

widget.setFeatures({ sidebar: false, statusBar: false })   // 运行中得到一个干净的图表
widget.isFeatureOn('sidebar')        // false
widget.getFeatures()                 // 所有开关，开或关
grid.setFeatures({ toasts: false })  // ChartWidgetGrid 中的每个图表`}</code></pre>
<p>
  这些名称是一项约定：只会新增，不会改名。它们列在 <code>WIDGET_FEATURES</code> 中并由 TypeScript 检查；未知的名称会被忽略并给出警告。
</p>
<p>
  开关只负责显示和隐藏组件自身的部分。要禁止图表本身的某件事——绘图、交易、缩放、某个周期——请使用图表的 features
  （<code>chartOptions.features</code>）。会带来数据或存储的部分仍然是选项：<code>trading</code>、<code>watchlist</code>、
  <code>depthLadder</code> 和 <code>layouts</code> 决定它们是否存在，开关则可以隐藏它们的按钮。
</p>
<p>以前的开/关选项就是这些开关，用法不变：</p>
<table>
  <thead><tr><th>选项</th><th>开关</th></tr></thead>
  <tbody>
    <tr><td><code>toolbar: false</code></td><td><code>toolbar</code></td></tr>
    <tr><td><code>drawingTools: false</code></td><td><code>sidebar</code>、<code>drawingSettings</code>、<code>hotkeys.tools</code>、<code>menu.chart.horizontalLine</code></td></tr>
    <tr><td><code>statusBar: false</code></td><td><code>statusBar</code>、<code>goToDate</code></td></tr>
    <tr><td><code>rangeBar: false</code></td><td><code>statusBar.range</code>、<code>goToDate</code></td></tr>
    <tr><td><code>accountPanel: false</code></td><td><code>accountPanel</code>、<code>orderTicket</code></td></tr>
    <tr><td><code>indicatorLegend</code>、<code>settings</code>、<code>alerts</code>、<code>objectTree</code>、<code>indicatorTemplates</code>、<code>intervalTyping</code>、<code>symbolInfo</code>、<code>navigation</code>、<code>dragDropImport</code>、<code>customTimeframes</code>、<code>fullscreen</code></td><td>同名的开关</td></tr>
  </tbody>
</table>

<h3>全部开关</h3>
<table>
  <thead><tr><th>分组</th><th>开关</th></tr></thead>
  <tbody>
    <tr><td>各个栏</td><td><code>toolbar</code> <code>sidebar</code> <code>statusBar</code></td></tr>
    <tr><td>功能</td><td>
      <code>alerts</code> <code>objectTree</code> <code>symbolInfo</code> <code>symbolSearch</code> <code>settings</code>
      <code>indicatorSettings</code> <code>drawingSettings</code> <code>dataWindow</code> <code>commandPalette</code>
      <code>hotkeySheet</code> <code>goToDate</code> <code>replay</code> <code>screenshot</code> <code>copyImage</code>
      <code>shareView</code> <code>autoFib</code> <code>themeToggle</code> <code>fullscreen</code> <code>accountPanel</code>
      <code>orderTicket</code> <code>bracketOrders</code> <code>depthLadder</code> <code>layouts</code>
      <code>indicatorTemplates</code> <code>compare</code> <code>indicatorLegend</code> <code>navigation</code>
      <code>customTimeframes</code> <code>intervalTyping</code> <code>dragDropImport</code> <code>hotkeys</code>
      <code>toasts</code>
    </td></tr>
    <tr><td>工具栏</td><td>
      <code>toolbar.symbol</code> <code>toolbar.symbolInfo</code> <code>toolbar.timeframes</code>
      <code>toolbar.timeframeMenu</code> <code>toolbar.chartType</code> <code>toolbar.indicators</code>
      <code>toolbar.layouts</code> <code>toolbar.replay</code> <code>toolbar.bracketOrders</code>
      <code>toolbar.depthLadder</code> <code>toolbar.accountPanel</code> <code>toolbar.objectTree</code>
      <code>toolbar.alerts</code> <code>toolbar.screenshot</code> <code>toolbar.settings</code>
      <code>toolbar.themeToggle</code> <code>toolbar.fullscreen</code>
    </td></tr>
    <tr><td>绘图侧栏</td><td>
      <code>sidebar.cursor</code> <code>sidebar.favorites</code> <code>sidebar.lines</code> <code>sidebar.fibonacci</code>
      <code>sidebar.patterns</code> <code>sidebar.forecasting</code> <code>sidebar.annotation</code> <code>sidebar.style</code>
      <code>sidebar.magnet</code> <code>sidebar.eraser</code> <code>sidebar.zoomArea</code> <code>sidebar.stayInDrawing</code>
      <code>sidebar.undo</code> <code>sidebar.redo</code> <code>sidebar.clear</code>
    </td></tr>
    <tr><td>状态栏</td><td>
      <code>statusBar.range</code> <code>statusBar.goToDate</code> <code>statusBar.market</code>
      <code>statusBar.connection</code> <code>statusBar.symbol</code>
    </td></tr>
    <tr><td>图表上</td><td>
      <code>indicatorLegend.values</code> <code>indicatorLegend.visibility</code> <code>indicatorLegend.settings</code>
      <code>indicatorLegend.remove</code> <code>indicatorLegend.more</code> <code>pane.move</code> <code>pane.collapse</code>
      <code>pane.maximize</code> <code>navigation.zoom</code> <code>navigation.scroll</code> <code>navigation.reset</code>
    </td></tr>
    <tr><td>菜单</td><td>
      <code>menu.chart</code> <code>menu.chart.alert</code> <code>menu.chart.order</code> <code>menu.chart.orderTicket</code>
      <code>menu.chart.horizontalLine</code> <code>menu.chart.resetView</code> <code>menu.chart.drawings</code>
      <code>menu.chart.exportData</code> <code>menu.chart.settings</code> <code>menu.chart.scale</code>
      <code>menu.chart.goToDate</code> <code>menu.chart.paneScale</code> <code>menu.priceAxisAdd</code>
      <code>menu.drawing</code> <code>menu.drawing.settings</code> <code>menu.drawing.alert</code>
      <code>menu.drawing.order</code> <code>menu.drawing.group</code> <code>menu.drawing.lock</code>
      <code>menu.drawing.hide</code> <code>menu.drawing.duplicate</code> <code>menu.drawing.delete</code>
    </td></tr>
    <tr><td>快捷键</td><td>
      <code>hotkeys.commandPalette</code> <code>hotkeys.symbolSearch</code> <code>hotkeys.save</code>
      <code>hotkeys.tools</code> <code>hotkeys.invertScale</code> <code>hotkeys.goToDate</code> <code>hotkeys.help</code>
    </td></tr>
  </tbody>
</table>
<p>
  有几个开关的作用比名字多：关闭 <code>indicatorLegend</code> 后，窗格会显示回自己的标题；<code>menu.chart.*</code>
  同时作用于价格轴旁的 "+" 和右键菜单；<code>compare</code> 去掉对象树里的添加按钮，已有的对比仍保留在列表中；
  <code>toasts</code> 关闭组件自身的提示（错误提示仍会显示），你通过 <code>widget.toast()</code> 发出的提示也照常显示。
</p>

<h2 id="parts">你自己的部件</h2>
<p>
  你的按钮、菜单和状态项放在组件的各个栏里，看起来和组件自带的一样，并跟随它的主题和外观。每个方法都返回一个句柄，
  用来修改或移除，并且在所在的栏显示时才显示。
</p>
<pre><code>{`widget.addToolbarButton({ id: 'news', label: 'News', icon: 'bell', toggle: true, onClick })

widget.addToolbarDropdown({
  id: 'scans',
  label: 'Scans',
  icon: 'layers',
  side: 'left',                              // 和图表控件放在一起
  items: () => [                             // 每次打开时重新获取
    { label: 'Breakouts', onSelect: () => runScan('breakouts') },
    { label: 'Live only', checked: liveOnly, onSelect: () => (liveOnly = !liveOnly) },
  ],
})

const ruler = widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true,
  onClick: () => ruler?.setActive(toggleRuler()) })

const latency = widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
latency?.setText('15 ms')
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress: () => addNote() })   // 按键相同时取代组件自带的快捷键；也列在快捷键面板中（?）

// 你的其他任何内容：工具栏控件旁、侧栏按钮下、状态栏两端，或图表之上
widget.getSlot('chart')?.append(myOverlay)   // 这一层让指针穿过；你的元素需设置 pointer-events: auto`}</code></pre>
<p>插槽：<code>toolbar.left</code>、<code>toolbar.right</code>、<code>sidebar</code>、<code>statusBar.left</code>、<code>statusBar.right</code>、<code>chart</code>。</p>

<h3>你的菜单项</h3>
<p>你的菜单项排在组件菜单的末尾，每次菜单打开时重新获取，并告诉你菜单在哪里打开。</p>
<pre><code>{`new ChartWidget(host, {
  chartMenuItems: ({ area, price }) => area === 'plot' && price !== undefined
    ? [{ label: 'Copy price', onSelect: () => copy(price) }]
    : [],
  drawingMenuItems: ({ id, type, selected }) => [{ label: 'Share', icon: 'link', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2 id="css">你自己的 CSS</h2>
<p>组件是页面的一部分，而不是嵌在 iframe 里，所以你的 CSS 能作用到它。以下这些挂钩在 1.x 中保持不变：</p>
<ul>
  <li><code>.tcw-root</code> 上的 <code>--tcw-*</code> 变量：外观的 token（见<a href={href('/docs/styling')}>样式</a>）。</li>
  <li><code>[data-tcw-part~="toolbar.screenshot"]</code>：每个部分都带有其开关的名称，规则可以按同样的名称找到它。</li>
  <li><code>.tcw-root[data-tcw-off~="sidebar"]</code>：关闭的开关，写在组件的根元素上。</li>
  <li><code>[data-host-button="id"]</code>、<code>[data-host-item="id"]</code>：你自己的按钮和状态项，按你给的 id。</li>
</ul>
<p>其他类名属于组件内部，可能会变：请通过这些挂钩来写样式。</p>
<pre><code>{`/* 你的工具栏按钮使用强调色 */
.tcw-root [data-host-button="news"] { color: var(--tcw-accent); }
/* 绘图工具关闭时，让你自己的面板更宽 */
.my-layout:has(.tcw-root[data-tcw-off~="sidebar"]) .my-panel { width: 320px; }`}</code></pre>

<h2 id="words">文字</h2>
<p>
  组件支持 30 种语言（<code>locale</code>；内置英语和越南语，其他语言从 <code>@tradecanvas/chart/widget/locales</code>
  加载）。<code>messages</code> 可以在语言的字符串之上修改任意一条。指标名称保持不变。
</p>
<pre><code>{`import { de } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  locale: 'de',
  messages: { ...de, 'toolbar.indicators': 'Studien' },
})`}</code></pre>

<h2>更深入</h2>
<p>
  你自己的指标、绘图工具和图表类型以<a href={href('/docs/plugins')}>插件</a>形式注册，之后就和内置的一样工作，包括出现在菜单中。
  想要完全属于你的界面，就使用无界面的 <code>Chart</code>：同一个引擎，没有组件外壳。
</p>
