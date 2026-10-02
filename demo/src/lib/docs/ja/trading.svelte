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
})`}</code></pre>

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
