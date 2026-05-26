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
