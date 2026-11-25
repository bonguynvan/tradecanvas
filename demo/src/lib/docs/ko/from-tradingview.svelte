<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>TradingView에서 옮겨 오기 — TradeCanvas 문서</title>
  <meta name="description" content="TradingView 차팅 라이브러리(Advanced Charts, Trading Platform)나 Lightweight Charts로 만든 앱을 TradeCanvas로 옮기는 방법: feedFromJsApi나 udfFeed로 데이터피드를 그대로 쓰고, 이름과 옵션의 대응은 코딩 에이전트가 MCP 서버로 찾게 하며, 옮겨 오지 못하는 것을 알아 둡니다." />
</svelte:head>

<h1>TradingView에서 옮겨 오기</h1>
<p>
  TradingView 차팅 라이브러리(Advanced Charts 또는 Trading Platform)나 Lightweight Charts로 만든 앱은 백엔드를
  바꾸지 않고 TradeCanvas로 옮길 수 있습니다. 데이터피드는 그대로 두고 브리지 뒤에 둡니다. 바뀌는 이름, 즉 옵션,
  featureset, override, study, 그리기, 메서드는 <a href={href('/docs/getting-started#ai')}>MCP 서버</a>가 답할 때
  쓰는 대응표에 들어 있어서, 코딩 에이전트는 짐작하지 않고 하나씩 찾아봅니다. 이 페이지는 그대로 이어지는 것,
  바뀌는 것, 옮겨 오지 못하는 것을 설명합니다.
</p>

<h2 id="datafeed">데이터피드는 그대로</h2>
<p>
  <code>feedFromJsApi</code>는 JS API용으로 작성한 데이터피드(<code>onReady</code>, <code>resolveSymbol</code>,
  <code>getBars</code>, <code>subscribeBars</code>, 그리고 있다면 <code>searchSymbols</code>,
  <code>getQuotes</code>, <code>subscribeQuotes</code>)를 <code>DataFeed</code>로 바꿉니다.
</p>
<pre><code>{`import { feedFromJsApi } from '@tradecanvas/chart'
import { ChartWidget } from '@tradecanvas/chart/widget'

const feed = feedFromJsApi(datafeed)   // 앱의 데이터피드, 그대로
await feed.ready()                      // onReady가 답함: 제공하는 시간 단위를 앎

const widget = new ChartWidget(document.getElementById('chart'), { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>브리지가 데이터피드를 위해 하는 일:</p>
<ul>
  <li>종목마다 한 번만 resolve하고, 그 symbol info를 <code>getBars</code>와 <code>subscribeBars</code>에 다시 넘깁니다.</li>
  <li>
    차트의 시간 단위를 resolution으로 바꾸고(<code>'1h'</code> → <code>'60'</code>, <code>'1d'</code> →
    <code>'1D'</code>), 차트의 <code>countBack</code>과 <code>before</code>를 초 단위의 <code>from</code>,
    <code>to</code>, <code>countBack</code>으로 바꿉니다.
  </li>
  <li>어떤 구간에 봉이 없으면 <code>nextTime</code>부터 한 번 더 요청합니다.</li>
  <li>
    구독할 때 쓴 guid로 구독을 해제하고, 데이터피드가 <code>onResetCacheNeeded</code>를 호출하면 시리즈를 다시 불러옵니다.
  </li>
  <li>
    종목의 <code>pricescale</code>과 <code>minmov</code>를 호가 단위로, <code>session</code>을 거래 시간으로 읽고,
    제공하는 시간 단위를 <code>supported_resolutions</code>에서 읽습니다.
  </li>
</ul>
<p>
  차트는 피드에 연결할 때 그 피드가 제공하는 시간 단위를 읽고, 다른 시간 단위는 그것으로 만듭니다(1분 봉으로 7분
  차트를 만드는 식). <code>onReady</code>는 그보다 늦게 답하므로 <code>ChartWidget</code>을 만들기 전에
  <code>feed.ready()</code>를 await하거나, 시간 단위를 직접 넘기세요: <code>feedFromJsApi(datafeed, {'{'} supportedTimeframes: ['1m', '1h', '1d'] {'}'})</code>.
</p>

<h3 id="udf">UDF 서버</h3>
<p>UDF를 쓰는 서버라면 데이터피드 코드가 전혀 필요 없습니다.</p>
<pre><code>{`import { udfFeed } from '@tradecanvas/chart'

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 })
await feed.ready()   // /config의 시간 단위

new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })`}</code></pre>
<p>
  <code>/config</code>, <code>/symbols</code>, <code>/search</code>, <code>/history</code>,
  <code>/quotes</code>를 읽습니다. UDF에는 푸시가 없어서 실시간 봉과 시세는 <code>updateFrequency</code> ms마다
  (기본 10초) 다시 요청합니다. <code>headers</code>는 모든 요청에 함께 보냅니다.
</p>

<h2 id="mcp">나머지 대응은 에이전트에게</h2>
<p>MCP 서버에는 옮겨 오기용 도구가 세 개 있습니다.</p>
<table>
  <thead><tr><th>도구</th><th>하는 일</th></tr></thead>
  <tbody>
    <tr>
      <td><code>migration_plan</code></td>
      <td>순서대로 된 단계, 앱 코드에서 무엇을 검색할지, 그리고 검색에서 찾은 것을 어느 도구로 대응시킬지.</td>
    </tr>
    <tr>
      <td><code>migration_lookup</code></td>
      <td>
        이름 하나가 무엇이 되는지: 위젯 옵션, featureset, override 키, study, 그리기 shape, 위젯이나 차트의 메서드,
        데이터피드나 broker의 멤버, 또는 resolution. 대응하는 옵션, 기능 스위치, 스타일 키, 지표 id(기본값과 선 키 포함),
        그리기 유형(점 포함) 또는 호출을 알려 주고, 비슷한 것이 없으면 그렇다고 분명히 말하며 대신 무엇을 할지 알려 줍니다.
      </td>
    </tr>
    <tr>
      <td><code>convert_widget_options</code></td>
      <td>
        <code>new TradingView.widget({'{'}...{'}'})</code>의 옵션 객체 전체를 featureset과 override까지 포함해
        <code>ChartWidget</code> 옵션으로 바꿉니다. Lightweight Charts의 <code>createChart</code> 옵션은
        <code>Chart</code> 옵션으로 바꿉니다. 차트가 생긴 뒤에 할 호출과 들어갈 자리가 없는 것도 나열하고, 결과를
        <code>validate_options</code>와 같은 방식으로 검사합니다.
      </td>
    </tr>
  </tbody>
</table>
<p>
  서버를 연결했다면 에이전트에게 옮겨 오기를 맡기세요. 먼저 <code>migration_plan</code>을 호출하고, 거기서부터 앱을
  차례로 처리합니다. 서버가 없는 에이전트를 위해 에이전트 스킬에도 같은 단계가 있습니다.
</p>

<h2 id="differs">바뀌는 것</h2>
<table>
  <thead><tr><th>TradingView</th><th>TradeCanvas</th></tr></thead>
  <tbody>
    <tr><td><code>new TradingView.widget({'{'} container: 'id' {'}'})</code>, <code>library_path</code></td><td><code>new ChartWidget(element, options)</code>; 호스팅할 것이 없음</td></tr>
    <tr><td><code>onChartReady(cb)</code></td><td><code>onReady</code> 옵션, 또는 생성자 다음에 오는 코드</td></tr>
    <tr><td><code>widget.activeChart().createStudy(...)</code></td><td><code>widget.getChart().addIndicator(id, params)</code>; id는 짧음: <code>'rsi'</code>, <code>'bb'</code></td></tr>
    <tr><td><code>createShape({'{'} time, price {'}'}, {'{'} shape {'}'})</code>, 시간은 초 단위</td><td><code>addDrawing({'{'} type, anchors: [{'{'} time, price {'}'}] {'}'})</code>, 시간은 밀리초 단위</td></tr>
    <tr><td>resolution: <code>'60'</code>, <code>'1D'</code>, <code>'W'</code></td><td>시간 단위: <code>'1h'</code>, <code>'1d'</code>, <code>'1w'</code> (<code>resolutionToTimeframe</code>, <code>timeframeToResolution</code>)</td></tr>
    <tr><td><code>disabled_features</code>, <code>enabled_features</code></td><td><code>features</code>: <code>false</code>로 두지 않는 한 모든 스위치가 켜짐</td></tr>
    <tr><td><code>overrides</code>, <code>applyOverrides</code></td><td>스타일 키, <code>chartOptions.overrides</code>나 <code>chart.applyOverrides()</code>로 지정; 선 스타일은 이름으로</td></tr>
    <tr><td><code>save_load_adapter</code></td><td><code>layouts: {'{'} storage {'}'}</code>와 <code>LayoutStorage</code>(<code>list</code>, <code>load</code>, <code>save</code>, <code>remove</code>)</td></tr>
    <tr><td>Broker API, 주문선과 포지션선</td><td><code>ExecutionAdapter</code>, <code>setOrders</code>, <code>setPositions</code>와 주문 이벤트(<a href={href('/docs/trading')}>트레이딩</a>)</td></tr>
    <tr><td>Lightweight Charts: 봉과 마커의 시간은 초 단위</td><td>밀리초: <code>time * 1000</code></td></tr>
  </tbody>
</table>

<h2 id="not-carried">옮겨 오지 못하는 것</h2>
<ul>
  <li>
    <strong>저장한 차트.</strong> TradingView 형식으로 저장한 레이아웃, 그리기, study는 불러올 수 없습니다. 사용자는
    새 레이아웃으로 시작합니다.
  </li>
  <li>
    <code>custom_indicators_getter</code>용으로 작성한 <strong>사용자 지표</strong>는
    <a href={href('/docs/plugins')}>지표 플러그인</a>으로 다시 작성합니다. 내장 지표 136개 중에 같은 일을 하는 것이
    있으면 그것을 씁니다.
  </li>
  <li>
    <strong>일부 그리기 도구와 featureset</strong>은 대응하는 것이 없습니다. 어느 것인지는 <code>migration_lookup</code>이
    알려 주고, 가장 가까운 도구를 제시합니다.
  </li>
  <li>
    <strong>여러 종목에 걸친 거래.</strong> <code>ExecutionAdapter</code>의 주문과 포지션은 차트 종목의 것입니다. 여러
    종목과 계좌에 걸친 계좌 관리자는 앱이 직접 갖춥니다.
  </li>
</ul>
<p>
  대응표는 TradingView의 공개 문서(2026년 11월에 확인)를 바탕으로 작성했고, 빌드할 때마다 TradeCanvas 자체의 이름과
  대조합니다. 빠지거나 틀린 이름은 버그입니다. GitHub에 알려 주세요.
</p>
