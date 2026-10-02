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
})`}</code></pre>

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
