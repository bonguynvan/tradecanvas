<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>画线工具 — TradeCanvas 文档</title>
  <meta name="description" content="69 种内置画线工具，各有独立设置：斐波那契与江恩工具、艾略特波浪、谐波形态、笔记、画笔、支持仓位计算的多/空仓位、画线提醒、分组与图层。" />
</svelte:head>

<h1>画线工具</h1>
<p>
  69 种内置画线工具。每种工具都能通过磁吸对齐到K线，支持撤销和重做，
  保留各自的设置，并随布局一起保存。
</p>

<h2>用指针绘制</h2>
<pre><code>{`chart.setDrawingTool('trendLine')   // 接下来的点击会绘制一条趋势线
chart.setDrawingTool(null)          // 回到光标
chart.setStayInDrawingMode(true)    // 每次绘制完成后保留当前工具`}</code></pre>
<p>工具有三种绘制方式：</p>
<ul>
  <li><b>点击</b> — 每个点点击一次（趋势线两次，XABCD 形态五次）。</li>
  <li><b>手绘</b> — 按住并拖动；<code>brush</code> 和 <code>highlighter</code>。</li>
  <li><b>路径</b> — 每个点点击一次，然后双击、按 <kbd>Enter</kbd> 或点击最后一个点即可结束；<code>path</code> 和 <code>polyline</code>。</li>
</ul>
<p><kbd>Escape</kbd> 会放弃尚未完成的绘制。</p>

<h2>用代码添加画线</h2>
<pre><code>{`const id = chart.addDrawing({
  type: 'fibRetracement',
  anchors: [{ time: t1, price: 101.2 }, { time: t2, price: 96.4 }],
  style: { color: '#f2a93b' },
  options: { reverse: true, extendRight: true },
})

chart.autoFib()   // 在当前可见范围内的主要波段上绘制回撤，没有则返回 null`}</code></pre>

<h2 id="panes">在指标窗格上</h2>
<p>
  在指标窗格（RSI、MACD…）上开始的绘图就画在该窗格上：锚点的价格是该窗格的数值，磁吸吸附到窗格的线，绘图跟随窗格的刻度，不会超出所在窗格。侧边窗格和折叠的窗格不能绘图；读取K线价格的工具（锚定 VWAP、成交量分布、多空头寸）只用于价格窗格。窗格上的绘图不能添加价格提醒。
</p>
<pre><code>{`const rsi = chart.addIndicator('rsi')
chart.addDrawing({
  type: 'horizontalLine',
  anchors: [{ time: t1, price: 70 }],   // RSI 刻度上的 70
  paneId: rsi,                          // 窗格 id，即 getIndicatorPanes() 列出的
})`}</code></pre>
<p>
  拥有窗格的指标被删除、由窗格中另一个指标接管时，绘图随窗格一起转移。窗格被删除时，其绘图会隐藏，撤销后随窗格一起恢复。保存的布局会把它们放回各自的窗格。
</p>

<h2 id="text">文字</h2>
<p>
  文字类工具（文本、便签、标注、价格标签、箭头标记）共用一套文字样式：字号、粗体、斜体和单独的文字颜色。文本、便签和标注还能左对齐、居中或右对齐，可以加背景和边框，并在指定宽度处换行。文本保留自己的换行，没有设定宽度时不会自动换行；便签和标注在 240 px 处换行。
</p>
<pre><code>{`chart.addDrawing({
  type: 'text',
  anchors: [{ time: t1, price: 101.2 }],
  style: {
    text: 'Breakout\\nretest here',     // 保留文字自己的换行
    fontSize: 14, bold: true, italic: false,
    textAlign: 'center',              // 'left' | 'center' | 'right'
    textColor: '#f2a93b',
    textBackground: true, fillColor: '#1e222d', fillOpacity: 0.8,
    textBorder: true, borderColor: '#f2a93b',
    textWrap: 200,                    // px；0：只在文字换行处换行
  },
})`}</code></pre>
<p>
  在组件中，画完文本、便签或标注后会立即询问内容：设置在“文字”页打开，文字已选中，按“取消”会撤回这个绘图。双击它们也会打开同一页。选中时的工具栏可设置有填充或文字的工具的填充色和文字颜色。
</p>

<h3 id="line-text">线和矩形上的文字</h3>
<p>
  趋势线、射线、延长线、信息线、角度线、箭头、水平线、垂直线和矩形也可以带文字，样式相同。<code>textAlign</code> 把文字放在线的左端、中间或右端，<code>textVAlign</code> 放在线的上方、线上或下方；在矩形中，它们把文字放在框内的顶部、中间或底部。文字随线的斜率倾斜，始终从左往右读，垂直线上则从下往上读。在小组件中，文字选项卡有这两行。
</p>
<pre><code>{`chart.addDrawing({
  type: 'trendLine',
  anchors: [{ time: t1, price: 98 }, { time: t2, price: 104 }],
  style: { color: '#4c8dff', lineWidth: 2, lineStyle: 'solid',
    text: 'Breakout', textAlign: 'right', textVAlign: 'top' },  // 'top' | 'middle' | 'bottom'
})
chart.addDrawing({ type: 'verticalLine', anchors: [{ time: t3, price: 0 }], options: { showTime: true } })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b], options: { trendLine: false, oneColor: true } })`}</code></pre>
<p>
  水平线和水平射线用 <code>showPrice: false</code> 隐藏价格。垂直线用 <code>showTime: true</code> 显示其 K 线的时间，写法与十字光标相同。矩形有八个控制点：每个角一个，每条边的中点一个，拖动后只移动那条边。斐波那契回撤和扩展会画一条穿过其各点的虚线（<code>trendLine</code>，默认开启），并可用 <code>oneColor</code> 让所有水平都用绘图的颜色。
</p>

<h2>设置</h2>
<p>
  除样式（颜色、线宽、线型、填充、文本）外，工具还可以提供自己的设置：
  斐波那契级别、向左或向右延伸线条、标签、背景、图标、波浪级别。
  组件的设置对话框就是根据这些设置生成的。
</p>
<pre><code>{`chart.getDrawingOptionDefs('fibRetracement')  // 工具提供哪些设置
chart.getDrawingOptions(id)                   // 当前的值，已填入默认值
chart.setDrawingOptions(id, {
  levels: [{ value: 0.5, visible: true }, { value: 0.618, visible: true, color: '#e8505b' }],
})

// 多项更改合并为一次撤销
chart.updateDrawing(id, { style: { lineWidth: 2 }, options: { extendLeft: true } })

// 预览更改的对话框：一次撤销，取消时还原
chart.beginDrawingEdit(id)
chart.updateDrawing(id, { style: { color: '#26a69a' } })
chart.endDrawingEdit(id, { cancel: false })

// 每个新建的斐波那契回撤的初始设置
chart.setDrawingToolDefaults('fibRetracement', { showPrices: false })`}</code></pre>
<p>来自已保存布局或粘贴画线的设置会按工具进行校验；工具不接受的值会被丢弃。</p>

<h3 id="settings-dialog">设置对话框</h3>
<p>
  在组件中双击一条画线（或点击它的工具栏、菜单或对象树中的“设置”），会打开它的设置，分为几个标签页。
  <strong>样式</strong>：线条（颜色、线宽、线型）在同一行，然后是线端、填充，接着是工具的开关和选项，以及它的级别。
  <strong>文本</strong>，用于可写文字的工具：文本及其字号。<strong>坐标</strong>：每个点的价格、日期和时间，按图表时区显示。
  <strong>可见性</strong>：它在哪些周期上显示。每项更改都会立即生效；<strong>确定</strong>将这些更改保留为一次撤销，
  <strong>取消</strong>（或 Escape）将画线还原。<strong>模板</strong>菜单可以应用或删除已保存的模板、将画线的外观保存为模板、
  将这些选项保存为该工具的默认值，以及重置它们。
</p>

<h3 id="drawing-intervals">只在部分周期显示</h3>
<p>
  画线可以只在部分周期上显示，规则与指标相同：关闭某一类周期（<code>minutes: false</code>），
  或限定它的一个范围（<code>hours: [1, 4]</code>）。在其他周期上，画线不会被绘制、无法点中，也不会被选中。
  这些规则随布局一起保存。
</p>
<pre><code>{`chart.updateDrawing(id, { intervals: { minutes: false } })  // 不在分钟图上显示
chart.isDrawingShown(id)                                    // 在 5m 图上为 false
chart.updateDrawing(id, { intervals: null })                // 恢复为全部周期

chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: 100 }], intervals: { days: false, weeks: false } })`}</code></pre>
<p>直接使用 Chart 且没有数据流时，用 <code>chart.setDataTimeframe('5m')</code> 告诉图表K线的周期。</p>

<h3 id="line-stats">线的端点、中点和统计</h3>
<p>
  趋势线、射线和延长线可以显示中点，以及两点之间的统计：价格变化及其百分比、两点之间的K线数和时间、角度。
  统计在线条被选中时显示，也可以始终显示，位置在右端、中点或左端旁。趋势线的端点可以是箭头。
  这些默认全部关闭，需要时再开启。
</p>
<pre><code>{`chart.setDrawingOptions(id, {
  showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true,
  alwaysShowStats: true, statsPosition: 'right',   // 'left' | 'center' | 'right'
  showMiddlePoint: true,
  rightEnd: 'arrow',                                // 趋势线：leftEnd、rightEnd
})`}</code></pre>

<h2 id="selection-toolbar">选中画线上方的工具栏</h2>
<p>
  在组件中点击一个画线，其上方会出现一个小工具栏：颜色、线宽和线型，然后是设置、在其线上加提醒、锁定、完整的画线菜单（与右键相同）和删除。选中多个画线时，工具栏位于它们全部之上，修改作用于每一个。画线被移动、平移或缩放时它会跟随；画线工具、橡皮擦或区域缩放开启时它会让开；它是一个 Tab 停靠点，可用方向键在其中移动。
</p>
<pre><code>{`new ChartWidget(host, { features: { selectionToolbar: false } })  // turn it off
widget.setFeatures({ selectionToolbar: true })

// Your own controls over a drawing, on a bare Chart:
chart.on('drawingSelect', ({ payload }) => {
  const rect = payload.primary ? chart.getDrawingRect(payload.primary) : null
  // { x, y, width, height } in px from the chart container's top-left, or null
})`}</code></pre>

<h2>多/空仓位</h2>
<p>
  <code>riskReward</code>：从入场价拖动到止损价。目标位按盈亏比放在相应的距离处，
  拖动它的控制点即可改变该比例。它根据账户资金和风险（账户的百分比或一个金额）
  算出数量，并显示每条线的价格、距离以及盈亏。
</p>
<pre><code>{`chart.setDrawingOptions(id, { accountSize: 25_000, riskMode: 'percent', risk: 1, rewardRatio: 3 })`}</code></pre>

<h2>画线提醒</h2>
<p>
  提醒可以跟随趋势线、射线、延长线或水平线，也可以跟随平行通道的各条线：
  当价格穿越该线在最新一根K线处的位置时触发，位置以图表上绘制的为准
  （K线之间保持笔直，对数坐标下按对数价格计算）。
</p>
<pre><code>{`if (chart.canAddDrawingAlert(id)) {
  chart.addDrawingAlert(id, { condition: 'crossingUp', message: 'Broke the trend line' })
}`}</code></pre>
<p>提醒跟随其画线，撤销时随画线一同恢复，并随布局一起保存。</p>

<h2>顺序与分组</h2>
<pre><code>{`chart.moveDrawing(id, 'front')       // 'front' | 'forward' | 'backward' | 'back'
chart.moveDrawing(id, 0)              // or a place in the order: 0 the bottom, as getDrawings() lists them
chart.updateDrawing(id, { name: 'Weekly support' })  // its name in the object tree; null: its tool's
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // 一次撤销
chart.removeAll('drawings')         // 所有绘图；'indicators'，或 'all' 两者都删：一次撤销，锁定的绘图保留
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)

chart.copyDrawings()                 // 选中的画线（Ctrl+C）
chart.pasteDrawings()                // Ctrl+V，粘贴到此处或页面上的其他图表
chart.canPasteDrawings()             // 是否有可粘贴的内容`}</code></pre>
<p>点击分组中的任意一条画线，会选中整个分组。</p>
<p>在小组件的对象树中，单击绘图的名称会选中它，双击则重命名。它的行可以克隆它，拖动手柄可把它移到另一行在顺序中的位置；在手柄上按方向键可把它移动一位。</p>

<h2>橡皮擦、缩放与磁吸</h2>
<pre><code>{`chart.setEraserMode(true)          // 每次点击画线就将其删除，直到按 Escape
chart.setZoomAreaMode(true)        // 下一次拖动会缩放到框内的K线
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>弱磁吸会在指针靠近K线的开盘价、最高价、最低价或收盘价时，把点吸附到该价位；强磁吸则始终吸附。在组件中磁吸默认关闭：绘图放在哪里就在哪里，直到用磁吸按钮开启。</p>

<h2 id="editing">用指针和键盘编辑</h2>
<ul>
  <li>拖动控制点或移动整个绘图时磁铁同样起作用：离抓取处最近的点落在价格上，其余的点与它保持相对位置。弱磁铁的范围为 50 px。</li>
  <li>绘制或拖动时按住 <kbd>Ctrl</kbd>/<kbd>⌘</kbd>，在此期间翻转磁铁：关着时打开，开着时关闭。</li>
  <li>绘制或拖动控制点时按住 <kbd>Shift</kbd>，让线在屏幕上保持水平、垂直或 45°。在图表空白处，<kbd>Shift</kbd> + 拖动仍是测量。适用于直线和路径；矩形、通道的宽度或叉子的点不受限制。</li>
  <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> 将选中的绘图横向移动一根 K 线或上下移动一个像素；加按 <kbd>Shift</kbd> 则为十。连续按键只算一步撤销，已锁定的绘图不动。</li>
  <li>在绘图上 <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 拖动会拖出一个副本（绘图在选区中时复制整个选区），算一步撤销。<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 单击仍然把它加入或移出选区，在空白处 <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 拖动仍然画选择框。在选中绘图的控制点上，<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + 拖动则是在磁铁翻转的状态下调整它。</li>
</ul>

<h2>键盘</h2>
<ul>
  <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd> 撤销，<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> 或 <kbd>Ctrl</kbd> + <kbd>Y</kbd> 重做。</li>
  <li><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd> 复制和粘贴画线，<kbd>Ctrl</kbd> + <kbd>D</kbd> 创建副本，<kbd>Delete</kbd> 删除。</li>
  <li><kbd>Ctrl</kbd> + <kbd>G</kbd> 将所选画线分组，<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> 取消分组。</li>
  <li><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> 上移 / 下移一层；加按 <kbd>Shift</kbd> 则置于顶层 / 底层。</li>
  <li><kbd>Enter</kbd> 结束路径；<kbd>Escape</kbd> 退出工具、橡皮擦或取消选择。</li>
</ul>

<h2>事件</h2>
<pre><code>{`chart.on('drawingCreate', (e) => e.payload)       // { id, type, drawing }
chart.on('drawingUpdate', (e) => e.payload)       // { id }
chart.on('drawingRemove', (e) => e.payload)       // { id }
chart.on('drawingDoubleClick', (e) => e.payload)  // { id }
chart.on('drawingContextMenu', (e) => e.payload)  // { id, x, y }
chart.on('toolModeChange', (e) => e.payload)      // { eraser } 或 { zoomArea }`}</code></pre>
<p>撤销和重做会针对它们恢复、移除或修改的画线，分别触发 <code>drawingCreate</code>、<code>drawingRemove</code> 和 <code>drawingUpdate</code>。</p>

<h2>工具目录</h2>

<h3>线条</h3>
<ul>
  <li><code>trendLine</code> — 需要时可向左或向右延伸。</li>
  <li><code>ray</code>、<code>extendedLine</code></li>
  <li><code>horizontalLine</code>、<code>horizontalRay</code>（从其所在点起向时间前方延伸）、<code>verticalLine</code>、<code>crossLine</code></li>
  <li><code>infoLine</code> — 带有价格变化、K线数、时间和角度的信息框。</li>
  <li><code>trendAngle</code> — 同时显示其在屏幕上的角度。</li>
</ul>

<h3>通道</h3>
<ul>
  <li><code>parallelChannel</code> — 可选中线，可向任一方向延伸。</li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>斐波那契</h3>
<ul>
  <li><code>fibRetracement</code>、<code>fibExtension</code> — 可编辑的级别、价格和百分比，标签可置于左侧或右侧，背景，反转。</li>
  <li><code>fibChannel</code>、<code>fibTimeZones</code>、<code>fibSpeedResistanceFan</code></li>
  <li><code>fibArcs</code> — 以一段走势的起点为中心的圆弧，半圆或整圆。</li>
  <li><code>fibCircles</code> — 半径按斐波那契倍数取值的圆。</li>
  <li><code>fibSpiral</code> — 从中心展开的黄金螺旋。</li>
  <li><code>fibWedge</code> — 从顶点出发的两条线之间的圆弧。</li>
</ul>

<h3>江恩与叉线</h3>
<ul>
  <li><code>pitchfork</code>、<code>schiffPitchfork</code>、<code>modifiedSchiffPitchfork</code></li>
  <li><code>pitchfan</code> — 从枢轴点出发、穿过两点之间各级别的射线。</li>
  <li><code>gannFan</code>、<code>gannBox</code>、<code>gannSquare</code></li>
</ul>

<h3>形状</h3>
<ul>
  <li><code>rectangle</code>、<code>circle</code>、<code>ellipse</code>、<code>triangle</code></li>
  <li><code>polyline</code> — 封闭图形，每次点击一个点。</li>
  <li><code>curve</code> — 经过第三个点弯曲；<code>arc</code> — 经过三个点的圆弧。</li>
</ul>

<h3>画笔</h3>
<ul>
  <li><code>brush</code>、<code>highlighter</code> — 手绘。</li>
  <li><code>path</code> — 经过各点的线，末端带箭头。</li>
</ul>

<h3>形态</h3>
<ul>
  <li><code>xabcdPattern</code>、<code>cypherPattern</code>、<code>abcdPattern</code>、<code>threeDrives</code> — 标注各自的比例。</li>
  <li><code>headAndShoulders</code> — 带颈线。</li>
</ul>

<h3>艾略特波浪</h3>
<ul>
  <li><code>elliottWave</code>（1–5、A–C）、<code>elliottImpulse</code>、<code>elliottCorrection</code>、<code>elliottTriangle</code>、<code>elliottDoubleCombo</code>、<code>elliottTripleCombo</code> — 标签采用对应波浪级别的样式：①、(1)、1 或 i。</li>
</ul>

<h3>周期</h3>
<ul>
  <li><code>cyclicLines</code>、<code>timeCycles</code>、<code>sineLine</code></li>
</ul>

<h3>测量</h3>
<ul>
  <li><code>measure</code>、<code>priceRange</code>、<code>dateRange</code>、<code>dateAndPriceRange</code></li>
</ul>

<h3>标注与标记</h3>
<ul>
  <li><code>text</code>、<code>note</code>（带文字的图钉）、<code>callout</code>、<code>priceLabel</code></li>
  <li><code>arrow</code>、<code>arrowMark</code>（向上、向下、向左或向右，带标签）、<code>flag</code>、<code>icon</code>（星形、心形、对勾、叉号、圆形、三角形、闪电）</li>
</ul>

<h3>预测</h3>
<ul>
  <li><code>riskReward</code> — 多/空仓位（见上文）。</li>
  <li><code>forecast</code> — 价格触及目标时变绿，若在此之前时间用完则变红。</li>
  <li><code>projection</code> — 从第三个点起平移复制一段走势。</li>
  <li><code>barsPattern</code> — 复制若干根K线，以K线、折线或最高-最低的形式显示，可左右镜像或上下翻转。</li>
  <li><code>anchoredVWAP</code>、<code>volumeProfileRange</code></li>
</ul>

<h2>保存</h2>
<pre><code>{`const json = chart.saveState()   // 画线及其设置和分组、指标、提醒……
chart.loadState(json)            // 校验每条画线；格式有误的会被剔除`}</code></pre>

<h2>自定义工具</h2>
<p>
  一个工具就是一个 <code>DrawingPlugin</code>，通过
  <code>chart.registerDrawingTool(plugin)</code> 注册。它的描述对象列出了工具的设置（<code>options</code>）、
  绘制方式（<code>creation</code>），以及是否带有填充或文本；它还可以提供各条线的价格
  （<code>priceAt</code>，用于提醒）、不属于锚点的移动控制点
  （<code>moveHandle</code>），并接收图表的K线数据
  （<code>setDataGetter</code>）。参见<a href={href('/docs/plugins')}>插件</a>。
</p>
