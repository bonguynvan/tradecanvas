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
<pre><code>{`chart.addPosition({
  id: 'pos-1',
  side: 'long',
  entry: 65_200,
  quantity: 0.5,
  closedQuantity: 0.1,   // partial-close band on the left edge
  stopLoss: 64_800,
  takeProfit: 66_000,
})`}</code></pre>

<h2>注文</h2>
<pre><code>{`chart.addOrder({
  id: 'ord-1',
  side: 'sell',
  type: 'limit',
  price: 65_500,
  quantity: 0.25,
})`}</code></pre>

<p>価格ラインをドラッグして変更します。変更は <code>chart.on('orderModify', ...)</code> で購読できます。</p>

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

chart.on('executionError', (e) => toast(e.payload.message))
// chart.disconnectExecution()`}</code></pre>
<p>
  実際のブローカーや OMS と接続するには、<code>ExecutionAdapter</code> を実装します（<code>DataAdapter</code> と対になる構造です）：
  <code>placeOrder</code>、<code>modifyOrder</code>、<code>cancelOrder</code>、
  <code>modifyPosition</code>、<code>closePosition</code> に加え、<code>orders</code> /
  <code>positions</code> / <code>fill</code> / <code>error</code> イベントです。
  <code>PaperExecutionAdapter</code> は、デモやテスト用に仮想的に約定させるサンドボックスです。
</p>

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
chart.modifyPositionIntent('pos-1', { stopLoss: null }) // null removes the stop`}</code></pre>
<p>
  1 回の操作でドテンできるアダプターは <code>reversePosition</code> を実装します。
  実装がなければ、チャートはポジションを決済してから、反対方向に成行注文を出します。
  注文には <code>stopLoss</code>、<code>takeProfit</code>、<code>timeInForce</code>
  （<code>'gtc'</code> または <code>'day'</code>）を指定でき、これらはその注文で建てたポジションに引き継がれます。
</p>
<p>
  <strong>アダプターの作者へ：</strong><code>PositionModifyIntent</code> では、
  <code>stopLoss: null</code>（または <code>takeProfit: null</code>）は削除を意味し、
  フィールドがない場合はそのまま維持することを意味します。
  <code>intent.stopLoss ?? position.stopLoss</code> のように書いたコードでは、ユーザーが削除した損切りが残ってしまいます。
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
</p>
<pre><code>{`const chart = new Chart(host, { features: { priceAxisAddButton: true } })

chart.on('chartContextMenu', (e) => {
  const { area, x, y, price, time } = e.payload
  openMyMenu(x, y)
})
chart.on('priceAxisAdd', (e) => openMyMenu(e.payload.x, e.payload.y, e.payload.price))`}</code></pre>
<p>
  ChartWidget のメニューは、これらのイベントの上に作られています。プロット領域を右クリックすると、
  その価格でのアラート、買いと売り（約定を待つ側なら指値、反対側なら逆指値）、注文チケット、水平線、
  表示のリセット、描画の操作が並びます。価格軸ではスケールの切り替え、時間軸では表示のリセットと
  日付への移動が並びます。独自の項目は <code>chartMenuItems</code> で追加できます
  （<a href={href('/docs/api')}>API リファレンス</a>を参照）。
</p>

<h2>注文チケットと口座パネル（ChartWidget）</h2>
<p>
  ウィジェットのレシートボタンで、チャートの下に口座パネルが開きます。保有ポジションとその損益、
  未約定の注文、これまでの約定と確定損益が表示され、各行から決済、ドテン、キャンセルができます。
  <strong>新規注文</strong>では注文チケットが開きます。買いか売り、成行・指値・逆指値、数量、価格、
  任意の損切りと利確、有効期限を指定します。入力中に注文をチェックし（買いの指値は市場価格より下、
  損切りはエントリーに対して損失側に置く…）、リスクリワード比を表示します。発注すると
  <code>orderPlace</code> の意図が送られます。
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  trading: true,         // default
  accountPanel: true,    // default when trading is on
})
widget.getChart().connectExecution(new PaperExecutionAdapter({ markPrice: 64_000 }))
widget.toggleAccountPanel(true)
// The panel follows ordersChange, positionsChange, executionFill and each tick.`}</code></pre>
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
  ブラケットを開始します。チャートはバックエンドが処理するための <code>bracketPlace</code> イベントを
  1 つ発行するだけで、自ら注文を出すことはありません。
</p>
<pre><code>{`chart.startBracket('buy')          // entry defaults to the latest close
chart.startBracket('sell', 64_800) // or pin the entry price

chart.on('bracketPlace', (e) => {
  const { side, entry, stopLoss, takeProfit, riskReward } = e.payload
  // submit to your OMS, then reflect fills back via chart.setOrders/setPositions
})

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
<pre><code>{`const widget = new ChartWidget(host, { depthLadder: true })

widget.setDepth({
  bids: [{ price: 64_190, volume: 3.1 }, { price: 64_185, volume: 5.4 }],
  asks: [{ price: 64_205, volume: 2.0 }, { price: 64_210, volume: 8.7 }],
})

widget.getChart().on('orderPlace', (e) => {
  // { side, type: 'limit', price } — submit to your backend
})`}</code></pre>

<h2>流動性ヒートマップ</h2>
<p>
  オーダーブックのスナップショットを蓄積し、ローソク足の背後にヒートマップとして表示します。
  各スナップショットは縦の帯になり、価格レベルごとに板に並ぶ数量が明るく表示されます（買いは緑、売りは赤）。
  時間がたっても残り続ける流動性の壁が浮かび上がります。設定シート（または
  <code>chart.setDepthHeatmapVisible</code>）で切り替えます。<code>widget.setDepth</code> は
  板が更新されるたびにスナップショットを記録します。
</p>
<pre><code>{`chart.setDepthHeatmapVisible(true)
chart.setDepthHeatmapConfig({ opacity: 0.7, capacity: 240 })

// each book update both draws the overlay/ladder and records a heatmap column
widget.setDepth(orderBook)
// low-level: chart.pushDepthSnapshot(orderBook) · chart.clearDepthHeatmap()`}</code></pre>

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

<h2>トレードゾーン</h2>
<p>エントリー → エグジットを、損益で色分けした長方形と方向のバッジで可視化します。</p>
<pre><code>{`chart.addTradeZone({
  id: 'tz-1',
  side: 'long',
  entryTime: openedAt,
  exitTime: closedAt,
  entryPrice: 65_100,
  exitPrice: 65_800,
  status: 'closed',
})`}</code></pre>

<h2>ポジションラベルのトークン</h2>
<p>
  チャート上のラベルをポジションごとにカスタマイズできます。<code>positionLabel</code> には
  テンプレート文字列か、文字列を返す関数を指定します。
</p>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  positionLabel: '{side} {qty} @ {entry} · {pnlSign}{pnlPct}%',
})`}</code></pre>

<p>
  使用できるトークン：
  <code>{'{side}'}</code>、<code>{'{qty}'}</code>、<code>{'{openQty}'}</code>、
  <code>{'{closedQty}'}</code>、<code>{'{entry}'}</code>、<code>{'{price}'}</code>、
  <code>{'{pnl}'}</code>、<code>{'{pnlPct}'}</code>、<code>{'{pnlSign}'}</code>。
</p>

<h2>損益グラデーションのカラーストップ</h2>
<pre><code>{`new ChartWidget(host, {
  trading: true,
  pnlThresholds: [
    { pnlPct: -0.02, color: '#ef4444' },
    { pnlPct: 0,     color: '#94a3b8' },
    { pnlPct: 0.02,  color: '#10b981' },
  ],
})`}</code></pre>
