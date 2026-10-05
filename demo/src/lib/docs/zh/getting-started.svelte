<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>快速开始 — TradeCanvas 文档</title>
  <meta name="description" content="安装 TradeCanvas，一分钟内渲染出你的第一个 Canvas 交易图表。" />
</svelte:head>

<h1>快速开始</h1>
<p>安装 TradeCanvas，一分钟内即可渲染出图表。</p>

<h2>安装</h2>
<p>使用你习惯的包管理器：</p>
<pre><code>npm install @tradecanvas/chart
# or
pnpm add @tradecanvas/chart
# or
yarn add @tradecanvas/chart</code></pre>

<h2>开箱即用的组件</h2>
<p>
  <code>ChartWidget</code> 是得到一个可用图表的最快方式。它会在任意宿主元素中渲染完整的
  交易界面——工具栏、画线侧边栏、设置对话框、状态栏——且不依赖任何框架。
</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  // Optional features
  watchlist: true,         // right-side sparkline panel
  persistLayouts: true,    // remember per-symbol indicators / drawings
  // dragDropImport defaults to true — drop a CSV / JSON onto the chart
})`}</code></pre>

<p>
  组件默认支持全套专业交易员手势：
  拖动越过最后一根K线进入右侧空白区域，拖动价格轴 / 时间轴进行缩放，
  <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+拖动框选多个画线，<kbd>Shift</kbd>+拖动进行测量，
  <kbd>Alt</kbd>+点击固定提示，<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>
  打开命令面板，<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd> 搜索代码，
  按 <kbd>?</kbd> 查看完整的快捷键列表。
</p>

<h2>无界面 Chart</h2>
<p>
  如果要完全掌控周边界面，可以直接使用更底层的 <code>Chart</code>
  类。工具栏由你自己实现，所有功能依然可用：
</p>

<pre><code>{`import { Chart } from '@tradecanvas/chart'

const chart = new Chart(host, {
  chartType: 'candlestick',
  theme: 'dark',
})

chart.setData(bars)
chart.addIndicator('sma', { period: 20 })`}</code></pre>

<h2>框架封装</h2>
<p>
  React、Vue 和 Svelte 的封装组件见
  <a href={href('/docs/frameworks')}>框架</a>一节。
</p>

<h2>下一步</h2>
<ul>
  <li><a href={href('/docs/api')}>API 参考</a> — <code>Chart</code> 与 <code>ChartWidget</code> 的完整接口</li>
  <li><a href={href('/docs/chart-types')}>图表类型</a> — 18 种内置图表类型</li>
  <li><a href={href('/docs/indicators')}>指标</a> — 111 个指标的目录</li>
  <li><a href={href('/docs/realtime')}>实时数据与回放</a> — 流式数据适配器与回放模式</li>
  <li><a href={href('/docs/analytics')}>分析</a> — 策略回测与风险指标</li>
</ul>
