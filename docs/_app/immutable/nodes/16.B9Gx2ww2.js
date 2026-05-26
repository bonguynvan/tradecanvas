import{a as x,f as C}from"../chunks/DQd-QV4-.js";import"../chunks/BDwnSFXg.js";import{s as e,C as S,D as Q,c as t,$ as W,r as n,F as j}from"../chunks/Bdusip-H.js";import{h as O}from"../chunks/CsQmdBNd.js";var R=C(`<meta name="description" content="Render positions, orders, signal markers, and trade zones directly on the chart with TradeCanvas's trading overlay."/>`),$=C(`<h1>Trading overlay</h1> <p>Render positions, orders, signal markers, and trade zones directly on the chart.
  Designed to integrate with both manual and algorithmic trading flows.</p> <h2>Disabling trading</h2> <p>Trading is opt-out, not opt-in. Projects that don't need trading affordances
  have two off-switches:</p> <pre><code></code></pre> <p>With either flag set, native browser right-click works on the chart as expected
  (previously the custom menu suppressed it unconditionally — fixed in 0.8.1).</p> <h2>Positions</h2> <pre><code></code></pre> <h2>Orders</h2> <pre><code></code></pre> <p>Drag the price line to modify; subscribe via <code>chart.on('orderModify', ...)</code>.</p> <h2>Signal markers</h2> <p>Bot or signal-trading integrations can place directional arrows on the overlay.</p> <pre><code></code></pre> <h2>Trade zones</h2> <p>Visualize entry → exit rectangles with P&amp;L coloring and direction badges.</p> <pre><code></code></pre> <h2>Position label tokens</h2> <p>Customize the on-chart label per position. <code>positionLabel</code> accepts a
  template string or a function returning a string.</p> <pre><code></code></pre> <p>Available tokens: <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>.</p> <h2>P&amp;L gradient stops</h2> <pre><code></code></pre>`,1);function V(b){var p=$();O("xjy7x2",A=>{var M=R();Q(()=>{W.title="Trading overlay — TradeCanvas docs"}),x(A,M)});var o=e(S(p),8),P=t(o);P.textContent=`// Drop the entire trading subsystem (no orders, no positions, no overlay, no menu)
new Chart(host, { features: { trading: false } })

// Keep positions and orders visible, but remove the right-click order menu
new Chart(host, { features: { tradingContextMenu: false } })`,n(o);var r=e(o,6),w=t(r);w.textContent=`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`,n(r);var a=e(r,4),k=t(a);k.textContent=`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`,n(a);var d=e(a,8),T=t(d);T.textContent=`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})`,n(d);var i=e(d,6),z=t(i);z.textContent=`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`,n(i);var c=e(i,6),D=t(c);D.textContent=`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`,n(c);var s=e(c,2),l=e(t(s));l.textContent="{side}";var h=e(l,2);h.textContent="{qty}";var g=e(h,2);g.textContent="{openQty}";var v=e(g,2);v.textContent="{closedQty}";var m=e(v,2);m.textContent="{entry}";var _=e(m,2);_.textContent="{price}";var u=e(_,2);u.textContent="{pnl}";var f=e(u,2);f.textContent="{pnlPct}";var L=e(f,2);L.textContent="{pnlSign}",j(),n(s);var y=e(s,4),q=t(y);q.textContent=`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`,n(y),x(b,p)}export{V as component};
