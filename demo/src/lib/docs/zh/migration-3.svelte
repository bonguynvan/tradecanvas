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
  括号单按其规模对应的数量发送。没有数量的括号单不会被发送，<code>executionError</code> 会说明原因
  （<code>reason: 'noQuantity'</code>）。组件的括号单操作栏现在有数量输入框，因此从工具栏开始的括号单都带有数量；
  由你的代码开始的括号单通过第三个参数指定规模（见 <a href={href('/docs/trading')}>交易</a>）：
</p>
<pre><code>{`chart.startBracket('buy', undefined, { quantity: 2 })
chart.startBracket('buy', undefined, { risk: 50 })   // 在止损处亏损 50 的数量`}</code></pre>

<h2 id="unchanged">没有变化的部分</h2>
<ul>
  <li>数据、2.x 保存的布局和设置照常加载。</li>
  <li>指标、绘图、主题和样式键的名称保持不变。</li>
</ul>
