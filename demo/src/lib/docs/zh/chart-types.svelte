<svelte:head>
  <title>图表类型 — TradeCanvas 文档</title>
  <meta name="description" content="17 种内置图表类型：蜡烛图、OHLC、平均K线（Heikin-Ashi）、砖形图（Renko）、卡吉图（Kagi）、点数图（Point & Figure）、等量图（Equivolume）等。" />
</svelte:head>

<h1>图表类型</h1>
<p>17 种内置图表类型。运行时可通过 <code>chart.setChartType(type)</code> 切换。</p>

<h2>标准类型</h2>
<table>
  <thead><tr><th>类型</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>candlestick</code></td><td>经典 OHLC 蜡烛图。</td></tr>
    <tr><td><code>bar</code></td><td>OHLC 柱线（美国线）。</td></tr>
    <tr><td><code>line</code></td><td>收盘价折线图。</td></tr>
    <tr><td><code>area</code></td><td>收盘价折线下方填充的面积图。</td></tr>
    <tr><td><code>baseline</code></td><td>以基准价格为界，上下两部分用两种颜色填充。</td></tr>
    <tr><td><code>stepLine</code></td><td>阶梯线——突出每根K线离散的收盘价。</td></tr>
    <tr><td><code>lineWithMarkers</code></td><td>折线，并在每个数据点处画一个圆点。</td></tr>
    <tr><td><code>hollowCandle</code></td><td>收盘价 &gt; 前一收盘价时实体为空心。</td></tr>
    <tr><td><code>hlcArea</code></td><td>最高价—最低价区间带，加一条收盘价线。</td></tr>
  </tbody>
</table>

<h2>衍生类型</h2>
<table>
  <thead><tr><th>类型</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>经 Heikin-Ashi 变换得到的平滑蜡烛序列（平均K线）。</td></tr>
    <tr><td><code>renko</code></td><td>固定价格砖块图（砖形图）；与时间无关。</td></tr>
    <tr><td><code>kagi</code></td><td>按百分比阈值反转的阳线 / 阴线（卡吉图）。</td></tr>
    <tr><td><code>lineBreak</code></td><td>三线突破反转形态（新价线）。</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>X / O 列（点数图）；由格值和反转格数决定。</td></tr>
    <tr><td><code>rangeBars</code></td><td>每根K线的最高价与最低价之差等于固定区间。</td></tr>
  </tbody>
</table>

<h2>成交量加权类型</h2>
<table>
  <thead><tr><th>类型</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>volumeCandles</code></td><td>蜡烛宽度与成交量成正比。</td></tr>
    <tr><td><code>equivolume</code></td><td>
      覆盖完整价格区间的方框，宽度与成交量占比成正比；颜色取决于收盘价相对前一收盘价的涨跌（Richard Arms 风格）。
    </td></tr>
  </tbody>
</table>

<h2>运行时切换</h2>
<pre><code>{`chart.setChartType('equivolume')`}</code></pre>

<p>
  变换类图表（Heikin-Ashi、Renko、Kagi、Line Break、P&amp;F、Range Bars）在内部处理——
  <code>chart.getData()</code> 返回的仍是原始输入序列。
</p>
