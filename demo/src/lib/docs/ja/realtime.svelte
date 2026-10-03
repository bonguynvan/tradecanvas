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
chart.replayStop()             // back to the live series`}</code></pre>

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
