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
  supportedTimeframes?: TimeFrame[]   // left out: it serves every timeframe
  connect(config): void
  disconnect(): void
  getConnectionState(): ConnectionState
  fetchHistory(symbol, timeframe, limit?): Promise<OHLCBar[]>
  on(event, listener): void   // 'bar' | 'tick' | 'connectionChange' | 'error' | 'symbolInfo'
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
<p>
  <code>searchSymbols</code> と <code>resolveSymbol</code> は <code>SymbolInfo</code> を返します。<code>symbol</code> と、
  フィードが知っているその他の情報です。読みやすい名称（<code>description</code>）、<code>exchange</code>、フィード自身の
  言葉での <code>type</code>（<code>'stock'</code>、<code>'futures'</code>、<code>'Cổ phiếu'</code>…）、ウィジェットの
  シンボル検索に表示される <code>logo</code>、<code>pricePrecision</code>、<code>minTick</code>、<code>currency</code>、
  <code>timeZone</code>、<code>sessions</code>。
</p>

<h2 id="built-timeframes">フィードにない時間足</h2>
<p>
  <code>supportedTimeframes</code> を挙げるフィードでは、ほかの時間足を、そのうち割り切れる最も粗い時間足から作ります。7m は 1m から、
  4h と 1D は 1h からです。日足、週足、月足と、1 日を割り切る時間足（2h、3h、4h、6h、8h、12h）は、取引所の午前 0 時、つまり
  <code>resolveSymbol</code> が示す <code>timeZone</code> の午前 0 時に始まります。チャートは銘柄ごとに一度、そうした時間足の最初の履歴の前に問い合わせ、
  そのタイムゾーンを保ちます。1h 以下の時間足は待ちません。<code>resolveSymbol</code> のないフィード、タイムゾーンを示さないか UTC を示すフィード、
  時間足がその午前 0 時にそろわないフィード（UTC から 7 時間ずれたタイムゾーンで 4h バーしかない場合など）は、これまでどおり UTC の日になります。
  問い合わせに失敗したフィードや 5 秒以内に答えないフィードも同じで、その銘柄の日はチャートがその銘柄を新たに読み込むまで（接続したとき、または別の銘柄や時間足から切り替えたとき）UTC のままなので、さらに古いページや再接続後の履歴に
  同じ日が二度現れることはありません。新たに読み込むときは、フィードがその後に示したタイムゾーンで日を作るか、もう一度問い合わせます。市場のタイムゾーン（<code>setMarket</code>）でこれらのバーが動くことはありません。
  00:00 UTC のタイムスタンプを持つ日足は、それが示す日付として扱います。フィードが後から <code>symbolInfo</code> イベントで送るタイムゾーンは、
  表示される時刻を変えますが、作られた日の始まりは変えません。
</p>

<h2 id="symbol-info">データフィードが後から知る銘柄情報</h2>
<p>
  接続済みのチャートは <code>resolveSymbol</code> を一度だけ呼びます。銘柄の情報を後から（たとえば最初のメッセージで）知るフィードは <code>symbolInfo</code> イベントで送れば、チャートがすぐ適用します。価格軸・凡例・価格タグは銘柄の小数桁（<code>pricePrecision</code>）で表示され、描画のラベル、当日の値幅制限と基準値、ピボットのラベル、計測ツール、マーケットプロファイルも同じ桁になります。ウィジェットではデータウィンドウ、アラート一覧、注文チケット、口座パネルも同様です。価格軸の目盛りは呼値（<code>minTick</code>）に揃い、取引所の取引時間も使われます。市場の小数桁（<code>setMarket</code>）も同じ箇所に届き、銘柄の小数桁より優先されます。どちらもない場合、描画のラベルは価格の大きさに応じた小数桁のまま、価格軸と同じく数値ロケールで桁区切りされます。
</p>
<pre><code>{`emit('symbolInfo', { symbol: 'VNM', pricePrecision: 0, minTick: 10, currency: 'VND' })   // アダプターが他のイベントを送るのと同じ方法で`}</code></pre>

<h2 id="corrections">フィードが修正するバー</h2>
<p>
  フィードは、確定したバーを自身の時刻のままもう一度送ってバーを修正します。<code>parseMessage</code> から <code>{'{'} bar, closed: true {'}'}</code> を返すか、<code>bar</code> イベントです。ストリームが受け取った最新のバーより古い確定バーは、そのバーについてのフィードの最終的な値です（次のバーの最初のフレームより後に届いた取引所の確定値や、訂正など）。チャートはどこにあってもその時刻のバーを置き換え（<code>updateBar</code>）、そこからインジケーターを計算し直し、表示位置はそのままにします。ライブ価格ではありません。価格線、注文、アラートは市場の価格に従ったままです。最新のバーより古い未確定のフレームは古いデータとして無視され、何も動かしません。組み込みのアダプター（<code>WebSocketAdapter</code>、<code>PollingAdapter</code>、それらを使うフィード、<code>BinanceAdapter</code>）がバーの終値からティックを作るのは、最新のバーのときだけです（提供した履歴の最後のバーも含めて数えるので、フィードが購読時にもう一度送る最後の確定バーからはティックを作りません）。独自のアダプターでバーからティックを作る場合も、古いバーは除いてください。アダプターがなければ <code>chart.updateBar(bar)</code> を呼びます。
</p>
<p>
  <code>aggregateTicks</code> では、履歴の最後のバーが約定の積み上げ先になります。接続後の最初の約定でも、その始値、高値、安値、出来高はそのままです。過ぎたバーの約定が遅れて届いた場合は無視し、そのバーの確定バーが届けばそれで修正します。形成中のバーは自分の約定を保ちます。最新のバーが始まった後の約定は、区切りの上ではそれより前に始まる場合でも、そのバーに入ります（午前 0 時以外の時刻で記録された日足や、最初の約定より後に銘柄のタイムゾーンが届いた場合）。そのため価格はすべての約定に追随します。より細かい時間足から作る時間足では、修正された元のバーが、形成中のバーの前にある直近 2 本の作ったバーを作り直します。それより前の修正は無視します。
</p>
<pre><code>{`// アダプター内: チャートに既にあるバーの、取引所の確定値
parseMessage: (raw) => ({ bar: toBar(raw), closed: true })

// アダプターなしで、自前のバーを
const corrected = chart.updateBar(bar)   // false: bar.time のバーが読み込まれていない`}</code></pre>

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

const agg = new TickAggregator('1d')
agg.setTimeZone('Asia/Ho_Chi_Minh')         // days start at the exchange's midnight
agg.seed(history.at(-1).time)               // a bar older than the history's last is past
agg.on('barClose', (bar) => console.log(bar))   // a bar whose interval is over
agg.on('correction', (bar) => console.log(bar)) // a closed bar older than the newest
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar`}</code></pre>
<p>週は月曜日、月は 1 日に始まります。<code>setTimeZone</code> を使うと、日、週、月と 1 日を割り切る時間足は取引所の午前 0 時に始まります。チャートは銘柄のタイムゾーン（なければ市場のもの）からストリームのティック（<code>aggregateTicks</code>）にこれを設定し、ティックから作るバーを履歴のバーに揃えます。履歴が日を 00:00 UTC で記録していれば日足もそうし、2h から 12h のバーは履歴のバーが取引所の午前 0 時から始まるときだけそこから始めるので、フィード自身の 4h バー（00:00、04:00… UTC）は時刻が変わりません。フィードのより細かい時間足から作る時間足では、作ったバーと同じところから始まります。時間足から作るときは、フィードの <code>resolveSymbol</code> が示したタイムゾーンの午前 0 時、なければ UTC の午前 0 時で、チャートのタイムゾーンには左右されません。フィードが 00:00 UTC で記録した日足から作る週足と月足はフィードの日付を保ち、約定の日付はフィードが示したタイムゾーン、なければチャートのタイムゾーンで決まります。フィード自身の日足と同じです。</p>
<p>受け取った最新のバーより古いバーは過ぎたものです。<code>processBar</code> は確定したものを <code>correction</code> として送り、未確定のフレームは無視します。<code>processTick</code> はそのバーの約定を無視するので、遅れたフレームや約定が形成中のバーを早く確定させたり、価格を動かしたりすることはありません。<code>seed(time)</code> は履歴の最後のバーから始め、後戻りはしません（ただし、より新しいバーを約定が今はもう使わない区切りで組み立てていた場合、たとえば取引所のタイムゾーンが約定の後に届いた場合は、そのバーを手放します。そうしないと次の区切りまで約定が無視されるためです）。<code>resume(bar)</code> はまだ形成中のそのバーを次の約定の積み上げ先にしますが、約定がすでにより新しいバーに進んでいればそのままです。チャートのストリームは接続のたびに両方を行うので、再接続で履歴が一つ前のバーまでしかなくても、形成中のバーの約定は残ります。このとき <code>StreamManager</code> は、形成中のバー（約定から組み立てたものでも、フィードのフレームから来たものでも）を <code>snapshot</code> として送る履歴の上に載せ、履歴の最後のバーの終値という古い価格の <code>priceChange</code> は送りません。修正は <code>barCorrection</code> として送ります。</p>

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
  ティックのバーは時間的に等間隔ではないため、時間軸とクロスヘアはバーにだけ時刻を表示し、その横の空白には表示しません。
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
  timeZone: 'America/New_York',
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
