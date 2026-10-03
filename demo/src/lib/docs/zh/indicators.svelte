<script lang="ts">
  // Generated from the indicator registry by `pnpm docs:gen`: always the real ids.
  import catalog from '$lib/generated/indicators.json';

  type Entry = (typeof catalog)[number];
  const overlays = catalog.filter((i) => i.placement === 'overlay');
  const panes = catalog.filter((i) => i.placement === 'panel');
  const params = (i: Entry) =>
    Object.entries(i.params).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  const lines = (i: Entry) => i.plots.map((p) => p.title).join(', ');
  const hasSource = (i: Entry) => 'inputs' in i && Object.values(i.inputs ?? {}).some((x) => (x as { source?: boolean }).source);
</script>

<svelte:head>
  <title>指标 — TradeCanvas 文档</title>
  <meta name="description" content="{catalog.length} 个内置技术指标：均线、通道带、振荡指标、成交量与波动率指标，支持选择数据源、指标叠加指标以及可编辑的水平线。" />
</svelte:head>

<h1>指标</h1>
<p>
  共 {catalog.length} 个内置指标。通过 id 添加指标；未传入的参数使用默认值，
  无效的参数也会回退到默认值。
</p>

<h2>添加指标</h2>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })          // on the price pane
const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom') // in a pane of its own
chart.updateIndicator(rsi, { period: 21 })
chart.removeIndicator(rsi)`}</code></pre>
<p>
  <code>addIndicator</code> 返回一个实例 id：同一个指标可以添加多次，
  每个实例都有各自的参数、颜色和水平线。
</p>

<h2>数据源与指标叠加指标</h2>
<p>
  下表中标记为<em>数据源</em>的指标，除收盘价外还可以基于其他价格计算
  （<code>open</code>、<code>high</code>、<code>low</code>、<code>hl2</code>、<code>hlc3</code>、
  <code>ohlc4</code>、<code>hlcc4</code>），也可以基于另一个指标的线计算。
  例如 RSI 的移动平均会画在 RSI 所在的窗格中、使用 RSI 的坐标，并在 RSI 被删除时一同删除。
</p>
<pre><code>{`import { indicatorSource } from '@tradecanvas/chart'

chart.updateIndicator(ema, { source: 'hlc3' })
const smoothed = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })`}</code></pre>
<p>
  副图指标也可以共用同一个窗格：
  <code>chart.addIndicator('stochastic', &#123;&#125;, 'bottom', &#123; pane: rsi &#125;)</code>。
</p>

<h2>水平线、颜色与数值</h2>
<pre><code>{`chart.setIndicatorLevels(rsi, [20, 50, 80])   // null restores 30 / 70
chart.updateIndicatorStyle(rsi, { colors: ['#f2a93b'], lineWidths: [2] })
chart.setIndicatorVisible(rsi, false)

const series = chart.getIndicatorOutput(rsi)?.series ?? []
const latest = series[series.length - 1]?.value   // keyed by the line keys below`}</code></pre>
<p>
  每条线的最新值会以该线的颜色标注在坐标轴上；可通过
  <code>features.indicatorValueLabels: false</code> 或 <code>setIndicatorValueLabelsVisible(false)</code> 关闭这些标签。
  同一窗格中的线、水平线、坐标轴和十字光标共用一套坐标。
</p>

<h2>主图指标（{overlays.length}）</h2>
<table>
  <thead><tr><th>id</th><th>名称</th><th>默认参数</th><th>线</th></tr></thead>
  <tbody>
    {#each overlays as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· 数据源</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>mtfma</code> 在当前图表上绘制更高周期的移动平均——例如在 1h K线上显示日线的 50 均线。
  它只对更高周期<em>已完成</em>的收盘价求平均，因此会在每个周期边界处呈阶梯状变化，且永不重绘。
</p>

<h2>副图指标（{panes.length}）</h2>
<table>
  <thead><tr><th>id</th><th>名称</th><th>默认参数</th><th>线</th><th>水平线</th></tr></thead>
  <tbody>
    {#each panes as ind (ind.id)}
      <tr>
        <td><code>{ind.id}</code></td>
        <td>{ind.name}{#if hasSource(ind)} <small>· 数据源</small>{/if}</td>
        <td><code>{params(ind) || '—'}</code></td>
        <td>{lines(ind) || '—'}</td>
        <td>{'levels' in ind ? ind.levels?.join(', ') : '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <code>voldelta</code>（Volume Delta）根据 OHLCV 估算买卖压力——收涨的K线计入正成交量，
  收跌的K线计入负成交量。<code>mode: 0</code> 为逐根K线的柱状图，
  <code>mode: 1</code> 为累计 delta。（真正的逐笔 delta 需要每笔成交的买价 / 卖价数据，
  而 OHLCV 序列并不包含这些信息。）
</p>

<h2>自定义指标</h2>
<p>
  继承 <code>IndicatorBase</code>，声明它要绘制的内容（<code>plots</code>）、窗格坐标、
  水平线和参数；图表会负责绘制、缩放窗格、标注数值，并把它列入组件的图例和设置中，
  你无需编写任何渲染代码。参见
  <a href="https://github.com/bonguynvan/tradecanvas/blob/main/skills/tradecanvas/references/recipes.md#a-custom-indicator">自定义指标示例</a>。
</p>

<h2>窗格：调整大小、收起、最大化、重新排序</h2>
<p>
  <strong>拖动窗格上方的分隔线</strong>即可调整其大小。在 ChartWidget 中，每个窗格右上角都有按钮：
  上移或下移、收起到只剩标题栏、最大化（其他窗格随之收起，主图保留一条窄条）。
  保存的布局会记住每个窗格的大小、顺序、收起与最大化状态。用代码也可以做到：
</p>
<pre><code>{`chart.setPanelSize(rsi, 180)        // px, clamped to a minimum
chart.setPaneCollapsed(macd, true)  // fold to its header
chart.setMaximizedPane(rsi)         // null puts the panes back
chart.movePane(rsi, -1)             // one place up; 1 = down
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order'`}</code></pre>

<h2>把指标移到另一个窗格</h2>
<p>
  指标可以加入另一个指标的窗格（随后与该窗格共用坐标），也可以独占一个窗格，或者回到主图。
  当它离开原本归它所有的窗格时，窗格中的其他指标会留下（由下一个副图指标接管该窗格），
  而基于它的线计算的指标会随它一起移动。在 ChartWidget 中，图例行上的 <strong>⋯</strong> 按钮
  提供上方窗格、下方窗格、新窗格和主图几个去处。
</p>
<pre><code>{`chart.moveIndicatorToPane(cci, rsi)      // into RSI's pane
chart.moveIndicatorToPane(cci, 'new')    // a pane of its own
chart.moveIndicatorToPane(ema, 'price')  // an overlay back to the price pane
chart.canMoveIndicatorToPane(cci, rsi)   // whether it would move`}</code></pre>

<h2>撤销与模板</h2>
<p>
  添加、删除、编辑和移动指标都是撤销步骤，与画线共用同一份历史记录
  （<kbd>Ctrl/⌘ Z</kbd>、<kbd>Ctrl/⌘ Shift Z</kbd>）；通过撤销恢复的指标会沿用原来的 id，
  因此其线上的提醒仍然对应得上。对同一个指标的一连串编辑（拖动颜色、输入周期）只算一步。
  加载布局后，历史记录会重新开始。
</p>
<p>
  所有指标可以作为一个整体取出再放回，ChartWidget 的指标模板正是这样做的：
  “指标”菜单中的 <strong>将指标保存为模板…</strong> 会把它们（参数、样式、水平线、窗格）
  以一个名称保存下来；选择模板后，它们会替换图表当前的指标，这也只算一次撤销步骤。
</p>
<pre><code>{`const setup = chart.getIndicatorSetup()   // what a layout keeps of them
chart.applyIndicatorSetup(setup)          // in place of the chart's indicators

new ChartWidget(host, { indicatorTemplates: true })  // the default`}</code></pre>

<h2>在图表之外计算</h2>
<p>
  <code>IndicatorWorkerHost</code> 根据K线计算指标，使用的消息与 Web Worker 相同。
  Worker 脚本目前尚未包含在发布的包中，因此请传入 <code>null</code> 并注册插件，
  以便在当前线程中计算（SSR、测试、脚本）：
</p>
<pre><code>{`import { IndicatorWorkerHost, RSIIndicator } from '@tradecanvas/core'

const host = new IndicatorWorkerHost(null)
host.registerFallbackPlugin(new RSIIndicator())
const output = await host.calculate('rsi', { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } }, bars)`}</code></pre>
