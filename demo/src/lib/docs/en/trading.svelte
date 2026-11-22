<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

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
  The trading overlay is on by default; the right-click order menu is not (since 1.3).
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  Without the menu, native browser right-click works on the chart as expected.
</p>

<h2>Positions</h2>
<pre><code>{`chart.setPositions([{
  id: 'pos-1',
  side: 'buy',
  entryPrice: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
}])`}</code></pre>

<p>
  Each line has a tag at its right end, by the price axis. The entry's gives the quantity, the side
  and the open profit or loss, then <strong>⇅</strong> and <strong>×</strong>; the stop's and the target's say
  what the position would make or lose there. Every price is on the axis too. Tags that would cover each other
  stand side by side, and the badges on the axis move apart. Drag a stop or a target by its line or by its tag.
</p>
<p>
  A position with no stop-loss or no take-profit has an <strong>SL</strong> or a <strong>TP</strong> button on its
  entry's tag. Press it and drag the new line where you want it, or just click to set it where it starts. A stop
  starts 1% of the entry away and a target at twice the stop's distance, as a bracket does, and both start at
  least 1% beyond the price now, so neither is hit the moment it is set. Letting go sends
  <code>positionModify</code>, as dragging a stop does, so a connected execution adapter applies it.
  <code>lineButtons: {'{'} addStops: false {'}'}</code> leaves the buttons out.
</p>
<p>
  The positions, the orders and their fills can be hidden, and their lines locked. Hidden, none is drawn and none
  can be pressed; they are still kept and still follow the execution adapter, and a bracket or an order being
  placed still shows. Locked, no line or tag of theirs can be dragged, and a position offers no SL or TP to drag
  out; their buttons (close, cancel, reverse, trail, remove a stop) still act. In the widget, the hide and lock
  buttons' menus on the drawing sidebar do it.
</p>
<pre><code>{`chart.setTradingVisible(false)   // isTradingVisible()
chart.setTradingLocked(true)     // isTradingLocked()
chart.setIndicatorsVisible(ids, false)   // several indicators at once, one undo step`}</code></pre>

<h2>Orders</h2>
<pre><code>{`chart.setOrders([{
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
  stopLoss: 66_000,      // dotted until it fills
  takeProfit: 64_500,
}])`}</code></pre>

<p>
  The order's tag gives its quantity and its kind (<code>0.25</code>, <code>Sell limit</code>), then
  <strong>×</strong> to cancel it; its tag on the price axis carries the price, written as the axis writes it.
  An order that opens with a stop and a target shows them as dotted lines, with what they would make. Drag the
  line, or its tag, to modify; subscribe via <code>chart.on('orderModify', ...)</code>.
</p>

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

chart.on('executionError', (e) => toast(e.payload.message))   // e.payload.command: the intent that failed
// A confirmed bracket goes to it too: see Bracket orders
// chart.disconnectExecution()`}</code></pre>
<p>
  Implement <code>ExecutionAdapter</code> (it mirrors <code>DataAdapter</code>) to wire a
  real broker / OMS: <code>placeOrder</code>, <code>modifyOrder</code>, <code>cancelOrder</code>,
  <code>modifyPosition</code>, <code>closePosition</code>, plus <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> events.
  <code>PaperExecutionAdapter</code> is a virtual-fill sandbox for demos and tests.
</p>

<h3 id="order-kinds">Orders that work together, and for how long</h3>
<p>
  An order's intent (<code>chart.placeOrderIntent</code>, the adapter's <code>placeOrder</code>) says more than
  its price:
</p>
<ul>
  <li>
    <strong><code>ocoGroup</code></strong>: a name shared by orders of which one cancels the others, as a target
    and a stop for the same exit. When one fills, the rest of the group are cancelled. Their tags on the chart read
    OCO.
  </li>
  <li>
    <strong><code>timeInForce</code></strong>: <code>'gtc'</code> (good till cancelled), <code>'day'</code>,
    <code>'gtd'</code> (good till a date: <code>expireTime</code>, in milliseconds), and <code>'ioc'</code> or
    <code>'fok'</code> for an order that fills at once or not at all.
  </li>
  <li>
    <strong><code>type: 'stopLimit'</code></strong>: <code>stopPrice</code> is where it starts working and
    <code>price</code> the limit it then works at. Its line on the chart is its limit: on the paper account,
    dragging it moves the stop by as much.
  </li>
</ul>
<pre><code>{`// A target and a stop for one exit: whichever fills first takes the other off
chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 66_000, quantity: 1, ocoGroup: 'exit' })
chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 63_000, stopPrice: 63_000, quantity: 1, ocoGroup: 'exit' })

// Works until midnight UTC
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1, timeInForce: 'gtd', expireTime: Date.UTC(2027, 0, 1) })`}</code></pre>
<p>
  The paper account does what a broker would with each. Of a group, the first to fill cancels the rest. A
  stop-limit becomes a limit order at its <code>price</code> once the price reaches its stop, and fills only
  within that limit (at the price that reached the stop, when that is within it). A <code>'gtd'</code> order
  comes off when the time given with <code>setMarkPrice</code> reaches its date (the clock's, with no time
  given), and one whose date has passed is refused. An <code>'ioc'</code> or <code>'fok'</code> limit fills at
  once, at the price there is, when that is within it, and is refused when it is not (<code>executionError</code>). The paper market has no size of its own, so the two are the
  same there, unless it is given one (<a href="#partial-fills">below</a>). The widget's order ticket offers both for a limit order, and its account panel writes OCO beside
  an order of a group and a dated order's date. It leaves <code>'day'</code> to the app, which knows when its market's day ends.
</p>
<p>
  <strong>One net position.</strong> By default the paper account opens a position for each filled order, a buy
  beside a sell (<code>positions: 'hedge'</code>). <code>{`new PaperExecutionAdapter({ positions: 'net' })`}</code>
  keeps one position, as a futures account does: a fill the same way adds to it at the average of their prices, a
  fill the other way takes from it and realises that part (<code>pnl</code> on the fill), and a larger one turns
  it round, the rest opening at the fill's price. A fill that adds to it brings its stops when it has them; one
  that takes from it leaves the position's stops as they are; one that turns it round brings its own.
</p>
<h3 id="partial-fills">Orders that fill in parts</h3>
<p>
  A limit order rests in the market and is filled as others come to it, often a part at a time. Given a
  <code>fillSize</code>, the paper account fills no more than that of a limit order at one price: a larger one
  fills a part at each price that reaches its limit (each <code>setMarkPrice</code>), and works on for the
  rest. The order stays in <code>chart.getOrders()</code> with its <code>filledQuantity</code>; each part is a
  fill of its own (<code>executionFill</code>), whose <code>remaining</code> is what it left working, and the
  last part takes the order off. The chart writes what has filled on the order's tag (<code>2/5</code>), and
  the widget's account panel in its row; the tags on the order's stop and target say what the rest of it would
  make, since what has filled is a position with tags of its own.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({ fillSize: 2 })   // two of a limit order at each price
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 })

chart.on('executionFill', (e) => console.log(e.payload.quantity, e.payload.remaining))   // 2 3, then 2 1, then 1 undefined
chart.on('ordersChange', (e) => console.log(e.payload.orders[0]?.filledQuantity))        // 2, 4, then no order`}</code></pre>
<p>
  The parts of one order build one position, at the average of their prices; on a net account they add to its
  position, or take from it. The position has the order's stop-loss, take-profit and levels from its first
  part, and a later part brings them no second time: a stop you moved since, or took off, stays as you left
  it. A part that fills after its position was closed opens another, with the order's stops again. A level is
  a size of the whole plan, so the first parts may not fill it: it takes no more than is open. A stop-limit
  fills in parts too, once it works as a limit. A part pays its own commission, and one the account can no longer carry cancels what is left of the
  order (<code>executionError</code>). What is left can be moved, cancelled, or end at its date, and the first
  part cancels the rest of the order's group. Of an <code>'ioc'</code> order what fills at once fills and the
  rest is dropped (the order that <code>placeOrder</code> gives back says how much: its
  <code>filledQuantity</code>; the chart and the widget say nothing of the dropped rest, and its fill is of
  less than was asked); a <code>'fok'</code> order larger than the size is refused. A market order and
  a stop fill whole, as do closes: the paper market takes them at the price there is, and models no slippage.
  An adapter of your own reports its broker's parts the same way: the order with its
  <code>filledQuantity</code> in <code>orders</code>, and a <code>fill</code> for each.
</p>

<h3 id="take-profit-levels">Taking profit in parts</h3>
<p>
  A position can be taken off in parts. <code>takeProfits</code> on an order's intent, or on a position
  (<code>chart.modifyPositionIntent</code>), is a list of levels, each a <code>price</code> and the
  <code>quantity</code> that closes there. As the price reaches a level, its part is closed at the level's price
  and the level goes; what the levels leave stays open for <code>takeProfit</code> to close, or the stop-loss.
  The stop-loss closes all that is left whatever levels were waiting, a level past the take-profit is never
  reached, and a level takes no more than is still open.
  The chart draws a line and a tag for each (TP1 is the nearest), with its part and what that would make, and
  the widget's account panel writes the nearest level and how many more there are.
</p>
<pre><code>{`chart.placeOrderIntent({
  side: 'buy', type: 'market', price: 64_000, quantity: 3,
  stopLoss: 63_000,
  takeProfits: [{ price: 65_000, quantity: 1 }, { price: 66_000, quantity: 1 }],   // a third at each
  takeProfit: 67_000,                                                              // the rest
})

chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: [{ price: 65_500, quantity: 2 }] })   // all of them, anew
chart.modifyPositionIntent({ positionId: 'pos-1', takeProfits: null })                               // none`}</code></pre>
<p>
  The paper account closes the parts (a fill each, with <code>reason: 'takeProfit'</code> and what it
  realised) and counts them in the position's <code>closedQuantity</code>. It takes only levels that are a
  profit from the entry, and on a net account an order that brings levels gives the position its levels, as it
  gives it its stops. TP1 on the chart is the nearest level still waiting. An adapter of your own reports its
  broker's. In the widget's order ticket, a take-profit can be reached in one, two or three
  <strong>Targets</strong>: with more than one, an even part of the quantity comes off at each target on the
  way, evenly spaced from the entry, and the take-profit closes what is left. The ticket lists what comes off
  where before it is placed.
</p>
<p>
  A position's level is dragged on the chart as its stop-loss and take-profit are, by its line or by its tag:
  the line follows the pointer, with where it was left faint behind it, and letting go raises
  <code>positionModify</code> with all the position's <code>takeProfits</code>, that one moved, the nearest
  first. A level is a profit, so one let go at the entry or past it the losing way goes back where it was, and
  nothing is raised. Of two levels within reach of a press the nearer is taken; an order's line, the stop-loss
  or the take-profit at the same place is taken before a level, which its tag still moves. The levels of an
  order that still waits are a plan the order brings and are not handles; nor is any while the lines are
  locked.
</p>

<h3 id="account">An account with money</h3>
<p>
  Given a <code>balance</code>, the paper account keeps its money as a broker does. What a close makes or loses
  goes into the balance, open positions hold margin (their value, over <code>leverage</code>), and each fill
  pays its <code>commission</code>. An order the free margin cannot carry is refused
  (<code>executionError</code>), and so is a reverse; a waiting order whose money has gone by the time its
  price comes is cancelled, which <code>executionError</code> says too. <code>multiplier</code> is what a move
  of one in price is worth for one unit, for a futures contract: give it the market's
  <code>contractMultiplier</code>, which the widget's panel counts the positions' profit by. The account is told
  before the fill that changed it, so <code>chart.getAccount()</code> in an <code>executionFill</code> listener
  reads it as the fill left it. Without a <code>balance</code> there is no account, and any order is taken, as
  before.
</p>
<p>
  While positions hold margin the account says how its equity stands to it: <code>marginLevel</code>, the
  equity as a part of the margin used (<code>1.5</code> is 150%). Two levels act on it, each left out unless
  given. Under <code>marginCallLevel</code> the account warns once, the <code>marginCall</code> event, and
  again only after the equity has been back over the level; it closes nothing. Under
  <code>stopOutLevel</code> it closes positions at the price there is, the one losing most first, until it is
  back over the level or holds none: closing one frees its margin, which may be enough. Each is a fill with
  <code>reason: 'liquidation'</code>. Both are counted as each price comes, after the orders and the stops it
  reached, so a stop-loss closes its position first, and a fill that brings the equity under a level is acted
  on at the next price. A position's margin is held at its entry's price, so the level moves with the equity
  alone. A stop-out leaves the orders that wait working: one whose money has gone is cancelled when its price
  comes. With neither level, nothing is closed and a balance can go below zero.
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({
  balance: 10_000,
  leverage: 10,                                 // a position holds a tenth of its value
  commission: { rate: 0.0004, min: 0.1 },       // 0.04% of each fill's value, no less than 0.1; perUnit: an amount a unit
  positions: 'net',
  marginCallLevel: 1,                           // warn when the equity falls under the margin held
  stopOutLevel: 0.5,                            // close positions when it falls under half of it
})
chart.connectExecution(broker)

chart.getAccount()   // { balance, equity, unrealisedPnl, realisedPnl, marginUsed, freeMargin, commission, marginLevel? } or null
chart.on('accountChange', (e) => console.log(e.payload.account?.equity))
chart.on('executionFill', (e) => console.log(e.payload.commission, e.payload.reason))   // 'liquidation' for a stop-out
chart.on('marginCall', (e) => warn(e.payload))   // { marginLevel: 0.9, level: 1, equity, marginUsed }`}</code></pre>
<p>
  The widget's account panel heads its totals with the balance, the equity and the free margin, and the margin
  level while there is one; it shows a margin call as a warning, and names a stop-out's fill in its history. An
  adapter of your own does the same by implementing <code>getAccount()</code> and emitting <code>account</code>
  with an <code>AccountSummary</code> as its money changes, and <code>marginCall</code> when its broker warns.
</p>

<h2>Act on orders and positions from the chart</h2>
<p>
  Order and position lines carry small buttons at their right end: <strong>×</strong>
  cancels an order or closes a position, <strong>⇅</strong> reverses a position, and an
  × on a stop-loss or take-profit line removes it. They raise the same intents as the
  API (<code>orderCancel</code>, <code>positionClose</code>, <code>positionReverse</code>,
  <code>positionModify</code> with <code>null</code>), so a connected adapter acts on them
  and a host without one gets the events. A button acts when it is released over it:
  a press that slides off does nothing. Turn any of them off with
  <code>lineButtons</code> in <code>setTradingConfig</code>.
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop
chart.modifyPositionIntent({ positionId: 'pos-1', trailingStop: 150 }) // the stop trails the price by 150; null ends the trail`}</code></pre>
<p>
  An adapter that can reverse in one step implements <code>reversePosition</code>;
  without it the chart closes the position and sends a market order the other way.
  Orders take a <code>stopLoss</code>, a <code>takeProfit</code> and a
  trailing distance that carry over to the position they open.
</p>
<p>
  <strong>For adapter authors:</strong> in <code>PositionModifyIntent</code>,
  <code>stopLoss: null</code> (or <code>takeProfit: null</code>) means remove it, while a
  missing field means leave it as it is. Code written as
  <code>intent.stopLoss ?? position.stopLoss</code> would keep a stop the user removed.
</p>
<p>
  A <strong>trailing stop</strong> is a stop-loss that follows the price: a position's <code>trailingStop</code> is the distance, in price, its stop keeps behind the best price, up for a long and down for a short, and it never moves back. On the chart its tag reads TSL. A button on the stop's tag starts a trail at the stop's distance from the price now, or ends one; <code>lineButtons: {'{'} trailStop: false {'}'}</code> hides it. The paper account moves the stop itself. An adapter for a broker passes <code>trailingStop</code> on from <code>modifyPosition</code> (a number starts the trail, <code>null</code> ends it and leaves the stop where it is) and reports the position's <code>stopLoss</code> as the broker moves it. An order carries it too: <code>trailingStop</code> on an order makes the position it opens trail from the start, and a waiting order's stop reads TSL. In the order ticket it is the Trailing stop switch under the stop-loss, which trails at the stop's distance from the entry. The trail button on a stop's tag is filled while its stop is trailing.
</p>

<h2>Fills on the chart</h2>
<p>
  Each fill shows as a small mark on its bar: solid where it opened a position,
  hollow where it closed one. The chart records the fills an adapter reports and
  emits <code>executionFill</code> with why it happened (<code>'order'</code>,
  <code>'close'</code>, <code>'reverse'</code>, <code>'stopLoss'</code>,
  <code>'takeProfit'</code>) and the profit or loss it realised.
</p>
<pre><code>{`chart.on('executionFill', (e) => {
  const { side, price, quantity, reason, pnl } = e.payload
})

chart.addFill({ orderId: 'o-7', side: 'buy', price: 64_150, quantity: 1, time: Date.now() })
chart.getFills()        // the latest 1000
chart.getRealisedPnl()  // every fill's P&L since the last clearFills
chart.clearFills()
chart.setTradingConfig({ fillMarks: false })  // no marks`}</code></pre>

<h2>Right-click menus and the “+” by the price axis</h2>
<p>
  A right-click on the chart emits <code>chartContextMenu</code> with the part that was
  clicked (<code>'plot'</code>, <code>'pane'</code>, <code>'priceAxis'</code> or
  <code>'timeAxis'</code>) and the price and time there. With
  <code>features.priceAxisAddButton</code> a “+” follows the crosshair along the price
  axis; pressing it emits <code>priceAxisAdd</code> with its price. While it shows, the order
  and position tags end left of it, so it never covers their buttons.
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget builds its menus on these. Right-click the plot for an alert, a buy and a
  sell at that price (a limit on the side of the market where it would wait, a stop on
  the other), an order ticket and a horizontal line; then reset view, paste the drawings
  you copied, hide or remove the drawings, remove the indicators (a comparison with
  another symbol stays), export the data, and the settings.
</p>
<p>
  Right-click the price axis for its reset, auto scale, the inverted and the left-hand
  scale, one of its four modes (regular, logarithmic, percentage, indexed to 100), the
  labels on it and the lines across the chart in two submenus, an alert at the price, and
  the settings open on their Scales tab. The time axis has its reset, go to date and the
  time zone.
</p>
<p>
  An entry shows the widget's shortcut for it while that key is on: <kbd>Alt</kbd> +
  <kbd>R</kbd> reset view, <kbd>Alt</kbd> + <kbd>I</kbd> invert the scale, <kbd>Alt</kbd> +
  <kbd>G</kbd> go to date. A submenu opens on a click, <kbd>Enter</kbd>, <kbd>→</kbd> or a
  pointer resting on it, and <kbd>←</kbd> or <kbd>Escape</kbd> goes back; on a phone, where
  menus open from the bottom, its first row leads back. Add your own entries with
  <code>chartMenuItems</code> (see the <a href={href('/docs/api')}>API reference</a>).
</p>

<h2>Order ticket and account panel (ChartWidget)</h2>
<p>
  <strong>Account</strong> in the toolbar's <strong>Trade</strong> menu opens an account panel under the chart: open positions
  with their profit and loss, working orders, the fills so far with the P&amp;L
  realised, and a log of what happened to the orders. Each row closes, reverses or cancels. <strong>New order</strong> opens an
  order ticket: buy or sell, market, limit or stop, quantity, price, an optional
  stop-loss and take-profit, and time in force. It checks the order as you fill it in
  (a buy limit goes below the market, a stop-loss on the losing side of the entry…)
  and shows the reward:risk. Placing it sends an <code>orderPlace</code> intent. With a
  market set (<code>chart.setMarket</code>), it also keeps its prices on the market's step and
  the order's price inside the day's ceiling and floor, starts at one lot, and takes whole lots above one
  (fewer shares are an odd-lot order of their own).
</p>
<p>
  The ticket names the symbol beside its title. The type and the time in force are choices in a row
  (the arrow keys move between them); − and + move the quantity by a lot and a price by the market's step, and a
  price from the chart starts rounded to that step. A stop-loss or a take-profit, switched on, says how far it is from
  the entry in percent and what it would make or lose; under them a receipt sums the order up: its value, its risk,
  its reward and the one over the other. Switching between buy and sell keeps a waiting order where it was put (a buy
  stop over the market becomes a sell limit), and Place takes the side's colour.
</p>
<p>
  In the widget, a selected Long/Short Position drawing offers <b>Create order</b> in its toolbar while trading is on. It opens this ticket filled from
  the drawing: its side, entry as the price, stop-loss and take-profit, and the
  quantity its risk buys, taken down to the decimals the drawing writes. The
  order type follows the entry against the market, and nothing is sent until
  Place.
</p>
<p>
  The account panel's head keeps the open P&amp;L and the P&amp;L realised in sight on every tab. Its figures are
  set right in the mono type, money to the price step's decimals in the number locale; on a phone each row is a card
  of named figures.
</p>
<p>
  <strong>The Log tab</strong> lists what happened to the orders, the newest first: each one placed, moved,
  cancelled or filled, and what the broker refused with its reason. The chart keeps it, for a chart of your own
  too: <code>chart.getActivityLog()</code> gives the latest 200 entries, oldest first, each
  <code>{`{ time, kind, orderId, side, type, quantity, price, reason, pnl, message }`}</code> with what its
  <code>kind</code> has (<code>'placed'</code>, <code>'moved'</code>, <code>'cancelled'</code>,
  <code>'filled'</code>, <code>'rejected'</code>). It is read from the orders, fills and errors the chart is told,
  by an execution adapter or by <code>setOrders</code> and <code>addFill</code>. The orders there when it began
  are not in it, nor those there when an adapter is connected or taken away, or (with no adapter) when the symbol
  changes: they are what is there, not orders placed. An order filled in part and then taken off is logged
  cancelled. <code>chart.clearActivityLog()</code> empties it.
</p>
<p>
  <strong>Sell and Buy on the chart.</strong> While an execution adapter is connected, the widget shows two
  buttons under the chart's legend, each with the price it would trade at: the best bid on Sell and the best ask
  on Buy with the spread between them (<code>chart.setBidAsk</code>, or a feed whose ticks carry them), else the
  last price on both, as on a replay or when the feed gives one side only. A press opens the order ticket on that
  side. <code>executionChange</code> says when an adapter is connected or taken away, <code>bidAskChange</code>
  when the bid and the ask change, and the <code>tradeButtons</code> switch turns the buttons off.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
  features: { tradeButtons: true },   // default: Sell and Buy under the legend, with a broker connected
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.

widget.getChart().getActivityLog().at(-1)   // { time, kind: 'filled', side: 'buy', quantity: 1, price: 64_000, reason: 'order' }`}</code></pre>
<p>
  Fill marks belong to the symbol on the chart: switching symbol in the widget starts
  the next one with none.
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
  emits a single <code>bracketPlace</code> event, and sends the bracket to a connected
  execution adapter (below); with none, the event is for your backend to act on.
</p>
<p>
  <strong>Its size.</strong> A bracket is for the quantity it is sized with. <code>{`{ quantity: 2 }`}</code> is
  that quantity. <code>{`{ risk: 50 }`}</code> is the money lost at the stop: the quantity is then 50 over the
  stop's distance from the entry (times <code>multiplier</code>, what a move of one in price is worth for one
  unit), rounded down to <code>quantityStep</code>, and follows the lines as they are dragged. The quantity is
  written on the entry's tag, and <code>bracketPlace</code> carries it. In the widget it is typed in a field
  on the bracket's bar, which starts at the quantity last typed, else at the market's lot, and
  <code>widget.startBracket(side, size)</code> takes a size too: a bracket sized by its risk has no field.
  <code>bracketQuantity(bracket, size)</code> is the same sum for your own code.
</p>
<p>
  With an execution adapter connected, the chart also sends a confirmed bracket to the
  adapter as one order: the entry, a limit when the price has to come back to it and a stop when it has to
  run on to it, its quantity, and its stop-loss and take-profit on it. Once the adapter took it, the chart
  sends <code>bracketOrder</code> with the order. If the adapter refuses it, it sends
  <code>executionError</code> with <code>command: 'bracketPlace'</code>. The widget says "placed" only then,
  and says why when it was refused. A bracket with no quantity is not confirmed, since no one saw a size to
  place: <code>confirmBracket()</code> returns false, and the bracket stays on the chart to be given one. One
  confirmed before the chart has a price to tell a limit entry from a stop is not sent.
  <code>executionError</code> gives the <code>reason</code> (<code>'noQuantity'</code>, <code>'noPrice'</code>),
  and the widget says so. An app that places the event's bracket itself connects with
  <code>brackets: 'event'</code>: the bracket then stays an event, and the widget says it was confirmed.
  Before 3.0 that was the default (see <a href={href('/docs/migration-3')}>Moving to 3.0</a>).
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price
chart.startBracket('buy', undefined, { quantity: 2 })                   // for two
chart.startBracket('buy', undefined, { risk: 50, quantityStep: 0.001 }) // for what loses 50 at the stop
chart.setBracketSize({ quantity: 3 })   // while it is placed
chart.getBracket()                      // { side, entry, stopLoss, takeProfit, quantity } or null

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, quantity, riskReward } = e.payload
  // with no adapter (or brackets: 'event'): submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

// The connected adapter places it
chart.connectExecution(broker)
chart.placesBrackets()   // true
chart.on('bracketOrder', (e) => console.log(e.payload.order.id))
// chart.connectExecution(broker, { brackets: 'event' })   // only the event: your code places it

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
<p>
  The ladder is a page of the dock beside the chart (a sheet on a phone): open it from the Trade menu, its rail
  button or <code>widget.openPanel('depthLadder')</code>, and take its rail button away with
  <code>dock.depthLadder: false</code>. Asks sit over bids with the spread between them, each size on a bar grown from
  the price; the rows where your working orders wait carry their quantity.
</p>
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })
widget.openPanel('depthLadder')   // a page of the dock; the Trade menu opens it too

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>Order book on the plot</h2>
<p>
  <code>features.depth</code> draws the order book on the plot, from the right edge, for a chart that only shows
  prices: it needs no orders and no trading UI, and works with <code>trading: false</code>. Feed it with
  <code>chart.setDepthData</code> (<code>widget.setDepth</code> does that too); the overlay is on once
  <code>features.depth</code> is, and <code>setDepthOverlay</code> changes how it looks.
</p>
<ul>
  <li><code>mode</code>: <code>'cumulative'</code> (default) adds each level to the ones nearer the market, so the bars grow away from it; <code>'level'</code> draws the size at each price alone, so a wall shows as one long bar.</li>
  <li><code>rowSize</code>: a bar's height in price. The levels are added up into rows that far apart, so a dense book under a coarse scale, or one with empty levels, still draws even bars (match it to your footprint's rows). <code>markBest</code> then lines the middle of the best rows.</li>
  <li><code>rowOrigin</code>: where the rows start, in price. Row k then runs from <code>rowOrigin + k × rowSize</code> to the next row's start, and a level on a row's start is in that row. A footprint whose cells start at multiples of its row size, each tick centred on its price, lines up with <code>rowOrigin: -tick / 2</code>. Without it each row is centred on a multiple of <code>rowSize</code>.</li>
  <li><code>markBest</code>: a line at the best bid and the best ask (<code>bestBidColor</code>, <code>bestAskColor</code>).</li>
  <li><code>maxWidth</code>: the longest bar in pixels (never more than the plot), <code>bidColor</code>, <code>askColor</code>.</li>
</ul>
<p>
  The bars sit over the newest candles. To make room, raise <code>rightMargin</code> and set <code>maxWidth</code>
  to about that many bars. With trading on, <code>{`setTradingConfig({ depthOverlay: { enabled: true } })`}</code> still turns it on as before.
</p>
<pre><code>{`const chart = new Chart(host, {
  features: { trading: false, depth: true },       // display only: no orders, no trading UI
  depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 },
  rightMargin: 14,                                  // empty slots past the newest bar, room for the bars
})
chart.setDepthData(orderBook)                       // { bids, asks }; null clears it
chart.setDepthOverlay({ mode: 'cumulative' })       // change the look later`}</code></pre>

<h2>Liquidity heatmap</h2>
<p>
  Accumulate order-book snapshots into a heatmap behind the candles — each
  snapshot is a vertical strip where resting size lights up per price level
  (bids green, asks red). Liquidity walls that persist over time stand out.
  Toggle from the settings sheet (or <code>chart.setDepthHeatmapVisible</code>);
  <code>widget.setDepth</code> records a snapshot on every book update.
  During a replay, a book recorded with no time belongs to the live series' last bar, the heatmap
  shows only the books of the bars the replay has shown, and the order book at the plot's edge,
  the live market's, is hidden until the replay ends.
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

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
})

// A marker under the pointer, and a click on one
chart.on('signalMarkerHover', (e) => showNote(e.payload.marker, e.payload.x, e.payload.y))  // marker null: off it
chart.on('signalMarkerClick', (e) => openSignal(e.payload.marker))`}</code></pre>
<p>
  ChartWidget shows a note by a marker under the pointer: its label and source, side,
  price, confidence and time.
</p>

<h2>Marks</h2>
<p>
  What happened at a time (a headline, an earnings date, a dividend, a split) as a small badge at
  the foot of the price pane, on the bar that holds its time. The pointer over a badge reads its
  title and text; badges that would overlap gather into one with a count. A replay shows each
  mark as it reaches it. Renko, Kagi, line break, point &amp; figure and range bars draw none: their
  bars are not times.
</p>
<pre><code>{`chart.setMarks([
  { id: 'q3', time: reportedAt, kind: 'earnings', title: 'Q3 earnings', text: 'EPS 1.42 vs 1.31 expected' },
  { id: 'div', time: exDate, kind: 'dividend', title: 'Dividend 0.24 a share' },
  { id: 'n1', time: publishedAt, kind: 'news', title: headline, text: source, url: 'https://example.com/story' },
])
const id = chart.addMark({ time: Date.now(), title: 'Trading halted', label: 'H', color: '#e5484d' })
chart.removeMark('div')
chart.getMarks()      // earliest first
chart.clearMarks()

chart.on('markClick', (e) => openStory(e.payload.marks))   // one mark, or the several a badge gathers
// a click on a badge is a markClick, not a click or a barClick
chart.on('markHover', (e) => e.payload.marks)              // null: the pointer left the badge
chart.on('marksChange', (e) => e.payload.count)

new Chart(host, { features: { marks: false } })            // or chart.setFeatures({ marks: false })`}</code></pre>
<p>
  <code>kind</code> picks the letter and the colour: <code>news</code> N, <code>earnings</code> E,
  <code>dividend</code> D, <code>split</code> S, and <code>event</code> (or none) i. <code>label</code>
  (one or two characters) and <code>color</code> replace them. A mark needs a <code>title</code> and
  a <code>time</code>; only http(s) links are kept; a chart keeps up to 2,000. Marks are the feed's,
  not the user's: <code>saveState</code> does not hold them, so set them again after a load.
</p>
<p>
  ChartWidget puts the symbol's headlines on the chart from its news source (<code>news</code>, or
  the adapter's <code>fetchNews</code>); <code>newsMarks: false</code> keeps them to the symbol info
  panel. A click on a mark opens its link in a new tab; on a badge of several, a list of them, newest
  first. The widget's <code>marks</code> feature switch hides every mark. Your own
  <code>setMarks</code> and <code>clearMarks</code> leave the widget's headlines on the chart.
</p>

<h2>Trade zones</h2>
<p>Visualize entry → exit rectangles with P&amp;L coloring and direction badges.</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  direction: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
})`}</code></pre>

<h2>Position label tokens</h2>
<p>
  Write a position's tag your way: <code>positionLabel</code> takes the place of the side and the profit
  after its quantity. It accepts a template string or a function returning a string.
</p>
<pre><code>{`chart.setTradingConfig({
  positionLabel: '{side} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  Available tokens:
  <code>{'{side}'}</code>, <code>{'{qty}'}</code>, <code>{'{openQty}'}</code>,
  <code>{'{closedQty}'}</code>, <code>{'{entry}'}</code>, <code>{'{price}'}</code>,
  <code>{'{pnl}'}</code>, <code>{'{pnlPct}'}</code>, <code>{'{pnlSign}'}</code>.
</p>

<h2>P&amp;L gradient stops</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  The open profit on the tag and the band to the price take the colour of the highest stop whose
  <code>pnl</code> is at or under the position's profit or loss, in money.
</p>
