<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>迁移到 3.0 — TradeCanvas 文档</title>
  <meta name="description" content="从 TradeCanvas 2.x 到 3.0，你的代码需要注意的变化：每一处发生变化的行为，以及保留旧行为的选项。3.0 正在独立分支上开发。" />
</svelte:head>

<h1>迁移到 3.0</h1>
<p>
  3.0 正在 <code>3.0</code> 分支上开发：尚未发布到 npm，本页会随开发进度不断补充。这里列出每一处可能破坏 2.x 代码的变化，
  以及相应的处理方法。从 1.x 升级到 2.0，请见 <a href={href('/docs/migration')}>迁移到 2.0</a>。
</p>

<h2 id="behaviour">发生变化的行为</h2>

<h3 id="brackets">已确认的括号单会发送给执行适配器</h3>
<p>
  连接了执行适配器（<code>chart.connectExecution(adapter)</code>）时，已确认的括号单现在会作为一个订单发送给适配器：
  入场及其数量、止损和止盈。在 2.x 中，除非适配器以 <code>brackets: 'place'</code> 连接，否则它只是
  <code>bracketPlace</code> 事件，并且图表会在控制台警告一次，说明括号单没有被发送。
</p>
<ul>
  <li>
    <strong>你的代码自行根据事件下括号单。</strong>请以 <code>brackets: 'event'</code> 连接，否则括号单会被下两次：
    图表一次，你一次。
  </li>
  <li>
    <strong>你已传入 <code>brackets: 'place'</code>。</strong>无需处理；该选项可以去掉。
  </li>
  <li>
    <strong>没有连接适配器。</strong>没有变化：括号单仍是 <code>bracketPlace</code> 事件。
  </li>
</ul>
<pre><code>{`// 2.x：是事件，除非另行指定            // 3.0：是订单，除非另行指定
chart.connectExecution(broker)             chart.connectExecution(broker, { brackets: 'event' })
chart.connectExecution(broker, { brackets: 'place' })   →   chart.connectExecution(broker)`}</code></pre>
<p>
  括号单按其规模对应的数量发送。没有数量的括号单不会被确认：它会留在图表上，<code>executionError</code> 会说明原因
  （<code>reason: 'noQuantity'</code>）。组件的括号单操作栏现在有数量输入框，因此从工具栏开始的括号单都带有数量；
  由你的代码开始的括号单通过第三个参数指定规模（见 <a href={href('/docs/trading')}>交易</a>）：
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // 在止损处亏损 50 的数量`}</code></pre>

<h3 id="trade-buttons">连接执行适配器后，图表上显示卖出和买入</h3>
<p>
  连接了执行适配器并且下单窗口开启时，组件现在会在图表图例下方显示卖出和买入。只为画出自己的订单和持仓而连接适配器的宿主，可以把它们关掉：
</p>
<pre><code>{`new ChartWidget(el, { features: { tradeButtons: false } });`}</code></pre>
<p>
  关闭 <code>orderTicket</code>，或没有适配器时，这两个按钮不会出现。逐个按名称关闭下单开关的宿主多了一个要写的名称：<code>tradeButtons</code> 是新开关，不设置时为开启。
</p>

<h3 id="stop-limit">模拟账户在限价内成交止损限价单</h3>
<p>
  <code>PaperExecutionAdapter</code> 以前在止损价处成交 <code>stopLimit</code> 订单，与止损单相同。现在，价格到达止损价后，
  它会变为以其 <code>price</code> 为限价的限价单：订单继续挂着（类型变为 <code>'limit'</code>），直到价格进入限价范围。
  如果测试期望价格一到止损价就产生持仓，请先把价格移到限价范围内，或改用 <code>'stop'</code> 订单。
</p>

<h3 id="hand-prices">手动设定的价格落在市场的价格网格上</h3>
<p>
  <code>orderModify</code>、<code>positionModify</code>、<code>bracketPlace</code>、草稿订单或右键菜单发出的 <code>orderPlace</code>、
  <code>priceAxisAdd</code> 和 <code>chartContextMenu</code> 以前携带的是指针下按像素算出的价格（<code>62549.71592675613</code>）。
  现在它们携带的是落在市场最小变动价位上的价格，没有时则取价格轴显示的小数位数：即 <code>chart.roundPrice</code> 给出的值。
  括号单和草稿订单无论从什么价格开始，也都落在网格上；被拖动的提醒同样如此。松开时仍在原来价位上的线不会发出任何事件。自己做过取整的代码可以去掉这一步。
  在有当日涨停价和跌停价的市场上，订单自身的价格也被限制在其间：拖过界时，事件携带的是涨停价或跌停价。
</p>

<h3 id="finger">在手指下，没有小于 32 px 的控件</h3>
<p>
  在主指针为粗略指针的设备上（手机、平板），无论哪种外观和 <code>density</code>，组件的控件现在每个方向至少 32 px：
  平板上的 <code>compact</code> 组件不再有 24 px 的按钮，指标图例的每一行高 32 px，而不是原来的 20 px。
  在鼠标下，图形保持原样，变化的只是点按区域：每个方向至少 20 px。在触摸屏上测量组件各部分（图例的高度、对话框的高度）的页面，会读到更大的数值。
</p>

<h3 id="order-answer">下单窗口发出的订单会等待适配器的答复</h3>
<p>
  连接了执行适配器时，下单窗口不再在下单的同时关闭：它会一直等到适配器的 <code>placeOrder</code> resolve（窗口关闭）或 reject（窗口保留并说明原因）。
  <code>placeOrder</code> 永不结束的适配器会让窗口一直等待：请以订单 resolve，或带着原因 reject。另有三处随之改变。
  每个 <code>orderPlace</code> 负载现在都带有 <code>clientOrderId</code>，<code>placeOrderIntent</code> 返回实际发出的订单（以前不返回任何值）。
  数据源同时给出买价和卖价时，下单窗口发出的市价单以卖价（买入）或买价（卖出）作为 <code>price</code>（以前是最新价）。
  一次按下发出的订单（来自右键菜单或盘口深度面板）在市场有交易单位时数量为一手（以前是 1，而深度面板的订单没有数量）。
</p>

<h3 id="orders-by-symbol">订单、持仓和成交画在各自的品种上</h3>
<p>
  写明了 <code>symbol</code> 的订单、持仓或成交，只在图表显示该品种时绘制。在其他品种上它会被保留：
  <code>getOrders()</code>、<code>getPositions()</code> 和 <code>getFills()</code> 返回整个账户，
  <code>chart.getSymbol()</code> 说明其中哪些被绘制。图表现在会在每个 <code>orderPlace</code> 负载上写明当前显示的品种，
  模拟账户会保留它，因此在一个品种上开出的持仓不会再像以前那样画到下一个品种上，并按错误的价格计算盈亏。
  没有写明品种的仍像以前一样画在每个品种上：你自己为多品种账户写的适配器，要在它的订单、持仓和成交上写明品种。
</p>
<p>
  随之改变的有三处。只要图表显示着某个品种，<code>executionFill</code> 和 <code>getFills()</code> 给出的每笔成交都带有
  <code>symbol</code>，<code>ChartWidget</code> 在品种改变时不再清除成交：历史和已实现盈亏属于账户，标记会随它们的品种
  一起回来。<code>setMarkPrice</code> 接受品种作为第三个参数，图表在回放时会传入它：提供的价格写明了品种时，
  模拟账户按各品种自己的价格撮合和估值；提供的价格没有写明品种时，它和以前一样是一个市场。另外，K 线由手动设置时，
  图表在被告知之前不知道品种：<code>chart.setSymbol(symbol)</code>，<code>ChartWidget</code> 会自己调用它。
</p>

<h2 id="types">扩充的类型</h2>
<p>
  <code>TimeInForce</code> 现在是 <code>'gtc' | 'day' | 'gtd' | 'ioc' | 'fok'</code>。处理全部成员的代码
  （没有 default 的 <code>switch</code>、<code>Record&lt;TimeInForce, …&gt;</code>）需要补上三个新成员；
  你自己的执行适配器可以拒绝它不支持的类型。
</p>
<p>
  <code>FillReason</code> 也多了 <code>'liquidation'</code>，用于模拟账户在强制平仓中平掉的持仓，
  <code>ExecutionEventType</code> 多了 <code>'marginCall'</code>。只有给模拟账户设置了
  <code>stopOutLevel</code> 或 <code>marginCallLevel</code>，这两者才会出现，但处理全部成员的代码需要补上它们。
</p>

<h2 id="unchanged">没有变化的部分</h2>
<ul>
  <li>数据、2.x 保存的布局和设置照常加载。</li>
  <li>指标、绘图、主题和样式键的名称保持不变。</li>
</ul>
