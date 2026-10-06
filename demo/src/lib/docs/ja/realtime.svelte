<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>リアルタイムとリプレイ — TradeCanvas ドキュメント</title>
  <meta name="description" content="ストリーミングのデータアダプター、ティックの集計、再接続の処理、そして過去データを再生する新しい ReplayController。" />
</svelte:head>

<h1>リアルタイムとリプレイ</h1>
<p>ライブデータをストリーミングし、ティックをバーに集計し、過去のデータを速度を制御しながらリプレイします。</p>

<h2>組み込みアダプター</h2>
<p>すべて無料で、API キーは不要です。どれも同じ方法で接続できます：</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })`}</code></pre>

<h2>DataAdapter インターフェース</h2>
<pre><code>{`interface DataAdapter {
  name: string
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'tick' | 'snapshot' | 'connectionChange' | 'error'
  off(event, listener): void
  dispose(): void

  // Optional
  fetchHistoryBefore?(symbol, timeframe, before, limit): Promise<OHLCBar[]>
  searchSymbols?(query, options?): Promise<SymbolInfo[]>
  resolveSymbol?(symbol): Promise<SymbolInfo | null>
  subscribeQuotes?(symbols, onQuotes): () => void      // a watchlist's rows
  fetchNews?(symbol, limit?): Promise<NewsItem[]>       // the symbol info panel
  fetchTrades?(symbol, limit?): Promise<Trade[]>        // tick charts, with
  subscribeTrades?(symbol, onTrades): () => void        // subscribeTrades
}`}</code></pre>

<h2>約 20 行で任意のフィードに対応</h2>
<p>
  <code>WebSocketAdapter</code>（ライブ + REST での履歴取得）または <code>PollingAdapter</code>
  （REST のみのフィード）を継承します。接続のライフサイクル、再接続、デコード、イベントの発行は基底クラスが
  処理するので、URL とパース関数を用意するだけです。
</p>
<pre><code>{`import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => 'wss://api.myexchange.com/ws/' + c.symbol + '@kline_' + c.timeframe,
  fetchHistory: (symbol, tf, limit) => fetch('/candles?...').then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})`}</code></pre>

<h2>ティックの集計</h2>
<p>生のティックを、時間足ごとの OHLC バーにまとめます：</p>
<pre><code>{`import { TickAggregator } from '@tradecanvas/chart'

const agg = new TickAggregator('1m')
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar
const closed = agg.flushClosedBars()        // bars that have rolled over`}</code></pre>

<h2>複数シンボルのクオート</h2>
<p>
  <code>subscribeQuotes</code> を持つフィードは、止めるまで複数のシンボルのクオート（最新価格、当日の変化、高値、安値、
  出来高、買気配と売気配）をまとめて送ります。<code>BinanceAdapter</code> は 24 時間のスナップショットを送ったあと、
  ミニティッカーのストリームを流します。<code>MockAdapter</code> はクオートを生成します。ウィジェットのウォッチリストは、
  これで各行を埋めます。
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>ティックチャート</h2>
<p>
  ティックの時間足 — <code>'100T'</code> — は 100 約定ごとに 1 本のバーを描きます。フィードの約定から組み立て、
  履歴には直近の約定（<code>fetchTrades</code>）、その後はライブの約定（<code>subscribeTrades</code>）を使います。
  <code>BinanceAdapter</code> は集約約定（aggregate trades）をストリーミングします。ティックチャートにはカウントダウンがなく、
  さらに古い履歴も読み込みません。約定を提供しないフィードはティックの時間足を受け付けません。
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2>市場の状態とニュース</h2>
<p>
  <code>marketStatus(info, now)</code> は、取引所のタイムゾーンでの取引時間（夏時間の切り替えを含む）から、ある時点で
  シンボルの市場が開いているかどうかと、それがいつ変わるかを返します。セッションには開く曜日を指定できます。
  フィードの <code>fetchNews</code> はウィジェットのシンボル情報パネルにヘッドラインを渡します。<code>readNews</code> は
  タイトルと時刻のある項目だけを残し、リンクも Web ページへのものだけを残します。
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timezone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

<h2>再接続</h2>
<p><code>ReconnectManager</code> は、上限付きの指数バックオフと、最終的な再試行の打ち切りを処理します。</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>リプレイモード</h2>
<p>
  過去の <code>DataSeries</code> を、速度を制御しながら先へ進めます。
  <code>Chart</code> から切り離されているため、UI でのリプレイにもヘッドレスのバックテストにも使えます。
</p>

<pre><code>{`import { ReplayController } from '@tradecanvas/chart'

const replay = new ReplayController({
  data: historicalBars,
  speed: 10,      // bars per second
  startIndex: 0,
})

// Seed the chart with everything before startIndex
chart.setData(replay.getPrefix())

// Wire each emitted bar into the chart
replay.on('bar', ({ bar }) => chart.appendBar(bar))
replay.on('finished', () => console.log('done'))

replay.start()
// replay.pause(); replay.resume(); replay.step(5); replay.seek(200); replay.setSpeed(20)
`}</code></pre>

<p>
  ウィジェットのリプレイモードでは、<strong>表示済みのバーをクリックすると、リプレイのカーソルが
  そこへ移動します</strong>。より一般的には、チャートは通常の左クリック（ドラッグせずに押して離す操作）に対して
  <code>click</code> と <code>barClick</code> イベントを発行するようになりました：
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>チャート上のリプレイを細かいステップで</h3>
<p>
  <code>chart.replayStart()</code> は、チャート自身の系列をリプレイします。下位足のバーを
  <code>steps</code> として渡すと（1 時間足のチャートに 5 分足のバーなど）、各ステップでそれらから形成中のバーが
  育っていきます。実際の市場で形成されたときと同じです。確定済みのバーは系列にあるとおりに表示されます。
  <code>startIndex</code> と <code>replaySeekToBar</code> はチャートのバーで数えます。
  ChartWidget では、リプレイバーの<strong>ステップ</strong>メニューに、フィードが持つ下位の時間足
  （または読み込んだバーから組み立てられる時間足）が並びます。
</p>
<pre><code>{`const steps = await adapter.fetchHistory('BTCUSDT', '5m', 2000)
chart.replayStart({ steps, startIndex: 120, paused: true, speed: 5 })
chart.replayResume()
chart.getReplayBarIndex()      // the chart bar forming now
chart.replaySeekToBar(150)     // to the end of bar 150
chart.replaySeekToTime(t)      // to the bars that opened before t
chart.on('replayStep', (e) => e.payload)    // { barIndex, time, until, total }
chart.on('replayComplete', (e) => e.payload) // { barIndex, time }
chart.on('replayState', (e) => e.payload)   // { state: 'playing' | 'paused' | 'stopped' }
chart.replayStop()             // back to the live series`}</code></pre>

<h3>自分のアプリでのリプレイ</h3>
<p>
  売買のマークと取引ゾーンは、リプレイがそこに届いたときに現れます。マークはその足が表示されたとき、取引はエントリーしたときに現れ、エグジットに届くまでは建玉中として描かれます（<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code> ですべて表示）。<code>startTime</code> は足ではなく時刻から始めます。<code>hideHistory</code> はリプレイが止まるまで開始前の足を外します。<code>duration</code> は足の数にかかわらず、ほぼその時間で最後まで再生します。1 フレームに複数の足を進め、遅れたフレームは飛ばさずに再生を遅らせます。
</p>
<pre><code>{`chart.setSignalMarkers(signals)          // バックテスト全体はそのまま
chart.setTradeZones(trades)
chart.replayStart({
  startTime: Date.now() - 30 * 86_400_000,   // 直近 30 日
  hideHistory: true,                          // チャートにはそれだけ
  duration: 3500,                             // 約 3.5 秒で
})
chart.on('replayComplete', () => chart.replayStop())   // そのあと系列全体に戻す
chart.replayStart({ startIndex: 100, revealMarks: false })   // 最初からすべてのマークを表示`}</code></pre>

<h3>リプレイ中のペーパー取引</h3>
<p>
  <code>PaperExecutionAdapter</code> のように <code>setMarkPrice(price, time)</code> を持つ実行アダプターは、
  リプレイ上で取引します。リプレイ中、チャートはリプレイされる価格と時刻を順に渡すので、注文や損切りは
  リプレイがその価格を通過したときに約定し、約定はリプレイ中のバーの上に記録されます。各ステップの安値と高値が
  考慮され、先へジャンプすると途中のステップをすべて通過します。進むのは前方向だけで、後ろへシークした後は、
  リプレイがそれまでに見た最も先の地点を越えるまで待ちます。
  その間、ライブ価格の影響は受けません。リプレイが終わるとライブ価格に戻り、約定時刻も実際の時計に戻ります。
  価格アラートは、その間もずっとライブの市場を監視し続けます。インジケーターのラインに対するアラートは、
  リプレイが終わるまで待機します。
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>メソッド</th><th>用途</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>現在のインデックスから発行を開始します。</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>タイマーを一時停止 / 再開します。</td></tr>
    <tr><td><code>step(n)</code></td><td>タイマーを使わずに N 本のバーを同期的に発行します。</td></tr>
    <tr><td><code>seek(index)</code></td><td>間のバーを発行せずに移動します。</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>1 秒あたりのバー数（&gt;= 0.01 に制限）。</td></tr>
    <tr><td><code>destroy()</code></td><td>タイマーとリスナーを解除します。</td></tr>
  </tbody>
</table>

<p>バックテスターとリプレイを組み合わせて使う方法は、<a href={href('/docs/analytics')}>分析</a>を参照してください。</p>
