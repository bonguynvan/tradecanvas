import{a as C,f}from"../chunks/D1Xo73DX.js";import"../chunks/BMDqXj-z.js";import{s as e,f as S,e as M,c as t,$ as Q,r as n,n as D}from"../chunks/Bfa79lMJ.js";import{h as O}from"../chunks/DC6RaQJL.js";var R=f(`<meta name="description" content="Render positions, orders, signal markers, and trade zones directly on the chart with TradeCanvas's trading overlay."/>`),W=f(`<h1>Trading overlay</h1> <p>Render positions, orders, signal markers, and trade zones directly on the chart.
  Designed to integrate with both manual and algorithmic trading flows.</p> <h2>Positions</h2> <pre><code></code></pre> <h2>Orders</h2> <pre><code></code></pre> <p>Drag the price line to modify; subscribe via <code>chart.on('orderModify', ...)</code>.</p> <h2>Signal markers</h2> <p>Bot or signal-trading integrations can place directional arrows on the overlay.</p> <pre><code></code></pre> <h2>Trade zones</h2> <p>Visualize entry → exit rectangles with P&amp;L coloring and direction badges.</p> <pre><code></code></pre> <h2>Position label tokens</h2> <p>Customize the on-chart label per position. <code>positionLabel</code> accepts a
  template string or a function returning a string.</p> <pre><code></code></pre> <p>Available tokens: <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>, <code></code>.</p> <h2>P&amp;L gradient stops</h2> <pre><code></code></pre>`,1);function V(b){var s=W();O("xjy7x2",q=>{var A=R();M(()=>{Q.title="Trading overlay — TradeCanvas docs"}),C(q,A)});var o=e(S(s),6),u=t(o);u.textContent=`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`,n(o);var r=e(o,4),P=t(r);P.textContent=`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`,n(r);var a=e(r,8),T=t(a);T.textContent=`chart.addSignalMarker({
  id: 'sig-12',
  time: bar.time,
  price: bar.close,
  direction: 'long',
  confidence: 0.86,
  source: 'momentum-bot',
  label: 'EMA cross',
})`,n(a);var d=e(a,6),k=t(d);k.textContent=`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`,n(d);var i=e(d,6),w=t(i);w.textContent=`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`,n(i);var c=e(i,2),p=e(t(c));p.textContent="{side}";var l=e(p,2);l.textContent="{qty}";var h=e(l,2);h.textContent="{openQty}";var g=e(h,2);g.textContent="{closedQty}";var v=e(g,2);v.textContent="{entry}";var m=e(v,2);m.textContent="{price}";var _=e(m,2);_.textContent="{pnl}";var y=e(_,2);y.textContent="{pnlPct}";var z=e(y,2);z.textContent="{pnlSign}",D(),n(c);var x=e(c,4),L=t(x);L.textContent=`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`,n(x),C(b,s)}export{V as component};
