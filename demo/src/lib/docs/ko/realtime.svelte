<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>실시간 및 리플레이 — TradeCanvas 문서</title>
  <meta name="description" content="스트리밍 데이터 어댑터, 틱 집계, 재연결 로직, 그리고 과거 데이터 재생을 위한 새로운 ReplayController." />
</svelte:head>

<h1>실시간 및 리플레이</h1>
<p>실시간 데이터를 스트리밍하고, 틱을 봉으로 집계하고, 과거 데이터를 원하는 속도로 리플레이합니다.</p>

<h2>내장 어댑터</h2>
<p>모두 무료이며 API 키가 필요 없습니다. 어느 것이든 같은 방식으로 연결합니다.</p>
<pre><code>{`import { BinanceAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/chart'

chart.connect({ adapter: new BinanceAdapter(),  symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new BybitAdapter(),    symbol: 'BTCUSDT', timeframe: '1m' })
chart.connect({ adapter: new KrakenAdapter(),   symbol: 'BTC/USD', timeframe: '5m' })
chart.connect({ adapter: new CoinbaseAdapter(), symbol: 'BTC-USD', timeframe: '15m' })`}</code></pre>

<h2>DataAdapter 인터페이스</h2>
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

<h2>약 20줄로 어떤 피드든 연결하기</h2>
<p>
  <code>WebSocketAdapter</code>(실시간 + REST 과거 데이터) 또는 <code>PollingAdapter</code>
  (REST 전용 피드)를 상속하세요. 연결 수명 주기, 재연결, 디코딩, 이벤트 발생은 기본 클래스가
  처리하므로 URL과 파싱 함수만 제공하면 됩니다.
</p>
<pre><code>{`import { WebSocketAdapter } from '@tradecanvas/chart'

const myAdapter = new WebSocketAdapter({
  name: 'myexchange',
  wsUrl: (c) => 'wss://api.myexchange.com/ws/' + c.symbol + '@kline_' + c.timeframe,
  fetchHistory: (symbol, tf, limit) => fetch('/candles?...').then((r) => r.json()),
  parseMessage: (raw) => ({ bar: toBar(raw), closed: raw.k.x }),
})`}</code></pre>

<h2>틱 집계</h2>
<p>원시 틱을 시간 단위별 OHLC 봉으로 묶습니다.</p>
<pre><code>{`import { TickAggregator } from '@tradecanvas/chart'

const agg = new TickAggregator('1m')
agg.processTick({ time, price, volume })

const current = agg.getCurrentBar()         // forming bar
const closed = agg.flushClosedBars()        // bars that have rolled over`}</code></pre>

<h2>여러 종목의 시세</h2>
<p>
  <code>subscribeQuotes</code>가 있는 피드는 중지할 때까지 여러 종목의 시세(현재가, 당일 변동, 고가, 저가,
  거래량, 매수호가와 매도호가)를 한꺼번에 보냅니다. <code>BinanceAdapter</code>는 24시간 스냅샷을 보낸 뒤
  미니 티커 스트림을 이어 보내고, <code>MockAdapter</code>는 시세를 만들어 냅니다. 위젯의 관심 종목은 이것으로
  각 행을 채웁니다.
</p>
<pre><code>{`const stop = new BinanceAdapter().subscribeQuotes(['BTCUSDT', 'ETHUSDT'], (quotes) => {
  for (const q of quotes) console.log(q.symbol, q.last, q.changePercent)
})
stop()

readQuote({ symbol: 'AAPL', last: 190, prevClose: 188 })   // → change 2, changePercent 1.06`}</code></pre>

<h2>틱 차트</h2>
<p>
  틱 시간 단위 — <code>'100T'</code> — 는 체결 100건마다 봉 하나를 그립니다. 피드의 체결로 만들어지며, 과거 데이터에는
  최근 체결(<code>fetchTrades</code>)을, 그 뒤로는 실시간 체결(<code>subscribeTrades</code>)을 씁니다.
  <code>BinanceAdapter</code>는 집계 체결(aggregate trades)을 스트리밍합니다. 틱 차트에는 카운트다운이 없고 더 이전의
  과거 데이터도 불러오지 않으며, 체결을 제공하지 않는 피드는 틱 시간 단위를 거부합니다.
</p>
<pre><code>{`chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '100T' })
await chart.setTimeframe('500T')

// Your own trades into tick bars
const builder = new TickBarBuilder(100)
builder.push([{ time, price, volume }])   // → [{ bar, closed }]`}</code></pre>

<h2>시장 상태와 뉴스</h2>
<p>
  <code>marketStatus(info, now)</code>는 거래소 시간대 기준의 거래 시간(서머타임 전환 포함)으로 특정 시점에 종목의 시장이
  열려 있는지, 그리고 그것이 언제 바뀌는지 알려 줍니다. 세션에는 열리는 요일을 지정할 수 있습니다. 피드의
  <code>fetchNews</code>는 위젯의 종목 정보 패널에 헤드라인을 제공하고, <code>readNews</code>는 제목과 시간이 있는 항목만,
  링크는 웹 페이지 링크만 남깁니다.
</p>
<pre><code>{`const info = {
  symbol: 'AAPL',
  timezone: 'America/New_York',
  sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }],
}
marketStatus(info, Date.now())   // { state: 'closed', next: <next open, ms> } · 'open' · 'always' (24/7)`}</code></pre>

<h2>재연결</h2>
<p><code>ReconnectManager</code>는 상한이 있는 지수 백오프와 마지막 포기 처리를 담당합니다.</p>
<pre><code>{`import { ReconnectManager } from '@tradecanvas/chart'

const rm = new ReconnectManager({ maxRetries: 6, baseDelay: 500, maxDelay: 30_000 })

rm.start()
rm.schedule(() => connectWebsocket())   // call on disconnect; backs off automatically
rm.onConnected()                        // call on a successful connect to reset`}</code></pre>

<h2>리플레이 모드</h2>
<p>
  과거 <code>DataSeries</code>를 원하는 속도로 진행시킵니다.
  <code>Chart</code>와 분리되어 있어 UI 리플레이와 헤드리스
  백테스트 모두에 사용할 수 있습니다.
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
  위젯의 리플레이 모드에서는 <strong>이미 표시된 봉을 클릭하면 리플레이
  커서가 그 위치로 이동합니다</strong>. 더 일반적으로, 이제 차트는 일반 왼쪽 클릭
  (드래그 없이 눌렀다 떼기)에 대해 <code>click</code>과 <code>barClick</code>
  이벤트를 발생시킵니다.
</p>
<pre><code>{`chart.on('barClick', (e) => {
  const { bar, barIndex, point } = e.payload
})`}</code></pre>

<h3>차트에서 더 작은 스텝으로 리플레이하기</h3>
<p>
  <code>chart.replayStart()</code>는 차트 자체의 시리즈를 리플레이합니다. 더 작은 단위의 봉을
  <code>steps</code>로 넘기면(1시간 차트 아래의 5분 봉 등) 각 스텝마다 그 봉들로 형성 중인 봉이
  실제 시장에서 그랬던 것처럼 자라납니다. 마감된 봉은 시리즈에 있는 그대로 표시됩니다.
  <code>startIndex</code>와 <code>replaySeekToBar</code>는 차트의 봉을 기준으로 셉니다.
  ChartWidget에서는 리플레이 바의 <strong>스텝</strong> 메뉴에 피드가 제공하는(또는 불러온 봉으로
  만들 수 있는) 더 작은 시간 단위가 나옵니다.
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

<h3>내 앱에서의 리플레이</h3>
<p>
  매수·매도 표시와 거래 영역은 리플레이가 그곳에 닿을 때 나타납니다. 표시는 그 봉이 보일 때, 거래는 진입했을 때 나타나고 청산에 닿기 전까지는 열린 상태로 그려집니다(<code>revealMarks: false</code>, ChartWidget: <code>replayRevealMarks: false</code>는 모두 보여 줌). <code>startTime</code>은 봉 대신 시각에서 시작하고, <code>hideHistory</code>는 리플레이가 멈출 때까지 시작 전의 봉을 뺍니다. <code>duration</code>은 봉 수와 상관없이 대략 그 시간 안에 끝까지 재생하며, 한 프레임에 여러 봉을 진행하고 늦은 프레임은 건너뛰지 않고 재생을 늦춥니다.
</p>
<pre><code>{`chart.setSignalMarkers(signals)          // 백테스트 전체는 그대로
chart.setTradeZones(trades)
chart.replayStart({
  startTime: Date.now() - 30 * 86_400_000,   // 최근 30일
  hideHistory: true,                          // 차트에는 그것만
  duration: 3500,                             // 약 3.5초 동안
})
chart.on('replayComplete', () => chart.replayStop())   // 그다음 전체 시리즈로 복귀
chart.replayStart({ startIndex: 100, revealMarks: false })   // 처음부터 모든 표시를 보여 줌`}</code></pre>

<h3>리플레이 중 모의 거래</h3>
<p>
  <code>setMarkPrice(price, time)</code> 메서드가 있는 실행 어댑터(<code>PaperExecutionAdapter</code> 등)는
  리플레이 위에서 거래합니다. 리플레이하는 동안 차트가 리플레이되는 가격과 시각을 차례로 넘겨 주므로,
  주문과 손절은 리플레이가 그 가격을 지날 때 체결되고 체결 내역은 리플레이된 봉 위에 놓입니다.
  각 스텝의 저가와 고가가 모두 반영되고, 앞으로 건너뛰면 그 사이의 스텝을 모두 거칩니다. 어댑터는 앞으로만
  나아가므로, 뒤로 이동한 뒤에는 리플레이가 지금까지 본 가장 먼 지점을 지날 때까지 기다립니다. 그동안 실시간
  가격은 영향을 주지 않으며, 리플레이가 끝나면 다시 실시간 가격을 따르고 체결 시각도 실제 시계로 돌아갑니다.
  가격 알림은 그동안에도 계속 실시간 시장을 감시하며, 지표 선에 건 알림은 리플레이가 끝날 때까지 기다립니다.
</p>
<pre><code>{`chart.connectExecution(new PaperExecutionAdapter())
chart.replayStart({ startIndex: 300, paused: true })
// place orders from the chart or the order ticket, then play`}</code></pre>

<h3>API</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>start()</code></td><td>현재 인덱스부터 봉을 내보내기 시작합니다.</td></tr>
    <tr><td><code>pause()</code> / <code>resume()</code></td><td>타이머를 일시정지 / 재개합니다.</td></tr>
    <tr><td><code>step(n)</code></td><td>타이머 없이 N개의 봉을 동기적으로 내보냅니다.</td></tr>
    <tr><td><code>seek(index)</code></td><td>중간 봉을 내보내지 않고 이동합니다.</td></tr>
    <tr><td><code>setSpeed(bps)</code></td><td>초당 봉 수(&gt;= 0.01로 제한).</td></tr>
    <tr><td><code>destroy()</code></td><td>타이머와 리스너를 정리합니다.</td></tr>
  </tbody>
</table>

<p>백테스터와 함께 리플레이를 사용하는 방법은 <a href={href('/docs/analytics')}>분석</a>을 참고하세요.</p>
