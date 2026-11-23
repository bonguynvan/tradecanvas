<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Moving to 3.0 — TradeCanvas docs</title>
  <meta name="description" content="What changes for your code between TradeCanvas 2.x and 3.0: each behaviour that changed and the option that keeps the old one. 3.0 is in development on its own branch." />
</svelte:head>

<h1>Moving to 3.0</h1>
<p>
  3.0 is in development on the <code>3.0</code> branch: it is not on npm yet, and this page grows with it. It lists
  each change that can break code written for 2.x and what to do about it. For 1.x to 2.0, see
  <a href={href('/docs/migration')}>Moving to 2.0</a>.
</p>

<h2 id="behaviour">Behaviour that changed</h2>

<h3 id="brackets">A confirmed bracket goes to the execution adapter</h3>
<p>
  With an execution adapter connected (<code>chart.connectExecution(adapter)</code>), a confirmed bracket is now
  sent to it as one order: the entry with its quantity, its stop-loss and its take-profit. In 2.x it stayed the
  <code>bracketPlace</code> event unless the adapter was connected with <code>brackets: 'place'</code>, and the
  chart warned once in the console that it was not sent.
</p>
<ul>
  <li>
    <strong>Your code places the event's bracket itself.</strong> Connect with <code>brackets: 'event'</code>, or
    the bracket is placed twice: once by the chart and once by you.
  </li>
  <li>
    <strong>You passed <code>brackets: 'place'</code>.</strong> Nothing to do; the option can go.
  </li>
  <li>
    <strong>No adapter connected.</strong> Nothing changes: the bracket is the <code>bracketPlace</code> event.
  </li>
</ul>
<pre><code>{`// 2.x: an event, unless asked            // 3.0: an order, unless asked
chart.connectExecution(broker)             chart.connectExecution(broker, { brackets: 'event' })
chart.connectExecution(broker, { brackets: 'place' })   →   chart.connectExecution(broker)`}</code></pre>
<p>
  A bracket is sent with the quantity it is sized with. One with none is not confirmed: it stays on the chart, and
  <code>executionError</code> says so (<code>reason: 'noQuantity'</code>). The widget's bracket bar now has a
  quantity field, so the brackets its toolbar starts have one; a bracket your code starts takes a size as the
  third argument (see <a href={href('/docs/trading')}>Trading</a>):
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // the quantity that loses 50 at the stop`}</code></pre>

<h3 id="trade-buttons">Sell and Buy show on the chart with an execution adapter</h3>
<p>
  With an execution adapter connected and the order ticket on, the widget now shows Sell and Buy under the
  chart's legend. A host that connects an adapter only to draw its orders and positions turns them off:
</p>
<pre><code>{`new ChartWidget(el, { features: { tradeButtons: false } });`}</code></pre>
<p>
  With <code>orderTicket</code> off, or with no adapter, they never show. A host that turns every order switch
  off by name has one more to name: <code>tradeButtons</code> is new, and on unless set.
</p>

<h3 id="stop-limit">The paper account fills a stop-limit within its limit</h3>
<p>
  <code>PaperExecutionAdapter</code> filled a <code>stopLimit</code> order at its stop, as a stop order. It now
  makes it a limit order at its <code>price</code> once the stop is reached: the order stays working (its type
  reads <code>'limit'</code>) until the price is within the limit. A test that expected a position as soon as the
  stop was reached moves the price within the limit first, or places a <code>'stop'</code> order.
</p>

<h3 id="hand-prices">A price set by hand is on the market's grid</h3>
<p>
  <code>orderModify</code>, <code>positionModify</code>, <code>bracketPlace</code>, the <code>orderPlace</code> of a draft order or of the
  right-click menu, <code>priceAxisAdd</code> and <code>chartContextMenu</code> carried the price under the pointer as a pixel gives it
  (<code>62549.71592675613</code>). They now carry it on the market's price step, else to the decimals the price axis
  shows: what <code>chart.roundPrice</code> gives. A bracket and a draft order start on the grid too, whatever price they are started at, and an alert dragged lands on it. A line let go on the step it was on reports nothing. Code that rounded
  these itself can stop.
  On a market with a ceiling and a floor for the day, an order's own price is kept inside them too: dragged past one, it is reported at it.
</p>

<h3 id="finger">Under a finger, no control is smaller than 32 px</h3>
<p>
  On a device whose main pointer is coarse (a phone, a tablet), the widget's controls are now 32 px each way at
  least, in every look and <code>density</code>: a <code>compact</code> widget on a tablet no longer has 24 px
  buttons, and each row of the indicator legend is 32 px tall where it was 20. Under a mouse the drawing is as it
  was and only what a press takes changes: 20 px each way at least. A page that measured the widget's parts on a
  touch screen (a legend's height, a dialog's) reads larger numbers.
</p>

<h3 id="order-answer">An order from the ticket waits for the adapter's answer</h3>
<p>
  With an execution adapter connected, the order ticket no longer shuts as it places: it waits until the adapter's
  <code>placeOrder</code> resolves (it shuts) or rejects (it stays, and says why). An adapter whose
  <code>placeOrder</code> never settles leaves the ticket waiting: resolve with the order, or reject with the reason.
  Three more things changed with it. Every <code>orderPlace</code> payload now carries a <code>clientOrderId</code>, and
  <code>placeOrderIntent</code> returns the order as sent (it returned nothing). A market order from the ticket carries
  the ask for a Buy and the bid for a Sell as its <code>price</code>, where the feed gives both (it was the last price).
  And an order asked for in one press, from the right-click menu or the depth ladder, is for the market's lot where it
  has one (it was for 1, and the ladder's had no quantity).
</p>

<h3 id="hold-tooltip">A press held on the chart shows the price popup</h3>
<p>
  In <code>ChartWidget</code>, a mouse press held still on the plot for half a second shows the floating OHLCV tooltip
  for the bar under the pointer, until the button is let go: the tooltip follows the pointer and the chart does not pan
  meanwhile. A press held that long is therefore no longer a click, nor the start of a pan. The widget's
  <code>crosshairTooltip</code> feature is now <code>'hold'</code> where it was <code>false</code>: pass
  <code>{`chartOptions: { features: { crosshairTooltip: false } }`}</code> for no popup, as before, or <code>true</code>
  for one under a pointer that hovers. The headless <code>Chart</code> is not changed: its tooltip follows the pointer
  unless told otherwise, and takes <code>'hold'</code> too.
</p>

<h2 id="types">Types that grew</h2>
<p>
  <code>TimeInForce</code> is now <code>'gtc' | 'day' | 'gtd' | 'ioc' | 'fok'</code>. Code that handles every
  member (a <code>switch</code> with no default, a <code>Record&lt;TimeInForce, …&gt;</code>) needs the three new
  ones; an execution adapter of your own may refuse those it does not take.
</p>
<p>
  <code>FillReason</code> has <code>'liquidation'</code> too, for a position the paper account closed in a
  stop-out, and <code>ExecutionEventType</code> has <code>'marginCall'</code>. Neither happens unless the paper
  account is given <code>stopOutLevel</code> or <code>marginCallLevel</code>, but code that handles every member
  needs them.
</p>

<h2 id="unchanged">Not changed</h2>
<ul>
  <li>Data, saved layouts and settings from 2.x load as before.</li>
  <li>Indicators, drawings, themes and style keys keep their names.</li>
</ul>
