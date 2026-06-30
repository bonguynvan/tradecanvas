<svelte:head>
  <title>Trading overlay — TradeCanvas docs</title>
  <meta name="description" content="Render positions, orders, signal markers, and trade zones directly on the chart with TradeCanvas's trading overlay." />
</svelte:head>

<h1>Trading overlay</h1>
<p>
  Render positions, orders, signal markers, and trade zones directly on the chart.
  Designed to integrate with both manual and algorithmic trading flows.
</p>

<h2>Disabling trading</h2>
<p>
  Trading is opt-out, not opt-in. Projects that don't need trading affordances
  have two off-switches:
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay, no menu)
new Chart(host, { features: { trading: false } })

// Keep positions and orders visible, but remove the right-click order menu
new Chart(host, { features: { tradingContextMenu: false } })`}</code></pre>

<p>
  With either flag set, native browser right-click works on the chart as expected
  (previously the custom menu suppressed it unconditionally — fixed in 0.8.1).
</p>

<h2>Positions</h2>
<pre><code>{`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`}</code></pre>

<h2>Orders</h2>
<pre><code>{`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`}</code></pre>

<p>Drag the price line to modify; subscribe via <code>chart.on('orderModify', ...)</code>.</p>

<h2>Live execution (connect an adapter)</h2>
<p>
  By default the chart <em>emits</em> order/position intents (<code>orderPlace</code>,
  <code>orderModify</code>, <code>orderCancel</code>, <code>positionModify</code>,
  <code>positionClose</code>) for your backend — it never trades itself. Connect an
  <code>ExecutionAdapter</code> and the chart instead routes those intents into the
  adapter and renders the authoritative orders/positions it emits back (the adapter is
  the single source of truth).
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))
// chart.disconnectExecution()`}</code></pre>
<p>
  Implement <code>ExecutionAdapter</code> (it mirrors <code>DataAdapter</code>) to wire a
  real broker / OMS: <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, plus <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> events.
  <code>PaperExecutionAdapter</code> is a virtual-fill sandbox for demos and tests.
</p>

<h2>Drag-to-create orders</h2>
<p>
  Start a single draggable order line, drag it to a price, and confirm — the order type
  (limit vs stop) is inferred from where you drop it relative to the current price. Pairs
  with <code>connectExecution</code> so a confirmed draft fills immediately.
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>Bracket orders (drag to place)</h2>
<p>
  Start a draggable bracket — entry plus stop-loss and take-profit zones — then
  drag the three lines to tune entry, risk, and reward. Confirm with
  <kbd>Enter</kbd> (or the Place button), cancel with <kbd>Esc</kbd>. In the
  widget, the green/red toolbar arrows start a long/short bracket. The chart
  emits a single <code>bracketPlace</code> event for your backend to act on —
  it never places orders itself.
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, riskReward } = e.payload
  // submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

chart.confirmBracket()  // same as Enter
chart.cancelBracket()   // same as Esc`}</code></pre>

<h2>Depth ladder (click to trade)</h2>
<p>
  An opt-in depth-of-market ladder renders the order book as price rows with
  bid/ask size columns — click an ask cell to buy, a bid cell to sell at that
  price. Enable with <code>depthLadder: true</code> and feed the book via
  <code>widget.setDepth</code>; clicks emit <code>orderPlace</code> intents for
  your OMS (the chart never trades itself). The same data also drives the
  on-chart depth overlay.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>Liquidity heatmap</h2>
<p>
  Accumulate order-book snapshots into a heatmap behind the candles — each
  snapshot is a vertical strip where resting size lights up per price level
  (bids green, asks red). Liquidity walls that persist over time stand out.
  Toggle from the settings sheet (or <code>chart.setDepthHeatmapVisible</code>);
  <code>widget.setDepth</code> records a snapshot on every book update.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()`}</code></pre>

<h2>Signal markers</h2>
<p>Bot or signal-trading integrations can place directional arrows on the overlay.</p>
<pre><code>{`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})`}</code></pre>

<h2>Trade zones</h2>
<p>Visualize entry → exit rectangles with P&amp;L coloring and direction badges.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`}</code></pre>

<h2>Position label tokens</h2>
<p>
  Customize the on-chart label per position. <code>positionLabel</code> accepts a
  template string or a function returning a string.
</p>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  Available tokens:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>P&amp;L gradient stops</h2>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`}</code></pre>
