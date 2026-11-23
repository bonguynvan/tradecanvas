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
  每条线在右端、靠近价格轴处有一个标签。开仓价的标签显示数量、方向和浮动盈亏，随后是 <strong>⇅</strong> 和
  <strong>×</strong>；止损和止盈的标签显示价格到达那里时持仓的盈亏。每个价格也都标在价格轴上。会互相遮挡的标签并排显示，
  轴上的价格标签也会自动错开。拖动止损或止盈的线或其标签即可修改。
</p>
<p>
  没有止损或没有止盈的持仓，其开仓价标签上有 <strong>SL</strong> 或 <strong>TP</strong> 按钮。按下它并把新线拖到想要的位置，
  或者只是点击，让它留在起始位置。与括号单一样，止损从距开仓价 1% 处开始，止盈位于止损距离的两倍处，并且两者都至少在当前价格
  之外 1% 开始，因此设置的那一刻都不会被触发。松开时会发出 <code>positionModify</code>，与拖动止损相同，由已连接的执行适配器应用。
  <code>lineButtons: {'{'} addStops: false {'}'}</code> 可去掉这些按钮。
  把一条线拖到某个价格时，十字光标不画水平线，也不在价格轴上写价格：这条线自己的标签已经写着价格。
  手动设定的价格始终落在市场的价格网格上：被拖动的订单、止损、止盈或分批止盈位，括号单和草稿订单的线，被拖动的提醒，以及右键点击或价格轴旁“+”给出的价格。价格取市场的最小变动价位（<code>setMarket</code>，或品种的 <code>minTick</code>），否则取价格轴显示的小数位数：即 <code>chart.roundPrice</code>。十字光标写出的指针处价格也落在同一网格上，所以它显示的就是旁边的“+”下单的价格。
  在有当日涨停价和跌停价的市场上（<code>setPriceLimits</code>），订单自身的价格也保持在其间：拖过界时订单的线停在涨停或跌停价上，括号单的入场价和草稿订单从界内开始并留在界内，菜单在界外不提供下单，盘口深度面板在界外也不会下单。持仓的止损、止盈和分批止盈位不受此限：它们不是当日的订单。
</p>
<p>
  持仓、订单及其成交可以隐藏，它们的线也可以锁定。隐藏时，它们都不绘制、也无法点按；但仍会保留并继续跟随执行适配器，
  正在下的括号单或订单仍会显示。锁定时，它们的线和标签都无法拖动，持仓也不再提供可拖出的 SL 或 TP；
  它们的按钮（平仓、撤单、反手、跟踪、移除止损）仍然可用。在组件中，由画线侧边栏上隐藏和锁定按钮的菜单完成这些操作。
</p>
<pre><code>{`chart.setTradingVisible(false)   // isTradingVisible()
chart.setTradingLocked(true)     // isTradingLocked()
chart.setIndicatorsVisible(ids, false)   // 一次处理多个指标，一步撤销`}</code></pre>

<h2>订单</h2>
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
  订单的标签显示数量和类型（<code>0.25</code>、<code>Sell limit</code>），随后是用于撤单的 <strong>×</strong>；
  它在价格轴上的标签显示价格，写法与坐标轴一致。带止损和止盈开仓的订单会用点线显示它们，并标出到达时的盈亏。拖动线或其标签即可修改订单；通过
  <code>chart.on('orderModify', ...)</code> 订阅修改事件。
</p>

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

chart.on('executionError', (e) => toast(e.payload.message))   // e.payload.command: the intent that failed
// A confirmed bracket goes to it too: see Bracket orders
// chart.disconnectExecution()`}</code></pre>
<p>
  实现 <code>ExecutionAdapter</code>（其结构与 <code>DataAdapter</code> 相对应），即可接入
  真实的经纪商 / OMS：<code>placeOrder</code>、<code>modifyOrder</code>、<code>cancelOrder</code>、
  <code>modifyPosition</code>、<code>closePosition</code>，以及 <code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> 事件。
  <code>PaperExecutionAdapter</code> 是一个虚拟成交的沙盒，适用于演示和测试。
</p>

<h3 id="order-outcome">订单的结果</h3>
<p>
  每一笔被请求的订单都带着一个 <code>clientOrderId</code> 发出，这是它自己的编号：它自带的那个，否则由图表给出；
  <code>placeOrderIntent</code> 返回实际发出的订单。在适配器答复之前，订单还在途中。<code>orderPlaced</code>
  表示适配器已接受，并带上它据此生成的订单；带有 <code>command: 'orderPlace'</code> 和同一个 <code>clientOrderId</code> 的
  <code>executionError</code> 表示它被拒绝。适配器的 <code>placeOrder</code> 必须以其中一种方式结束：以订单 resolve，
  或带着原因 reject。请把这个编号转给支持它的经纪商，并对重复发来的同一编号以已生成的订单作答，这样一次按下被发送两次也只是一笔订单（模拟账户就是这样做的）。
</p>
<pre><code>{`const sent = chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1 })
chart.on('orderPlaced', (e) => { if (e.payload.intent.clientOrderId === sent?.clientOrderId) done(e.payload.order) })
chart.on('executionError', (e) => { if (e.payload.clientOrderId === sent?.clientOrderId) failed(e.payload.cause) })`}</code></pre>

<h3 id="order-kinds">互相配合的订单，以及订单的有效期</h3>
<p>
  订单的意图（<code>chart.placeOrderIntent</code>、适配器的 <code>placeOrder</code>）说明的不只是它的价格：
</p>
<ul>
  <li>
    <strong><code>ocoGroup</code></strong>：一组订单共用的名称，其中一个会撤销其余的，例如同一次出场的目标单和止损单。
    一个成交后，组内其余订单被撤销。它们在图表上的标签显示 OCO。
  </li>
  <li>
    <strong><code>timeInForce</code></strong>：<code>'gtc'</code>（撤销前有效）、<code>'day'</code>、
    <code>'gtd'</code>（到某个日期前有效：<code>expireTime</code>，以毫秒计），以及 <code>'ioc'</code> 或
    <code>'fok'</code>，用于立即成交、否则完全不成交的订单。
  </li>
  <li>
    <strong><code>type: 'stopLimit'</code></strong>：<code>stopPrice</code> 是它开始生效的价格，
    <code>price</code> 是它此后所按的限价。它在图表上的线是它的限价，它的触发价另有一条点划线，标签为 STOP，价格写在价格轴上。
    拖动订单的线会让两者一起移动，间距不变；拖动触发价的线或它的标签则只移动触发价。
    这时 <code>orderModify</code> 在 <code>newPrice</code> 之外还带有 <code>newStopPrice</code>，模拟账户会照此执行。
  </li>
</ul>
<pre><code>{`// A target and a stop for one exit: whichever fills first takes the other off
chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 66_000, quantity: 1, ocoGroup: 'exit' })
chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 63_000, stopPrice: 63_000, quantity: 1, ocoGroup: 'exit' })

// Works until midnight UTC
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1, timeInForce: 'gtd', expireTime: Date.UTC(2027, 0, 1) })`}</code></pre>
<p>
  模拟账户对每一种都按经纪商的做法处理。一组订单中，最先成交的会撤销其余的。
  止损限价单在价格到达其止损价后，变成按其 <code>price</code> 的限价单，并且只在该限价之内成交
  （到达止损价的那个价格在限价之内时，按那个价格成交）。<code>'gtd'</code> 订单在随
  <code>setMarkPrice</code> 给出的时间到达其日期时撤下（未给出时间时按时钟的时间），日期已过的订单会被拒绝。
  <code>'ioc'</code> 或 <code>'fok'</code> 限价单在当前价格处于其限价之内时，立即按当前价格成交，
  不在限价之内时被拒绝（<code>executionError</code>）。模拟市场本身没有可成交数量，所以两者在那里相同，
  除非给它设定一个（见<a href="#partial-fills">下文</a>）。组件的下单窗口为限价单提供这两种选项，
  账户面板会在属于某一组的订单旁写上 OCO，并写出带日期订单的日期。它把 <code>'day'</code> 留给应用处理，因为应用知道其市场的交易日何时结束。
  下单窗口为限价单和止损单提供“指定日期前有效”：按图表自己的时钟选一个日期和时间，初始为一天之后；到期时间已过的订单不会被提交。
  立即成交否则撤销的限价单（IOC、FOK）可以把价格设在市场价的另一侧：它按市场价成交，下单窗口从该价格计算其金额、风险和目标。
  下单窗口也接受止损限价单，需填写触发价和限价，可一直有效、当日有效或指定日期前有效。它可能在触发价到限价之间的任何价格成交，因此止损要设在触发价之外，止盈要设在限价之外；账户面板会写出它的类型和这两个价格，触发价在前。
</p>
<p>
  <strong>一个净持仓。</strong>默认情况下，模拟账户为每笔成交的订单开一个持仓，买入的与卖出的并存
  （<code>positions: 'hedge'</code>）。<code>{`new PaperExecutionAdapter({ positions: 'net' })`}</code>
  只保留一个持仓，与期货账户相同：同方向的成交按两者价格的平均值加到持仓上，
  反方向的成交从持仓中减去并实现这一部分的盈亏（成交上的 <code>pnl</code>），更大的反向成交会让持仓反转，
  其余部分按成交价开仓。加到持仓上的成交带有止损止盈时，会把它们带给持仓；
  从持仓中减去的成交让持仓的止损止盈保持原样；让持仓反转的成交带来它自己的。
</p>
<h3 id="partial-fills">部分成交的订单</h3>
<p>
  限价单挂在市场中，随着对手单到来而成交，往往一次成交一部分。给出
  <code>fillSize</code> 后，模拟账户在一个价格上成交的限价单数量不超过它：更大的订单在每个到达其限价的价格
  （每次 <code>setMarkPrice</code>）成交一部分，其余部分继续挂单。订单留在 <code>chart.getOrders()</code> 中，
  带有它的 <code>filledQuantity</code>；每一部分都是一笔独立的成交（<code>executionFill</code>），
  其 <code>remaining</code> 是它留下的仍在挂单的数量，最后一部分把订单撤下。图表把已成交的数量写在订单的标签上
  （<code>2/5</code>），组件的账户面板写在订单的行里；订单的止损和目标上的标签显示的是其余部分到达时的盈亏，
  因为已成交的部分是一个带有自己标签的持仓。
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({ fillSize: 2 })   // two of a limit order at each price
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 })

chart.on('executionFill', (e) => console.log(e.payload.quantity, e.payload.remaining))   // 2 3, then 2 1, then 1 undefined
chart.on('ordersChange', (e) => console.log(e.payload.orders[0]?.filledQuantity))        // 2, 4, then no order`}</code></pre>
<p>
  一个订单的各部分构成一个持仓，价格为各部分价格的平均值；在净持仓账户上，它们加到账户的持仓上，或从中减去。
  持仓从订单的第一部分得到订单的止损、止盈和止盈档位，之后的部分不会再带来一次：
  你此后移动过或取消了的止损，保持你留下的样子。在其持仓已平仓之后才成交的部分会另开一个持仓，
  并再次带上订单的止损止盈。止盈档位的数量是按整个计划定的，所以最初的几部分可能不够它平：
  它平掉的数量不超过当前持有的数量。止损限价单一旦作为限价单生效，也会分部分成交。
  每一部分各自支付手续费，账户已无力承担的那一部分会撤销订单的剩余部分（<code>executionError</code>）。
  剩余部分可以移动、撤销，或在其日期到期，第一部分成交会撤销订单所在组的其余订单。
  <code>'ioc'</code> 订单中能立即成交的部分成交，其余被丢弃（它的成交说明丢弃了多少：其 <code>dropped</code>，而 <code>quantity</code> 少于所要求的数量；
  <code>placeOrder</code> 返回的订单带有它的 <code>filledQuantity</code>；日志把其余部分记为已撤单，组件会提示成交了多少）；
  超过可成交数量的 <code>'fok'</code> 订单被拒绝。市价单和止损单整笔成交，平仓也是如此：
  模拟市场按当前价格接受它们，不模拟滑点。你自己的适配器以同样的方式上报其经纪商的部分成交：
  在 <code>orders</code> 中给出带 <code>filledQuantity</code> 的订单，并为每一部分给出一个 <code>fill</code>。
</p>

<h3 id="take-profit-levels">分批止盈</h3>
<p>
  持仓可以分批平掉。订单意图上的 <code>takeProfits</code>，或持仓上的（<code>chart.modifyPositionIntent</code>），
  是一个档位列表，每一档有一个 <code>price</code> 和在该处平掉的 <code>quantity</code>。价格到达某一档时，它的那一部分按该档的价格平仓，该档随之消失；
  各档平完后剩下的部分继续持有，由 <code>takeProfit</code> 或止损来平。
  无论还有哪些档位在等待，止损都会平掉剩下的全部；越过止盈价的档位永远不会到达；一档平掉的数量不超过仍持有的数量。
  图表为每一档画一条线和一个标签（TP1 是最近的一档），标出它的那一部分以及这一部分的盈亏，
  组件的账户面板写出最近的一档以及还有多少档。
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
  模拟账户负责平掉各个部分（每一部分一笔成交，带 <code>reason: 'takeProfit'</code> 和它实现的盈亏），
  并把它们计入持仓的 <code>closedQuantity</code>。它只接受相对开仓价为盈利的档位；在净持仓账户上，
  带有档位的订单会把它的档位交给持仓，就像把止损止盈交给持仓一样。图表上的 TP1 是仍在等待的最近一档。
  你自己的适配器上报其经纪商的档位。在组件的下单窗口中，止盈可以分一、二或三档到达（<strong>止盈档数</strong>）：多于一档时，途中的每一档平掉数量中相等的一份，各档从开仓价起等距排列，
  止盈平掉剩下的部分。下单之前，下单窗口会列出在哪里平掉多少。
</p>
<p>
  持仓的档位可以在图表上拖动，与它的止损和止盈一样，拖它的线或它的标签都可以：
  线跟随指针，原来的位置以淡色留在后面，松开时发出 <code>positionModify</code>，带有该持仓的全部
  <code>takeProfits</code>，其中这一档已移动，最近的排在最前。档位是盈利的，所以在开仓价处、
  或越过开仓价到了亏损一侧松开的档位会回到原处，不发出任何事件。按下时触及范围内有两档的，取较近的一档；
  同一位置上有订单线、止损或止盈时，先取它们而不是档位，此时档位仍可通过它的标签移动。
  仍在等待的订单的档位是订单带来的计划，不是可拖动的手柄；线被锁定时，任何档位也都不是。
</p>

<h3 id="account">有资金的账户</h3>
<p>
  给出 <code>balance</code> 后，模拟账户像经纪商那样管理它的资金。平仓的盈亏计入余额，
  未平仓的持仓占用保证金（持仓价值除以 <code>leverage</code>），每笔成交支付它的 <code>commission</code>。
  可用保证金承担不了的订单会被拒绝（<code>executionError</code>），反手也是如此；
  挂单在其价格到来时资金已经不够的，会被撤销，<code>executionError</code> 同样会说明。
  <code>multiplier</code> 是价格变动一个单位时每一单位的价值，用于期货合约：把市场的
  <code>contractMultiplier</code> 传给它，组件的面板就是按它计算持仓盈亏的。
  账户的变化先于引起它的那笔成交通知出去，所以在 <code>executionFill</code> 监听器中调用
  <code>chart.getAccount()</code>，读到的是这笔成交之后的账户。没有 <code>balance</code> 就没有账户，
  任何订单都会被接受，与以前一样。
</p>
<p>
  持仓占用保证金期间，账户会给出净值相对保证金的情况：<code>marginLevel</code>，
  即净值占已用保证金的比例（<code>1.5</code> 即 150%）。有两个水平据此起作用，不给出就不启用。
  低于 <code>marginCallLevel</code> 时，账户警告一次，即 <code>marginCall</code> 事件，
  只有净值回到该水平之上以后才会再次警告；它不平任何仓。低于
  <code>stopOutLevel</code> 时，它按当前价格平掉持仓，亏损最多的先平，
  直到回到该水平之上或不再有持仓：平掉一个持仓会释放它的保证金，这可能就够了。每一次都是一笔
  <code>reason: 'liquidation'</code> 的成交。两者都在每个价格到来时计算，排在该价格到达的订单和止损止盈之后，
  所以止损会先平掉它的持仓，而让净值跌破某个水平的成交要到下一个价格才处理。
  持仓的保证金按其开仓价占用，所以该比例只随净值变动。强制平仓不影响仍在等待的订单，它们继续挂单：
  资金已经不够的订单在其价格到来时被撤销。两个水平都不给时，不会平任何仓，余额可以跌到零以下。
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
  组件的账户面板在汇总数字的最前面显示余额、净值和可用保证金，有保证金比例时也显示它；
  它把追加保证金通知显示为一条警告，并在历史中标明强制平仓的成交。你自己的适配器要做到同样的事，
  需实现 <code>getAccount()</code>，在资金变化时发出带 <code>AccountSummary</code> 的 <code>account</code>，
  并在其经纪商发出警告时发出 <code>marginCall</code>。
</p>

<h3 id="symbols">交易多个品种的账户</h3>
<p>
  一张图表只显示一个品种，而一个账户可以持有多个品种。订单、持仓和成交都可以写明它所属的品种（<code>symbol</code>）。
  图表绘制属于当前显示品种的那些，以及没有写明品种的那些；写明其他品种的会被保留，等该品种显示时再画出来。
  <code>getOrders()</code>、<code>getPositions()</code> 和 <code>getFills()</code> 返回整个账户，
  <code>ordersChange</code> 和 <code>positionsChange</code> 也是如此；<code>chart.getSymbol()</code> 说明其中哪些在图表上。
  图表发出的订单会写明当前显示的品种（<code>orderPlace</code> 中的 <code>symbol</code>），模拟账户会把它保留在订单、
  订单开出的持仓以及它们的成交上。你自己为多品种账户写的适配器要在每一项上写明品种。图表从不猜测：
  没有写明品种的会像以前一样画在每个品种上。两个名称不区分大小写即为同一品种；只有一方带交易所前缀时按代码比较
  （<code>BTCUSDT</code> 与 <code>BINANCE:BTCUSDT</code>）；双方都带交易所前缀时，必须是同一个交易所。
</p>
<p>
  成交是某一个品种 K 线上的标记，所以图表会给每笔成交一个品种：它自己的，否则是其持仓或订单的，再否则是成交到来时
  图表显示的品种。组件的账户面板列出所有品种的行，并在有一行属于其他品种时写出品种名；其他品种的持仓显示适配器给它的
  价格（持仓上的 <code>markPrice</code>）以及按该价格计算的盈亏，否则两者都不显示：图表的价格不是它的价格。
  盘口深度只标出它所显示的那个品种的订单。
</p>
<p>
  使用数据流（<code>connect</code>、<code>switchStream</code>）时，图表知道自己的品种。K 线由你自己设置时，
  请在更换它们时告诉图表；<code>ChartWidget</code> 在选择品种时会自己这样做。
</p>
<pre><code>{`chart.setData(barsOf('ETHUSDT'))
chart.setSymbol('ETHUSDT')        // 绘制 ETHUSDT 的订单和持仓；'' 则重新全部绘制
chart.getSymbol()                 // 'ETHUSDT'

chart.setPositions([
  { id: 'p1', symbol: 'BTCUSDT', side: 'buy', entryPrice: 64_000, quantity: 1, markPrice: 64_250 },   // 保留，不绘制
  { id: 'p2', symbol: 'ETHUSDT', side: 'sell', entryPrice: 3_150, quantity: 2 },                      // 绘制
])`}</code></pre>
<p>
  价格同样属于某一个品种。向模拟账户提供价格时写明品种，每个价格就只撮合该品种的订单和止损，只为该品种的持仓估值；
  持仓按它自己品种的最新价格平仓、反手和强平，净头寸账户每个品种保留一个持仓。没有写明品种的价格是账户所持全部内容的
  价格，和以前一样。请在你提供的每个价格上都写明品种，或者都不写：一个没有写明品种的价格会让账户重新变成一个市场。回放时，图表会在它提供的价格上写明品种。
</p>
<pre><code>{`feed.onTrade((trade) => broker.setMarkPrice(trade.price, trade.time, trade.symbol))`}</code></pre>

<h3 id="live-price">不再是实时的价格</h3>
<p>
  组件的数据源已连接并持续推送时，图表上的价格是实时的。数据源断开，或者已连接但一分钟内没有任何推送
  （<code>feedQuietAfter</code>，单位为秒），最后的价格就会停在那里：这时状态栏会说明这一点而不再显示“Live”，
  下单窗口不发送市价单，对其他类型则给出警告，因为价格是交易者自己填的。数据源断开期间，一键下单（右键菜单、盘口深度）
  以及在图表上确认的括号单或草稿订单也会被拦下并给出提示（后两者由 <code>chart.setOrderGate</code> 拦截）。
  平仓和撤单从不会被拦下。休市的市场（品种的 <code>sessions</code>）本来就没有推送，不做判断；回放以及由你自己提供的K线
  （没有 <code>adapter</code>）也不判断：这种情况请在你自己的 <code>orderPlace</code> 处理函数里拦截订单。
</p>
<pre><code>{`new ChartWidget(host, { adapter, symbol: 'BTCUSDT', trading: true, feedQuietAfter: 30 })   // seconds; 0: never
chart.getFeedTime()   // when the stream last told anything, ms; null before it has`}</code></pre>

<h3 id="confirmations">确认</h3>
<p>
  在 <code>ChartWidget</code> 中，一次点击就能完成的交易会先确认：平仓或反手（账户面板中的那一行、图表上的按钮），
  以及来自右键菜单或盘口深度的订单。对话框会完整写明这笔交易（方向、数量、价格、品种）；按 Enter 执行，按 Escape 放弃。
  <code>confirmOrders: false</code> 即一键交易，供有此需求的经纪商使用。下单窗口不会被询问两次：它的下单按钮就是确认。
  在盘口深度上，点击买价单元格会在该价格挂出限价买单，与那里的买单排在一起；点击卖价单元格则挂出限价卖单。
  每个单元格在点击前都会写明这一点以及数量。
</p>
<pre><code>{`new ChartWidget(host, { adapter, symbol: 'BTCUSDT', trading: true, confirmOrders: false })   // one-click trading
chart.setPositionGuard((action, positionId, send) => ask(action, positionId).then((yes) => yes && send()))   // your own, on a headless Chart`}</code></pre>

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
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop
chart.modifyPositionIntent({ positionId: 'pos-1', trailingStop: 150 }) // the stop trails the price by 150; null ends the trail`}</code></pre>
<p>
  能一步完成反手的适配器可实现 <code>reversePosition</code>；
  若未实现，图表会先平仓，再按相反方向发送一笔市价单。
  订单可以带 <code>stopLoss</code>、<code>takeProfit</code> 和追踪距离，这些设置会延续到该订单开出的持仓上。
</p>
<p>
  <strong>适配器作者请注意：</strong>在 <code>PositionModifyIntent</code> 中，
  <code>stopLoss: null</code>（或 <code>takeProfit: null</code>）表示移除，
  而缺少该字段表示保持不变。写成 <code>intent.stopLoss ?? position.stopLoss</code>
  的代码会保留用户已经移除的止损。
</p>
<p>
  <strong>追踪止损</strong>是跟随价格的止损：持仓的 <code>trailingStop</code> 是止损与最优价格之间保持的距离（以价格计），多头向上跟随，空头向下跟随，并且绝不回退。在图表上，它的标签显示为 TSL。止损标签上的按钮会按止损到当前价格的距离开始追踪，或者结束追踪；<code>lineButtons: {'{'} trailStop: false {'}'}</code> 可将其隐藏。模拟账户会自行移动止损。对接经纪商的适配器在 <code>modifyPosition</code> 中转交 <code>trailingStop</code>（数字表示开始追踪，<code>null</code> 表示结束追踪并让止损留在原处），并在经纪商移动止损时上报持仓的 <code>stopLoss</code>。订单也可以带上它：订单上的 <code>trailingStop</code> 会让它开出的持仓从一开始就追踪，挂单的止损标签显示为 TSL。在下单面板中，它是止损下方的“追踪止损”开关，按止损到入场价的距离追踪。止损正在追踪时，其标签上的追踪按钮会被填充。
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
  点击它会发出带有该价格的 <code>priceAxisAdd</code> 事件。它显示时，订单和持仓的标签会停在它的左侧，
  因此它不会挡住标签上的按钮。
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
  添加水平线；其后依次是重置视图、粘贴已复制的画线、隐藏或删除画线、删除指标（与其他品种的
  对比会保留）、导出数据和打开设置。
</p>
<p>
  在价格轴上右键，可重置坐标、开启自动缩放、反转坐标或改用左侧价格坐标，在四种模式（常规、
  对数、百分比、以 100 为基准）中选择一种，在两个子菜单中设置轴上的标签和横贯图表的线条，
  在该价格添加提醒，还可打开设置并直接进入“坐标”标签页。时间轴的菜单有重置、跳转到日期和时区。
</p>
<p>
  对应的快捷键开启时，菜单项会显示组件的快捷键：<kbd>Alt</kbd> + <kbd>R</kbd> 重置视图，
  <kbd>Alt</kbd> + <kbd>I</kbd> 反转坐标，<kbd>Alt</kbd> + <kbd>G</kbd> 跳转到日期。点击子菜单项、
  按 <kbd>Enter</kbd> 或 <kbd>→</kbd>，或让指针在其上停留，都会打开子菜单；按 <kbd>←</kbd> 或
  <kbd>Escape</kbd> 返回。在手机上，菜单从底部打开，子菜单的第一行用于返回。可用
  <code>chartMenuItems</code> 添加自己的菜单项（参见
  <a href={href('/docs/api')}>API 参考</a>）。
</p>

<h2>下单窗口和账户面板（ChartWidget）</h2>
<p>
  工具栏 <strong>交易</strong> 菜单中的 <strong>账户</strong> 会在图表下方打开账户面板：显示当前持仓及其盈亏、挂单、迄今为止的成交
  和已实现盈亏，以及一份记录订单经过的日志。每一行都可以平仓、反手或撤单。<strong>新建委托</strong>会打开下单窗口：
  买入或卖出，市价、限价或止损，数量、价格、可选的止损和止盈，以及有效期。填写时它会实时检查订单
  （限价买单应低于市价，止损应位于入场价亏损的一侧……），并显示盈亏比。
  下单时会发出 <code>orderPlace</code> 意图。
  设置了市场（<code>chart.setMarket</code>）后，它还会让各个价格落在市场的最小变动价位上，并让委托价格处于当日涨停价与
  跌停价之间；数量从一手起，超过一手时只接受整手（不足一手的股数应作为单独的零股委托）。
</p>
<p>
  数据源同时给出买价和卖价时，下单窗口按卖价对买入、按买价对卖出进行估值、校验和发送；否则两者都按最新价。
  连接了执行适配器时，它会等待适配器的答复：窗口保持打开，按钮处显示<strong>发送中…</strong>，内容不可修改；订单被接受后关闭；
  订单被拒绝时，保留已输入的内容并说明原因，直到订单被修改。十秒内没有答复时，它会说明这一点并继续等待：再次发送前请先查看您的委托。点击窗口外部不会关闭它；Escape、取消和叉号才会。
  一次按下发出的订单（来自右键菜单或盘口深度面板的一档）数量为该市场的一手（<code>volumeUnit</code>），没有交易单位时为 1。
</p>
<p>
  下单窗口在标题旁写出品种代码。订单类型和有效期是一排选项（方向键可在其间移动）；− 和 + 按一手调整数量、
  按市场的最小价位调整价格，从图表带入的价格会先按该价位取整。开启的止损或止盈会显示距开仓价的百分比和到达时的盈亏；
  下方的小票汇总这笔订单：金额、风险、收益以及收益风险比。在买卖之间切换时，挂单仍留在原来的价位
  （高于市价的买入止损单会变为卖出限价单），下单按钮使用该方向的颜色。
</p>
<p>
  在组件中，交易开启时，选中的多/空仓位画线会在其工具栏中提供 <b>创建订单</b>。它打开这个下单窗口，并按画线填好：
  方向、以入场作为价格、止损和止盈，以及按其风险可买的数量（向下取到画线书写的小数位数）。订单类型由入场相对于市价的位置决定，
  在按下“下单”之前不会发出任何东西。
</p>
<p>
  账户面板的顶部在每个标签页都显示浮动盈亏和已实现盈亏。数字以等宽字体右对齐，金额按最小价位的小数位数和数字区域格式书写；
  在手机上每一行是一张标明各项数字的卡片。
</p>
<p>
  组件会提示它发出的订单的结果：被适配器拒绝的订单，用适配器自己的原话；部分成交而其余被丢弃的订单，提示成交了多少。
</p>
<p>
  <strong>日志标签页</strong>列出订单经历的事情，最新的在前：每一笔下单、改价、撤单或成交，
  以及经纪商拒绝的订单及其原因。日志由图表保存，你自己的图表也可以使用：
  <code>chart.getActivityLog()</code> 给出最近的 200 条，最早的在前，每条为
  <code>{`{ time, kind, orderId, side, type, quantity, price, reason, pnl, message }`}</code>，带有其
  <code>kind</code>（<code>'placed'</code>、<code>'moved'</code>、<code>'cancelled'</code>、
  <code>'filled'</code>、<code>'rejected'</code>）所具有的字段。它根据图表得知的订单、成交和错误生成，
  来源是执行适配器，或 <code>setOrders</code> 和 <code>addFill</code>。日志开始时已有的订单不在其中，
  连接或移除适配器时已有的订单也不在其中，（没有适配器时）切换品种时已有的订单同样不在其中：
  它们是已经存在的订单，不是新下的订单。部分成交后被撤下的订单记为已撤单。
  <code>chart.clearActivityLog()</code> 清空日志。
</p>
<p>
  <strong>图表上的卖出和买入。</strong>连接了执行适配器期间，组件在图表图例下方显示两个按钮，
  各自带有它将成交的价格：卖出按钮上是最优买价，买入按钮上是最优卖价，两者之间是价差
  （<code>chart.setBidAsk</code>，或 tick 中带有它们的数据源），否则两个按钮上都是最新价，
  例如回放时，或数据源只给出一侧时。按下会打开该方向的下单窗口。
  <code>executionChange</code> 在适配器连接或移除时发出，<code>bidAskChange</code>
  在买价和卖价变化时发出，<code>tradeButtons</code> 开关可关闭这两个按钮。
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
  图表会发出一个 <code>bracketPlace</code> 事件，并把括号单发给已连接的执行适配器（见下文）；
  没有适配器时，该事件由你的后端处理。
</p>
<p>
  <strong>规模。</strong>括号单按其规模对应的数量下单。<code>{`{ quantity: 2 }`}</code> 就是该数量。
  <code>{`{ risk: 50 }`}</code> 是在止损处亏损的金额：数量等于 50 除以入场价到止损价的距离（再乘以
  <code>multiplier</code>，即价格变动一个单位时每一单位的价值），按 <code>quantityStep</code> 向下取整，并随拖动的线而变化。
  数量写在入场线的标签上，<code>bracketPlace</code> 也会带上它。在组件中，数量在括号单操作栏的输入框里填写，
  初始值为上次填写的数量，否则为市场的每手数量。<code>widget.startBracket(side, size)</code> 也接受规模：
  按风险确定规模的括号单没有输入框。<code>bracketQuantity(bracket, size)</code> 是供你自己的代码使用的同一计算。
</p>
<p>
  连接了执行适配器时，图表还会把已确认的括号单作为一个订单发给适配器：入场（价格需要回到入场价时为限价单，
  需要继续走到入场价时为止损单）、数量，以及附带的止损和止盈。适配器接受后，图表发出带有该订单的
  <code>bracketOrder</code>。如果适配器拒绝，图表发出 <code>command: 'bracketPlace'</code> 的
  <code>executionError</code>。只有这时组件才提示"已下单"，被拒绝时会说明原因。没有数量的括号单不会被确认，
  因为没有人看到要下的数量：<code>confirmBracket()</code> 返回 false，括号单留在图表上等待填入数量。
  在图表还没有价格来区分限价入场和止损入场时确认的括号单不会被发送。
  <code>executionError</code> 会给出 <code>reason</code>（<code>'noQuantity'</code>、<code>'noPrice'</code>），
  组件也会提示。自行根据事件下括号单的应用以 <code>brackets: 'event'</code> 连接：这时括号单只是一个事件，
  组件提示已确认。3.0 之前这是默认行为（见 <a href={href('/docs/migration-3')}>迁移到 3.0</a>）。
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

<h2>盘口深度（点击交易）</h2>
<p>
  可选开启的盘口深度面板会把订单簿渲染为按价格排列的行，
  并带有买单 / 卖单数量列——点击卖价单元格即以该价格买入，点击买价单元格即以该价格卖出。
  设置 <code>depthLadder: true</code> 启用，并通过 <code>widget.setDepth</code> 传入订单簿；
  点击会发出 <code>orderPlace</code> 意图，交给你的 OMS 处理（图表自己从不交易）。
  同一份数据也会驱动图表上的深度叠加层。
</p>
<p>
  盘口深度是图表旁 dock 的一页（手机上为底部面板）：可从交易菜单、它在侧栏上的按钮或
  <code>widget.openPanel('depthLadder')</code> 打开，用 <code>dock.depthLadder: false</code> 去掉侧栏按钮。卖价在上、
  买价在下，中间是价差，每个数量都有一条从价格列向外生长的条形；有你挂单的价位会标出挂单数量。
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

<h2>图表上的订单簿</h2>
<p>
  <code>features.depth</code> 从右边缘把订单簿画在绘图区上，供只显示价格的图表使用：不需要订单，也不需要交易界面，
  可与 <code>trading: false</code> 一起使用。用 <code>chart.setDepthData</code> 提供数据（<code>widget.setDepth</code> 也会这样做）；
  开启 <code>features.depth</code> 即开启覆盖层，<code>setDepthOverlay</code> 用来改变外观。
</p>
<ul>
  <li><code>mode</code>：<code>'cumulative'</code>（默认）把每一档与更靠近市价的各档相加，因此越远离市价条越长；<code>'level'</code> 只画每个价位自己的数量，大单墙会显示为一根长条。</li>
  <li><code>rowSize</code>：条的高度（以价格计）。各档按这个间距合并成行，因此价格刻度较粗时的密集订单簿、或有空档的订单簿，仍然画成均匀的条（可设为与足迹图的行一致）。此时 <code>markBest</code> 画在最优行的中间。</li>
  <li><code>rowOrigin</code>：行的起点（以价格计）。此时第 k 行从 <code>rowOrigin + k × rowSize</code> 起，到下一行的起点为止，正好落在行起点上的档位属于该行。若足迹图的格子从行大小的倍数开始、每个 tick 以其价格为中心，设 <code>rowOrigin: -tick / 2</code> 即可对齐。不设时每行以 <code>rowSize</code> 的倍数为中心。</li>
  <li><code>markBest</code>：在最优买价和最优卖价处各画一条线（<code>bestBidColor</code>、<code>bestAskColor</code>）。</li>
  <li><code>maxWidth</code>：条的最大长度（像素，不超过绘图区），<code>bidColor</code>、<code>askColor</code>。</li>
</ul>
<p>
  这些条位于最新的 K 线之上。要留出空间，请调大 <code>rightMargin</code>，并把 <code>maxWidth</code> 设为大约等于这些根数的宽度。
  开启交易时，<code>{`setTradingConfig({ depthOverlay: { enabled: true } })`}</code> 仍像以前一样打开它。
</p>
<pre><code>{`const chart = new Chart(host, {
  features: { trading: false, depth: true },       // display only: no orders, no trading UI
  depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 },
  rightMargin: 14,                                  // empty slots past the newest bar, room for the bars
})
chart.setDepthData(orderBook)                       // { bids, asks }; null clears it
chart.setDepthOverlay({ mode: 'cumulative' })       // change the look later`}</code></pre>

<h2>流动性热力图</h2>
<p>
  把订单簿快照累积成蜡烛背后的热力图——每个快照是一条垂直色带，
  各价位上的挂单量会被点亮（买单为绿色，卖单为红色）。长时间存在的流动性墙会格外醒目。
  可在设置面板中切换（或调用 <code>chart.setDepthHeatmapVisible</code>）；
  每次订单簿更新时，<code>widget.setDepth</code> 都会记录一个快照。
  回放期间，未带时间记录的订单簿归属于实时序列的最后一根K线；热力图只显示回放已经展示过的K线的订单簿，
  而绘图区边缘的订单簿（属于实时行情）会隐藏，直到回放结束。
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })
chart.setDepthHeatmapConfig({ bidColor: '#1e88e5', askColor: '#fb8c00' })   // 自己的颜色；null：主题的K线颜色

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

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

<h2>标记（Marks）</h2>
<p>
  某个时间发生的事（一条新闻、财报日、分红、拆股）以小徽标显示在价格窗格底部，位于包含该时间的 K 线上。
  指针移到徽标上可读到标题和说明；会重叠的徽标合并为一个并显示数量。回放到达时才显示相应标记。
  Renko、Kagi、新价线、点数图和范围 K 线不绘制标记：它们的 K 线不对应时间。
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
  <code>kind</code> 决定字母和颜色：<code>news</code> 为 N，<code>earnings</code> 为 E，
  <code>dividend</code> 为 D，<code>split</code> 为 S，<code>event</code>（或不填）为 i。
  <code>label</code>（一到两个字符）和 <code>color</code> 可替换它们。标记必须有 <code>title</code>
  和 <code>time</code>；只保留 http(s) 链接；一个图表最多保留 2,000 个。标记属于数据源而不是用户：
  <code>saveState</code> 不保存它们，加载状态后请重新设置。
</p>
<p>
  ChartWidget 会把当前品种的新闻标题从新闻来源（<code>news</code>，或适配器的
  <code>fetchNews</code>）放到图表上；<code>newsMarks: false</code> 只在品种信息面板中显示。
  点击一个标记会在新标签页打开其链接；点击合并了多个标记的徽标会打开列表，最新的在前。
  组件的 <code>marks</code> 功能开关可隐藏所有标记。你自己调用 <code>setMarks</code> 和
  <code>clearMarks</code> 不会移除组件放上的新闻标记。
</p>

<h2>交易区域</h2>
<p>以矩形展示入场 → 出场区间，按盈亏着色并带有方向标记。</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  direction: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
})`}</code></pre>

<h2>持仓标签占位符</h2>
<p>
  按你的方式书写持仓标签：<code>positionLabel</code> 取代数量之后的方向和盈亏。它接受一个
  模板字符串，或一个返回字符串的函数。
</p>
<pre><code>{`chart.setTradingConfig({
  positionLabel: '{side} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  可用的占位符：
  <code>{'{side}'}</code>、<code>{'{qty}'}</code>、<code>{'{openQty}'}</code>、
  <code>{'{closedQty}'}</code>、<code>{'{entry}'}</code>、<code>{'{price}'}</code>、
  <code>{'{pnl}'}</code>、<code>{'{pnlPct}'}</code>、<code>{'{pnlSign}'}</code>。
</p>

<h2>盈亏渐变色阶</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  标签上的浮动盈亏和到当前价格的色带，取 <code>pnl</code> 不超过持仓盈亏（以金额计）的最高色阶的颜色。
</p>
