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
chart.replayStop()             // back to the live series`}</code></pre>

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
