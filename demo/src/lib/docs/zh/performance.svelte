<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>性能 — TradeCanvas 文档</title>
  <meta name="description" content="TradeCanvas 如何保持高速：双画布渲染、只处理可见范围、增量计算指标、低开销的完整加载、LTTB 降采样——附基准测试数据。" />
</svelte:head>

<h1>性能</h1>
<p>
  双画布的 Canvas2D 渲染管线只重绘发生变化的部分，每一帧的每个步骤的开销都取决于屏幕上显示的内容，
  而不是已加载的历史数据量。下面的数据来自 <code>pnpm bench</code>（单核）以及对实际组件的性能分析；
  <a href={href('/') + '#lab-title'}>功能实验室</a>会在你点击时为真实的切换计时。
</p>

<h2>帧耗时：从 500 到 100,000 根K线始终持平</h2>
<ul>
  <li><strong>双画布</strong>——一个场景画布（网格、序列、指标、图表对象、坐标轴），以及一个较薄的顶层画布，用于十字光标、图例和其他跟随指针的元素。鼠标悬停只重绘顶层画布（约 0.2 ms），浏览器合成的是两个图层，而不是四个。</li>
  <li><strong>只渲染可见范围</strong>——每个渲染器、自动缩放以及指标的价格范围计算，都只遍历视野内的K线。</li>
  <li><strong>每帧不产生垃圾对象</strong>——视口快照在两次变化之间会被缓存；数字和日期格式化器会被复用，而不是为每个标签重新创建。</li>
  <li><strong>自动调整宽度的价格轴</strong>——让坐标轴适应最长标签的开销约为 0.05 ms，并且只有在宽度确实变化时才重新布局。</li>
</ul>

<h2>实时 tick：增量计算指标</h2>
<p>
  一次 tick 只会改变正在形成的K线，因此实现了 <code>update()</code> 的指标只需重新计算这一根K线
  （SMA、EMA、WMA、VWMA、Bollinger、Envelope、RSI、MACD、ATR、OBV、Stochastic）。
  其他指标会回退为完整重算。BB + EMA + RSI + MACD 的数据如下：
</p>
<table>
  <thead><tr><th>历史数据</th><th>完整重算</th><th>增量 <code>update()</code></th></tr></thead>
  <tbody>
    <tr><td>20,000 根K线</td><td>约 5 ms</td><td>约 0.0005 ms</td></tr>
    <tr><td>100,000 根K线</td><td>约 27 ms</td><td>约 0.001 ms</td></tr>
  </tbody>
</table>
<p>
  自定义指标也可以选择支持——参见 <a href={href('/docs/plugins')}>插件 → 快速实时更新</a>。
</p>

<h2>切换品种或周期</h2>
<ul>
  <li><strong>低开销的完整加载</strong>——指标值存放在 <code>IndicatorValueMap</code> 中（基于数组，构建开销约为以时间戳为键的 <code>Map</code> 的三分之一），并且 <code>setData</code> 会复用仍然有效的K线，而不是复制它们。</li>
  <li><strong>只在慢的时候显示加载</strong>——上一个图表会保留在屏幕上；只有切换超过 200 ms 才会显示遮罩，因此正常约 130 ms 的网络切换永远不会闪烁。</li>
  <li><strong>不会出现过期数据</strong>——已被取代的历史数据请求会被丢弃，旧的 socket 会被断开，因此始终以最后一次点击为准。</li>
  <li><strong>本地重采样</strong>——静态数据切换周期时无需重新请求；较慢的重采样会在主线程忙碌之前先绘制遮罩。</li>
</ul>

<h2>LTTB 降采样</h2>
<p>
  当K线数量远多于像素时，折线图和面积图会使用
  <strong>Largest-Triangle-Three-Buckets</strong> 算法把可见范围降采样到每像素约 2 个点——
  线条在视觉上完全一致，而绘制的点数少了几十倍。在正常缩放级别下不做任何处理。
  该算法也已导出，可供你自己使用：
</p>
<pre><code>{`import { lttbDownsample } from '@tradecanvas/chart'

// indices preserving the shape of a 100k series, reduced to 1600 points
const idx = lttbDownsample(series.length, 1600, (i) => series[i].close)`}</code></pre>
<table>
  <thead><tr><th>可见点数 → 1600</th><th>每帧耗时</th><th>吞吐量</th></tr></thead>
  <tbody>
    <tr><td>10,000</td><td>约 0.025 ms</td><td>39,600 次 / 秒</td></tr>
    <tr><td>100,000</td><td>约 0.32 ms</td><td>3,100 次 / 秒</td></tr>
    <tr><td>1,000,000</td><td>约 2.6 ms</td><td>380 次 / 秒</td></tr>
  </tbody>
</table>

<h2>缩小时的指标</h2>
<p>
  当每根K线窄于一个像素时，指标的线、带和柱状图按像素列绘制：每列一段，从该列最低点到最高点，与前一列相连，宽度等于线宽。它看起来与穿过数千个点的描边几乎一样，光栅化的工作量却少得多。在 200,000 根K线上缩小并叠加布林带、EMA、RSI 和 MACD 时，集成显卡上每帧从约 54 ms 降到约 21 ms。<code>node scripts/bench-render.mjs</code> 可在你自己的机器上跑出这些数字。
</p>

<h2>WebGL 渲染器（预览）</h2>
<p>
  <code>renderer: 'webgl'</code> 用 WebGL 2 绘制网格、交易时段底色与分隔线、K线和成交量，画在 2D 场景下方的一个画布上；指标、绘图、坐标轴和十字线仍用 Canvas 2D 绘制。<code>'auto'</code> 只在硬件 GPU 上启用 WebGL。像素与 Canvas 2D 的差异不超过 2/255。WebGL 代码是一个独立的 chunk（gzip 后约 6 KB），首次使用时才加载；没有 WebGL 2 或上下文丢失时，图表会继续用 Canvas 2D 绘制。
</p>
<pre><code>{`const chart = new Chart(el, { renderer: 'webgl' })

chart.on('rendererChange', (e) => console.log(e.payload))
// { renderer: 'webgl' }, or { renderer: 'canvas', reason: 'unsupported' | 'contextLost' }

await chart.setRenderer('canvas')   // resolves to what draws now`}</code></pre>
<p>平移时的每帧耗时，集成显卡（Intel UHD；16.7 ms 即 60 fps）：</p>
<table>
  <thead><tr><th>图表</th><th>像素比</th><th>Canvas 2D</th><th>WebGL</th></tr></thead>
  <tbody>
    <tr><td>1600×900，2,000 根K线</td><td>2</td><td>23.3 ms</td><td>17.6 ms</td></tr>
    <tr><td>1600×900，在 200,000 根K线上缩小</td><td>2</td><td>25.1 ms</td><td>18.2 ms</td></tr>
    <tr><td>2560×1400，2,000 根K线</td><td>1.5</td><td>28.8 ms</td><td>20.9 ms</td></tr>
    <tr><td>2560×1400，2,000 根K线</td><td>2</td><td>38.1 ms</td><td>22.5 ms</td></tr>
    <tr><td>六个图表，每个 500 根K线加两个指标</td><td>2</td><td>33.4 ms</td><td>24 ms</td></tr>
  </tbody>
</table>
<p>
  指标仍用 Canvas 2D 绘制，所以指标多的图表收益较小：2560×1400 加四个指标、像素比 2 时，从 138 ms 降到 97 ms。在这个尺寸和像素比下，仅浏览器合成全尺寸图层就要在这块 GPU 上花约 23 ms。<code>node scripts/bench-render.mjs --renderer=webgl</code> 可在你的机器上测出这些数字。
</p>

<h2>脱离主线程</h2>
<p>
  <code>IndicatorWorkerHost</code> 在 Web Worker 中运行指标计算，提供基于 Promise 的
  <code>calculate()</code>、按请求设置的超时，以及用于 SSR 和测试的同步回退方案。
</p>
