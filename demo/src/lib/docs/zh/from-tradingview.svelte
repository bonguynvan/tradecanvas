<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>从 TradingView 迁移 — TradeCanvas 文档</title>
  <meta name="description" content="把基于 TradingView 图表库（Advanced Charts、Trading Platform）或 Lightweight Charts 的应用迁移到 TradeCanvas：用 feedFromJsApi 或 udfFeed 保留原有 datafeed，让编程智能体通过 MCP 服务器对照名称和选项，并了解哪些内容无法迁移。" />
</svelte:head>

<h1>从 TradingView 迁移</h1>
<p>
  基于 TradingView 图表库（Advanced Charts 或 Trading Platform）或 Lightweight Charts 构建的应用，迁移到
  TradeCanvas 时后端无需改动。datafeed 保持原样，放在一层桥接之后。确实会变的名称，包括选项、featureset、
  override、study、画线和方法，都收录在 <a href={href('/docs/getting-started#ai')}>MCP 服务器</a>据以回答的对照表中，
  因此编程智能体会逐个查询，而不是去猜。本页说明哪些内容可以沿用、哪些会变、哪些无法迁移。
</p>

<h2 id="datafeed">保留 datafeed</h2>
<p>
  <code>feedFromJsApi</code> 把为 JS API 编写的 datafeed（<code>onReady</code>、<code>resolveSymbol</code>、
  <code>getBars</code>、<code>subscribeBars</code>，以及在实现了的情况下的 <code>searchSymbols</code>、
  <code>getQuotes</code>、<code>subscribeQuotes</code>）转换成一个 <code>DataFeed</code>：
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // 应用原有的 datafeed，不做改动
await feed.ready()                      // onReady 已返回：已知道它提供的周期

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>桥接层为 datafeed 做的事：</p>
<ul>
  <li>每个品种只解析一次，并把它的 symbol info 交回给 <code>getBars</code> 和 <code>subscribeBars</code>；</li>
  <li>
    把图表的周期转换为 resolution（<code>'1h'</code> → <code>'60'</code>，<code>'1d'</code> →
    <code>'1D'</code>），并把图表的 <code>countBack</code> 和 <code>before</code> 转换为以秒为单位的
    <code>from</code>、<code>to</code> 和 <code>countBack</code>；
  </li>
  <li>某个区间没有K线时，再从 <code>nextTime</code> 请求一次；</li>
  <li>
    用订阅时的 guid 取消订阅，并在 datafeed 调用 <code>onResetCacheNeeded</code> 时重新加载序列；
  </li>
  <li>
    把品种的 <code>pricescale</code> 和 <code>minmov</code> 读作价格步长，把 <code>session</code> 读作交易时段，
    并从 <code>supported_resolutions</code> 读取它提供的周期。
  </li>
</ul>
<p>
  图表在连接 feed 时读取它提供的周期，并由这些周期构建其他周期（用 1 分钟K线构建 7 分钟图表）。
  <code>onReady</code> 返回得更晚，因此请在创建 <code>ChartWidget</code> 之前 await <code>feed.ready()</code>，
  或者自己传入这些周期：<code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>。
</p>

<h3 id="udf">UDF 服务器</h3>
<p>支持 UDF 协议的服务器完全不需要编写 datafeed 代码：</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // 它的 /config 中的周期

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  它读取 <code>/config</code>、<code>/symbols</code>、<code>/search</code>、<code>/history</code> 和
  <code>/quotes</code>。UDF 没有推送，因此实时K线和报价每隔 <code>updateFrequency</code> 毫秒重新请求一次
  （默认 10 秒）。<code>headers</code> 会随每个请求发送。
</p>

<h2 id="mcp">让智能体对照其余部分</h2>
<p>MCP 服务器为迁移提供三个工具：</p>
<table>
  <thead><tr><th>工具</th><th>作用</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>按顺序列出步骤、要在应用代码中搜索什么，以及每次搜索的结果由哪个工具对照。</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        一个名称会变成什么：组件选项、featureset、override 键、study、画线形状、组件或图表的方法、datafeed 或
        broker 的成员，或一个 resolution。它给出对应的选项、功能开关、样式键、指标 id（附默认值和线条键）、画线类型
        （附其锚点）或调用；没有对应项时会直接说明，并给出替代做法。
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        把 <code>new TradingView.widget({'{'}...{'}'})</code> 的整个选项对象（包括 featureset 和 override）转换为
        <code>ChartWidget</code> 选项；或把 Lightweight Charts 的 <code>createChart</code> 选项转换为
        <code>Chart</code> 选项。它还会列出图表创建后需要进行的调用以及无处安放的部分，并像
        <code>validate_options</code> 一样检查结果。
      </td>
    </tr>
  </tbody>
</table>
<p>
  连接服务器后，直接让智能体完成迁移：它会先调用 <code>migration_plan</code>，然后据此逐步处理整个应用。
  对于没有连接服务器的智能体，agent skill 中有相同的步骤。
</p>

<h2 id="differs">会变的部分</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>、<code>library_path</code></td><td><code>new ChartWidget(element, options)</code>；无需托管任何文件</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td><code>onReady</code> 选项，或写在构造函数之后的代码</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>；id 很短：<code>'rsi'</code>、<code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>，时间以秒为单位</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>，时间以毫秒为单位</td></tr>
    <tr><td>resolution：<code>'60'</code>、<code>'1D'</code>、<code>'W'</code></td><td>周期：<code>'1h'</code>、<code>'1d'</code>、<code>'1w'</code>（<code>resolutionToTimeframe</code>、<code>timeframeToResolution</code>）</td></tr>
    <tr><td><code>disabled_features</code>、<code>enabled_features</code></td><td><code>features</code>：每个开关默认开启，除非设为 <code>false</code></td></tr>
    <tr><td><code>overrides</code>、<code>applyOverrides</code></td><td>样式键，写在 <code>chartOptions.overrides</code> 中或通过 <code>chart.applyOverrides()</code>；线型用名称表示</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code> 配合一个 <code>LayoutStorage</code>（<code>list</code>、<code>load</code>、<code>save</code>、<code>remove</code>）</td></tr>
    <tr><td>Broker API、订单线和持仓线</td><td>一个 <code>ExecutionAdapter</code>、<code>setOrders</code>、<code>setPositions</code> 和订单事件（<a href={href('/docs/trading')}>交易</a>）</td></tr>
    <tr><td>Lightweight Charts：K线和标记以秒为单位</td><td>毫秒：<code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">无法迁移的部分</h2>
<ul>
  <li>
    <strong>已保存的图表。</strong>以 TradingView 格式保存的布局、画线和指标无法加载：用户需要新建布局。
  </li>
  <li>
    为 <code>custom_indicators_getter</code> 编写的<strong>自定义指标</strong>需要改写为
    <a href={href('/docs/plugins')}>指标插件</a>，除非 138 个内置指标中已有功能相同的。
  </li>
  <li>
    <strong>部分画线工具和 featureset</strong> 没有对应项。<code>migration_lookup</code> 会说明是哪些，并给出最接近的工具。
  </li>
  <li>
    <strong>跨品种交易。</strong><code>ExecutionAdapter</code> 的订单和持仓属于图表当前的品种；跨多个品种和账户的账户管理器
    由应用自己实现。
  </li>
</ul>
<p>
  这些对照表依据 TradingView 的公开文档编写（2026 年 11 月查阅），并在每次构建时与 TradeCanvas 自身的名称进行核对。
  缺失或错误的名称属于 bug：请在 GitHub 上报告。
</p>
