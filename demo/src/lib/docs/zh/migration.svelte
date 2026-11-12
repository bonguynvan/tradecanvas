<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>迁移到 2.0 — TradeCanvas 文档</title>
  <meta name="description" content="从 TradeCanvas 1.x 到 2.0，你的代码需要关注的变化：安装 beta 版、默认外观以及保留 1.x 外观的一个选项、已移除的名称及其替代写法，还有发生变化的行为。" />
</svelte:head>

<h1>迁移到 2.0</h1>
<p>
  2.0 改变了图表和组件的默认外观，移除了 1.x 中已弃用的名称，并改变了四项行为。数据、已保存的布局、指标、画线、
  交易和主题照旧可用。本页逐项列出这些变化以及相应的处理方法。
</p>

<h2 id="install">安装</h2>
<p>
  2.0 目前处于 beta 阶段。所有包都以 <code>2.0.0-beta.N</code> 的版本发布在 <code>beta</code> 标签下；
  在 2.0 正式发布之前，<code>latest</code> 仍是 1.x。
</p>
<pre><code>{`npm install @tradecanvas/chart@beta

# 使用框架组件时，同时安装对应的包
npm install @tradecanvas/react@beta
npm install @tradecanvas/vue@beta
npm install @tradecanvas/svelte@beta`}</code></pre>

<h2 id="look">默认外观</h2>
<p>
  图表和组件现在会在所绘内容周围留出更多空间。用一个选项即可保留 1.x 的外观：
</p>
<pre><code>{`// 组件保持 1.x 的样子
new ChartWidget(host, { ui: { density: 'classic' } })
widget.setUI({ density: 'classic' })

// 你自己的图表保持 1.x 的样子
new Chart(host, { density: 'compact' })`}</code></pre>
<p>
  <code>ui: {'{'} density: 'compact' {'}'}</code>（更小的控件）没有变化。
</p>
<p>默认情况下的不同之处：</p>
<table>
  <thead><tr><th>对象</th><th>1.x</th><th>2.0</th></tr></thead>
  <tbody>
    <tr><td>最新 K 线之后的留白</td><td>5 格</td><td>8 格</td></tr>
    <tr><td>价格上方和下方的留白</td><td>高度的 9%</td><td>高度的 11.5%</td></tr>
    <tr><td>单独使用的 <code>Chart</code> 的 K 线</td><td>classic</td><td>golden，实体占一格的 62%，与组件原本的画法相同</td></tr>
    <tr><td>图例与绘图区角的距离</td><td>向内 8 px</td><td>向内 12 px</td></tr>
    <tr><td>组件的间距 <code>--tcw-space-1</code> … <code>-7</code></td><td>2 · 3 · 5 · 8 · 13 · 21 · 34 px</td><td>2 · 4 · 6 · 8 · 12 · 20 · 32 px</td></tr>
    <tr><td>Print 的按钮</td><td>33 px</td><td>34 px</td></tr>
    <tr><td>按钮文字两侧的内边距</td><td>8 px</td><td>12 px</td></tr>
  </tbody>
</table>
<p>
  组件中的所有尺寸和间距现在都是偶数像素；屏幕缩放为 125% 和 150% 时，细线的宽度为一个设备像素。
</p>
<p>请在你自己的代码中检查以下几处：</p>
<ul>
  <li>覆盖了 <code>--tcw-space-*</code> 的 CSS，或假定控件为 33 px 的 CSS。</li>
  <li>传入 <code>rightMargin</code> 的代码。只要设置了，它仍然优先。</li>
  <li>
    React、Vue 和 Svelte 组件不再自行设置 <code>rightMargin: 5</code>。如需保留，请在 <code>options</code> 中传入
    <code>density: 'compact'</code> 或 <code>rightMargin: 5</code>。
  </li>
  <li>
    读取 <code>@tradecanvas/core</code> 的 <code>PRICE_SCALE_MARGIN</code> 或
    <code>DEFAULT_CHART_OPTIONS.rightMargin</code> 的代码：两者的值都变了。
  </li>
</ul>
<pre><code>{`// React；Vue 和 Svelte 组件接受同样的 options
<TradeCanvas options={{ density: 'compact' }} />
<TradeCanvas options={{ rightMargin: 5 }} />`}</code></pre>
<p>
  每种密度设置的全部内容，参见 <a href={href('/docs/styling#density')}>样式 → 密度</a>。
</p>

<h2 id="removed">已移除的名称</h2>
<p>以下名称均已在 1.x 中弃用，2.0 中不再存在。</p>
<table>
  <thead><tr><th>已移除</th><th>改用</th></tr></thead>
  <tbody>
    <tr><td><code>chart.setTimezone(tz)</code></td><td><code>chart.setTimeZone(tz)</code></td></tr>
    <tr><td><code>chart.getTimezone()</code></td><td><code>chart.getTimeZone()</code></td></tr>
    <tr><td><code>chart.getEffectiveTimezone()</code></td><td><code>chart.getEffectiveTimeZone()</code></td></tr>
    <tr><td><code>chart.getExchangeTimezone()</code></td><td><code>chart.getExchangeTimeZone()</code></td></tr>
    <tr><td><code>chart.setTimezoneOffset(minutes)</code></td><td><code>chart.setTimeZone(minutes)</code>：UTC 以东的分钟数，传 <code>null</code> 则使用浏览器的时区</td></tr>
    <tr><td><code>EXCHANGE_TIMEZONE</code></td><td><code>EXCHANGE_TIME_ZONE</code></td></tr>
    <tr><td><code>SymbolInfo.timezone</code></td><td><code>SymbolInfo.timeZone</code></td></tr>
    <tr><td><code>timeFormatter</code> 中的 <code>TimeFormatContext.kind === 'date'</code></td><td>时间轴给出的是 <code>'year'</code>、<code>'month'</code> 或 <code>'day'</code>。从 1.x 起它就不再给出 <code>'date'</code>，现在类型中也已去掉。</td></tr>
    <tr><td><code>SessionBreaks.setLocale()</code> 和 <code>SessionBreaks.renderLabels()</code>（<code>@tradecanvas/core</code>）</td><td>删除这些调用：两者原本就不做任何事。</td></tr>
    <tr><td>组件的字符串键 <code>replay.barsPerSecond</code></td><td>从 <code>messages</code> 覆盖中删除：它从未被使用。回放速度的文字是 <code>replay.rate</code>。</td></tr>
  </tbody>
</table>

<h3 id="symbol-time-zone">品种的 <code>timezone</code> 不再被读取</h3>
<p>
  旧字段已完全不再读取。只给出 <code>timezone</code> 的品种，无论来自你的 <code>symbols</code>、
  <code>resolveSymbol</code>、数据源（feed）还是适配器，现在都没有自己的时区：
</p>
<ul>
  <li><code>setTimeZone('exchange')</code> 和日线的日期会退回到市场的时区，或退回到 UTC；</li>
  <li>品种自己的 <code>sessions</code> 不再着色（设置了市场时，仍按市场的交易时段着色）；</li>
  <li>品种的状态会显示为全天候交易的市场，品种信息面板也不显示时区。</li>
</ul>
<p>
  仍然传入的 <code>timezone</code> 会原样保留在 <code>getSymbolInfo()</code> 中，但不会被读取。
</p>
<pre><code>{`// 1.x
chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York' })

// 2.0
chart.setSymbolInfo({ symbol: 'AAPL', timeZone: 'America/New_York' })`}</code></pre>

<h3 id="kept">没有改动的名称</h3>
<p>
  这些名称彼此很像，查找替换时请留意。组件的设置项仍然写作 <code>timezone</code>：
</p>
<pre><code>{`widget.setSettings({ timezone: 'exchange' })
widget.getSettings().timezone       // 'exchange'`}</code></pre>
<p>
  组件的字符串键 <code>settings.timezone</code> 和 <code>menu.chart.timezone</code> 也保持原名。
</p>

<h3 id="find">如何查找</h3>
<p>
  在代码中搜索 <code>Timezone(</code> 和 <code>EXCHANGE_TIMEZONE</code>，以及品种对象中的 <code>timezone:</code>。
  每一个已移除的名称，TypeScript 都会报错。
</p>

<h2 id="behaviour">发生变化的行为</h2>
<p>以下变化不涉及任何名称的改动。</p>
<ul>
  <li>
    <strong>窗格边缘的价格轴标签。</strong>会被所在窗格的上边缘或下边缘截断的标签不再绘制，它的网格线仍然保留。
  </li>
  <li>
    <strong>多个窗格中的价格窗格。</strong>无论打开多少个指标窗格，价格窗格至少保有图表高度的 38.2%，
    其余高度由打开的窗格按各自的大小成比例分配。为窗格设置的大小会被保留，图表变高后会重新按该大小显示。
    此前各窗格保持自己的高度，可能让价格窗格一点高度都不剩。
  </li>
  <li>
    <strong>介于整数像素之间的线宽。</strong>这样的线取不超过该宽度的整数个设备像素：100% 缩放下，1.5 px
    是一个设备像素，以前是两个。
  </li>
  <li>
    <strong><code>setBarLayout()</code> 与 <code>setDensity()</code>。</strong>运行时用
    <code>chart.setBarLayout()</code> 设置的 K 线布局，在之后调用 <code>setDensity()</code> 时会被保留。
  </li>
</ul>

<h2 id="unchanged">没有变化的部分</h2>
<ul>
  <li>
    数据：<code>DataAdapter</code>、<code>DataFeed</code>、<code>setData</code>、<code>appendBar</code> 和
    <code>updateLastBar</code>。
  </li>
  <li>1.x 保存的布局和设置可以照常加载。</li>
  <li>指标、画线、交易、主题和样式键的名称都没有变。</li>
</ul>
