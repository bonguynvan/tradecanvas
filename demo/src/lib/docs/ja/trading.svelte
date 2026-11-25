<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>トレーディングオーバーレイ — TradeCanvas ドキュメント</title>
  <meta name="description" content="TradeCanvas のトレーディングオーバーレイで、ポジション、注文、シグナルマーカー、トレードゾーンをチャート上に直接表示します。" />
</svelte:head>

<h1>トレーディングオーバーレイ</h1>
<p>
  ポジション、注文、シグナルマーカー、トレードゾーンをチャート上に直接表示します。
  手動取引とアルゴリズム取引のどちらのフローにも組み込めるよう設計されています。
</p>

<h2>トレーディングの無効化</h2>
<p>
  トレーディングオーバーレイは既定で有効ですが、右クリックの注文メニューは無効です（1.3 以降）。
</p>
<pre><code>{`// Drop the entire trading subsystem (no orders, no positions, no overlay)
new Chart(host, { features: { trading: false } })

// Opt in to the right-click "Buy / Sell here" order menu
new Chart(host, { features: { tradingContextMenu: true } })
new ChartWidget(host, { chartOptions: { features: { tradingContextMenu: true } } })`}</code></pre>

<p>
  メニューがなければ、チャート上でもブラウザー標準の右クリックが通常どおり動作します。
</p>

<h2>ポジション</h2>
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
  各ラインの右端、価格軸の手前にタグが付きます。建値のタグには数量、売買の向き、含み損益、続いて
  <strong>⇅</strong> と <strong>×</strong>。損切りと利確のタグには、価格がそこに達したときの損益が表示されます。
  すべての価格は軸にも表示されます。重なりそうなタグは横に並び、軸のタグは互いにずれて表示されます。
  損切りや利確はラインでもタグでもドラッグできます。
</p>
<p>
  損切りや利確のないポジションでは、建値のタグに <strong>SL</strong> または <strong>TP</strong> のボタンが付きます。
  押して新しいラインを置きたい位置までドラッグするか、クリックだけで開始位置に設定します。損切りはエントリーから 1% の位置、
  利確は損切りの 2 倍の距離から始まり（ブラケットと同じです）、どちらも現在価格から少なくとも 1% 先に置かれるので、
  設定した瞬間に達することはありません。離すと損切りのドラッグと同じく <code>positionModify</code> が送られ、
  接続した執行アダプターがそれを反映します。<code>lineButtons: {'{'} addStops: false {'}'}</code> でボタンを表示しません。
  ラインを価格までドラッグしている間、クロスヘアは水平線を描かず、価格軸にも価格を表示しません。価格はライン自身のタグに出ています。
  手で決めた価格は市場の価格の刻みに乗ります。ドラッグした注文・損切り・利確・利確レベル、ブラケットや下書き注文のライン、ドラッグしたアラート、右クリックや価格軸の「+」が返す価格がそうです。市場の呼値（<code>setMarket</code>、または銘柄の <code>minTick</code>）に、なければ価格軸が表示する小数桁に丸められます：<code>chart.roundPrice</code> です。クロスヘアもポインター下の価格を同じ刻みで表示するので、表示される価格が横の「+」で発注される価格です。
  その日の値幅制限（ストップ高・ストップ安）がある市場（<code>setPriceLimits</code>）では、注文そのものの価格も制限内に収まります。制限を越えてドラッグしても注文のラインは制限の価格で止まり、ブラケットのエントリーと下書き注文は制限内から始まって制限内にとどまり、メニューは制限の外では注文を出さず、板情報ラダーも制限の外では発注しません。ポジションの損切り・利確・利確レベルは対象外です。当日の注文ではないからです。
</p>
<p>
  ポジション、注文、その約定は非表示にでき、その線はロックできます。非表示のときはどれも描画されず、押すこともできません。
  それでも保持され、執行アダプターに従い続け、発注中のブラケットや注文は表示されます。ロックのときは、線もタグもドラッグできず、
  ポジションから SL や TP を引き出すこともできません。ボタン（決済、取消、反転、トレール、ストップの削除）は使えます。
  ウィジェットでは、描画サイドバーの非表示ボタンとロックボタンのメニューで行います。
</p>
<pre><code>{`chart.setTradingVisible(false)   // isTradingVisible()
chart.setTradingLocked(true)     // isTradingLocked()
chart.setIndicatorsVisible(ids, false)   // 複数のインジケーターをまとめて、1 回の元に戻す単位で`}</code></pre>

<h2>注文</h2>
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
  注文のタグには数量と種類（<code>0.25</code>、<code>Sell limit</code>）、続いて取消用の <strong>×</strong>
  が表示され、価格軸のタグには軸と同じ書き方で価格が表示されます。損切りと利確付きで建てる注文は、それらを点線で示し、
  達したときの損益も表示します。ラインかタグをドラッグして変更します。変更は <code>chart.on('orderModify', ...)</code> で購読できます。
</p>

<h2>ライブ執行（アダプターの接続）</h2>
<p>
  既定では、チャートは注文 / ポジションの意図（<code>orderPlace</code>、
  <code>orderModify</code>、<code>orderCancel</code>、<code>positionModify</code>、
  <code>positionClose</code>）をバックエンド向けに<em>発行</em>するだけで、自ら取引することはありません。
  <code>ExecutionAdapter</code> を接続すると、チャートはそれらの意図をアダプターに渡し、
  アダプターから返される正式な注文 / ポジションを描画します（アダプターが唯一の信頼できる情報源になります）。
</p>
<pre><code>{`import { PaperExecutionAdapter } from '@tradecanvas/chart'

chart.connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))

chart.on('executionError', (e) => toast(e.payload.message))   // e.payload.command: the intent that failed
// A confirmed bracket goes to it too: see Bracket orders
// chart.disconnectExecution()`}</code></pre>
<p>
  実際のブローカーや OMS と接続するには、<code>ExecutionAdapter</code> を実装します（<code>DataAdapter</code> と対になる構造です）：
  <code>placeOrder</code>、<code>modifyOrder</code>、<code>cancelOrder</code>、
  <code>modifyPosition</code>、<code>closePosition</code> に加え、<code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> イベントです。
  <code>PaperExecutionAdapter</code> は、デモやテスト用に仮想的に約定させるサンドボックスです。
</p>

<h3 id="order-outcome">注文がどうなったか</h3>
<p>
  求められた注文はすべて、固有の ID である <code>clientOrderId</code> を付けて送り出されます。付いてきた ID があればそれを、なければチャートが与えたものを使い、
  <code>placeOrderIntent</code> は送り出したとおりの注文を返します。アダプターが答えるまで、注文は送信途中です。<code>orderPlaced</code> は
  アダプターが受け付けたことを、それをもとに作られた注文とともに伝えます。<code>command: 'orderPlace'</code> と同じ <code>clientOrderId</code> を持つ
  <code>executionError</code> は、拒否されたことを伝えます。アダプターの <code>placeOrder</code> は必ずどちらかで終わらなければなりません：注文で resolve するか、
  理由を付けて reject するかです。この ID は、それを受け取れるブローカーへそのまま渡し、同じ ID が再び届いたら既に作った注文で答えてください。
  そうすれば、二重に送られた 1 回の押下も 1 つの注文になります（ペーパー口座はそうします）。
</p>
<pre><code>{`const sent = chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1 })
chart.on('orderPlaced', (e) => { if (e.payload.intent.clientOrderId === sent?.clientOrderId) done(e.payload.order) })
chart.on('executionError', (e) => { if (e.payload.clientOrderId === sent?.clientOrderId) failed(e.payload.cause) })`}</code></pre>

<h3 id="order-kinds">連動する注文と、その有効期間</h3>
<p>
  注文の意図（<code>chart.placeOrderIntent</code>、アダプターの <code>placeOrder</code>）は、価格以外のことも伝えます：
</p>
<ul>
  <li>
    <strong><code>ocoGroup</code></strong>：1 つが残りをキャンセルする注文同士が共有する名前です。同じ決済のための利確と損切りがその例です。
    1 つが約定すると、グループの残りはキャンセルされます。チャート上のタグには OCO と表示されます。
  </li>
  <li>
    <strong><code>timeInForce</code></strong>：<code>'gtc'</code>（取消まで有効）、<code>'day'</code>、
    <code>'gtd'</code>（期日まで有効：<code>expireTime</code>、ミリ秒単位）、そして、すぐに約定するか、まったく約定しない注文のための
    <code>'ioc'</code> または <code>'fok'</code>。
  </li>
  <li>
    <strong><code>type: 'stopLimit'</code></strong>：<code>stopPrice</code> は注文が有効になり始める価格、
    <code>price</code> はその後に有効になる指値です。チャート上のラインはその指値で、ストップには STOP のタグが付いた一点鎖線が別に引かれ、その価格が価格軸に表示されます。
    注文のラインをドラッグすると間隔を保ったまま両方が動き、ストップのライン（またはそのタグ）をドラッグするとストップだけが動きます。
    このとき <code>orderModify</code> は <code>newPrice</code> に加えて <code>newStopPrice</code> を持ち、ペーパー口座はそれに従います。
  </li>
</ul>
<pre><code>{`// A target and a stop for one exit: whichever fills first takes the other off
chart.placeOrderIntent({ side: 'sell', type: 'limit', price: 66_000, quantity: 1, ocoGroup: 'exit' })
chart.placeOrderIntent({ side: 'sell', type: 'stop', price: 63_000, stopPrice: 63_000, quantity: 1, ocoGroup: 'exit' })

// Works until midnight UTC
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 63_500, quantity: 1, timeInForce: 'gtd', expireTime: Date.UTC(2027, 0, 1) })`}</code></pre>
<p>
  ペーパー口座は、それぞれについてブローカーと同じことをします。グループでは、最初に約定した注文が残りをキャンセルします。
  ストップリミットは、価格がそのストップに達すると <code>price</code> を指値とする指値注文になり、その指値の範囲内でだけ約定します
  （ストップに達した価格が範囲内なら、その価格で）。<code>'gtd'</code> の注文は、<code>setMarkPrice</code> で渡した時刻が
  その期日に達すると外され（時刻を渡さなければ時計の時刻）、期日を過ぎた注文は拒否されます。<code>'ioc'</code> または
  <code>'fok'</code> の指値は、その時点の価格が指値の範囲内であれば、その価格ですぐに約定し、範囲外なら拒否されます（<code>executionError</code>）。ペーパー口座の市場には自前の数量がないので、そこでは両者は同じです。
  ただし、数量を与えた場合は別です（<a href="#partial-fills">下記</a>）。ウィジェットの注文チケットは指値注文で両方を選べ、口座パネルはグループの注文の横に OCO を、
  期日付きの注文にはその期日を表示します。<code>'day'</code> はアプリに任せます。市場の 1 日がいつ終わるかを知っているのはアプリです。
  チケットは指値注文と逆指値注文で期日指定を選べます。チャートの時計での日付と時刻を指定し、初期値は今から 1 日後です。期限が過去になる注文は発注しません。
  IOC・FOK の指値注文は、市場価格を越えた価格を指定できます。約定は市場価格で行われ、チケットは金額・リスク・目標をその価格から計算します。
  チケットはストップリミット注文も受け付け、逆指値価格と指値価格を指定します。有効期限は取消まで、当日、期日指定から選べます。逆指値価格から指値価格までのどこでも約定しうるため、損切りは逆指値価格の外側、利確は指値価格の外側に置きます。口座パネルは注文の種類と両方の価格を、逆指値価格を先にして表示します。
</p>
<p>
  <strong>ネットの 1 ポジション。</strong>既定では、ペーパー口座は約定した注文ごとにポジションを建て、買いと売りが並びます
  （<code>positions: 'hedge'</code>）。<code>{`new PaperExecutionAdapter({ positions: 'net' })`}</code>
  は、先物口座のようにポジションを 1 つだけ持ちます：同じ向きの約定は、それらの価格の平均でポジションに加わり、
  反対向きの約定はポジションを減らしてその分を確定し（約定の <code>pnl</code>）、それより大きい約定はポジションをドテンし、
  残りは約定の価格で建ちます。ポジションを増やす約定は、損切りと利確を持っていればそれを持ち込みます。
  減らす約定はポジションの損切りと利確をそのままにし、ドテンする約定は自分のものを持ち込みます。
</p>
<h3 id="partial-fills">部分的に約定する注文</h3>
<p>
  指値注文は市場で待ち、ほかの注文が来るにつれて約定します。一部ずつになることもよくあります。
  <code>fillSize</code> を指定すると、ペーパー口座は 1 つの価格で指値注文をその数量までしか約定させません：
  それより大きい注文は、指値に達する価格ごと（<code>setMarkPrice</code> ごと）に一部が約定し、残りは有効なまま待ちます。
  注文は <code>filledQuantity</code> とともに <code>chart.getOrders()</code> に残ります。各部分はそれぞれ 1 つの約定
  （<code>executionFill</code>）で、その <code>remaining</code> は約定後に有効なまま残った数量です。最後の部分で注文は外れます。
  チャートは約定済みの数量を注文のタグに（<code>2/5</code>）、ウィジェットの口座パネルはその行に表示します。
  注文の損切りと利確のタグは、残りの数量が生む損益を示します。約定済みの分は、自分のタグを持つポジションになっているためです。
</p>
<pre><code>{`const broker = new PaperExecutionAdapter({ fillSize: 2 })   // two of a limit order at each price
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price: 95, quantity: 5 })

chart.on('executionFill', (e) => console.log(e.payload.quantity, e.payload.remaining))   // 2 3, then 2 1, then 1 undefined
chart.on('ordersChange', (e) => console.log(e.payload.orders[0]?.filledQuantity))        // 2, 4, then no order`}</code></pre>
<p>
  1 つの注文の各部分は、それらの価格の平均で 1 つのポジションを作ります。ネット口座では、口座のポジションに加わるか、そこから減らします。
  ポジションは最初の部分から注文の損切り、利確、レベルを受け取り、後の部分がそれらをもう一度持ち込むことはありません：
  その後に動かした、または外したストップは、そのままになります。ポジションが決済された後に約定した部分は、
  再び注文の損切りと利確を付けて、別のポジションを建てます。レベルは計画全体に対する数量なので、最初の部分だけでは
  その数量に届かないことがあります：レベルは建っている数量までしか取りません。ストップリミットも、指値として有効になった後は
  部分的に約定します。各部分は自分の手数料を支払い、口座がもう負担できない部分は、注文の残りをキャンセルします（<code>executionError</code>）。
  残りは移動やキャンセルができ、期日で終わることもあります。また、最初の部分が注文のグループの残りをキャンセルします。
  <code>'ioc'</code> の注文は、すぐに約定する分が約定し、残りは捨てられます（その約定の <code>dropped</code> が捨てられた数量を示し、<code>quantity</code> は指定より少ない数量です。
  <code>placeOrder</code> が返す注文には <code>filledQuantity</code> が付きます。ログは残りをキャンセルとして記録し、
  ウィジェットは約定した数量を知らせます）。市場の数量より大きい <code>'fok'</code> の注文は拒否されます。
  成行注文と逆指値注文は全量が約定し、決済も同じです：ペーパー口座の市場はその時点の価格で受け、スリッページは再現しません。
  独自のアダプターも、ブローカーの部分約定を同じ方法で報告します：<code>orders</code> に
  <code>filledQuantity</code> 付きの注文を、そして部分ごとに <code>fill</code> を送ります。
</p>

<h3 id="take-profit-levels">分割して利確する</h3>
<p>
  ポジションは分割して決済できます。注文の意図、またはポジション（<code>chart.modifyPositionIntent</code>）の
  <code>takeProfits</code> はレベルのリストで、それぞれが <code>price</code> と、そこで決済する
  <code>quantity</code> を持ちます。価格がレベルに達すると、その分がレベルの価格で決済され、レベルは消えます。
  レベルが残した分は建ったままで、<code>takeProfit</code> か損切りが決済します。
  損切りは、待っているレベルがあっても残りすべてを決済し、利確より先のレベルに達することはなく、
  レベルはまだ建っている数量までしか取りません。
  チャートはレベルごとにラインとタグを描き（TP1 が最も近いレベル）、その数量とそれが生む損益を表示します。
  ウィジェットの口座パネルは、最も近いレベルと、ほかにいくつあるかを表示します。
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
  ペーパー口座は各部分を決済し（それぞれ 1 つの約定で、<code>reason: 'takeProfit'</code> と確定した損益が付きます）、
  ポジションの <code>closedQuantity</code> に数えます。エントリーから見て利益になるレベルだけを受け付け、
  ネット口座では、レベルを持つ注文は、損切りと利確を渡すのと同じように、ポジションにそのレベルを渡します。
  チャート上の TP1 は、まだ待っている最も近いレベルです。独自のアダプターは、ブローカーのレベルを報告します。
  ウィジェットの注文チケットでは、<strong>利確の分割数</strong>として、利確までを 1 つ、2 つ、または 3 つのターゲットで進められます：
  2 つ以上のときは、エントリーから等間隔に並ぶ途中の各ターゲットで数量の均等な一部が決済され、残りを利確が決済します。
  チケットは、発注前に、どこで何が決済されるかを一覧で示します。
</p>
<p>
  ポジションのレベルは、損切りや利確と同じように、ラインでもタグでもチャート上でドラッグできます：
  ラインはポインターに追従し、元の位置がその後ろに薄く残ります。離すと、そのレベルを動かした、ポジションのすべての
  <code>takeProfits</code> を、最も近いものから順に持つ <code>positionModify</code> が発行されます。
  レベルは利益なので、エントリーの位置、またはそれを越えた損失側で離したレベルは元の位置に戻り、何も発行されません。
  押した位置から届く範囲に 2 つのレベルがあるときは、近いほうが選ばれます。同じ位置に注文のライン、損切り、または利確があるときは、
  レベルより先にそちらが選ばれ、レベルはタグで動かせます。まだ待っている注文のレベルは、注文が持ち込む計画であり、
  ハンドルではありません。ラインがロックされている間は、どのレベルもハンドルではありません。
</p>

<h3 id="account">資金のある口座</h3>
<p>
  <code>balance</code> を指定すると、ペーパー口座はブローカーと同じように資金を管理します。決済の損益は残高に入り、
  保有ポジションは証拠金（その価値を <code>leverage</code> で割った額）を拘束し、約定ごとに
  <code>commission</code> を支払います。余剰証拠金で負担できない注文は拒否され
  （<code>executionError</code>）、ドテンも同じです。待機中の注文は、その価格が来たときに資金がなくなっていれば
  キャンセルされ、これも <code>executionError</code> が伝えます。<code>multiplier</code> は、先物の契約について、
  価格が 1 動いたときの 1 単位あたりの価値です：市場の
  <code>contractMultiplier</code> を渡してください。ウィジェットのパネルは、これでポジションの損益を計算します。
  口座は、それを変えた約定より先に通知されるので、<code>executionFill</code> のリスナーの中の <code>chart.getAccount()</code>
  は、約定後の口座を読み取ります。<code>balance</code> がなければ口座はなく、これまでどおり、どの注文も受け付けられます。
</p>
<p>
  ポジションが証拠金を拘束している間、口座は有効証拠金がそれに対してどの水準にあるかを示します：
  <code>marginLevel</code>、つまり必要証拠金に対する有効証拠金の割合です（<code>1.5</code> は 150%）。
  これに対して 2 つの水準が働き、どちらも指定しなければ使われません。<code>marginCallLevel</code> を下回ると、
  口座は一度だけ警告し（<code>marginCall</code> イベント）、有効証拠金がその水準の上に戻った後でなければ再び警告しません。
  何も決済しません。<code>stopOutLevel</code> を下回ると、その時点の価格で、損失の最も大きいポジションから順に決済し、
  水準の上に戻るか、ポジションがなくなるまで続けます：1 つ決済するとその証拠金が解放され、それで足りることもあります。
  それぞれが <code>reason: 'liquidation'</code> の約定です。どちらも価格が来るたびに、その価格が達した注文とストップの後で
  計算されるので、損切りが先にそのポジションを決済し、有効証拠金を水準より下げた約定には、次の価格で対応します。
  ポジションの証拠金はエントリーの価格で拘束されるので、証拠金維持率は有効証拠金だけで動きます。
  強制決済は、待機中の注文を有効なまま残します：資金がなくなった注文は、その価格が来たときにキャンセルされます。
  どちらの水準もなければ、何も決済されず、残高はゼロを下回ることがあります。
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
  ウィジェットの口座パネルは、合計の先頭に残高、有効証拠金、余剰証拠金を表示し、証拠金維持率があるときはそれも表示します。
  マージンコールは警告として表示し、履歴では強制決済の約定をその名前で示します。独自のアダプターは、
  <code>getAccount()</code> を実装し、資金が変わるたびに <code>AccountSummary</code> 付きの <code>account</code> を、
  ブローカーが警告したときに <code>marginCall</code> を発行することで、同じことができます。
</p>

<h3 id="symbols">複数の銘柄を取引する口座</h3>
<p>
  チャートが表示する銘柄は 1 つですが、口座は多くの銘柄を保有できます。注文、ポジション、約定はそれぞれ、
  自分の銘柄（<code>symbol</code>）を示すことができます。チャートは、表示中の銘柄のものと、銘柄を示していないものを
  描きます。別の銘柄を示すものは保持され、その銘柄が表示されたときに再び描かれます。<code>getOrders()</code>、
  <code>getPositions()</code>、<code>getFills()</code> は口座全体を返し、<code>ordersChange</code> と
  <code>positionsChange</code> も同じです。そのうちどれがチャート上にあるかは <code>chart.getSymbol()</code> で
  わかります。チャートが出す注文には表示中の銘柄が付き（<code>orderPlace</code> の <code>symbol</code>）、
  ペーパー口座はそれを注文、その注文が開くポジション、それらの約定に保持します。複数銘柄の口座のための独自の
  アダプターでは、それぞれに銘柄を付けてください。チャートは推測しません。銘柄を示していないものは、これまでどおり
  すべての銘柄で描かれます。2 つの名前は大文字と小文字を区別せずに同じ銘柄とみなされ、片方だけが取引所を付けている場合は
  ティッカーで比べます（<code>BTCUSDT</code> と <code>BINANCE:BTCUSDT</code>）。両方が取引所を付けている場合は、
  同じ取引所でなければなりません。
</p>
<p>
  約定は 1 つの銘柄のバー上の印なので、チャートは各約定に銘柄を与えます。約定自身のもの、なければそのポジションか
  注文のもの、それもなければ約定が届いたときに表示していた銘柄です。ウィジェットの口座パネルはすべての銘柄の行を
  並べ、別の銘柄の行があるときは銘柄名を示します。別の銘柄のポジションには、アダプターがそのポジションに与えた価格
  （ポジションの <code>markPrice</code>）とその価格での損益が表示され、なければどちらも表示されません。
  チャートの価格はその銘柄の価格ではないからです。板情報は、表示している板の銘柄の注文だけに印を付けます。
</p>
<p>
  ブローカーはポジションをマーク価格で評価しますが、それはチャートが表示する直近の約定価格とは限りません。
  アダプターがポジションに <code>markPrice</code> を与えると、パネルの行とチャート上のタグはその価格で損益を
  計算します。チャート自身の銘柄のポジションでも同じなので、各行は口座の含み損益と一致します。マーク価格が動いたら
  ポジションをもう一度送ってください。なければ、チャートの銘柄のポジションはチャートの最新価格で計算されます。
</p>
<p>
  ストリーム（<code>connect</code>、<code>switchStream</code>）があれば、チャートは自分の銘柄を知っています。
  バーを自分で設定する場合は、差し替えるときに銘柄を伝えてください。<code>ChartWidget</code> は銘柄が選ばれたときに
  自分で伝えます。
</p>
<pre><code>{`chart.setData(barsOf('ETHUSDT'))
chart.setSymbol('ETHUSDT')        // ETHUSDT の注文とポジションを描く。'' で再びすべてを描く
chart.getSymbol()                 // 'ETHUSDT'

chart.setPositions([
  { id: 'p1', symbol: 'BTCUSDT', side: 'buy', entryPrice: 64_000, quantity: 1, markPrice: 64_250 },   // 保持され、描かれない
  { id: 'p2', symbol: 'ETHUSDT', side: 'sell', entryPrice: 3_150, quantity: 2 },                      // 描かれる
])`}</code></pre>
<p>
  価格も 1 つの銘柄のものです。ペーパー口座に価格を渡すときに銘柄を付けると、その価格はその銘柄の注文とストップだけを
  処理し、その銘柄のポジションだけを評価します。ポジションは自分の銘柄の最新価格で決済、ドテン、強制決済され、
  ネット口座は銘柄ごとに 1 つのポジションを持ちます。銘柄を付けない価格は、これまでどおり口座が持つすべての価格です。
  渡す価格にはすべて銘柄を付けるか、すべて付けないかにしてください。銘柄を付けない価格が 1 つあると、口座は再び 1 つの市場になります。
  リプレイ中、チャートは渡す価格に銘柄を付けます。
</p>
<pre><code>{`feed.onTrade((trade) => broker.setMarkPrice(trade.price, trade.time, trade.symbol))`}</code></pre>

<h3 id="live-price">リアルタイムでなくなった価格</h3>
<p>
  ウィジェットのフィードが接続され、データを送り続けている間、チャートの価格はリアルタイムです。フィードが切断されたとき、
  または接続中でも 1 分間（<code>feedQuietAfter</code>、秒）何も送ってこないときは、最後の価格がそのまま残ります。
  このときステータスバーは「Live」の代わりにそのことを表示し、チケットは成行注文を送らず、それ以外の注文には警告を
  出します（価格はトレーダー自身が入力したものだからです）。フィードが切断されている間は、ワンクリックの注文
  （右クリックメニュー、板情報）と、チャート上で確定したブラケット注文やドラフト注文も、メッセージとともに保留されます
  （後の 2 つは <code>chart.setOrderGate</code> が保留します）。ポジションの決済と注文のキャンセルが保留されることは
  ありません。閉場中の市場（銘柄の <code>sessions</code>）はもともと静かなので判定されず、リプレイと自分で用意したバー
  （<code>adapter</code> なし）も判定されません。その場合は自分の <code>orderPlace</code> ハンドラーで注文を止めてください。
</p>
<pre><code>{`new ChartWidget(host, { adapter, symbol: 'BTCUSDT', trading: true, feedQuietAfter: 30 })   // seconds; 0: never
chart.getFeedTime()   // when the stream last told anything, ms; null before it has`}</code></pre>

<h3 id="confirmations">確認</h3>
<p>
  <code>ChartWidget</code> では、ワンクリックで成立する取引は先に確認されます。ポジションの決済やドテン
  （口座パネルの行、チャート上のボタン）、右クリックメニューや板情報からの注文です。ダイアログには取引の内容
  （売買の別、数量、価格、銘柄）がすべて表示されます。Enter で実行し、Escape で取りやめます。
  <code>confirmOrders: false</code> はワンクリック取引で、トレーダーがそれを求めるブローカー向けです。
  注文チケットは二重に確認されません。その発注ボタンが確認だからです。板情報では、買い気配のセルを押すとその価格に
  買い指値が出され、そこにある買い注文に並びます。売り気配のセルを押すと売り指値が出されます。各セルは押す前に、
  数量とともにそのことを示します。
</p>
<pre><code>{`new ChartWidget(host, { adapter, symbol: 'BTCUSDT', trading: true, confirmOrders: false })   // one-click trading
chart.setPositionGuard((action, positionId, send) => ask(action, positionId).then((yes) => yes && send()))   // your own, on a headless Chart`}</code></pre>

<h3 id="broker-rules">ブローカーの注文ルール</h3>
<p>
  取引所のプリセット（<code>setMarket</code>）には、その呼値と売買単位があります。ブローカーがあるセッションで
  ある銘柄について受け付けるものはブローカー独自のもので、ライブラリのリリースなしに変わります。
  <code>orderRules</code> で渡し、銘柄やセッションが変わったら <code>widget.setOrderRules</code> で渡し直してください。
  <code>orderKinds</code> は、成行、指値、逆指値、逆指値指値の代わりにチケットが提示する注文の種類で、それぞれ
  取引所での名前（<code>code</code>）と、チャートが理解する種類（<code>type</code>）を持ちます。後者はチケットが
  価格を尋ねるかどうかと注文の描き方を決め、名前は <code>exchangeType</code> として注文とともにブローカーへ渡ります。
  <code>timesInForce</code> は受け付ける有効期間（種類ごとに独自のものも指定できます）、<code>lot</code> は市場の
  売買単位より優先されます。ペーパー口座は注文に名前を保持し、<code>type</code> として約定させます。寄付きや引けの
  板寄せはシミュレートしません。右クリックメニューや板情報からの注文は、その type に当たるブローカーの種類として、
  受け付けられる有効期間を付けて送られます。該当する種類がブローカーにない場合（HOSE の逆指値など）は送られません。
  ブラケット注文、チャート上でドラッグしたドラフト注文、ポジションの決済やドテンには名前が付きません。それらには
  アダプター側で取引所の種類を付けてください。成行の注文に有効期間が付くことはありません。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  adapter, symbol: 'VNM', trading: true,
  orderRules: {
    orderKinds: [
      { code: 'LO', type: 'limit' },
      { code: 'ATO', type: 'market' },
      { code: 'ATC', type: 'market' },
      { code: 'MP', type: 'market' },
    ],
    timesInForce: ['day'],
    lot: 100,
  },
})
// Another session, another list: an open ticket takes it at once
widget.setOrderRules({ orderKinds: [{ code: 'ATC', type: 'market' }, { code: 'LO', type: 'limit' }], timesInForce: ['day'], lot: 100 })

chart.on('orderPlace', (e) => send(e.payload.exchangeType ?? e.payload.type, e.payload))   // 'ATO', and type: 'market'`}</code></pre>

<h2>チャート上で注文とポジションを操作する</h2>
<p>
  注文とポジションのラインの右端には小さなボタンがあります。<strong>×</strong> は注文をキャンセルするか
  ポジションを決済し、<strong>⇅</strong> はポジションをドテンします。損切りや利確のライン上の × は、
  そのラインを削除します。これらは API と同じ意図（<code>orderCancel</code>、<code>positionClose</code>、
  <code>positionReverse</code>、<code>null</code> を指定した <code>positionModify</code>）を発行するため、
  接続済みのアダプターがそれを処理し、アダプターのないホストアプリにはイベントが届きます。
  ボタンは、その上で離したときに動作します。押したまま外へずらした場合は何も起こりません。
  どのボタンも <code>setTradingConfig</code> の <code>lineButtons</code> でオフにできます。
</p>
<pre><code>{`chart.setTradingConfig({ lineButtons: { reverse: false } })  // keep cancel, close and remove-stops

chart.cancelOrderIntent('ord-1')
chart.closePositionIntent('pos-1')
chart.reversePositionIntent('pos-1')                 // close, then the same size the other way
chart.modifyPositionIntent({ positionId: 'pos-1', stopLoss: null }) // null removes the stop
chart.modifyPositionIntent({ positionId: 'pos-1', trailingStop: 150 }) // the stop trails the price by 150; null ends the trail`}</code></pre>
<p>
  1 回の操作でドテンできるアダプターは <code>reversePosition</code> を実装します。
  実装がなければ、チャートはポジションを決済してから、反対方向に成行注文を出します。
  注文には <code>stopLoss</code>、<code>takeProfit</code>、トレールの距離を指定でき、
  これらはその注文で建てたポジションに引き継がれます。
</p>
<p>
  <strong>アダプターの作者へ：</strong><code>PositionModifyIntent</code> では、
  <code>stopLoss: null</code>（または <code>takeProfit: null</code>）は削除を意味し、
  フィールドがない場合はそのまま維持することを意味します。
  <code>intent.stopLoss ?? position.stopLoss</code> のように書いたコードでは、ユーザーが削除した損切りが残ってしまいます。
</p>
<p>
  <strong>トレーリングストップ</strong>は価格に追随するストップロスです。ポジションの <code>trailingStop</code> は、ストップが最良価格の後ろに保つ距離（価格単位）で、ロングでは上へ、ショートでは下へ追随し、決して戻りません。チャート上ではタグが TSL と表示されます。ストップのタグにあるボタンで、現在の価格からストップまでの距離でトレールを開始、または終了できます。<code>lineButtons: {'{'} trailStop: false {'}'}</code> でボタンを隠せます。ペーパー口座はストップを自ら動かします。ブローカー向けアダプターは <code>modifyPosition</code> で受け取った <code>trailingStop</code> を渡し（数値で開始、<code>null</code> で終了し、ストップはその位置に残ります）、ブローカーが動かしたポジションの <code>stopLoss</code> を報告します。注文にも持たせられます。注文の <code>trailingStop</code> は、その注文が開くポジションを最初からトレールさせ、待機中の注文のストップは TSL と表示されます。注文チケットでは、ストップロスの下にあるトレーリングストップのスイッチがそれで、エントリーからストップまでの距離でトレールします。ストップがトレール中のあいだ、タグのトレールボタンは塗りつぶされます。
</p>

<h2>チャート上の約定</h2>
<p>
  約定はそれぞれのバーに小さなマークで表示されます。ポジションを建てた約定は塗りつぶし、
  決済した約定は中抜きです。チャートはアダプターが報告した約定を記録し、約定の理由
  （<code>'order'</code>、<code>'close'</code>、<code>'reverse'</code>、<code>'stopLoss'</code>、
  <code>'takeProfit'</code>）と確定した損益を付けて <code>executionFill</code> を発行します。
</p>
<pre><code>{`chart.on('executionFill', (e) => {
  const { side, price, quantity, reason, pnl } = e.payload
})

chart.addFill({ orderId: 'o-7', side: 'buy', price: 64_150, quantity: 1, time: Date.now() })
chart.getFills()        // the latest 1000
chart.getRealisedPnl()  // every fill's P&L since the last clearFills
chart.clearFills()
chart.setTradingConfig({ fillMarks: false })  // no marks`}</code></pre>

<h2>右クリックメニューと価格軸の「+」</h2>
<p>
  チャートを右クリックすると、クリックされた部分（<code>'plot'</code>、<code>'pane'</code>、
  <code>'priceAxis'</code>、<code>'timeAxis'</code> のいずれか）と、その位置の価格と時刻を含む
  <code>chartContextMenu</code> が発行されます。<code>features.priceAxisAddButton</code> を有効にすると、
  価格軸上にクロスヘアを追って動く「+」が表示され、押すとその価格を含む <code>priceAxisAdd</code> が発行されます。
  「+」が表示されている間、注文とポジションのタグはその左で終わるため、タグのボタンが隠れることはありません。
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget のメニューは、これらのイベントの上に作られています。プロット領域を右クリックすると、
  その価格でのアラート、買いと売り（約定を待つ側なら指値、反対側なら逆指値）、注文チケット、水平線が並び、
  続いて表示のリセット、コピーした描画の貼り付け、描画の非表示と削除、インジケーターの削除（ほかの
  シンボルとの比較は残ります）、データのエクスポート、設定が並びます。
</p>
<p>
  価格軸を右クリックすると、スケールのリセット、自動スケール、反転スケールと左側のスケール、4 つの
  モード（標準、対数、パーセント、100 を基準）の選択、軸上のラベルとチャートを横切るラインを
  まとめた 2 つのサブメニュー、その価格でのアラート、「スケール」タブで開く設定が並びます。時間軸には
  リセット、日付への移動、タイムゾーンがあります。
</p>
<p>
  ウィジェットのショートカットがオンのあいだは、項目にそのキーが表示されます：<kbd>Alt</kbd> +
  <kbd>R</kbd> で表示のリセット、<kbd>Alt</kbd> + <kbd>I</kbd> でスケールの反転、<kbd>Alt</kbd> +
  <kbd>G</kbd> で日付への移動。サブメニューはクリック、<kbd>Enter</kbd>、<kbd>→</kbd>、またはポインターを
  しばらく重ねると開き、<kbd>←</kbd> か <kbd>Escape</kbd> で戻ります。メニューが下から開くスマートフォンでは、
  サブメニューの先頭の行で前に戻ります。独自の項目は <code>chartMenuItems</code> で追加できます
  （<a href={href('/docs/api')}>API リファレンス</a>を参照）。
</p>

<h2>注文チケットと口座パネル（ChartWidget）</h2>
<p>
  ツールバーの <strong>取引</strong> メニューの <strong>口座</strong> で、チャートの下に口座パネルが開きます。保有ポジションとその損益、
  未約定の注文、これまでの約定と確定損益、そして注文に起きたことのログが表示され、各行から決済、ドテン、キャンセルができます。
  <strong>新規注文</strong>では注文チケットが開きます。買いか売り、成行・指値・逆指値、数量、価格、
  任意の損切りと利確、有効期限を指定します。入力中に注文をチェックし（買いの指値は市場価格より下、
  損切りはエントリーに対して損失側に置く…）、リスクリワード比を表示します。発注すると
  <code>orderPlace</code> の意図が送られます。
  マーケットを設定している場合（<code>chart.setMarket</code>）は、各価格をマーケットの呼値の単位に合わせ、注文価格を当日の
  上限価格と下限価格の範囲内に収め、数量は 1 単位から始まり、1 単位を超えると売買単位の整数倍だけを受け付けます
  （それより少ない株数は、別の単元未満株の注文になります）。
</p>
<p>
  フィードが買気配と売気配の両方を渡す場合、注文チケットは買いを売気配で、売りを買気配で評価・検証・送信します。そうでなければどちらも最新価格です。
  執行アダプターが接続されているときは、アダプターの答えを待ちます：チケットは開いたまま、ボタンの位置に<strong>送信中…</strong>と表示され、
  何も変更できません。注文が受け付けられると閉じ、拒否された場合は入力内容を残し、注文が変更されるまで理由を表示します。10 秒たっても応答がなければその旨を表示して待ち続けます。再送信する前に注文を確認してください。
  チケットの外を押しても閉じません。Escape、キャンセル、×で閉じます。右クリックメニューや板情報ラダーの 1 段から 1 回の操作で出す注文の数量は、
  その市場の売買単位（<code>volumeUnit</code>）で、単位がなければ 1 です。
</p>
<p>
  注文チケットはタイトルの横に銘柄を表示します。注文の種類と有効期間は横並びの選択肢で、矢印キーで切り替えられます。
  − と + は数量を売買単位ごとに、価格を市場の呼値ごとに動かし、チャートから渡された価格は最初にその呼値に丸められます。
  オンにした損切りと利確には建値からの距離（%）と達したときの損益が表示され、その下のレシートに注文の金額、リスク、
  リワード、リスクリワード比がまとまります。買いと売りを切り替えても待機中の注文は置いた価格のままで
  （市場より上の買い逆指値は売り指値になります）、発注ボタンは売買の色になります。
</p>
<p>
  ウィジェットでは、トレーディングがオンの間、選択したロング/ショートポジションの描画のツールバーに <b>注文を作成</b> が表示されます。
  押すと描画の内容を入れたこのチケットが開きます：売買の向き、価格としてのエントリー、損切りと利確、
  そしてリスクに見合う数量（描画が書く小数桁数に切り捨て）です。注文の種類は市場価格に対するエントリーの位置で決まり、
  発注を押すまで何も送られません。
</p>
<p>
  口座パネルの上部には、どのタブでも含み損益と確定損益が表示されます。数字は等幅書体で右揃え、
  金額は呼値の桁数と数値ロケールで書かれ、スマートフォンでは各行が項目名付きのカードになります。
</p>
<p>
  ウィジェットは、送った注文がどうなったかを知らせます。アダプターが拒否した注文はアダプター自身の言葉で、
  一部だけ約定して残りが捨てられた注文は約定した数量を知らせます。
</p>
<p>
  <strong>ログタブ</strong>は、注文に起きたことを新しい順に並べます：発注、移動、キャンセル、約定した各注文と、
  ブローカーが拒否したものとその理由です。ログを保持するのはチャートなので、独自のチャートでも使えます：
  <code>chart.getActivityLog()</code> は最新の 200 件を古い順に返し、各項目は
  <code>{`{ time, kind, orderId, side, type, quantity, price, reason, pnl, message }`}</code> の形で、その
  <code>kind</code>（<code>'placed'</code>、<code>'moved'</code>、<code>'cancelled'</code>、
  <code>'filled'</code>、<code>'rejected'</code>）にあるものを持ちます。ログは、執行アダプター、または <code>setOrders</code> と
  <code>addFill</code> によってチャートに伝えられた注文、約定、エラーから読み取られます。ログが始まったときにあった注文は含まれず、
  アダプターを接続したときや外したとき、（アダプターなしで）シンボルが変わったときにあった注文も含まれません：
  それらはそこにあるものであって、発注された注文ではありません。一部が約定してから外された注文は、キャンセルとして記録されます。
  <code>chart.clearActivityLog()</code> でログを空にします。
</p>
<p>
  <strong>チャート上の売りと買い。</strong>執行アダプターが接続されている間、ウィジェットはチャートの凡例の下に 2 つのボタンを表示し、
  それぞれに取引される価格が付きます：売りには最良買気配、買いには最良売気配で、その間にスプレッドが表示されます
  （<code>chart.setBidAsk</code>、またはティックがそれらを持つフィード）。そうでなければ、リプレイ中やフィードが片側しか渡さないときのように、
  両方に最新価格が付きます。押すと、その側で注文チケットが開きます。<code>executionChange</code> はアダプターが接続されたときと
  外されたときを、<code>bidAskChange</code> は買気配と売気配が変わったときを伝え、<code>tradeButtons</code> スイッチでボタンをオフにできます。
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
  約定マークはチャートに表示中のシンボルに属します。ウィジェットでシンボルを切り替えると、
  次のシンボルはマークのない状態から始まります。
</p>

<h2>ドラッグで注文を作成</h2>
<p>
  ドラッグできる注文ラインを 1 本作り、価格までドラッグして確定します。注文の種類（指値か逆指値か）は、
  現在価格に対してどこでドロップしたかで判断されます。<code>connectExecution</code> と組み合わせると、
  確定した下書きがすぐに約定します。
</p>
<pre><code>{`chart.startOrderDraft('buy')   // draggable line at the latest close
chart.confirmOrderDraft()      // emits orderPlace -> a connected adapter fills it
chart.cancelOrderDraft()`}</code></pre>

<h2>ブラケット注文（ドラッグで発注）</h2>
<p>
  ドラッグできるブラケット（エントリーに加えて、損切りと利確のゾーン）を作り、3 本のラインをドラッグして
  エントリー、リスク、リワードを調整します。<kbd>Enter</kbd>（または「発注」ボタン）で確定し、
  <kbd>Esc</kbd> でキャンセルします。ウィジェットでは、ツールバーの緑 / 赤の矢印でロング / ショートの
  ブラケットを開始します。チャートは <code>bracketPlace</code> イベントを 1 つ発行し、接続されている執行アダプターに
  ブラケットを送ります（下記）。アダプターがなければ、このイベントはバックエンドが処理するためのものです。
</p>
<p>
  <strong>サイズ。</strong>ブラケットは、そのサイズから決まる数量の注文です。<code>{`{ quantity: 2 }`}</code>
  はその数量です。<code>{`{ risk: 50 }`}</code> はストップで失う金額です：数量は 50 をエントリーからストップまでの距離
  （に <code>multiplier</code>、つまり価格が 1 動いたときの 1 単位あたりの価値を掛けたもの）で割り、
  <code>quantityStep</code> に切り捨てたもので、ラインをドラッグすると追従します。数量はエントリーのタグに表示され、
  <code>bracketPlace</code> にも含まれます。ウィジェットでは、ブラケットバーの入力欄に数量を入力します。
  入力欄は前回入力した数量、なければ市場のロットから始まります。<code>widget.startBracket(side, size)</code>
  もサイズを受け取ります：リスクでサイズを決めるブラケットには入力欄がありません。
  <code>bracketQuantity(bracket, size)</code> は同じ計算を自分のコードで使うためのものです。
</p>
<p>
  執行アダプターを接続していると、チャートは確定したブラケットを 1 つの注文としてアダプターにも送ります：
  エントリー（価格がエントリーまで戻る必要があるときは指値、さらに進む必要があるときはストップ）、数量、
  そして注文に付くストップロスとテイクプロフィットです。アダプターが受け付けると、チャートはその注文とともに
  <code>bracketOrder</code> を送ります。アダプターが拒否した場合は、<code>command: 'bracketPlace'</code> の
  <code>executionError</code> を送ります。ウィジェットが「発注済み」と表示するのはそのときだけで、
  拒否されたときは理由を表示します。数量のないブラケットは確定されません。発注するサイズを誰も見ていないためです：
  <code>confirmBracket()</code> は false を返し、ブラケットは数量が与えられるまでチャートに残ります。
  指値エントリーとストップエントリーを区別するための価格がチャートにまだないうちに確定したブラケットは送られません。
  <code>executionError</code> が <code>reason</code>（<code>'noQuantity'</code>、<code>'noPrice'</code>）を伝え、
  ウィジェットもそれを表示します。イベントのブラケットを自分で発注するアプリは <code>brackets: 'event'</code>
  で接続します：ブラケットはイベントのままで、ウィジェットは確定したと表示します。3.0 より前はこれが既定でした
  （<a href={href('/docs/migration-3')}>3.0 への移行</a> を参照）。
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

<h2>板情報（クリックで取引）</h2>
<p>
  オプトインの板情報ラダーは、オーダーブックを価格の行と、買い / 売りの数量の列で表示します。
  売り（ask）のセルをクリックするとその価格で買い、買い（bid）のセルをクリックするとその価格で売ります。
  <code>depthLadder: true</code> で有効にし、<code>widget.setDepth</code> で板のデータを渡します。
  クリックすると OMS 向けの <code>orderPlace</code> の意図が発行されます（チャート自身は取引しません）。
  同じデータは、チャート上の板のオーバーレイにも使われます。
</p>
<p>
  板情報はチャート横の dock のページです（スマートフォンではシート）。取引メニュー、レールのボタン、または
  <code>widget.openPanel('depthLadder')</code> で開き、<code>dock.depthLadder: false</code> でレールのボタンを外せます。
  売りは買いの上に並び、その間にスプレッドが入ります。各数量には価格の列から伸びるバーが付き、
  自分の待機注文がある価格の行にはその数量が表示されます。
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

<h2>チャート上の板情報</h2>
<p>
  <code>features.depth</code> は、価格だけを表示するチャート向けに、板情報を右端からプロット上に描きます。注文も取引 UI も要らず、
  <code>trading: false</code> でも動きます。データは <code>chart.setDepthData</code> で渡します（<code>widget.setDepth</code> も同じことをします）。
  <code>features.depth</code> を有効にするとオーバーレイも有効になり、見た目は <code>setDepthOverlay</code> で変えます。
</p>
<ul>
  <li><code>mode</code>：<code>'cumulative'</code>（既定）は各価格を市場に近い価格と合算するので、市場から離れるほどバーが伸びます。<code>'level'</code> は各価格の数量だけを描くので、大きな板は 1 本の長いバーになります。</li>
  <li><code>rowSize</code>：バーの高さを価格で指定します。各価格はこの間隔の行にまとめられるので、粗い価格目盛りの上の密な板や、空いた価格がある板でも、均一なバーで描かれます（フットプリントの行に合わせられます）。このとき <code>markBest</code> は最良の行の中央に線を引きます。</li>
  <li><code>rowOrigin</code>：行の始まりを価格で指定します。k 番目の行は <code>rowOrigin + k × rowSize</code> から次の行の始まりまでとなり、行の始まりちょうどの価格はその行に入ります。行サイズの倍数からセルが始まり、各ティックが価格を中心に置かれるフットプリントには <code>rowOrigin: -tick / 2</code> で揃います。指定しないと各行は <code>rowSize</code> の倍数を中心にします。</li>
  <li><code>markBest</code>：最良買気配と最良売気配に線を引きます（<code>bestBidColor</code>、<code>bestAskColor</code>）。</li>
  <li><code>maxWidth</code>：バーの最大長（ピクセル、プロットの幅まで）、<code>bidColor</code>、<code>askColor</code>。</li>
</ul>
<p>
  バーは最新のローソク足の上に重なります。余白を作るには <code>rightMargin</code> を増やし、<code>maxWidth</code> をその本数分ほどにします。
  取引が有効なときは、これまでどおり <code>{`setTradingConfig({ depthOverlay: { enabled: true } })`}</code> でオンにできます。
</p>
<pre><code>{`const chart = new Chart(host, {
  features: { trading: false, depth: true },       // display only: no orders, no trading UI
  depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 },
  rightMargin: 14,                                  // empty slots past the newest bar, room for the bars
})
chart.setDepthData(orderBook)                       // { bids, asks }; null clears it
chart.setDepthOverlay({ mode: 'cumulative' })       // change the look later`}</code></pre>

<h2>流動性ヒートマップ</h2>
<p>
  オーダーブックのスナップショットを蓄積し、ローソク足の背後にヒートマップとして表示します。
  各スナップショットは縦の帯になり、価格レベルごとに板に並ぶ数量が明るく表示されます（買いは緑、売りは赤）。
  時間がたっても残り続ける流動性の壁が浮かび上がります。設定シート（または
  <code>chart.setDepthHeatmapVisible</code>）で切り替えます。<code>widget.setDepth</code> は
  板が更新されるたびにスナップショットを記録します。
  リプレイ中は、時刻なしで記録された板はライブ系列の最後の足に属し、ヒートマップはリプレイで表示済みの足の板だけを表示します。
  プロット端の板（ライブ市場のもの）はリプレイが終わるまで隠れます。
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })
chart.setDepthHeatmapConfig({ bidColor: '#1e88e5', askColor: '#fb8c00' })   // 独自の色。null でテーマのローソク足の色

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()
// books recorded for older bars, oldest first: chart.pushDepthSnapshot(orderBook, bar.time)`}</code></pre>

<h2>シグナルマーカー</h2>
<p>ボットやシグナル取引との連携で、オーバーレイ上に方向を示す矢印を配置できます。</p>
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
  ChartWidget では、ポインターの下にあるマーカーの横にメモを表示します。内容はラベルとソース、方向、
  価格、信頼度、時刻です。
</p>

<h2>マーク</h2>
<p>
  ある時刻に起きたこと（ニュース、決算日、配当、株式分割）を、その時刻を含むバーの位置で、
  価格ペインの下端に小さなバッジとして表示します。ポインターをバッジに重ねるとタイトルと本文が
  読めます。重なるバッジは件数付きの 1 つにまとまります。リプレイでは到達した時点で各マークが現れます。
  Renko、カギ足、新値足、ポイント＆フィギュア、レンジバーではマークを描きません（バーが時刻を表さないため）。
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
  <code>kind</code> が文字と色を決めます：<code>news</code> は N、<code>earnings</code> は E、
  <code>dividend</code> は D、<code>split</code> は S、<code>event</code>（または未指定）は i。
  <code>label</code>（1〜2 文字）と <code>color</code> で置き換えられます。マークには
  <code>title</code> と <code>time</code> が必要で、http(s) のリンクだけが保持され、チャートは最大
  2,000 件まで保持します。マークはフィードのものであり、ユーザーのものではありません：
  <code>saveState</code> には含まれないので、読み込み後に設定し直してください。
</p>
<p>
  ChartWidget はシンボルのニュース見出しをニュースソース（<code>news</code>、またはアダプターの
  <code>fetchNews</code>）からチャートに表示します。<code>newsMarks: false</code>
  でシンボル情報パネルだけに留めます。マークをクリックするとリンクが新しいタブで開き、
  複数をまとめたバッジでは新しい順の一覧が開きます。ウィジェットの機能スイッチ
  <code>marks</code> はすべてのマークを隠します。独自の <code>setMarks</code> や
  <code>clearMarks</code> を呼んでも、ウィジェットの見出しはチャートに残ります。
</p>

<h2>トレードゾーン</h2>
<p>エントリー → エグジットを、損益で色分けした長方形と方向のバッジで可視化します。</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  direction: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
})`}</code></pre>

<h2>ポジションラベルのトークン</h2>
<p>
  ポジションのタグを自由に書けます。<code>positionLabel</code> は数量の後ろの売買の向きと損益に置き換わります。
  テンプレート文字列か、文字列を返す関数を指定します。
</p>
<pre><code>{`chart.setTradingConfig({
  positionLabel: '{side} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  使用できるトークン：
  <code>{'{side}'}</code>、<code>{'{qty}'}</code>、<code>{'{openQty}'}</code>、
  <code>{'{closedQty}'}</code>、<code>{'{entry}'}</code>、<code>{'{price}'}</code>、
  <code>{'{pnl}'}</code>、<code>{'{pnlPct}'}</code>、<code>{'{pnlSign}'}</code>。
</p>

<h2>損益グラデーションのカラーストップ</h2>
<pre><code>{`chart.setTradingConfig({
  pnlThresholds: [
    { pnl: -Infinity, color: '#ef4444' },
    { pnl: 0,         color: '#94a3b8' },
    { pnl: 500,       color: '#10b981' },   // 500 or more in profit
  ],
})`}</code></pre>

<p>
  タグの含み損益と現在値までの帯は、<code>pnl</code> がポジションの損益（金額）以下である最も高いストップの色になります。
</p>
