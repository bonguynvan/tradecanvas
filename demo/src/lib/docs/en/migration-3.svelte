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

<h2 id="unchanged">Not changed</h2>
<ul>
  <li>Data, saved layouts and settings from 2.x load as before.</li>
  <li>Indicators, drawings, themes and style keys keep their names.</li>
</ul>
