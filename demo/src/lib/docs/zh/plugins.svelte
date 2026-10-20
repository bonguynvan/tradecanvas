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

<h2>插件种类</h2>
<table>
  <thead><tr><th>种类</th><th>契约</th><th>渲染位置</th></tr></thead>
  <tbody>
    <tr><td><code>indicator</code></td><td><code>IndicatorPlugin</code> — <code>calculate()</code> + <code>render()</code></td><td>主图叠加或副图</td></tr>
    <tr><td><code>drawing</code></td><td><code>DrawingPlugin</code> — <code>render()</code> + <code>hitTest()</code></td><td>叠加图层</td></tr>
    <tr><td><code>chartType</code></td><td><code>ChartTypePlugin</code> — <code>createRenderer()</code> + 可选的 <code>transform()</code></td><td>主序列</td></tr>
    <tr><td><code>overlay</code></td><td><code>OverlayPlugin</code> — <code>render(ctx, &#123; viewport, data, theme &#125;)</code></td><td><code>main</code> / <code>overlay</code> / <code>ui</code></td></tr>
  </tbody>
</table>

<h2>自定义指标</h2>
<p>继承 <code>IndicatorBase</code> 以获得绘图辅助方法，然后像内置指标一样注册并添加：</p>
<pre><code>{`import { IndicatorBase, IndicatorValueMap, registerPlugin } from '@tradecanvas/chart'

class DoubleSMA extends IndicatorBase {
  descriptor = {
    id: 'double-sma', name: 'Double SMA',
    placement: 'overlay', defaultConfig: { fast: 10, slow: 30 },
  }
  calculate(data, config) { /* values = new IndicatorValueMap(); return { values, series } */ }
  render(ctx, output, viewport, style) { /* draw lines */ }
}

registerPlugin({ kind: 'indicator', plugin: new DoubleSMA() })
chart.addIndicator('double-sma', { fast: 10, slow: 30 })`}</code></pre>
<p>
  <code>values</code> 请使用 <code>new IndicatorValueMap()</code> 而不是 <code>new Map()</code>：它可以直接替代
  <code>Map</code>，在按时间顺序逐根K线写入时开销要低好几倍——而每次切换品种或周期时，
  都会对整段历史数据执行这样的写入。
</p>

<h3>快速实时更新（可选）</h3>
<p>
  每次实时 tick 只有正在形成的K线会变化。实现 <code>update()</code>，只重新计算从
  <code>from</code> 开始的K线，而不是整段历史——图表会在收到 tick 和新K线时使用它；
  如果未实现或返回 <code>null</code>，则回退到 <code>calculate()</code>。
  它产生的数值必须与 <code>calculate()</code> 完全一致。
</p>
<pre><code>{`update(data, config, prev, from) {
  if (!this.canResume(data, prev, from)) return null   // IndicatorBase helper
  for (let i = from; i < data.length; i++) {
    this.writePoint(prev, data, i, { value: /* recompute bar i */ 0 })
  }
  return prev
}`}</code></pre>

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
  描述对象还可以说明工具的绘制方式（<code>creation</code>：
  <code>'clicks'</code>、<code>'freehand'</code> 或 <code>'path'</code>，并可配合
  <code>maxAnchors</code>），以及对话框是否提供填充（<code>fill</code>）或文本
  （<code>text</code>）。工具可以用 <code>moveHandle()</code> 移动不属于锚点的控制点；
  如果绘制时需要用到图表的K线，则通过 <code>setDataGetter()</code> 获取。
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
  品种的最小变动价位（<code>minTick</code>）、分数单位，或当前显示小数位的一个单位。指标和图表类型的渲染器只拿到 viewport，
  为此导出了 <code>priceToY</code>、<code>barIndexToX</code>、<code>timeToX</code> 及其反函数。这里的 K 线是屏幕上绘制的序列：
  在 Renko 或 Kagi 图上就是它的砖块（<code>chart.isTimeAligned()</code> 表示它们是否就是数据源的 K 线）。
</p>
<p>
  带有自身设置（显示模式、开关）的叠加层可以立即显示变化，即使没有新的 tick 触发重绘：在插件上设置
  <code>enabled: false</code> 可在保持注册的同时隐藏它；修改设置或开关后调用 <code>chart.requestRender()</code>。
  下一帧之前的多次请求只绘制一帧。
</p>

<p>完整的插件类型签名请参见 <a href={href('/docs/api')}>API 参考</a>。</p>
