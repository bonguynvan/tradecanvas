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
<pre><code>{`registerPlugin({
  kind: 'overlay',
  plugin: {
    descriptor: { id: 'vwap-band', name: 'VWAP Band', layer: 'main' },
    render(ctx, { viewport, data, theme }) {
      // draw onto the main layer with the current viewport + data
    },
  },
})`}</code></pre>

<p>完整的插件类型签名请参见 <a href={href('/docs/api')}>API 参考</a>。</p>
