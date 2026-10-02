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
const group = chart.groupDrawings([a, b, c], 'Weekly levels')
chart.setDrawingGroupVisible(group, false)
chart.setDrawingGroupLocked(group, true)
chart.ungroupDrawings(group)

chart.getSelectedDrawingIds()
chart.removeDrawings(ids)            // 一次撤销
chart.setDrawingsVisible(ids, false)
chart.setDrawingsLocked(ids, true)`}</code></pre>
<p>点击分组中的任意一条画线，会选中整个分组。</p>

<h2>橡皮擦、缩放与磁吸</h2>
<pre><code>{`chart.setEraserMode(true)          // 每次点击画线就将其删除，直到按 Escape
chart.setZoomAreaMode(true)        // 下一次拖动会缩放到框内的K线
chart.setDrawingMagnetMode('strong') // 'off' | 'weak' | 'strong'`}</code></pre>
<p>弱磁吸会在指针靠近K线的开盘价、最高价、最低价或收盘价时，把点吸附到该价位；强磁吸则始终吸附。</p>

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
