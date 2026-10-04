<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>API 参考 — TradeCanvas 文档</title>
  <meta name="description" content="Chart、ChartWidget、ChartGrid 以及 TradeCanvas 核心接口的 API 参考。" />
</svelte:head>

<h1>API 参考</h1>
<p>顶层类的公开接口：<code>Chart</code>、<code>ChartWidget</code>、<code>ChartWidgetGrid</code> 和 <code>ChartGrid</code>。</p>

<h2>Chart</h2>
<p>无界面渲染器。界面由你自己实现；订阅事件；以命令式方式修改状态。</p>

<h3>构造</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>数据</h3>
<table>
  <thead><tr><th>方法</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>替换整个序列。</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>追加一根新K线；如已启用则自动滚动。</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>批量追加；指标只重新计算一次。</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>修改当前正在形成的K线。</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>把一笔 tick 合并进最后一根K线。</td></tr>
    <tr><td><code>getData()</code></td><td>读取原始 OHLC 序列。</td></tr>
  </tbody>
</table>

<h3>图表类型与主题</h3>
<table>
  <thead><tr><th>方法</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>18 种类型之一——参见 <a href={href('/docs/chart-types')}>图表类型</a>。</td></tr>
    <tr><td><code>setTheme(name)</code></td><td>在内置主题之间切换。</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>切换当前周期；重新连接实时数据流。</td></tr>
  </tbody>
</table>

<h3>渲染器</h3>
<table>
  <thead><tr><th>方法</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>renderer</code> 选项</td><td><code>'canvas'</code>（默认）、<code>'webgl'</code> 或 <code>'auto'</code>（仅在硬件 GPU 上用 WebGL）。</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>运行时切换。返回当前实际使用的渲染器：没有 WebGL 2 时为 <code>'canvas'</code>。</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> 或 <code>'webgl'</code>。</td></tr>
  </tbody>
</table>
<p>GPU 绘制哪些内容以及测量数字：<a href={href('/docs/performance')}>性能 → WebGL 渲染器</a>。</p>

<h3>指标</h3>
<table>
  <thead><tr><th>方法</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>添加叠加指标或副图指标。返回实例 id。</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>修改一个运行中的指标。</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>删除并销毁。</td></tr>
  </tbody>
</table>

<h3>坐标轴与缩放</h3>
<p>
  价格轴（右侧区域）和时间轴（底部区域）可直接用指针操作，
  手势与交易员熟悉的一致：
</p>
<table>
  <thead><tr><th>手势</th><th>效果</th></tr></thead>
  <tbody>
    <tr><td>上下拖动价格轴</td><td>压缩 / 拉伸纵向价格范围（会关闭自动缩放）。</td></tr>
    <tr><td>左右拖动时间轴</td><td>放大 / 缩小时间轴。</td></tr>
    <tr><td>双击价格轴</td><td>重新启用自动缩放。</td></tr>
    <tr><td>双击时间轴</td><td>让全部数据适应视口。</td></tr>
  </tbody>
</table>
<p>
  <strong>时区。</strong>时间轴标签和十字光标的时间标签默认跟随浏览器本地时区；
  可以在设置面板中切换为固定的 UTC 偏移（或切回本地），也可以直接调用：
</p>
<pre><code>{`chart.setTimezoneOffset(-300)  // EST (UTC-5), in minutes
chart.setTimezoneOffset(330)   // IST (UTC+5:30)
chart.setTimezoneOffset(null)  // back to browser-local`}</code></pre>

<p>同样的效果也可以通过代码实现：</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)`}</code></pre>

<p>
  <strong>价格坐标模式。</strong>除常规和对数外，坐标轴还可以以第一根可见K线为基准
  重新计算标签——<code>percentage</code> 显示百分比涨跌，<code>indexedTo100</code>
  把基准设为 100。常规、百分比和以 100 为基准三种模式共用同一套线性几何，只有标签不同。
  可在图表设置面板中设置，也可以直接调用：
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>价格与时间格式</h3>
<p>
  价格可以按你自己的方式显示，也可以像债券及其期货报价那样以一个点的分数显示
  （<code>101'16</code> 表示 101 又 16/32）。该格式作用于价格坐标上所有显示价格的地方：坐标轴、十字光标、
  最新价标签、图例、提示框、委托、提醒和画线标签；坐标轴刻度落在整分数上，<code>roundPrice</code>
  也按整分数取整。指标窗格保留各自的数字格式。时间同样可以按你的方式显示；格式化函数会得知当前标签的类型。
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'date' (a daily bar), 'day' (a new day), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3>品种对比</h3>
<p>
  可以在价格坐标上显示另一个品种的涨跌幅（<code>addCompareSymbol</code>），也可以把它的价格放在独立坐标或独立窗格中，
  或者显示图表收盘价与它的价差或比值——后几种都是指标（<code>compareSymbol</code>、<code>spread</code>），
  和其他指标一样有图例、数值标签和提醒，并会保存在布局中。另一个品种的K线按时间与图表的K线对齐。
  图表会请求它需要的K线；切换周期后请重新提供。
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  在 ChartWidget 中，对象树的对比按钮会先询问品种，再询问对比方式：涨跌幅、独立坐标、独立副图、价差或比值。
</p>

<h3>导出数据</h3>
<p>
  以 CSV 或 JSON 导出K线，每条指标线各占一列，列名与图例中的名称一致。ChartWidget 的图表右键菜单中有
  <strong>导出数据 (CSV)</strong>。
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

<h3>成交量分布（Volume Profile）</h3>
<p>
  在可见范围内按价格分组统计成交量的水平直方图。默认关闭——
  可通过代码或组件的设置面板开启：
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>波段标记（枢轴点）</h3>
<p>
  用小三角形标出分形波段高点 / 低点（▼ 位于已确认的枢轴高点上方，▲ 位于枢轴低点下方）。
  强度参数决定两侧各需要有多少根更低的K线。可在设置面板中切换，或者：
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>交易时段着色（常规交易时段）</h3>
<p>
  把常规交易时段以外的K线（盘前 / 盘后或隔夜休市）调暗，让常规交易时段更加醒目。
  默认使用美股常规交易时段（纽约时间 09:30–16:00，已考虑夏令时）；
  可以用“一天中的分钟数”加上市场时区来配置时间窗口。
  如果某个品种的数据源提供了交易时段信息，会自动设置。
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>
<p>
  <strong>延长交易时段。</strong>关闭后，品种常规交易时段（按其 <code>timezone</code> 计算的
  <code>SymbolInfo.sessions</code>）以外的K线会离开图表；它们会被暂存起来，实时K线和历史分页也是如此，
  重新开启后即恢复。日线及更长周期的K线保持不变。
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

<h3>前一周期高低点（PDH / PDL / PDC）</h3>
<p>
  将前一日（或前一周）的最高价、最低价、收盘价以及当前周期的开盘价绘制为带标签的水平线——
  这正是日内交易者关注的支撑 / 阻力位。可在设置面板中切换，也可以直接调用：
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day')  // [{ id, label, price }]`}</code></pre>

<h3>市场轮廓（TPO）</h3>
<p>
  一种“价格停留时间”直方图：每根K线会为其价格范围触及的每个价格档位贡献一个 TPO，
  由此显示控制点（Point of Control，成交最密集的价格）和价值区（约 70% 的 TPO）。
  它与成交量分布不同——按时间而非成交量加权——并固定在左侧，因此两者可以同时显示。
  默认关闭；可在设置面板中切换，也可以直接调用：
</p>
<pre><code>{`chart.setMarketProfileVisible(true)
chart.setMarketProfileConfig({
  buckets: 48,
  widthRatio: 0.18,
  opacity: 0.32,
  valueAreaPct: 0.7,  // fraction of TPOs in the value area
  highlightPoC: true, // dashed line at the point of control
})

// split into one mini-profile per calendar-day session
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax)  // per-day TPO`}</code></pre>

<h3>触控与移动端</h3>
<table>
  <thead><tr><th>手势</th><th>操作</th></tr></thead>
  <tbody>
    <tr><td>单指拖动（图表区域）</td><td>平移并移动十字光标</td></tr>
    <tr><td>双指捏合</td><td>以中点为中心缩放</td></tr>
    <tr><td>长按（约 500 ms）</td><td>在K线上固定 OHLC 提示（相当于移动端的 Alt+点击）</td></tr>
    <tr><td>在价格轴 / 时间轴区域内单指拖动</td><td>缩放对应的坐标轴</td></tr>
  </tbody>
</table>
<p>
  当视口宽度小于 640 px 时，弹窗（设置、快捷键列表、命令面板、代码搜索）
  会自动切换为底部抽屉样式，带拖动手柄，并适配安全区域的内边距。
</p>

<h3>测量工具</h3>
<p>
  按住 <kbd>Shift</kbd> 在图表上拖动，即可测量两点之间的K线数 × 价差——
  浮层会显示价格 Δ（绝对值 + 百分比）、K线数量和时间跨度。
  松开鼠标后浮层立即消失，不会保存到状态中。
</p>

<h3>事件</h3>
<p>所有事件都通过 <code>ChartEventMap</code> 提供类型：</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { length } */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* 画线、指标、提醒、图表类型或主题可能已变化 */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' } */)`}</code></pre>

<h3>为你自己的改动提供撤销</h3>
<p>
  <code>recordUndo</code> 把你的一次改动放进图表的撤销历史，和画线、指标放在一起：Ctrl/Cmd+Z 调用 <code>undo</code>，
  重做调用 <code>redo</code>。针对同一 <code>subject</code>、时间上相近的改动算作一步。ChartWidget 就是这样记录它的设置和图表类型的。
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>键盘与屏幕阅读器</h3>
<p>
  获得焦点的图表可以用方向键滚动（按住 Shift 一次十根K线），用 ↑/↓ 或 +/− 缩放，用 Home 和 End 跳到开头和末尾。
  对屏幕阅读器而言，它是一个带摘要（品种、类型、周期、最新价）的应用程序；按键移动视图后，它会说出屏幕上显示的内容，
  逗号和句号键则逐根朗读K线。<code>a11y.labels</code> 把这些文字换成你的语言；<code>a11y: false</code> 则不加这部分。
  <code>scrollBars(n)</code> 和 <code>selectDrawing(id)</code> 用代码完成按键和点击所做的事。
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  来自指针的价格可以用 <code>chart.roundPrice(price)</code> 对齐到市场的价格刻度：
  取品种 <code>minTick</code> 的整数倍，未设置时按品种的价格精度取整。ChartWidget 的菜单和下单窗口都会这样做。
</p>

<h2>ChartWidget</h2>
<p>为 <code>Chart</code> 包上一套完整界面。同一个实例可通过 <code>widget.chart</code> 访问。</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { drawings: true, indicators: true },
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3>组件快捷键</h3>
<table>
  <thead><tr><th>快捷键</th><th>操作</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>命令面板（指标、图表类型、画线……）</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>代码搜索——在已配置的品种列表中模糊查找</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>保存布局（首次保存时会询问名称）</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>输入周期（<code>5</code>、<code>15m</code>、<code>1h</code>、<code>1D</code>）后按 Enter（设置 <code>intervalTyping: false</code> 可关闭）</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>趋势线、水平线、水平射线、垂直线、十字线、斐波那契回撤</td></tr>
    <tr><td><kbd>?</kbd></td><td>显示快捷键列表</td></tr>
    <tr><td><kbd>Alt</kbd> + 点击图表</td><td>在鼠标所在K线上固定 OHLC 提示（同时显示与实时十字光标的差值）</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>取消固定提示 / 取消当前画线</td></tr>
    <tr><td>点击工具栏中的品种</td><td>打开代码搜索弹窗</td></tr>
    <tr><td>点击工具栏中的播放按钮</td><td>打开K线回放进度条（播放 / 单步 / 跳转 / 速度）</td></tr>
  </tbody>
</table>
<p>运行时可用 <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code> 更新可搜索的品种列表。</p>

<h3>数据窗口</h3>
<p>
  一个浮动的读数面板，显示鼠标所在K线的精确 O/H/L/C/V、K线涨跌，以及每个已添加指标的数值——
  移动十字光标时实时更新。可从命令面板中切换（<kbd>Ctrl/⌘ K</kbd> →
  “显示/隐藏数据窗口”）。
</p>

<h3>可分享视图（深层链接）</h3>
<p>
  把整个视图——品种、周期、图表类型、价格坐标、指标（含参数）和画线——编码为一个紧凑的、
  可安全放入 URL 的字符串，用于深层链接。设置 <code>shareUrl: true</code> 后，
  组件会在加载时恢复 <code>#tcw=…</code> 哈希，命令面板中的“分享视图”操作
  会把链接复制到剪贴板。
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>命名布局</h3>
<p>
  工具栏上的布局按钮会以一个名称保存图表：品种、周期、价格坐标、图表类型、指标、画线和提醒
  （不包括主题，主题由查看者自己决定）。可从该按钮的菜单中打开、重命名和删除布局；
  当前打开的布局会在变化时自动保存，按 <kbd>Ctrl/⌘ S</kbd> 也可以保存。
  除非你提供一个 <code>storage</code>，布局都保存在当前浏览器的 <code>localStorage</code> 中。
  <code>storage</code> 由四个方法组成，每个方法都可以返回 promise。
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } 或 null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // 设为 false 则不启用
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } 或 null
layouts.setAutoSave(false)

// 只取内容本身，可以存放在任何地方
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  内置两种存储：<code>localStorageLayouts(prefix)</code> 和 <code>memoryLayouts()</code>。
  读取已保存的内容时会做防御性校验：无法解析的布局会被拒绝，而不会只应用一半。
  每个布局都会记录自己的 <code>kind</code>（<code>'chart'</code> 或 <code>'grid'</code>），
  因此图表组件和网格可以共用一个存储，各自只列出自己的布局。保存、打开和自动保存会逐个依次执行，
  因此保存绝不会写入在它之后打开的布局。
</p>

<h3>按品种保存的布局</h3>
<p>
  另外，还可以自动把每个品种的指标组合、画线、提醒和图表类型
  持久化到 <code>localStorage</code>：
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  persistLayouts: true,  // or { keyPrefix: 'myapp:', debounceMs: 2000 }
})

// Reset a single symbol's layout
widget.clearSavedLayout('BTCUSDT')`}</code></pre>
<p>
  切换品种和销毁组件时都会立即写入布局，因此用户离开页面时不会丢失任何内容。
</p>

<h3>拖放导入数据</h3>
<p>
  把 CSV 或 JSON 文件拖到图表上即可立即载入。默认启用——
  设置 <code>dragDropImport: false</code> 可关闭。解析器支持常见的列布局
  （<code>time, open, high, low, close, volume</code>）、
  ISO 8601 时间戳以及 Unix 秒 / 毫秒。
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>周期重采样</h3>
<p>
  用 <code>widget.setData()</code> 传入你最细粒度的序列，工具栏的周期按钮会在客户端
  进行聚合——一份数据驱动所有周期，无需重新请求。只要没有连接实时适配器就会生效；
  设置 <code>resampleTimeframes: false</code> 可关闭。周线默认以周一为起点
  （<code>weekStartsOn: 0</code> 表示周日）。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  timeframes: ['5m', '15m', '1h', '4h', '1d', '1w'],
})
widget.setData(oneMinuteBars)   // base series; clicking 4h/1d/1w resamples it

// Or use the pure function directly
import { resampleOHLCV, inferTimeframeMs } from '@tradecanvas/chart'

const hourly = resampleOHLCV(oneMinuteBars, '1h')   // OHLC merged, volume summed
const fourHour = resampleOHLCV(oneMinuteBars, '4h', { weekStartsOn: 1 })`}</code></pre>
<p>
  分组遵循日历规则：日内和日线周期对齐 UTC 纪元边界，周线对齐所配置的一周起始日，
  月 / 季度 / 年对齐日历边界。输入的K线永远不会被修改。
</p>

<h3>自选列表</h3>
<p>
  右侧面板中有多个品种列表，每一行显示最新价、涨跌幅 % 和走势图。列表可在面板菜单中切换、新建、重命名和删除；
  品种可从代码搜索（+）添加，可移除，也可通过拖动或 Alt+↑/↓ 重新排序。各行的报价来自适配器的
  <code>subscribeQuotes</code>、你自己的报价源，或你推送的数据。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code> 仍和以前一样显示一个由 <code>symbols</code> 组成的列表；<code>setWatchlistEntry</code>
  仍可推送某一行的价格、涨跌和走势图。
</p>

<h3>品种信息</h3>
<p>
  从工具栏的 ⓘ 按钮（或命令面板）打开的面板：品种的名称、最新价和涨跌、市场状态及距下次开盘或收盘的倒计时、
  当日开盘价、波动区间、成交量、昨收、买价和卖价、最小变动价位、货币、时区和交易时段，以及新闻。市场休市时，状态栏会显示出来。
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>导航、撤销与文字方向</h3>
<p>
  图表上的按钮——缩小和放大、向前和向后滚动（按住会持续滚动）、重置——在鼠标位于图表上时显示
  （<code>navigation: false</code> 可去掉它们）。设置的改动和图表类型的切换可以用 Ctrl/Cmd+Z 撤销，与画线和指标一样。
  在阿拉伯语、希伯来语、波斯语或乌尔都语下，组件会左右镜像（<code>dir: 'auto'</code>；或 <code>'rtl'</code> / <code>'ltr'</code>）；
  图表中的时间仍从左向右推进。
</p>

<h3>收藏的画线工具</h3>
<p>
  把常用的画线工具固定到侧边栏顶部的收藏栏。
  右键点击任意工具（在分组弹出菜单或收藏栏中）即可固定或取消固定；
  该设置会持久化到 localStorage。可用 <code>drawingFavorites</code>
  预设初始收藏：
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>

<h3>画线样式与模板</h3>
<p>
  画线侧边栏上的调色板按钮会打开样式浮层——为下一条画线（以及当前选中的画线）选择颜色、
  线宽和线型，还可以保存带名称的<strong>模板</strong>到 localStorage，一键复用。
  对应的代码调用：
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>对象树</h3>
<p>
  工具栏中的图层按钮会打开对象树面板，列出所有已添加的指标和画线。
  指标可以删除；每条画线都可以单独显示 / 隐藏、锁定 / 解锁、设置和删除，
  分组则连同其中的画线一起列出。
  默认启用——设置 <code>objectTree: false</code> 可关闭。画线控制对应以下调用：
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // 一起隐藏、锁定和选中
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>画线设置与菜单</h3>
<p>
  双击一条画线，或在对象树中点击它的齿轮按钮，即可打开它的设置：样式、工具自身的设置
  （斐波那契级别、延伸、标签……）以及按图表时区显示的各个点。右键点击画线可打开它的菜单：
  设置、基于其线条的提醒、顺序、分组、锁定、隐藏、创建副本和删除。侧边栏里还有橡皮擦、
  缩放工具，以及可关闭、弱、强三档的磁吸。底层 API 参见
  <a href={href('/docs/drawing-tools')}>画线工具</a>。
</p>

<p>
  每行指标上的齿轮按钮会打开<strong>设置对话框</strong>，它会读取指标的参数
  （数值、开关、颜色），并通过 <code>updateIndicator</code> 实时应用修改——
  修改周期或颜色时无需先删除再重新添加。
</p>
<p>
  对象树中的<strong>对比</strong>区域可以把其他品种叠加为归一化的折线。
  连接实时适配器时，点击 + 按钮会打开品种选择器，通过 <code>adapter.fetchHistory</code>
  获取该品种的历史数据，并以百分比模式添加（这样价格量级不同的品种可以共用一个坐标轴）。
  切换周期时，对比数据会自动重新获取。对应的代码调用：
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>价格提醒</h3>
<p>
  除了价格水平，提醒还可以把一条线与另一条线比较（价格穿越移动平均线、MACD 穿越其信号线），
  在若干根K线内（2 到 500 根）涨跌达到一定百分比时触发，只看已收盘的K线（影线刺破后又收回不会触发），
  以及到期失效。组件的提醒面板支持以上全部功能；在代码中，它们是 <code>addAlert</code> 的最后一个参数。
  每次有新价格（来自 <code>setCurrentPrice</code> 或已连接的数据源）时，提醒都会与其监控的线一起检查：
</p>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })
const rsi = chart.addIndicator('rsi')
chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: \`\${ema}:value\` })
chart.addAlert(NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 })
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', \`\${rsi}:value\`, 'RSI', { onBarClose: true })
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 })

chart.on('alertExpired', (e) => e.payload)   // it reached its time without firing
chart.on('alertTriggered', (e) => e.payload)  // { id, condition, channel, target?, percent?, bars?, … }`}</code></pre>
<p>
  工具栏中的铃铛按钮会打开浮动面板，用于添加、查看和删除价格提醒；
  提醒触发时会弹出通知。提醒线也可以<strong>拖动</strong>——
  在图表上抓住它并滑动即可修改价格（移动提醒会重新激活它）。默认启用——
  设置 <code>alerts: false</code> 可关闭。也可以通过 <code>Chart</code> API
  和带类型的提醒事件以代码方式控制：
</p>
<pre><code>{`// Add from code (condition: 'crossing' | 'crossingUp' | 'crossingDown'
//                          | 'greaterThan' | 'lessThan')
const id = chart.addAlert(64200, 'crossingUp', 'breakout')
chart.removeAlert(id)
chart.getAlerts()      // PriceAlert[]
chart.saveAlerts('tcw:alerts:BTCUSDT')   // localStorage persistence
chart.loadAlerts('tcw:alerts:BTCUSDT')

// React to triggers
chart.on('alertTriggered', (e) => {
  console.log('hit', e.payload.price, e.payload.message)
})
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)

// Indicator alerts: bind to an indicator line via channel '<instanceId>:<key>'.
// In the widget, the alerts panel's source dropdown lists every active line.
const ema = chart.addIndicator('rsi')
chart.addAlert(70, 'crossingUp', 'RSI overbought', \`\${ema}:rsi\`, 'RSI')`}</code></pre>
<p>
  提醒触发时可选择播放声音和 / 或发送桌面通知（两者默认都关闭）。
  <code>sound: true</code> 播放内置提示音；也可以传入 URL 使用自定义声音。
  <code>desktop: true</code> 使用 Notification API，首次使用时会请求权限。
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>自定义按钮和菜单项</h3>
<p>
  向工具栏添加按钮（内置图标或你自己的元素、文字、开关），并向图表的右键菜单添加菜单项，
  它们会排在组件自带的项目之后。
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // 或一个 <svg> 元素；或 text: 'News'
  side: 'right',           // 'left' 会与图表控件放在一起
  toggle: true,
  onClick: () => news?.setActive(togglePanel()),
})
news?.setText('3')
news?.remove()

new ChartWidget(host, {
  chartMenuItems: ({ area, price, time }) => area === 'plot' && price !== undefined
    ? [{ label: \`Copy \${price.toFixed(2)}\`, icon: 'check', onSelect: () => copy(price) }]
    : [],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  多个图表组件并排显示，每个都有自己的品种、周期、指标和画线。上方的工具条用于选择排列方式、
  联动各个图表，并把整个网格保存为一个命名布局。最后点击的图表就是当前图表（带边框）。
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x1' '1x2' '2x1' '2x2' '1x3' '3x1' '2x3' '3x2'
  widget: { timeframe: '1h' },                    // 作用于每个图表
  adapter: () => new BinanceAdapter(),            // 每个图表一个：一个适配器只维持一条数据流
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // 让其他图表与当前图表保持一致
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// 每个图表创建时（初始时，以及网格变大时）
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  十字光标同步会在每个图表上显示指针所在的时间；时间同步会让其他图表随正在操作的图表一起滚动和缩放；
  画线会复制到显示同一品种的图表上（开启时会把这些图表的画线合并到一起，不会丢失任何画线）；
  回放同步会把其他图表回放到与正在回放的图表相同的时间（K线比回放步长更长的图表会显示包含该时间的整根K线）。
  网格缩小时被移除的图表会被收起并保留在已保存的布局中，网格再次变大时会原样恢复；
  全新的图表在品种和周期处于同步状态时，会使用当前图表的品种和周期打开。
</p>

<h2>ChartGrid</h2>
<p>由无界面图表（不带工具栏）组成的同步联动多图表布局；如需完整界面，请参见 <code>ChartWidgetGrid</code>。</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// 每个图表一个适配器：一个适配器只维持一条数据流
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>布局：<code>'1x1'</code>、<code>'1x2'</code>、<code>'2x1'</code>、<code>'2x2'</code>、<code>'1x3'</code>、<code>'3x1'</code>、<code>'2x3'</code>、<code>'3x2'</code>。</p>
