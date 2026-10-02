<svelte:head>
  <title>画线工具 — TradeCanvas 文档</title>
  <meta name="description" content="40 种内置画线工具：趋势线、斐波那契通道与扇形、希夫音叉、谐波形态、江恩、艾略特波浪、固定区间成交量分布、多/空仓位等。" />
</svelte:head>

<h1>画线工具</h1>
<p>40 种内置画线工具。所有工具都支持磁吸、撤销 / 重做以及完整的 JSON 序列化。</p>

<h2>激活工具</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>自动斐波那契</h2>
<p>
  一键在可见范围内的主要波段（极端高点和低点）上绘制斐波那契回撤——
  上涨波段从低点锚定到高点，下跌波段从高点锚定到低点。可从命令面板中运行（“自动斐波那契”），
  也可以通过代码调用：
</p>
<pre><code>{`chart.autoFib()  // returns the new drawing id, or null if no clear swing

// general drawing append (active style applied, id auto-assigned)
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`}</code></pre>

<h2>工具目录</h2>

<h3>线条</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>horizontalRay</code> — 与 <code>horizontalLine</code> 类似，但只从锚点开始向未来方向延伸。</li>
  <li><code>verticalLine</code></li>
  <li><code>crossLine</code> — 穿过同一点的一条水平线和一条垂直线（单击即可）。</li>
  <li><code>infoLine</code> — 带统计框的趋势线：价格变化及百分比、跨越的K线数与时间、角度。</li>
  <li><code>trendAngle</code> — 显示其屏幕角度（以度为单位）的趋势线。</li>
</ul>

<h3>通道</h3>
<ul>
  <li><code>parallelChannel</code></li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>形状</h3>
<ul>
  <li><code>rectangle</code></li>
  <li><code>ellipse</code></li>
  <li><code>triangle</code></li>
  <li><code>circle</code> — 先点圆心，再点边缘上的一点。</li>
</ul>

<h3>斐波那契</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — 根据两个锚点之间的时间跨度，投射出按斐波那契数列间隔的垂直线。</li>
  <li><code>fibChannel</code> — A→B 为基准趋势线，C 决定宽度；按宽度的斐波那契比例绘制平行线。</li>
  <li><code>fibSpeedResistanceFan</code> — 从 A 出发、穿过 A→B 走势在价格和时间上的斐波那契比例点的射线。</li>
</ul>

<h3>高级</h3>
<ul>
  <li><code>pitchfork</code> — 安德鲁音叉。</li>
  <li><code>schiffPitchfork</code> — 中线起点位于 A 的时间、A 到 B 价格的一半处。</li>
  <li><code>modifiedSchiffPitchfork</code> — 中线起点位于 A 与 B 的中点。</li>
  <li><code>cyclicLines</code> — 以 A→B 的间隔重复出现的垂直线。</li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>形态</h3>
<ul>
  <li><code>xabcdPattern</code> — 谐波 XABCD 形态（Gartley、Bat、Butterfly、Crab……），并标注 XB、AC、BD 和 XD 比例。</li>
  <li><code>abcdPattern</code> — ABCD 形态，标注 BC/AB 和 CD/BC 比例。</li>
  <li><code>headAndShoulders</code> — 七个枢轴点，颈线穿过两个颈部点。</li>
  <li><code>elliottWave</code> — 1-2-3-4-5-A-B-C 波浪计数。</li>
</ul>

<h3>测量</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
  <li><code>dateAndPriceRange</code> — 用一个方框同时测量价格变化、K线数、时间和成交量。</li>
</ul>

<h3>标注</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
  <li><code>priceLabel</code> — 固定在某一点上的标注框，显示该点的价格（或 <code>style.text</code>）。</li>
</ul>

<h3>仓位</h3>
<ul>
  <li><code>riskReward</code> — “多/空仓位”：从入场价拖动到止损价；方向以及带阴影的风险 / 收益区域（默认 2:1）会自动计算。</li>
</ul>

<h2>序列化</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code> 会过滤格式错误的画线、订单和指标——
  不完整或损坏的数据不会再污染图表。
</p>
