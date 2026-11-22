<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>插件 — TradeCanvas 文档</title>
  <meta name="description" content="通过插件 SDK，为 TradeCanvas 扩展自定义指标、画线工具、图表类型和叠加层。" />
</svelte:head>

<h1>插件</h1>
<p>
  为图表扩展自定义<strong>指标</strong>、<strong>画线工具</strong>、
  <strong>图表类型</strong>和<strong>叠加层</strong>——可以全局注册，也可以按图表注册。
</p>

<h2>注册</h2>
<p>共有三种注册方式，按优先级顺序依次为：全局默认、构造函数，以及在实例上以命令式调用。</p>
<pre><code>{`import { Chart, registerPlugin } from '@tradecanvas/chart'

// 1) Global — every Chart created afterward inherits it
registerPlugin({ kind: 'indicator', plugin: new MyIndicator() })

// 2) Per-chart at construction
const chart = new Chart(el, { plugins: [{ kind: 'overlay', plugin: myHeatmap }] })

// 3) Imperative on an instance
chart.plugins.register({ kind: 'chartType', plugin: myCandles })
chart.plugins.unregister('chartType:my-candles')
chart.plugins.list()`}</code></pre>
<p>
  <code>ChartWidget</code> 通过 <code>plugins</code> 接收插件（带类型，并与 <code>chartOptions.plugins</code> 中的一并接收）：
  它们会在组件恢复任何内容之前注册到它的图表上，因此保存的布局
  （<code>persistLayouts</code>）、模板或共享视图中用到了你的某个指标时，都能把它恢复回来。
  同一个 id 时，组件的 <code>plugins</code> 优先于 <code>chartOptions.plugins</code>；网格单元自己的
  <code>plugins</code> 会替换网格共用的插件。如果在布局恢复之后才通过 <code>widget.getChart()</code>
  注册，指标就来得太晚了：布局已经把它略去了。
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT', adapter, persistLayouts: true,
  plugins: [{ kind: 'indicator', plugin: new DoubleSMA() }],
})`}</code></pre>

<h2>插件种类</h2>
<table>
  <thead><tr><th>种类</th><th>契约</th><th>渲染位置</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render(ctx, output, viewport, style, &#123; theme &#125;)</code></td><td>主图叠加或副图</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>叠加图层</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + 可选的 <code>transform()</code></td><td>主序列</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2 id="define">自定义指标：简便方式</h2>
<p>
  <code>defineIndicator</code> 用指标的输入和一个处理K线的函数生成指标：不需要类，也不需要绘图代码。
  <code>calculate</code> 接收按列给出的K线（<code>bars.close[i]</code>）、各输入的值，以及
  <code>ta</code>（构成指标的各种计算），并按键返回它的各条线。图表会绘制它们、为其窗格定坐标、
  把它们列入图例，并在设置对话框中为每个输入提供一个输入框。
</p>
<pre><code>{`import { defineIndicator } from '@tradecanvas/chart'

const emaCross = defineIndicator({
  id: 'emaCross',
  name: 'EMA Crossover',
  placement: 'overlay',                       // on the prices; 'panel' (the default) is a pane of its own
  inputs: {
    fast: { default: 9, kind: 'int', min: 1 },
    slow: { default: 21, kind: 'int', min: 2 },
  },
  plots: [
    { key: 'fast', title: 'Fast', color: 0 },
    { key: 'slow', title: 'Slow', color: 1 },
    { key: 'buy', title: 'Buy', color: 2, kind: 'markers', shape: 'arrowUp', position: 'belowBar' },
    { key: 'sell', title: 'Sell', color: 3, kind: 'markers', shape: 'arrowDown', position: 'aboveBar' },
  ],
  calculate({ bars, inputs, ta }) {
    const fast = ta.ema(bars.close, inputs.fast)
    const slow = ta.ema(bars.close, inputs.slow)
    return { fast, slow, buy: ta.crossover(fast, slow), sell: ta.crossunder(fast, slow) }
  },
})

chart.registerIndicator(emaCross)
chart.addIndicator('emaCross', { fast: 12 })`}</code></pre>
<ul>
  <li>
    <strong>输入。</strong>每个输入有一个 <code>default</code>，它的类型就是该输入的类型，另有设置对话框显示它所需的内容：
    <code>kind</code>、<code>min</code>、<code>max</code>、<code>step</code>，
    选项用的 <code>options</code>，价格来源用的 <code>source: true</code>（此时指标把它读作
    <code>bars.close</code>）。<code>calculate</code> 得到的每个数字都在其 <code>min</code> 和
    <code>max</code> 之内，<code>kind: 'int'</code> 的为整数，选项的值则是它的可选项之一。
  </li>
  <li>
    <strong>线。</strong>每根K线一个值；没有值的地方为 <code>undefined</code>、<code>null</code> 或 <code>NaN</code>。
    <code>true</code> 标记一根K线，用于主图上 <code>kind: 'markers'</code> 的线条：
    按其 <code>position</code> 位于K线上方或下方，否则位于K线的收盘价处。独立窗格中的标记是一个数字，
    即它所绘制处的数值。没有 <code>plots</code> 时，返回的每条线都按主题的序列颜色画成一条线；
    在K线太少时不返回任何线的指标，要声明它们。
  </li>
  <li>
    <strong>外观。</strong><code>plots</code>（一条线、<code>'histogram'</code>、<code>'step'</code>、
    <code>'dots'</code>、<code>'markers'</code>，各有其颜色、宽度和线型），用于两条线之间色带的 <code>fills</code>，
    用于窗格的 <code>scale</code> 和 <code>levels</code>，与下文<a href="#descriptor">描述符</a>中的相同。
  </li>
  <li>
    <strong><code>ta</code></strong> 包含 <code>sma</code>、<code>ema</code>、<code>wma</code>、<code>rma</code>、
    <code>stdev</code>、<code>highest</code>、<code>lowest</code>、<code>change</code>、<code>rsi</code>、
    <code>macd</code>、<code>atr</code>、<code>bollinger</code>、<code>crossover</code> 和
    <code>crossunder</code>。每个都接收每根K线一个值的序列，并返回同样的序列，所以一个的结果可以交给下一个
    （<code>ta.ema(ta.rsi(bars.close, 14), 9)</code>）。<code>rsi</code>、<code>macd</code>、<code>atr</code> 和
    <code>bollinger</code> 运行的就是内置指标本身，所以它们的数值与图表的一致。
  </li>
  <li>
    <strong><code>ta.indicator(id, input, params)</code></strong> 运行任意一个内置指标，并按键返回它的各条线：
    <code>{`ta.indicator('stochastic', bars, { kPeriod: 14 }).k`}</code>、
    <code>{`ta.indicator('supertrend', bars).value`}</code>。id、输入和线就是
    <a href={href('/docs/indicators')}>指标</a>页面上的那些，并且带有类型。<code>input</code> 是K线，
    或每根K线一个值的序列，指标会把它读作自己的价格（<code>{`ta.indicator('ema', rsi, { period: 5 })`}</code>）。
    每根K线一个值的序列没有成交量，也没有时间，所以基于成交量或当日交易时段的指标（OBV、MFI、VWAP…）需要K线。
    读取另一个品种K线的那五个指标不在其中。它也单独导出：<code>{`import { ta } from '@tradecanvas/chart'`}</code>。
  </li>
</ul>
<p>
  每个 tick 它都对全部K线重新计算，对这类计算来说很快。慢到能让人察觉的指标，
  或绘制的不是每根K线一个值的指标，应写成带 <code>update</code> 的类：也就是下文较长的那种方式。
</p>

<h2>自定义指标</h2>
<p>
  指标是一个 <code>IndicatorPlugin</code>：一个说明它是什么、外观如何的 <code>descriptor</code>，以及一个为每根K线给出数值的
  <code>calculate()</code>。继承 <code>IndicatorBase</code>，其余的由图表根据描述符完成：绘制各条线、为窗格定坐标、
  在坐标轴上标出数值，并在图例、设置对话框和“指标”对话框中列出该指标。下面是一个完整的例子，一个在线条转向处做标记的 MACD：
</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart'

const ema = (prev, value, period) => (prev === undefined ? value : prev + (2 / (period + 1)) * (value - prev))

class TurningMacd extends IndicatorBase {
  descriptor = {
    id: 'turning-macd', name: 'Turning MACD', shortName: 'TMACD',
    placement: 'panel',               // a pane of its own; 'overlay' draws on the price pane
    category: 'oscillators',          // its group in the Indicators dialog
    defaultConfig: { fast: 12, slow: 26, source: 'close' },
    inputs: {
      fast: { kind: 'int', min: 2, label: 'Fast' },
      slow: { kind: 'int', min: 3, label: 'Slow' },
      source: { kind: 'choice', label: 'Price', options: [{ value: 'close', label: 'Close' }, { value: 'hl2', label: 'Median' }] },
    },
    plots: [
      { key: 'value', title: 'MACD', color: 0 },
      { key: 'turn', title: 'Turn', color: 1, kind: 'markers', tone: { field: 'up' }, downColor: 2 },
    ],
    scale: { zero: true },
    levels: [0],
    defaultStyle: (theme) => ({ colors: theme.name === 'light' ? ['#1f4e8c', '#0a7d3b', '#b3261e'] : ['#8ab4f8', '#4cc38a', '#f28b82'] }),
  }

  calculate(data, config) {
    const { fast, slow, source } = config.params
    const values = new IndicatorValueMap()
    const series = new Array(data.length).fill(null)
    let f, s
    for (let i = 0; i < data.length; i++) {
      const bar = data[i]
      const price = source === 'hl2' ? (bar.high + bar.low) / 2 : bar.close
      f = ema(f, price, fast)
      s = ema(s, price, slow)
      if (i < slow) continue
      const point = { value: f - s }
      const a = series[i - 2]?.value, b = series[i - 1]?.value
      // The bar before this one is a turn when the line changed direction there.
      if (a !== undefined && b !== undefined && (b - a) * (point.value - b) < 0) {
        series[i - 1] = { ...series[i - 1], turn: b, up: point.value > b ? 1 : 0 }
        values.set(data[i - 1].time, series[i - 1])
      }
      series[i] = point
      values.set(bar.time, point)
    }
    return { values, series }
  }
}`}</code></pre>
<p>
  <code>calculate(data, config)</code> 接收K线和该实例的输入（<code>config.params</code>），并把数值返回两次：
  按K线索引（<code>series</code>，第一个值之前为 <code>null</code>）和按K线时间（<code>values</code>）。
  <code>values</code> 请使用 <code>new IndicatorValueMap()</code>：这是一个按时间顺序写入时开销要低好几倍的
  <code>Map</code>，而每次切换品种或周期都会这样写入。没有任何线条引用的字段（上例中的 <code>up</code>）
  不会被绘制、不参与坐标计算，也不会显示；它是供线条的 <code>tone</code> 使用的。
</p>

<h3 id="descriptor">描述符</h3>
<ul>
  <li><strong>线条（plots）</strong>各绘制一个字段：<code>'line'</code>（默认）、<code>'step'</code>、
    <code>'histogram'</code>、<code>'dots'</code>（以点绘制的线），或 <code>'markers'</code>：在该字段有值的K线上画一个形状
    （<code>shape</code>：<code>'dot'</code>、<code>'triangleUp'</code>、<code>'triangleDown'</code>），位于该值处，或在主图上位于K线上方或下方
    （<code>position</code>）。<code>color</code> 是样式颜色列表中的索引；<code>tone</code> 和 <code>downColor</code> 让线条以两种颜色绘制；
    <code>width</code>、<code>lineStyle</code>、<code>opacity</code> 和 <code>breakOn</code> 设定线的外观。
    <code>fills</code> 为两条线之间着色。</li>
  <li><strong>输入（inputs）</strong>说明 <code>defaultConfig</code> 中每个输入如何编辑：<code>kind</code>、
    <code>label</code>、<code>min</code>、<code>max</code>、<code>step</code>，以及选项的 <code>options</code>，可以是纯值，
    也可以为每项带上标签（<code>{'{ value, label }'}</code>）。<code>{'{ source: true }'}</code> 让它可以基于另一种价格或另一个指标的线计算。</li>
  <li><strong>窗格</strong>：<code>scale</code> 固定其上下界或让零保持在视野中，<code>levels</code> 绘制查看者可以编辑的参考水平线。</li>
  <li><strong>外观</strong>：<code>defaultStyle</code>，一个样式，或为每个主题各给一个（见下文）。</li>
</ul>

<h3>实时 tick：update 与 revisesBefore</h3>
<p>
  每个 tick 只有最新的K线会变化。没有 <code>update()</code> 时，图表会对整段历史重新运行 <code>calculate()</code>；
  有了它，图表会把你上一次的输出（<code>prev</code>）和第一根发生变化的K线（<code>from</code>）交给你，由你从那里重新计算。
  返回 <code>null</code> 则改为运行 <code>calculate()</code>；得出的数值必须与它给出的一致。<code>canResume</code> 和
  <code>writePoint</code> 由 <code>IndicatorBase</code> 提供。
</p>
<p>
  下面这类指标的每根K线都由其周围的K线算出，而不是像 TurningMacd 的均线那样依赖一个持续累积的状态
  （那样的指标需要自己保存状态，或者不实现 <code>update</code>）：
</p>
<pre><code>{`// A swing high: the bar is higher than the n bars either side of it.
pointAt(data, i, n) {
  if (i < n || i + n >= data.length) return null
  for (let k = 1; k <= n; k++) if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null
  return { high: data[i].high }
}

update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null
  const n = config.params.strength
  // A new bar decides the bar n back: rewrite from there.
  for (let i = Math.max(0, from - n); i < data.length; i++) this.writePoint(prev, data, i, this.pointAt(data, i, n))
  return prev
}

revisesBefore(config) { return config.params.strength }`}</code></pre>
<p>
  <code>from</code> 始终是第一根发生变化的K线。当一根新K线可能改变它之前的K线时（波段点、转向点、分形都由其后的K线决定），
  <code>update</code> 会自己改写这些K线，而 <code>revisesBefore(config)</code> 说明改写了多少根，以便读取该指标线的那些指标
  也从那里重新计算。如果只有从 <code>from</code> 开始的K线会变化，就不要实现它。
</p>

<h3>绘制</h3>
<p>
  <code>IndicatorBase</code> 的 <code>render()</code> 按窗格的坐标绘制 <code>plots</code> 和 <code>fills</code>，
  因此大多数指标不需要绘图代码。要多画一些内容，就重写它并先调用它。第五个参数带有图表绘制所用的主题，
  可用于样式没有提供的颜色和字体：<code>theme.candleUp</code>、<code>theme.candleDown</code>、<code>theme.text</code>、<code>theme.font</code>。
</p>
<pre><code>{`render(ctx, output, viewport, style, context) {
  super.render(ctx, output, viewport, style, context)
  ctx.fillStyle = context.theme.text
  // barIndexToX(i, viewport) and priceToY(value, viewport) place it where the chart draws
}`}</code></pre>

<h3>随主题变化的颜色</h3>
<p>
  描述符上的 <code>defaultStyle</code> 是指标初始的外观：一个样式，或一个以主题为参数、为每个主题各给出一个样式的函数。
  使用它的实例会跟随 <code>chart.setTheme()</code> 变化；有人为它选定的颜色则保持不变。它的优先级低于查看者保存的默认样式
  （<code>chart.setIndicatorDefaults()</code>，组件中的<em>保存为默认</em>），因此你的应用的颜色永远不会取代查看者的选择。
  保存的布局不记录由主题给出的部分，在另一个主题中打开时会采用该主题的颜色。
</p>

<h3>在读取布局之前注册</h3>
<p>
  保存的布局按 id 指明指标，读取布局时尚未注册的指标会被略去。请把你的指标通过 <code>plugins</code> 交给
  <code>ChartWidget</code>：它们会在组件恢复布局（<code>persistLayouts</code>）、模板或共享视图之前注册。
  对于 <code>Chart</code>，把 <code>plugins</code> 传给构造函数，或在 <code>loadState()</code> 之前注册。
</p>
<pre><code>{`new ChartWidget(host, { symbol, adapter, persistLayouts: true, plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })

const chart = new Chart(host, { plugins: [{ kind: 'indicator', plugin: new TurningMacd() }] })
chart.addIndicator('turning-macd', { fast: 8 })`}</code></pre>

<h3>图表从中读取什么</h3>
<ul>
  <li><strong>图例</strong>用 <code>shortName</code> 以及与 <code>defaultConfig</code> 不同的输入来命名它
    （选项显示其标签），并以各自的颜色显示除标记以外每条线的数值。</li>
  <li><strong>价格轴</strong>标出这些线的最新数值。</li>
  <li><strong>CSV 导出</strong>为其中每条线各设一列，以图例中的名称命名；线条不止一条时，再加上该线的 <code>title</code>。</li>
  <li><strong>设置对话框</strong>编辑各项输入，列出每条线及其颜色、是否显示，线和阶梯线还有线型，并可编辑水平线。</li>
  <li><strong>“指标”对话框</strong>在其 <code>category</code> 下以 <code>name</code> 列出它：一个类别
    （<code>'oscillators'</code>、<code>'volume'</code>…），或你自己的分组 <code>{`{ id: 'my-app', label: 'My App' }`}</code>，
    它把你的应用的指标一起放在它的名称下，排在内置类别之前（有多个分组时，按各组第一个指标注册的顺序排列）。
    搜索也能按这个名称找到它们。</li>
  <li><strong>其他指标</strong>可以把它的线（即这些线条）作为数据源读取。</li>
</ul>
<p>
  编程 agent 可以从 MCP 服务器的 <code>custom_indicator</code> 工具和 agent 技能中的
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">自定义指标示例</a>
  获得同样的指南，其中的代码已针对已发布的包做过类型检查。
</p>

<h2>自定义画线工具</h2>
<p>
  继承 <code>DrawingBase</code> 以使用它的辅助方法（锚点转像素、线型、控制点），再描述该工具并注册。
  <code>descriptor.options</code> 中列出的设置会出现在组件的设置对话框里，并随画线一起保存。
</p>
<pre><code>{`import { DrawingBase, registerPlugin } from '@tradecanvas/chart'

class TargetLine extends DrawingBase {
  descriptor = {
    type: 'targetLine', name: 'Target Line', requiredAnchors: 1,
    options: { label: { kind: 'text', label: 'Label', default: 'Target' } },
  }
  render(ctx, state, viewport, selected) { /* 在 this.anchorToPixel(state.anchors[0], viewport) 处 */ }
  hitTest(point, state, viewport, tolerance) { /* 指针是否在它上面？ */ return false }
  // 可选：各条线的价格，便于提醒跟随它们
  priceAt(state) { return [state.anchors[0].price] }
}

registerPlugin({ kind: 'drawing', plugin: new TargetLine() })
chart.setDrawingTool('targetLine')`}</code></pre>
<p>
  工具的名称在图表接受工具名的地方（<code>setDrawingTool</code>、<code>addDrawing</code>…）都能用，在 TypeScript 中也一样：
  <code>DrawingToolType</code> 接受任何名称，同时仍会补全内置工具，内置工具列在 <code>BuiltInDrawingToolType</code> 中。
</p>
<p>
  描述对象还可以说明工具的绘制方式（<code>creation</code>：
  <code>'clicks'</code>、<code>'freehand'</code> 或 <code>'path'</code>，并可配合
  <code>maxAnchors</code>），以及对话框是否提供填充（<code>fill</code>）或文本
  （<code>text</code>）。工具可以用 <code>moveHandle()</code> 移动不属于锚点的控制点；
  如果绘制时需要用到图表的K线，则通过 <code>setDataGetter(getter, revision)</code> 获取。
  当同一数组中的某根K线被修正（<code>updateBar</code>）时，<code>revision()</code> 会变化：
  缓存了由K线计算出的结果的工具，此时应重新计算。
</p>

<h2>自定义图表类型</h2>
<p><code>ChartTypePlugin</code> 提供一个渲染器和一个可选的数据变换；切换方式与内置类型相同：</p>
<pre><code>{`registerPlugin({
  kind: 'chartType',
  plugin: {
    descriptor: { type: 'my-bricks', name: 'My Bricks' },
    createRenderer: () => new MyBrickRenderer(),
    transform: (raw) => toBricks(raw),   // optional
  },
})

chart.setChartType('my-bricks')`}</code></pre>

<h2>自定义叠加层</h2>
<p><code>OverlayPlugin</code> 每一帧都在你选择的图层上绘制，并接收实时的视口、数据和主题：</p>
<pre><code>{`import { overlayScale, registerPlugin } from '@tradecanvas/chart'

registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'high-marks', name: 'High marks', layer: 'main' },
    render(ctx, context) {
      const s = overlayScale(context)
      ctx.fillStyle = '#f2a93b'
      for (let i = s.visible.from; i <= s.visible.to; i++) {
        const bar = context.data[i]
        ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(bar.high) - 1, s.barWidth, 2)
      }
    },
  },
})`}</code></pre>
<p>
  <code>overlayScale(context)</code> 按图表自身的方式定位：<code>timeToX</code> / <code>xToTime</code> 按 K 线时间（两根 K 线之间及最新 K 线之后按比例），
  <code>indexToX</code> / <code>xToIndex</code>，<code>priceToY</code> / <code>yToPrice</code>（对数坐标与反转坐标同样适用），
  <code>barWidth</code>，以及屏幕上可见的 K 线范围 <code>visible</code>。要按价格网格划分行，用 <code>chart.getPriceStep()</code>：
  品种的最小变动价位（<code>minTick</code>）、分数单位，或当前显示小数位的一个单位。图表类型的渲染器只拿到 viewport，指标则拿到 viewport 和主题，
  为此导出了 <code>priceToY</code>、<code>barIndexToX</code>、<code>timeToX</code> 及其反函数。这里的 K 线是屏幕上绘制的序列：
  在 Renko 或 Kagi 图上就是它的砖块（<code>chart.isTimeAligned()</code> 表示它们是否就是数据源的 K 线）。
  要像价格轴那样书写价格，viewport 提供图表自己的价格格式（若有，<code>formatPrice</code>）、<code>numberLocale</code>，
  以及市场或品种设定的小数位（<code>pricePrecision</code>）；指标窗格不设格式和小数位。
</p>
<p>
  带有自身设置（显示模式、开关）的叠加层可以立即显示变化，即使没有新的 tick 触发重绘：在插件上设置
  <code>enabled: false</code> 可在保持注册的同时隐藏它；修改设置或开关后调用 <code>chart.requestRender()</code>。
  下一帧之前的多次请求只绘制一帧。
</p>

<p>完整的插件类型签名请参见 <a href={href('/docs/api')}>API 参考</a>。</p>
