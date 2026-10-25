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

<p>
  在 TypeScript 中，内置指标的 id 和参数都有类型：<code>BuiltInIndicators</code> 列出每个指标的参数、默认值以及各条线的键，
  编辑器会在输入时给出提示，拼错名字的参数无法通过类型检查。插件注册的指标可以使用任意 id 和参数。
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
  图例显示每条线的最新值。若还要以该线的颜色把它标注在坐标轴上，可通过
  <code>features.indicatorValueLabels: true</code> 或 <code>setIndicatorValueLabelsVisible(true)</code> 开启这些标签（默认关闭）。
  同一窗格中的线、水平线、坐标轴和十字光标共用一套坐标。
</p>

<h2>只在部分周期显示</h2>
<p>
  指标可以只在部分周期上显示：例如 200 日均线只在日线及更高周期上显示，快速震荡指标只在分钟图上显示。
  每一类周期（tick、秒、分钟、小时、日、周、月）可以保持开启、关闭，或限定一个数值范围；
  未列出的类别在其所有周期上都显示。图表会随周期变化，用所连接数据流的周期来套用这些规则；
  对于用 <code>setData</code> 设置的K线，
  <code>chart.setDataTimeframe('1h')</code> 告诉图表它们的周期（ChartWidget 会自动完成）；两者都没有时则显示该指标。这些规则随布局一起保存，也和其他编辑一样可以撤销。
</p>
<pre><code>{`chart.setIndicatorIntervals(ema, { seconds: false, minutes: false, hours: [1, 4] })
chart.getIndicatorIntervals(ema)    // { seconds: false, minutes: false, hours: [1, 4] }
chart.setIndicatorIntervals(ema, null)  // 恢复为全部周期`}</code></pre>
<p>
  <code>getActiveIndicators()</code> 会说明每个指标是否 <code>visible</code>（已开启）以及是否
  <code>shown</code>（在当前周期上绘制）。在 ChartWidget 中，指标未绘制时，它的图例行会变灰。
</p>

<h2>在 ChartWidget 中</h2>
<p>
  工具栏上的 <strong>指标</strong> 会打开一个对话框。输入文字即可按名称或简称搜索所有指标
  （<kbd>Enter</kbd> 添加最匹配的一项）；也可以在侧边选择分组：<strong>收藏</strong>、
  <strong>模板</strong>、<strong>全部</strong>，然后是各个类别（移动平均线、趋势、震荡指标、波动率、
  成交量、轨道与通道、价格与形态）。点击一行即添加该指标，对话框保持打开，便于继续添加；
  计数显示图表上已有几个该指标，旁边的星标可将它加入收藏。在手机上，分组显示为列表上方的一排标签。
</p>
<p>
  指标的设置（点击其图例行上的名称或齿轮图标打开）有三个标签页：<strong>参数</strong>；
  <strong>样式</strong>，每条线一行（是否显示、颜色、线型），以及线宽、叠加指标的价格坐标和水平线；
  以及 <strong>可见性</strong>，即它在哪些周期上显示。每次编辑都会立即生效。<strong>取消</strong>或
  <kbd>Esc</kbd> 会全部恢复原样，<strong>确定</strong>则保留修改。<strong>默认</strong>可重置设置，
  或将其保存为默认：之后在此浏览器中，新添加的同类指标都会以这些参数和外观开始。
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

<h2>亚洲行情软件常见的指标</h2>
<p>
  韩国、日本和越南的交易者在行情软件上常用的指标：心理线（<code>psy</code>）与新心理线（<code>newpsy</code>）、成交量比率（<code>vr</code>）、AB 比率（<code>abratio</code>）、<code>sonar</code>、<code>sigma</code>、二元波（<code>binarywave</code>）、成交额（<code>tradevalue</code>）与成交量变化（<code>volchange</code>）、DeMark 预测区间（<code>demark</code>），以及最多 20 条线的均线彩虹（<code>rainbow</code>）。成交额是估算值，即每根 K 线的收盘价 × 成交量；交易所的官方数字来自其行情源。
</p>
<pre><code>{`chart.addIndicator('psy', { period: 10 }, 'bottom')              // 上涨收盘的占比；标出 25 和 75
chart.addIndicator('vr', { period: 20 }, 'bottom')                // 上涨日与下跌日的成交量之比
chart.addIndicator('tradevalue', {}, 'bottom')                    // 每根 K 线的收盘价 × 成交量
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 }) // 十条均线，10 到 100 根`}</code></pre>

<h2>K 线形态</h2>
<p>
  64 种 1 到 5 根 K 线的形态：十字星、锤子线与流星线、光头光脚线与捉腰带线；吞没、孕线、刺透与乌云盖顶、平头、反冲；早晨之星与黄昏之星、弃婴、三白兵与三只乌鸦、三内与三外、跳空并列；三线打击、上升与下降三法、铺垫、脱离和梯底。反转形态只在其要反转的趋势之后才计入（形态之前的收盘价同时越过其 10 根均值和 10 根之前的收盘价，<code>trendPeriod</code>），实体长短与之前 K 线的平均实体比较。指标在看涨形态下方、看跌形态上方画箭头，K 线够宽时附上简称；一根 K 线结束多个形态时显示最长的那个。<code>reversal</code>、<code>continuation</code> 和 <code>indecision</code>（1 或 0）选择类型。
</p>
<pre><code>{`chart.addIndicator('candlepatterns')                  // 在每个形态结束的 K 线上画箭头和名称
chart.addIndicator('candlepatterns', { indecision: 1 }) // 也显示十字星和纺锤线

import { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/chart'

const found = detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer'] })
// [{ index, time, pattern: { id, name, short, direction, kind, bars } }]
CANDLE_PATTERNS.length                                 // 64`}</code></pre>

<h2>自定义指标</h2>
<p>
  继承 <code>IndicatorBase</code>，声明它要绘制的内容（<code>plots</code>）、窗格坐标、
  水平线和参数；图表会负责绘制、缩放窗格、标注数值，并把它列入组件的图例和设置中，
  你无需编写任何渲染代码。它的 <code>category</code>（<code>'oscillators'</code>、<code>'volume'</code>…）
  会把它放进“指标”对话框中的对应分组；未设置时归入“其他”。参见
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
chart.on('paneChange', (e) => e.payload.change)  // 'collapsed' | 'maximized' | 'order' | 'scale'
chart.setPaneScale(atr, { log: true, invert: false })  // log while its values are above 0
chart.setPaneScale(atr, { percent: true })             // labels in percent of its first value on screen`}</code></pre>
<p>
  在 ChartWidget 中右键点击窗格，即可为它单独设置对数坐标、反转坐标或百分比坐标。
</p>

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
  “指标”对话框“模板”标签页上的 <strong>将指标保存为模板…</strong> 会把它们（参数、样式、水平线、窗格）
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
