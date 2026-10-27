<svelte:head>
  <title>图表类型 — TradeCanvas 文档</title>
  <meta name="description" content="18 种内置图表类型：蜡烛图、OHLC、高低图、平均K线（Heikin-Ashi）、砖形图（Renko）、卡吉图（Kagi）、点数图（Point & Figure）、等量图（Equivolume）等。" />
</svelte:head>

<h1>图表类型</h1>
<p>18 种内置图表类型。运行时可通过 <code>chart.setChartType(type)</code> 切换。</p>

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
    <tr><td><code>hiLo</code></td><td>每根K线画一根从最低价到最高价的柱，按涨跌着色；柱子足够宽时会标出最高价和最低价。</td></tr>
  </tbody>
</table>

<h2>衍生类型</h2>
<table>
  <thead><tr><th>类型</th><th>说明</th></tr></thead>
  <tbody>
    <tr><td><code>heikinAshi</code></td><td>经 Heikin-Ashi 变换得到的平滑蜡烛序列（平均K线）。</td></tr>
    <tr><td><code>renko</code></td><td>固定价格砖块图（砖形图）；与时间无关。</td></tr>
    <tr><td><code>kagi</code></td><td>阳线 / 阴线（卡吉图）；反转幅度按百分比（默认 4）或按价格。</td></tr>
    <tr><td><code>lineBreak</code></td><td>收盘价突破最近几条线（默认 3 条）时画出新线（新价线）。</td></tr>
    <tr><td><code>pointAndFigure</code></td><td>X / O 列（点数图）；由格值和反转格数决定。</td></tr>
    <tr><td><code>rangeBars</code></td><td>每根K线的最高价与最低价之差等于固定区间，并收在其最高价或最低价；最后一根是仍在形成的K线。</td></tr>
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

<h2>衍生类型的设置</h2>
<p>
  砖形图的砖块大小、新价线需要突破的线数、卡吉图的反转幅度、点数图的格值与反转格数，以及
  Range Bars 的区间。未设置的项会根据数据计算（砖形图使用 ATR 砖块，P&amp;F 格值取平均收盘价的 1%……）。
  这些设置会随状态一起保存；在 ChartWidget 中，它们位于当前图表类型的设置对话框里。
</p>
<p>
  Range Bars 的自动区间是最近 100 根已收盘K线的平均真实波幅，取整到 1、2 或 5（… 1、2、5、10、20 …），
  再取整为该品种价格步长的整数倍（若市场的价格步长随价格而变，则取这些K线成交过的最大步长）：
  一秒图上K线较小，日线图上较大。仍在形成的K线不计入其中，因此一笔成交只会改变由这根K线生成的区间K线，
  之前的区间K线保持不变。当一根K线收盘使平均值跨到下一个 1-2-5 数，或使这些K线换到另一个价格步长时，
  所有K线会按新区间重新生成。上涨时K线收在最低价加区间，下跌时收在最高价减区间：
  收盘价是K线实际到达过的价格，影线显示价格先走的方向。一次跨越多个区间的跳动（包括两根K线之间的跳空）
  会为每个区间生成一根K线；填补跳空的K线位于跳空越过、从未成交过的价格上。无论区间是设定的还是自动的，
  若已收盘的K线会生成超过 100,000 根区间K线，或仅仍在形成的那根K线就会生成超过 100,000 根，
  区间就会提高到其自身的 2、5、10、20… 倍中第一个不超过这个数的倍数，所有K线都按提高后的区间重新生成。
  小于最高价格第 15 位有效数字一半的区间不会收出任何K线，无论价格如何书写。
</p>
<p>
  砖形图的砖块大小、卡吉图的反转幅度和点数图的格值也遵守同样的上限：若取值相对价格过小，使最后一根之前的K线
  会生成超过 100,000 个砖块、线或列，或仅最后一根K线就会生成这么多，就会提高到其自身的 2、5、10、20…
  倍中第一个不超过这个数的倍数，并按提高后的值生成图表。卡吉图和点数图每根K线最多生成一条线或一列，
  因此只有超过 100,000 根K线的序列才会触及这个上限；新价线的设置是线数，每根K线同样最多生成一条线。
  已保存状态或分享链接中不是大于 0 的有限数的砖块大小、反转幅度或区间会被丢弃（图表改用默认值：根据数据计算，卡吉图则为 4%），
  因此链接无法让图表卡死。设置对话框不接受小于 0.00000001 的值，并会在输入框下方说明。在实时图表上，提高后的大小会在各个 tick 之间保留，
  因此每个 tick 只构建一次，换成新序列时再重新计算；把 <code>ReshapeMemo</code> 作为最后一个参数传入时，<code>toRenko</code>、
  <code>toKagi</code>、<code>toPointAndFigure</code> 和 <code>toRangeBars</code> 也会这样做。每个序列用一个 memo，每次计算都传入；
  序列被替换时（换了品种或周期）调用 <code>memo.clear()</code>（或新建一个）：memo 自己分辨不出新序列，会沿用上一个序列提高后的大小来绘制。
</p>
<pre><code>{`chart.setChartTypeOptions({
  renko: { boxSize: 50 },                         // or 'atr' with atrPeriod
  lineBreak: { lines: 2 },
  kagi: { reversal: 25, reversalType: 'price' },  // or a percent
  pointAndFigure: { boxSize: 10, reversal: 3 },
  rangeBars: { range: 20 },
})
chart.getChartTypeOptions()
new Chart(host, { chartTypeOptions: { renko: { boxSize: 50 } } })`}</code></pre>

<h2>主数据系列，以及主图上的线</h2>
<p>
  隐藏主数据系列，只看指标或对比品种；标出屏幕上的最高价和最低价；标出买价和卖价。
  如果数据源的 tick 带有 <code>bid</code> 和 <code>ask</code>，这些线会自动保持更新。
</p>
<pre><code>{`chart.setMainSeriesVisible(false)
chart.setHighLowLines(true)          // or new Chart(host, { highLowLines: true })
chart.setBidAsk({ bid: 64210.5, ask: 64211 })
chart.setBidAsk(null)`}</code></pre>
