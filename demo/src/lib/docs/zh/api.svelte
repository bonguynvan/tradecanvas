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

<p id="live-price">
  <code>appendBar</code>、<code>appendBars</code> 或 <code>updateLastBar</code> 送来的K线，以及一笔 tick，就是实时价格：价格线、警报和订单的盈亏都跟随它，就像跟随已连接的数据流和 <code>setCurrentPrice</code> 一样。新K线会发出 <code>dataUpdate</code>；正在形成的K线上的 tick 不会。
</p>

<p id="bar-times">
  K 线时间为纪元毫秒或秒，整个序列使用同一单位。图表从最新一根 K 线读取一次单位：<code>barTimeUnit(data)</code> 返回 1（毫秒，1e11 及以上）或 1000（秒）。因此毫秒序列中 2001 年以前的日期也保持正确，即使这些值小于 1e12。请让一个序列只用一种单位；图表返回的时间（事件、<code>getData()</code>）使用该单位。
</p>

<h3>图表类型与主题</h3>
<table>
  <thead><tr><th>方法</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>18 种类型之一——参见 <a href={href('/docs/chart-types')}>图表类型</a>。</td></tr>
    <tr><td><code>getChartType()</code></td><td>图表当前绘制的类型（默认 <code>'candlestick'</code>）。</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>在内置主题之间切换，或设置自己的主题。<code>getTheme()</code> 按设置时的样子返回。</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>按键设置图表任意部分的样式（<code>'grid.vertical.visible'</code>、<code>'series.candlestick.upColor'</code>…）；<code>null</code> 移除一个键。见<a href={href('/docs/styling#overrides')}>样式</a>。</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>一次替换整个层；移除指定的键（或全部）。</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>某一层的覆盖；解析后的外观；某个键最终的值。</td></tr>
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
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>删除多个指标，作为一步撤销。</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>颜色、线宽、不透明度，以及每条线的线型和显示与否（<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>）。</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>从现在起同类指标的初始样式。</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>它显示在哪些周期上（<code>{`{ minutes: false, hours: [1, 4] }`}</code>）；<code>null</code> 表示全部周期。随布局一起保存。</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td>用 <code>setData</code> 设置的K线的周期：图例标题行显示它，只在部分周期显示的指标随之变化。</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>面板自己的外观，随其指标一起保存。</td></tr>
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
chart.fitContent()         // zoom out to all data (Alt+R in the widget, with auto scale)
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.setMinBarUnit(0.05)               // narrower bars, so 'All' fits a long series (0.25 by default)
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)
chart.setVisibleRange(from, to)         // the bars between two times, edge to edge (Go to's Custom range)
chart.getVisibleTimeRange()             // { from, to }: the first and last bars on screen, or null`}</code></pre>
<p id="long-ranges">
  <strong>长区间。</strong>每根 K 线的位置不窄于 0.25 px，因此超过这一限度的区间（笔记本上 26 年的日线）只显示最新的部分。在组件中，区间栏上的长区间会切换到 K 线能够放下的周期，每根至少 2 px：5Y 日线切换为周线，All 切换为月线；短区间则回到你选择的周期，绝不更细。它只会切换到你的数据源提供的周期（或现有 K 线能聚合到的周期）。<code>{`features: { 'statusBar.rangeTimeframe': false }`}</code> 保持周期不变。直接使用 <code>Chart</code> 时，<code>minBarUnit</code>（选项，或 <code>setMinBarUnit</code>）允许最窄 0.02 px，按像素列绘制。
</p>

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
  也按整分数取整。指标窗格保留各自的数字格式。没有自定义格式时，价格按数字区域设置分组；
  坐标轴的刻度标签只显示其步长所需的小数位（73,500），而最新价、十字光标和坐标轴旁的标签显示全部小数位。时间同样可以按你的方式显示；格式化函数会得知当前标签的类型。
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">坐标轴如何选择标签</h3>
<p>
  时间轴为开启最大日历步长的 K 线标注：一年（粗体）、一个月、一天、一个整点，彼此至少相隔 80 px。因此在 5Y 时显示 <code>2022 · Jul · 2023</code>，一个月时 <code>Oct · 8 · 15</code>，一天之内 <code>12:00 · 18:00</code>。标签属于 K 线而非屏幕：平移时随 K 线移动，前面加载更多历史时保持原位。最早一根 K 线左侧没有标签。月份名称遵循 <code>setNumberLocale</code>，网格线与标签位置一致。
</p>
<p>
  价格轴按其高度放置尽可能多的标签，彼此至少相隔 30 px，并落在市场的最小变动价位上。对数坐标下步长随价格增大，因此底部与顶部一样有标签；百分比或指数坐标下，标签是从基准起算的整百分比或整指数点。指标窗格也按自身高度确定标签数量。
</p>

<h3>市场：最小变动价位、涨跌停与交易时段</h3>
<p>
  <code>setMarket</code> 把交易所的规则交给图表：K线颜色、小数位数、最小变动价位（可随价格变化）、
  当日涨停价和跌停价，以及每手股数。<code>roundPrice</code> 和
  <code>getPriceStep</code> 遵循价格所在区间的最小变动价位，因此从图表菜单得到的价格都是有效价格；组件的下单窗口
  也会按最小变动价位、当日涨跌停价和整手检查订单。预设还带有交易所的交易时段和时区，供
  <code>getCurrentSession</code> 和你自己的代码使用；图表的交易时段着色和延长交易时段则来自
  <code>setSymbolInfo</code>。内置预设覆盖截至 2025 年 5 月的越南交易所规则：HOSE（按价格每档
  10、50 或 100 越南盾，±7%）、其 ETF 和备兑权证（10 越南盾）、HNX（±10%，设有收盘后交易时段）、UPCoM（±15%）
  以及 VN30 指数期货（每档 0.1 点，±7%，8:45 开盘）；股票每手 100 股，绿涨红跌，紫色为涨停价、青色为跌停价、
  黄色为参考价。预设中的价格以千越南盾为单位，与行情报价板一致；<code>scaleMarketPrices(preset, 1000)</code>
  则按越南盾读取价格。
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // 或用 scaleMarketPrices(MARKET_HOSE, 1000) 处理 25350 这样的价格
chart.setTimezone('exchange')                // 时间轴使用市场的时区：Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35)                  // 参考价：前一交易日的收盘价
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35，最小变动 50 越南盾
chart.getPriceStep(9.5)                      // 低于 10,000 越南盾时为 0.01

// 单独使用这些规则
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }，仅按时钟判断

// VN30 期货：四个挂牌合约及其最后交易日
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // 第三个星期四，遇节假日则提前`}</code></pre>
<p>
  自定义市场是一个 <code>MarketConfig</code>：<code>priceStep</code>（按价格区间分档时用
  <code>priceSteps: [{'{'} from, step {'}'}]</code>）、<code>priceLimits</code>、
  <code>volumeUnit</code>（每手数量）、<code>sessions</code>、<code>timeZone</code> 和
  <code>colorScheme</code>。品种自身的 <code>minTick</code> 优先于市场的最小变动价位。交易所会不时调整规则；
  在依赖某个预设之前，请先对照你所在交易所的现行规则进行核实。
</p>

<h3 id="comparing-symbols">品种对比</h3>
<p>
  可以在价格坐标上显示另一个品种的涨跌幅（<code>addCompareSymbol</code>），也可以把它的价格放在独立坐标或独立窗格中，
  或者显示图表收盘价与它的价差或比值——后几种都是指标（<code>compareSymbol</code>、<code>spread</code>），
  和其他指标一样有图例、数值标签和提醒，并会保存在布局中。另一个品种的K线按时间与图表的K线对齐。
  图表会请求它需要的K线；切换周期后请重新提供。<code>correlation</code>（按收盘价）和 <code>correlationlog</code>
  （按逐根K线收益率）以同样方式读取另一个品种，取值在 −1 到 1 之间。
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  在 ChartWidget 中，工具栏上的对比（以及对象树中的 +）会打开对比对话框：搜索品种，在<strong>添加方式</strong>下选择对比方式
  （涨跌幅、独立坐标、独立副图、价差、比值，或按价格或收益率计算的相关性），想添加多少个都可以。已在对比的品种列在最前面，
  每个都标出其对比方式，并带一个移除按钮。下次打开时，对话框默认使用上次用过的方式。
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
    <tr><td>轻点</td><td>点击：<code>click</code>、<code>barClick</code>、信号标记；点在绘图上则选中它</td></tr>
    <tr><td>双击轻点</td><td>双击：在坐标轴上则重置该轴；在绘图上则打开其设置</td></tr>
    <tr><td>在绘图上单指拖动</td><td>移动它，或拖动所选绘图的控制点改变形状</td></tr>
    <tr><td>选中绘图工具时：点、点——或按下、拖动、抬起</td><td>放置各点；按下、拖动再抬起，一次画出两点线</td></tr>
    <tr><td>在绘图上长按</td><td>打开它的菜单（相当于右键）</td></tr>
    <tr><td>在提醒线、订单线、括号单线或窗格分隔线上单指拖动</td><td>拖动它</td></tr>
  </tbody>
</table>
<p>
  手指的触及范围比鼠标大：到线约 16 px，到控制点约 22 px，鼠标为 8 px。在可滚动的页面上，<code>pageScroll: true</code> 会把竖直滑动和普通鼠标滚轮留给页面：图表随横向滑动平移，用双指或 Ctrl + 滚轮（触控板捏合）缩放，而按在绘图、线和坐标轴上的操作仍归图表。<code>chart.setPageScroll(on)</code> 可在运行时切换。
</p>
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
chart.on('dataUpdate', e => /* setData 和新K线时为 { kind: 'bars', length }；其他情况 kind 为 'alert' | 'bracket' | 'connection' | 'error' */)
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
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>

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
  取品种 <code>minTick</code> 的整数倍，未设置时按品种的价格精度取整。ChartWidget 的菜单、下单窗口和画线设置的 Coordinates 标签页都会这样做。
  <code>chart.getPriceStep()</code> 返回这个步长本身。
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
  features: { 'toolbar.replay': false },   // 组件的开关：见“定制”
  onReady: (chart, widget) => { /* once built, just after new ChartWidget() returns */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">各个栏</h3>
<table>
  <thead><tr><th>栏</th><th>包含的内容</th></tr></thead>
  <tbody>
    <tr><td>工具栏</td><td>
      品种及其信息；周期（固定的周期显示为按钮，另有一个按单位列出全部周期的菜单，从分钟到月，每项带一个星标，点它即可固定）；
      以图标显示的图表类型；指标（一个对话框，见<a href={href('/docs/indicators')}>指标</a>），以及配置了数据适配器时的对比；撤销和重做。右侧依次是：布局、K线回放、一个交易菜单（新建委托、做多和做空括号单、
      盘口深度和账户面板），然后是截图、设置、主题和全屏；没有按钮栏时（在手机上，或设置
      <code>{`features: { dock: false }`}</code> 时）还有提醒和对象树。放不下的部分收进“更多”。
    </td></tr>
    <tr><td>画线工具</td><td>
      每个分组的菜单都标出其中工具的快捷键（Alt+T 为趋势线），每一行都有一个星标，可把该工具固定到顶部。底部依次是：
      画线样式、磁吸、橡皮擦、区域缩放、保持画线模式、全部锁定、全部隐藏和全部清除。
    </td></tr>
    <tr><td>状态栏</td><td>
      区间预设和跳转到日期；市场状态、连接状态、一个按显示时区走的时钟（点击它会打开可选的时区列表），以及价格轴的
      <code>%</code> · <code>log</code> · <code>auto</code> 切换按钮。
    </td></tr>
    <tr><td>选中画线上方</td><td>
      颜色、线宽和线型、设置、提醒、锁定、更多和删除。按住工具栏的拖动柄把它拖开，它就留在那里，下一个画线也是如此；
      双击拖动柄可让它回到画线上方。
    </td></tr>
    <tr><td>停靠区</td><td>
      外侧边缘的一条按钮栏，每个面板一个按钮：自选列表、提醒、对象树、数据窗口和品种信息。见<a href="#dock">停靠区</a>。
    </td></tr>
  </tbody>
</table>

<h3 id="dock">停靠区</h3>
<p>
  组件的面板位于图表旁边，一次显示一个，从外侧边缘的按钮栏打开（组件左右镜像时位于左侧）。按下按钮栏上的按钮会打开对应的面板，
  如果它正是打开着的那个，则将其关闭；每个面板的关闭按钮也能关闭它。面板不会自动打开：在打开某个面板之前，空间都留给图表
  （在代码中用 <code>widget.openPanel('watchlist')</code> 打开）。拖动面板的边缘，或在边缘上按方向键，可把宽度设为 233 到 377 px（初始为 296），
  宽度保存在当前浏览器中；面板最多占这一行的 38.2%，其余留给图表。
</p>
<p>
  在手机上，或组件宽度小于 641 px 时，没有按钮栏：面板从底部升起，覆盖在图表上，一开始是关闭的，按 Escape 即可关闭；
  组件变窄时（例如旋转平板）已打开的面板会关闭。此时提醒和对象树从工具栏打开，
  品种信息从品种旁的 <strong>ⓘ</strong> 打开，任何面板也都可以由你自己的代码打开。<code>ChartWidgetGrid</code> 中的图表各自没有按钮栏，
  除非它的 <code>widget.features</code> 打开了 <code>dock</code>。
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo' | 'depthLadder'; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">搜索代码、对比和跳转到</h3>
<p>
  <strong>搜索代码</strong>可以从工具栏上的品种或 <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> 打开，
  也可以直接在图表上输入一个字母打开，并以该字母开始搜索。还没有输入时，它列出你的 <code>symbols</code>；
  输入后，每当停顿下来，它就调用数据源的搜索（<code>searchSymbols</code>，或适配器的搜索）：品种、名称、类别和交易所分列显示，
  图表当前的品种会被标出。结果包含多种类别（比如股票和加密货币）时，可以只看其中一种。搜索得知的名称会保留下来，
  用在打开时显示的列表里。<code>{`features: { symbolTyping: false }`}</code> 让在图表上输入的字母不再打开搜索。
</p>
<p>
  <strong>对比</strong>是同一个对话框，只是在搜索框下方多了<strong>添加方式</strong>，并把已在对比的品种列在最前面
  （见<a href="#comparing-symbols">品种对比</a>）。
</p>
<p>
  <strong>跳转到</strong>（状态栏上的日历、<kbd>Alt</kbd>+<kbd>G</kbd> 或图表菜单）有两个标签页。<strong>日期</strong>把某一天某一时刻的K线移到中间；
  <strong>自定义范围</strong>把两个这样的时刻之间的K线铺满整个宽度，初始值为屏幕上当前显示的K线。输入框下方的月历会填入正在编辑的日期框，
  选好范围的起点后会转到终点。日线及更长周期无需填写时间，今天之后的日期不能选。日期和时间按显示时区解读。
</p>

<h3>组件快捷键</h3>
<table>
  <thead><tr><th>快捷键</th><th>操作</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>命令面板：组件自身的命令及其快捷键（跳转、重置视图、保存布局、各个面板……）、画线工具、图表类型、周期和指标；最近用过的排在最前</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>代码搜索：你的品种列表，输入时则调用数据源的搜索</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>搜索品种，从输入的字母开始（设置 <code>{`features: { symbolTyping: false }`}</code> 可关闭）</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>保存布局（首次保存时会询问名称）</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>输入周期（<code>5</code>、<code>15m</code>、<code>1h</code>、<code>1D</code>）后按 Enter（设置 <code>intervalTyping: false</code> 可关闭）</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>趋势线、水平线、水平射线、垂直线、十字线、斐波那契回撤</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>重置视图：显示全部K线，价格坐标随之适配</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>反转价格坐标</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>跳转到日期</td></tr>
    <tr><td><kbd>?</kbd></td><td>快捷键列表，可按功能或按键搜索</td></tr>
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
  停靠区中的一个面板，含多个品种列表，每一行显示最新价、涨跌幅 % 和走势图。列表可在面板菜单中切换、新建、重命名和删除；
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
  停靠区中的一个面板，可从品种旁的 ⓘ、按钮栏或命令面板打开：品种的名称、最新价和涨跌、市场状态及距下次开盘或收盘的倒计时、
  当日开盘价、波动区间、成交量、昨收、买价和卖价、最小变动价位、货币、时区和交易时段，以及新闻。市场休市时，状态栏会显示出来。
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>导航、撤销与文字方向</h3>
<p>
  图表上的按钮——缩小和放大、向前和向后滚动（按住会持续滚动）、重置——在鼠标靠近绘图区底边时显示，以免挡住数据，或在其中一个按钮获得焦点时显示
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
  按钮栏上的图层按钮（没有按钮栏时是工具栏上的）会在停靠区中打开对象树，列出所有已添加的指标和画线。
  指标可以删除；每条画线都可以单独显示 / 隐藏、锁定 / 解锁、设置和删除，
  分组则连同其中的画线一起列出。
  默认启用——设置 <code>objectTree: false</code> 可关闭。画线控制对应以下调用：
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // 未隐藏，且在当前周期上显示
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // 一起隐藏、锁定和选中
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>画线设置与菜单</h3>
<p>
  双击一条画线，或在对象树中点击它的齿轮按钮，即可打开它的设置，分为几个标签页：样式（线条、线端、填充，
  以及工具自身的设置，如斐波那契级别、延伸和标签）、用于可写文字的工具的文本、坐标（按图表时区显示的各个点）
  和可见性（它在哪些周期上显示），底部有模板菜单、取消和确定。
  右键点击画线可打开它的菜单：
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
  对象树中的<strong>对比</strong>区域列出叠加为归一化折线的品种。
  连接实时适配器时，点击其中的 + 按钮会打开对比对话框；以百分比方式添加的品种会通过 <code>adapter.fetchHistory</code>
  获取历史数据（这样价格量级不同的品种可以共用一个坐标轴）。
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

<h3>功能开关</h3>
<p>132 个开关，全部默认开启，直到被关闭：不带点的名称是一整项功能，在它出现的每个地方关闭；带点的名称是一个位置。开关可在组件运行时切换。完整列表及对应的旧选项见<a href={href('/docs/customization')}>定制</a>。</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // 一个按钮、一组绘图工具、所有快捷键

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // 所有开关，开或关`}</code></pre>

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
<p>另外还有工具栏上的菜单按钮、绘图侧栏上的按钮、状态栏上的项目、各个栏和图表上方属于你的位置，以及绘图或指标菜单末尾的菜单项（见<a href={href('/docs/customization#parts')}>定制</a>）：</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // 每次打开时重新获取
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // 图表上方的一层
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // 你自己的快捷键，按键相同时取代组件自带的

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
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
grid.applyOverrides({ 'grid.vertical.visible': false })   // 所有图表的外观，以及之后添加的图表
grid.setFeatures({ 'toolbar.replay': false })               // 所有图表的开关，以及之后添加的图表
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
