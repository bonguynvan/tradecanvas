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

<h2>脱离主线程</h2>
<p>
  <code>IndicatorWorkerHost</code> 在 Web Worker 中运行指标计算，提供基于 Promise 的
  <code>calculate()</code>、按请求设置的超时，以及用于 SSR 和测试的同步回退方案。
</p>
