<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>交易叠加层 — TradeCanvas 文档</title>
  <meta name="description" content="借助 TradeCanvas 的交易叠加层，直接在图表上渲染持仓、订单、信号标记和交易区域。" />
</svelte:head>

<h1>交易叠加层</h1>
<p>
  直接在图表上渲染持仓、订单、信号标记和交易区域。
  设计上可同时接入手动交易和程序化交易流程。
</p>

<h2>关闭交易功能</h2>
<p>
  交易叠加层默认开启；右键下单菜单默认关闭（自 1.3 起）。
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  不启用该菜单时，在图表上右键会照常弹出浏览器原生菜单。
</p>

<h2>持仓</h2>
<pre><code>{`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`}</code></pre>

<h2>订单</h2>
<pre><code>{`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`}</code></pre>

<p>拖动价格线即可修改订单；通过 <code>chart.on('orderModify', ...)</code> 订阅修改事件。</p>

<h2>实盘执行（连接适配器）</h2>
<p>
  默认情况下，图表只会<em>发出</em>订单 / 持仓意图（<code>orderPlace</code>、
  <code>orderModify</code>、<code>orderCancel</code>、<code>positionModify</code>、
  <code>positionClose</code>），交由你的后端处理——它自己从不交易。连接一个
  <code>ExecutionAdapter</code> 后，图表会把这些意图转发给适配器，
  并渲染适配器回传的权威订单 / 持仓（适配器是唯一的数据来源）。
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))
// chart.disconnectExecution()`}</code></pre>
<p>
  实现 <code>ExecutionAdapter</code>（其结构与 <code>DataAdapter</code> 相对应），即可接入
  真实的经纪商 / OMS：<code>placeOrder</code>、<code>modifyOrder</code>、<code>cancelOrder</code>、
  <code>modifyPosition</code>、<code>closePosition</code>，以及 <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> 事件。
  <code>PaperExecutionAdapter</code> 是一个虚拟成交的沙盒，适用于演示和测试。
</p>

<h2>在图表上操作订单和持仓</h2>
<p>
  订单线和持仓线的右端带有小按钮：<strong>×</strong> 撤销订单或平掉持仓，
  <strong>⇅</strong> 反手持仓，止损线或止盈线上的 × 则移除该止损或止盈。
  它们发出的意图与 API 相同（<code>orderCancel</code>、<code>positionClose</code>、
  <code>positionReverse</code>、带 <code>null</code> 的 <code>positionModify</code>），
  因此已连接的适配器会执行这些操作，未连接适配器的宿主应用则会收到相应事件。
  按钮只有在其上方松开时才会生效：按下后滑出按钮则不会执行任何操作。
  可在 <code>setTradingConfig</code> 中通过 <code>lineButtons</code> 关闭其中任意按钮。
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent('pos-1', { stopLoss: null }) // null removes the stop`}</code></pre>
<p>
  能一步完成反手的适配器可实现 <code>reversePosition</code>；
  若未实现，图表会先平仓，再按相反方向发送一笔市价单。
  订单可以带 <code>stopLoss</code>、<code>takeProfit</code> 和
  <code>timeInForce</code>（<code>'gtc'</code> 或 <code>'day'</code>），这些设置会延续到
  该订单开出的持仓上。
</p>
<p>
  <strong>适配器作者请注意：</strong>在 <code>PositionModifyIntent</code> 中，
  <code>stopLoss: null</code>（或 <code>takeProfit: null</code>）表示移除，
  而缺少该字段表示保持不变。写成 <code>intent.stopLoss ?? position.stopLoss</code>
  的代码会保留用户已经移除的止损。
</p>

<h2>图表上的成交</h2>
<p>
  每笔成交都会在其所在K线上显示一个小标记：开仓的成交为实心，平仓的成交为空心。
  图表会记录适配器回报的成交，并发出 <code>executionFill</code> 事件，附带成交原因
  （<code>'order'</code>、<code>'close'</code>、<code>'reverse'</code>、
  <code>'stopLoss'</code>、<code>'takeProfit'</code>）以及已实现的盈亏。
</p>
<pre><code>{`chart.on('executionFill', (e) => {
  const { side, price, quantity, reason, pnl } = e.payload
})

chart.addFill({ orderId: 'o-7', side: 'buy', price: 64_150, quantity: 1, time: Date.now() })
chart.getFills()        // the latest 1000
chart.getRealisedPnl()  // every fill's P&L since the last clearFills
chart.clearFills()
chart.setTradingConfig({ fillMarks: false })  // no marks`}</code></pre>

<h2>右键菜单与价格轴旁的“+”</h2>
<p>
  在图表上右键会发出 <code>chartContextMenu</code> 事件，其中包含被点击的区域
  （<code>'plot'</code>、<code>'pane'</code>、<code>'priceAxis'</code> 或
  <code>'timeAxis'</code>）以及该处的价格和时间。启用
  <code>features.priceAxisAddButton</code> 后，价格轴上会有一个“+”跟随十字光标移动；
  点击它会发出带有该价格的 <code>priceAxisAdd</code> 事件。
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget 的菜单就是基于这些事件构建的。在绘图区右键，可在该价格添加提醒、买入和卖出
  （价格位于订单需要挂单等待的一侧时为限价单，位于另一侧时为止损单），还可打开下单窗口、
  添加水平线、重置视图以及操作画线；在价格轴上右键可切换坐标模式；在时间轴上右键可重置视图
  和跳转到日期。可用 <code>chartMenuItems</code> 添加自己的菜单项（参见
  <a href={href('/docs/api')}>API 参考</a>）。
</p>

<h2>下单窗口和账户面板（ChartWidget）</h2>
<p>
  组件的收据按钮会在图表下方打开账户面板：显示当前持仓及其盈亏、挂单，以及迄今为止的成交
  和已实现盈亏。每一行都可以平仓、反手或撤单。<strong>新建委托</strong>会打开下单窗口：
  买入或卖出，市价、限价或止损，数量、价格、可选的止损和止盈，以及有效期。填写时它会实时检查订单
  （限价买单应低于市价，止损应位于入场价亏损的一侧……），并显示盈亏比。
  下单时会发出 <code>orderPlace</code> 意图。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.`}</code></pre>
<p>
  成交标记属于图表上当前的品种：在组件中切换品种后，新的品种从没有任何标记开始。
</p>

<h2>拖动创建订单</h2>
<p>
  创建一条可拖动的订单线，把它拖到目标价格后确认——订单类型
  （限价单或止损单）会根据放下位置相对于当前价格的方向自动推断。
  与 <code>connectExecution</code> 配合使用时，确认后的草稿订单会立即成交。
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>括号单（拖动下单）</h2>
<p>
  创建一个可拖动的括号单——入场价加上止损区和止盈区——然后
  拖动这三条线来调整入场、风险和收益。按 <kbd>Enter</kbd>（或“下单”按钮）确认，
  按 <kbd>Esc</kbd> 取消。在组件中，工具栏上的绿色 / 红色箭头分别创建做多 / 做空括号单。
  图表只会发出一个 <code>bracketPlace</code> 事件，由你的后端处理——
  它自己从不下单。
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, riskReward } = e.payload
  // submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

chart.confirmBracket()  // same as Enter
chart.cancelBracket()   // same as Esc`}</code></pre>

<h2>盘口深度（点击交易）</h2>
<p>
  可选开启的盘口深度面板会把订单簿渲染为按价格排列的行，
  并带有买单 / 卖单数量列——点击卖价单元格即以该价格买入，点击买价单元格即以该价格卖出。
  设置 <code>depthLadder: true</code> 启用，并通过 <code>widget.setDepth</code> 传入订单簿；
  点击会发出 <code>orderPlace</code> 意图，交给你的 OMS 处理（图表自己从不交易）。
  同一份数据也会驱动图表上的深度叠加层。
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>流动性热力图</h2>
<p>
  把订单簿快照累积成蜡烛背后的热力图——每个快照是一条垂直色带，
  各价位上的挂单量会被点亮（买单为绿色，卖单为红色）。长时间存在的流动性墙会格外醒目。
  可在设置面板中切换（或调用 <code>chart.setDepthHeatmapVisible</code>）；
  每次订单簿更新时，<code>widget.setDepth</code> 都会记录一个快照。
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()`}</code></pre>

<h2>信号标记</h2>
<p>交易机器人或信号交易集成可以在叠加层上放置方向箭头。</p>
<pre><code>{`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})

// A marker under the pointer, and a click on one
chart.on('signalMarkerHover', (e) => showNote(e.payload.marker, e.payload.x, e.payload.y))  // marker null: off it
chart.on('signalMarkerClick', (e) => openSignal(e.payload.marker))`}</code></pre>
<p>
  ChartWidget 会在指针下方的标记旁显示一条说明：它的标签和来源、方向、价格、置信度和时间。
</p>

<h2>交易区域</h2>
<p>以矩形展示入场 → 出场区间，按盈亏着色并带有方向标记。</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`}</code></pre>

<h2>持仓标签占位符</h2>
<p>
  自定义每个持仓在图表上的标签。<code>positionLabel</code> 接受一个
  模板字符串，或一个返回字符串的函数。
</p>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  可用的占位符：
  <code>{'{side}'}</code>、<code>{'{qty}'}</code>、<code>{'{openQty}'}</code>、
  <code>{'{closedQty}'}</code>、<code>{'{entry}'}</code>、<code>{'{price}'}</code>、
  <code>{'{pnl}'}</code>、<code>{'{pnlPct}'}</code>、<code>{'{pnlSign}'}</code>。
</p>

<h2>盈亏渐变色阶</h2>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`}</code></pre>
