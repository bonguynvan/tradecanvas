<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>API 레퍼런스 — TradeCanvas 문서</title>
  <meta name="description" content="Chart, ChartWidget, ChartGrid 및 TradeCanvas 핵심 API 레퍼런스." />
</svelte:head>

<h1>API 레퍼런스</h1>
<p>최상위 클래스 <code>Chart</code>, <code>ChartWidget</code>, <code>ChartWidgetGrid</code>, <code>ChartGrid</code>의 공개 API입니다.</p>

<h2>Chart</h2>
<p>헤드리스 렌더러입니다. UI는 직접 만들고, 이벤트를 구독하며, 상태는 명령형으로 변경합니다.</p>

<h3>생성</h3>
<pre><code>{`new Chart(host: HTMLElement, options?: ChartOptions)`}</code></pre>

<h3>데이터</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>setData(data)</code></td><td>전체 시리즈를 교체합니다.</td></tr>
    <tr><td><code>appendBar(bar)</code></td><td>새 봉을 추가합니다. 활성화되어 있으면 자동으로 스크롤합니다.</td></tr>
    <tr><td><code>appendBars(bars)</code></td><td>일괄 추가합니다. 지표는 한 번만 다시 계산합니다.</td></tr>
    <tr><td><code>updateLastBar(bar)</code></td><td>현재 형성 중인 봉을 변경합니다.</td></tr>
    <tr><td><code>updateLastBarFromTick(tick)</code></td><td>틱을 마지막 봉에 병합합니다.</td></tr>
    <tr><td><code>getData()</code></td><td>원본 OHLC 시리즈를 읽습니다.</td></tr>
  </tbody>
</table>

<p id="bar-times">
  봉의 시간은 에포크 밀리초 또는 초이며, 시리즈 전체가 하나의 단위를 씁니다. 차트는 가장 최근 봉에서 단위를 한 번 읽습니다: <code>barTimeUnit(data)</code>는 1(밀리초, 1e11 이상) 또는 1000(초)을 돌려줍니다. 그래서 밀리초 시리즈는 1e12보다 작은 2001년 이전 날짜도 올바르게 유지합니다. 한 시리즈는 한 단위로 유지하세요. 차트가 돌려주는 시간(이벤트, <code>getData()</code>)도 그 단위입니다.
</p>

<h3>차트 유형 및 테마</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>18가지 유형 중 하나 — <a href={href('/docs/chart-types')}>차트 유형</a>을 참고하세요.</td></tr>
    <tr><td><code>setTheme(name | theme)</code></td><td>내장 테마 사이에서 전환하거나 자신의 테마를 설정합니다. <code>getTheme()</code> 은 설정한 그대로 돌려줍니다.</td></tr>
    <tr><td><code>applyOverrides(patch, {'{ layer }'})</code></td><td>차트의 어떤 부분이든 키로 스타일 지정(<code>'grid.vertical.visible'</code>, <code>'series.candlestick.upColor'</code>…). <code>null</code> 은 키를 뺍니다. <a href={href('/docs/styling#overrides')}>스타일</a> 참고.</td></tr>
    <tr><td><code>setOverrides(overrides, {'{ layer }'})</code> · <code>resetOverrides(keys?, {'{ layer }'})</code></td><td>레이어 전체를 한 번에. 키(또는 전부)를 뺌.</td></tr>
    <tr><td><code>getOverrides({'{ layer }'})</code> · <code>getStyle()</code> · <code>getStyleValue(key)</code></td><td>레이어의 오버라이드, 해석된 모양, 키의 최종 값.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>활성 시간 단위를 바꾸고 실시간 스트림을 다시 연결합니다.</td></tr>
  </tbody>
</table>

<h3>렌더러</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>renderer</code> 옵션</td><td><code>'canvas'</code>(기본값), <code>'webgl'</code>, 또는 <code>'auto'</code>(하드웨어 GPU일 때만 WebGL).</td></tr>
    <tr><td><code>setRenderer(mode)</code></td><td>실행 중에 전환합니다. 실제로 그리는 렌더러를 반환합니다(WebGL 2가 없으면 <code>'canvas'</code>).</td></tr>
    <tr><td><code>getRenderer()</code></td><td><code>'canvas'</code> 또는 <code>'webgl'</code>.</td></tr>
  </tbody>
</table>
<p>GPU가 그리는 것과 측정값: <a href={href('/docs/performance')}>성능 → WebGL 렌더러</a>.</p>

<h3>지표</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>오버레이 또는 패널 지표를 추가합니다. 인스턴스 id를 반환합니다.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>실행 중인 지표를 변경합니다.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>지표를 제거하고 정리합니다.</td></tr>
    <tr><td><code>removeIndicators(instanceIds)</code></td><td>여러 지표를 한 번의 실행 취소 단계로 제거합니다.</td></tr>
    <tr><td><code>updateIndicatorStyle(instanceId, style)</code></td><td>색, 선 두께, 불투명도, 그리고 플롯별 선 종류와 표시(<code>plots: {`{ signal: { lineStyle: 'dashed' } }`}</code>).</td></tr>
    <tr><td><code>setIndicatorDefaults(id, style | null)</code></td><td>앞으로 추가할 같은 종류 지표의 시작 스타일.</td></tr>
    <tr><td><code>setIndicatorIntervals(instanceId, intervals | null)</code> · <code>getIndicatorIntervals(instanceId)</code></td><td>지표가 표시되는 시간 단위(<code>{`{ minutes: false, hours: [1, 4] }`}</code>). <code>null</code>이면 전체. 레이아웃과 함께 저장.</td></tr>
    <tr><td><code>setDataTimeframe(timeframe | null)</code></td><td><code>setData</code>로 넣은 바의 시간 단위. 범례 제목 줄에 표시되고, 일부 시간 단위에서만 표시하는 지표가 이를 따릅니다.</td></tr>
    <tr><td><code>setPaneStyle(instanceId, {'{ background, separator }'} | null)</code> · <code>getPaneStyle(instanceId)</code></td><td>패널 자체의 모양, 지표와 함께 저장.</td></tr>
  </tbody>
</table>

<h3>축 및 눈금</h3>
<p>
  가격 축(오른쪽 영역)과 시간 축(아래쪽 영역)은 트레이더에게 익숙한 제스처로
  포인터를 직접 조작할 수 있습니다.
</p>
<table>
  <thead><tr><th>제스처</th><th>효과</th></tr></thead>
  <tbody>
    <tr><td>가격 축을 위 / 아래로 드래그</td><td>세로 가격 범위를 축소 / 확대합니다(자동 눈금 해제).</td></tr>
    <tr><td>시간 축을 왼쪽 / 오른쪽으로 드래그</td><td>시간 축을 확대 / 축소합니다.</td></tr>
    <tr><td>가격 축 더블 클릭</td><td>자동 눈금을 다시 켭니다.</td></tr>
    <tr><td>시간 축 더블 클릭</td><td>모든 데이터를 화면에 맞춥니다.</td></tr>
  </tbody>
</table>
<p>
  <strong>시간대.</strong> 시간 축 라벨과 십자선의 시간 표시는 기본적으로 브라우저의
  로컬 시간대를 따릅니다. 설정 창에서 또는 코드로 직접 고정 UTC 오프셋으로 바꾸거나
  로컬로 되돌릴 수 있습니다.
</p>
<pre><code>{`chart.setTimezoneOffset(-300)  // EST (UTC-5), in minutes
chart.setTimezoneOffset(330)   // IST (UTC+5:30)
chart.setTimezoneOffset(null)  // back to browser-local`}</code></pre>

<p>같은 효과를 코드로도 적용할 수 있습니다.</p>
<pre><code>{`chart.setAutoScale(false)  // freeze the current price range
chart.setLogScale(true)    // switch to logarithmic price scale
chart.setInvertScale(true) // upside down (Alt+I in the widget)
chart.fitContent()         // zoom out to all data (Alt+R in the widget, with auto scale)
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.setMinBarUnit(0.05)               // narrower bars, so 'All' fits a long series (0.25 by default)
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)
chart.setVisibleRange(from, to)         // the bars between two times, edge to edge (Go to's Custom range)
chart.getVisibleTimeRange()             // { from, to }: the first and last bars on screen, or null`}</code></pre>
<p id="long-ranges">
  <strong>긴 기간.</strong> 봉 하나의 자리는 0.25 px보다 좁아지지 않으므로, 그보다 긴 기간(노트북에서 26년치 일봉)은 가장 최근 부분만 보입니다. 위젯에서는 기간 막대의 긴 기간이 봉당 2 px 이상으로 들어가는 시간 단위로 바뀝니다: 5Y 일봉은 주봉으로, All은 월봉으로. 짧은 기간은 고른 시간 단위로 돌아오며, 그보다 촘촘해지지 않습니다. 데이터 피드가 제공하는(또는 가진 봉을 모아 만들 수 있는) 시간 단위로만 바뀝니다. <code>{`features: { 'statusBar.rangeTimeframe': false }`}</code>는 시간 단위를 유지합니다. <code>Chart</code>를 직접 쓸 때는 <code>minBarUnit</code>(옵션, 또는 <code>setMinBarUnit</code>)으로 0.02 px까지 좁힐 수 있고, 픽셀 열 단위로 그립니다.
</p>

<p>
  <strong>가격 눈금 모드.</strong> 일반 눈금과 로그 눈금 외에도, 축 라벨을 첫 번째로
  보이는 봉을 기준으로 다시 매길 수 있습니다. <code>percentage</code>는
  % 변화를 표시하고, <code>indexedTo100</code>은 기준값을 100으로 맞춥니다. 일반,
  퍼센트, 100 기준 모드는 같은 선형 기하를 공유하며 라벨만
  다릅니다. 차트 설정 패널에서 또는 코드로 직접 설정할 수 있습니다.
</p>
<pre><code>{`chart.setScaleMode('percentage')   // axis labels: +12.34% from first visible bar
chart.setScaleMode('indexedTo100') // first visible bar reads as 100
chart.setScaleMode('logarithmic')
chart.getScaleMode()`}</code></pre>

<h3>가격 및 시간 형식</h3>
<p>
  가격은 원하는 형식으로 표시할 수 있고, 채권과 채권 선물의 호가처럼 1포인트의 분수로도 표시할 수
  있습니다(<code>101'16</code>은 101과 32분의 16). 이 형식은 가격 눈금을 따라 가격을 표시하는 모든 곳에
  적용됩니다. 축, 십자선, 현재가 태그, 범례, 툴팁, 주문, 알림, 그림 라벨이 모두 해당하며, 축 눈금은 정확히
  분수 단위에 놓이고 <code>roundPrice</code>도 그 단위로 반올림합니다. 지표 패널은 자체 숫자 형식을
  유지합니다. 형식을 직접 정하지 않으면 가격은 숫자 로캘에 따라 자릿수를 묶어 표시합니다. 축의 눈금 라벨은 그 간격에
  필요한 소수 자릿수만 보여 주고(73,500), 최근 가격, 십자선, 축 옆의 태그는 모든 소수 자릿수를 보여 줍니다. 시간도 원하는 형식으로 표시할 수 있으며, 포매터에는 라벨의 종류가 함께 전달됩니다.
</p>
<pre><code>{`new Chart(host, { priceFormat: { denominator: 32 } })                    // 101'16
chart.setPriceFormat({ denominator: 32, subDenominator: 2 })            // 101'165: 16½ 32nds
chart.setPriceFormat((p) => '$' + p.toFixed(2))
chart.setPriceFormat(null)                                              // decimals again

chart.setTimeFormatter((time, { kind, timeZone }) =>
  // kind: 'year', 'month', 'day' (the step a label starts), 'time' (within a day), 'crosshair'
  new Intl.DateTimeFormat('en-GB', { timeZone: timeZone ?? undefined, hour: '2-digit', minute: '2-digit' }).format(time))`}</code></pre>

<h3 id="axis-labels">축이 라벨을 고르는 방식</h3>
<p>
  시간축은 가장 큰 달력 단위를 시작하는 봉에 라벨을 붙입니다: 연도(굵게), 월, 일, 정시이며 서로 최소 80 px 떨어집니다. 그래서 5Y에서는 <code>2022 · Jul · 2023</code>, 한 달에서는 <code>Oct · 8 · 15</code>, 하루 안에서는 <code>12:00 · 18:00</code>으로 읽힙니다. 라벨은 화면이 아니라 봉에 속합니다: 이동하면 봉과 함께 움직이고, 앞쪽에 기록을 더 불러와도 제자리에 있습니다. 가장 오래된 봉의 왼쪽에는 없습니다. 월 이름은 <code>setNumberLocale</code>을 따르며, 격자선은 라벨 위치에 그어집니다.
</p>
<p>
  가격축은 높이에 맞는 만큼의 라벨을 최소 30 px 간격으로, 시장의 호가 단위에 놓습니다. 로그 축에서는 간격이 가격과 함께 커지므로 위쪽처럼 아래쪽에도 라벨이 붙고, 퍼센트나 지수 축에서는 기준에서 센 반듯한 퍼센트나 지수 포인트가 됩니다. 지표 창도 자기 높이로 라벨 수를 정합니다.
</p>

<h3>시장: 호가 단위, 가격 제한, 거래 세션</h3>
<p>
  <code>setMarket</code>은 차트에 거래소의 규칙을 알려 줍니다. 캔들 색상, 소수 자릿수, 호가 단위(가격에 따라
  달라질 수 있음), 그날의 상한가와 하한가, 매매 단위가 여기에 해당합니다.
  <code>roundPrice</code>와 <code>getPriceStep</code>은 가격이 속한 가격대의 호가 단위를 따르므로 차트 메뉴에서
  고른 가격은 항상 유효한 가격이 되고, 위젯의 주문 티켓은 호가 단위, 그날의 가격 제한, 매매 단위를 기준으로 주문을
  검사합니다. 프리셋에는 거래소의 거래 세션과 시간대도 들어 있어 <code>getCurrentSession</code>과 직접 작성한
  코드에서 쓸 수 있습니다. 차트의 세션 음영과 시간외 거래는 <code>setSymbolInfo</code>에서 정합니다. 프리셋은 2025년 5월 기준 베트남 거래소를 다룹니다. HOSE(가격에 따라 10, 50, 100동 단위, ±7%),
  HOSE의 ETF와 커버드 워런트(10동), HNX(±10%, 장 마감 후 세션), UPCoM(±15%), VN30 지수 선물(0.1포인트
  단위, ±7%, 8:45 개장)이며, 주식은 100주 단위, 상승은 초록, 하락은 빨강, 상한가는 보라, 하한가는 청록, 기준가는
  노랑입니다. 프리셋의 가격은 시세판처럼 1,000동 단위이며, <code>scaleMarketPrices(preset, 1000)</code>을 쓰면
  동 단위 가격을 읽습니다.
</p>
<pre><code>{`import {
  MARKET_HOSE, scaleMarketPrices, priceStepAt, roundToPriceStep, getCurrentSession,
  vn30fContracts, vn30fLastTradingDay,
} from '@tradecanvas/chart'

chart.setMarket(MARKET_HOSE)                 // 25350 같은 가격이면 scaleMarketPrices(MARKET_HOSE, 1000)
chart.setPriceLimits(25.35)                  // 기준가: 전일 종가
chart.getPriceLimits()                       // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
chart.roundPrice(25.37)                      // 25.35, 50동 단위
chart.getPriceStep(9.5)                      // 10,000동 미만은 0.01

// 규칙만 따로 쓰기
priceStepAt(25.35, MARKET_HOSE)              // 0.05
roundToPriceStep(10.486, MARKET_HOSE, 'down') // 10.45
getCurrentSession(MARKET_HOSE.sessions, Date.now(), MARKET_HOSE.timeZone) // { name: 'ATC', type: 'preClose', … }, 시각만으로 판단

// VN30 선물: 상장된 네 개 계약과 각각의 최종 거래일
vn30fContracts(Date.now())                   // [{ symbol: 'VN30F2611', lastTradingDay: '2026-11-19', … }, …]
vn30fLastTradingDay(2026, 12, (day) => holidays.has(day)) // 셋째 목요일, 휴일이면 앞당김`}</code></pre>
<p>
  직접 만드는 시장은 <code>MarketConfig</code>입니다. <code>priceStep</code>(가격대별로는
  <code>priceSteps: [{'{'} from, step {'}'}]</code>), <code>priceLimits</code>,
  <code>volumeUnit</code>(매매 단위), <code>sessions</code>, <code>timeZone</code>,
  <code>colorScheme</code>를 지정합니다. 종목 자체의 <code>minTick</code>이 시장의 호가 단위보다 우선합니다.
  거래소 규칙은 때때로 바뀌므로, 프리셋을 사용하기 전에 해당 거래소의 현행 규칙과 대조해 보세요.
</p>

<h3 id="comparing-symbols">종목 비교</h3>
<p>
  다른 종목의 변동률을 가격 눈금에 표시하거나(<code>addCompareSymbol</code>), 그 가격을 별도 눈금이나
  별도 패널에 표시하거나, 차트 종가와의 스프레드 또는 비율을 표시할 수 있습니다. 뒤의 방식들은
  지표(<code>compareSymbol</code>, <code>spread</code>)이므로 다른 지표처럼 범례, 값 라벨, 알림을 갖고
  레이아웃에도 저장됩니다. 다른 종목의 봉은 시간 기준으로 차트의 봉에 맞춰집니다. 차트가 필요한 봉을
  요청하므로, 시간 단위를 바꾼 뒤에는 다시 넘겨 주세요. <code>correlation</code>(종가 기준)과
  <code>correlationlog</code>(봉별 수익률 기준)도 같은 방식으로 다른 종목을 읽으며, 값은 −1에서 1 사이입니다.
</p>
<pre><code>{`chart.addCompareSymbol('eth', 'ETHUSDT', ethBars, '#7c4dff')   // percent change, on this scale
chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' })  // own scale
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })                      // own pane
chart.addIndicator('correlation', { symbol: 'ETHUSDT', length: 20 })                    // −1 to 1, own pane

chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))
chart.getRequiredSymbols()                           // what to fetch again on a new interval
chart.setPaneScale(spreadId, { percent: true })     // a pane in percent of its first value`}</code></pre>
<p>
  ChartWidget에서는 도구 모음의 비교(그리고 개체 트리의 +)가 비교 대화상자를 엽니다. 종목을 검색하고
  <strong>추가 방식</strong>에서 표시 방식(변동률, 별도 눈금, 별도 보조 차트, 스프레드, 비율, 가격 또는 수익률 상관관계)을
  고른 뒤 원하는 만큼 추가할 수 있습니다. 이미 비교 중인 종목은 맨 앞에 나열되며, 각각 표시 방식과 제거 버튼이
  붙습니다. 다음에 열 때는 마지막으로 쓴 방식이 선택되어 있습니다.
</p>

<h3>데이터 내보내기</h3>
<p>
  봉을 CSV 또는 JSON으로 내보내며, 각 지표 선은 범례에 표시되는 이름으로 별도의 열이 됩니다.
  ChartWidget에서는 차트의 오른쪽 클릭 메뉴에 <strong>데이터 내보내기 (CSV)</strong>가 있습니다.
</p>
<pre><code>{`chart.exportAllData('csv', 'btc-1h.csv')                 // every bar loaded
chart.exportVisibleData('json', undefined, { indicators: false })
const text = chart.getExportText('csv', { range: 'visible' })
const { bars, columns } = chart.getExportData()          // columns: { name, values }[]`}</code></pre>

<h3>매물대 (Volume Profile)</h3>
<p>
  보이는 범위의 거래량을 가격대별로 나누어 보여 주는 가로 히스토그램입니다.
  기본값은 꺼짐이며, 코드나 위젯 설정 창에서
  켜고 끌 수 있습니다.
</p>
<pre><code>{`chart.setVolumeProfileVisible(true)
chart.setVolumeProfileConfig({
  buckets: 48,        // resolution of the histogram
  widthRatio: 0.18,   // % of chart width
  opacity: 0.32,
  highlightPoC: true, // mark the highest-volume bucket
})`}</code></pre>

<h3>스윙 표시 (피벗)</h3>
<p>
  프랙탈 스윙 고점/저점을 작은 삼각형으로 표시합니다(확정된 피벗 고점 위에 ▼,
  피벗 저점 아래에 ▲). 강도는 양쪽에서 몇 개의 봉이 더 낮아야 하는지를
  정합니다. 설정 창에서 켜고 끄거나 다음과 같이 설정합니다.
</p>
<pre><code>{`chart.setPivotMarkersVisible(true)
chart.setPivotMarkersConfig({ left: 5, right: 5, showLabels: true })

// market-structure labels (HH / HL / LH / LL) instead of price
chart.setPivotMarkersConfig({ structureLabels: true })

// pure detection + classification are exported
import { findPivots, classifyPivots } from '@tradecanvas/core'
const pivots = findPivots(bars, 5, 5)        // [{ index, price, type }]
const structure = classifyPivots(pivots)     // adds label: 'HH'|'LH'|'HL'|'LL'`}</code></pre>

<h3>세션 음영 (정규 거래 시간)</h3>
<p>
  정규 세션 밖의 봉(장전/장후 또는 야간 휴장)을 흐리게 표시해
  정규장이 눈에 띄게 합니다. 기본값은 미국 주식 정규 거래 시간(뉴욕 시간
  09:30–16:00, 서머타임 반영)이며, 하루 중 분 단위로 시간 창을 정하고
  시장의 시간대를 함께 설정합니다. 피드가 세션 정보를 제공하는 종목은
  세션이 자동으로 설정됩니다.
</p>
<pre><code>{`chart.setSessionShadingVisible(true)
chart.setSessionShadingConfig({
  startMinute: 9 * 60 + 30,     // 09:30
  endMinute: 16 * 60,           // 16:00 (end-exclusive; end < start wraps midnight)
  timeZone: 'America/New_York', // or tzOffsetMinutes: -300 for a fixed offset
})`}</code></pre>
<p>
  <strong>시간외 거래.</strong> 끄면 종목의 정규 거래 시간(종목의 <code>timezone</code> 기준
  <code>SymbolInfo.sessions</code>) 밖의 봉이 차트에서 빠집니다. 빠진 봉은 실시간 봉과 과거 데이터
  페이지까지 따로 보관되며, 다시 켜면 돌아옵니다. 하루 이상 단위의 봉은 그대로 둡니다.
</p>
<pre><code>{`chart.setSymbolInfo({ symbol: 'AAPL', timezone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00' }] })
chart.setExtendedHours(false)     // or new Chart(host, { extendedHours: false })
chart.isExtendedHoursVisible()`}</code></pre>

<h3>이전 기간 레벨 (PDH / PDL / PDC)</h3>
<p>
  전일(또는 전주)의 고가, 저가, 종가와 현재 기간의 시가를
  라벨이 붙은 수평선으로 그립니다. 데이 트레이더가 주시하는 지지/저항
  레벨입니다. 설정 창에서 또는 코드로 직접 켜고 끌 수 있습니다.
</p>
<pre><code>{`chart.setPeriodLevelsVisible(true)
chart.setPeriodLevelsPeriod('week')   // 'day' (PDH/PDL/PDC) | 'week' (PWH/PWL/PWC)

// pure computation is exported
import { computePeriodLevels } from '@tradecanvas/core'
const levels = computePeriodLevels(bars, 'day')  // [{ id, label, price }]`}</code></pre>

<h3>마켓 프로파일 (TPO)</h3>
<p>
  가격별 체류 시간 히스토그램입니다. 각 봉은 자신의 범위가 닿은 모든 가격 구간에
  TPO를 하나씩 더하며, 이를 통해 POC(Point of Control, 가장 오래 머문 가격)와
  가치 영역(TPO의 약 70%)이 드러납니다. 거래량이 아니라 시간으로 가중한다는 점에서
  매물대와 다르며, 왼쪽에 고정되므로 둘을 함께 표시할 수 있습니다. 기본값은 꺼짐이며,
  설정 창에서 또는 코드로 직접 켜고 끌 수 있습니다.
</p>
<pre><code>{`chart.setMarketProfileVisible(true)
chart.setMarketProfileConfig({
  buckets: 48,
  widthRatio: 0.18,
  opacity: 0.32,
  valueAreaPct: 0.7,  // fraction of TPOs in the value area
  highlightPoC: true, // dashed line at the point of control
})

// split into one mini-profile per calendar-day session
chart.setMarketProfileConfig({ splitBySession: true })

// classic TPO letters per session (when zoomed in enough to be legible)
chart.setMarketProfileConfig({ splitBySession: true, letters: true })

// pure computation is exported too
import { computeMarketProfile, computeSessionProfiles } from '@tradecanvas/core'
const profile = computeMarketProfile(bars, priceMin, priceMax, { buckets: 48 })
const sessions = computeSessionProfiles(bars, priceMin, priceMax)  // per-day TPO`}</code></pre>

<h3>터치 및 모바일</h3>
<table>
  <thead><tr><th>제스처</th><th>동작</th></tr></thead>
  <tbody>
    <tr><td>한 손가락 드래그(차트 영역)</td><td>이동 + 십자선 이동</td></tr>
    <tr><td>두 손가락 핀치</td><td>가운데를 중심으로 확대/축소</td></tr>
    <tr><td>길게 누르기(~500 ms)</td><td>봉에 OHLC 툴팁 고정(Alt-클릭의 모바일 버전)</td></tr>
    <tr><td>가격 / 시간 축 영역 안에서 한 손가락 드래그</td><td>해당 축의 눈금 조정</td></tr>
    <tr><td>탭</td><td>클릭: <code>click</code>, <code>barClick</code>, 시그널 마커. 드로잉 위면 선택</td></tr>
    <tr><td>두 번 탭</td><td>더블클릭: 축 위면 초기화, 드로잉 위면 설정 열기</td></tr>
    <tr><td>드로잉 위에서 한 손가락 드래그</td><td>이동하거나, 선택한 드로잉의 핸들로 모양 변경</td></tr>
    <tr><td>드로잉 도구 선택 중: 탭, 탭 — 또는 누르고, 끌고, 떼기</td><td>점을 찍습니다. 누르고 끌다 떼면 두 점 선을 한 번에 그립니다</td></tr>
    <tr><td>드로잉 위에서 길게 누르기</td><td>그 메뉴(오른쪽 클릭과 같음)</td></tr>
    <tr><td>알림·주문·브래킷 선이나 창 구분선 위에서 한 손가락 드래그</td><td>그것을 끌기</td></tr>
  </tbody>
</table>
<p>
  손가락은 마우스보다 멀리 닿습니다: 선까지 약 16 px, 핸들까지 약 22 px(마우스는 8 px). 스크롤되는 페이지에서는 <code>pageScroll: true</code>가 세로 스와이프와 일반 마우스 휠을 페이지에 맡깁니다. 차트는 가로 스와이프로 이동하고 두 손가락이나 Ctrl + 휠(트랙패드 핀치)로 확대/축소하며, 드로잉·선·축을 누르는 동작은 계속 차트가 받습니다. <code>chart.setPageScroll(on)</code>으로 실행 중에 바꿀 수 있습니다.
</p>
<p>
  모달(설정, 단축키 목록, 명령 팔레트, 종목 검색)은 뷰포트 너비가 640 px 미만이면
  잡기 핸들과 안전 영역을 고려한 여백이 있는 바텀 시트 형태로
  자동 전환됩니다.
</p>

<h3>측정 도구</h3>
<p>
  <kbd>Shift</kbd>를 누른 채 차트를 드래그하면 두 지점 사이의 봉 수 × 가격을
  측정합니다. 오버레이에 가격 Δ(절대값 + %), 봉 수, 시간 범위가
  표시됩니다. 마우스를 놓는 즉시 오버레이가 사라지며, 저장된
  상태에는 남지 않습니다.
</p>

<h3>이벤트</h3>
<p>모든 이벤트는 <code>ChartEventMap</code>으로 타입이 지정됩니다.</p>
<pre><code>{`chart.on('orderPlace', e => /* OrderPlacePayload */)
chart.on('orderModify', e => /* OrderModifyPayload */)
chart.on('signalMarkerAdd', e => /* { marker } */)
chart.on('tradeZoneAdd', e => /* { zone } */)
chart.on('dataUpdate', e => /* { length } */)
chart.on('ordersChange', e => /* { orders } */)
chart.on('positionsChange', e => /* { positions } */)
chart.on('executionFill', e => /* { side, price, quantity, reason, pnl } */)
chart.on('chartContextMenu', e => /* { area, x, y, price, time } */)
chart.on('stateChange', () => /* 그림, 지표, 알림, 차트 유형 또는 테마가 바뀌었을 수 있음 */)
chart.on('paneChange', e => /* { instanceId, change: 'collapsed' | 'maximized' | 'order' } */)
chart.on('chartTypeChange', e => /* { type, previous } */)
chart.on('symbolChange', e => /* { symbol, previous } */)
chart.on('timeframeChange', e => /* { timeframe, previous } */)
chart.on('historyChange', e => /* { canUndo, canRedo } */)
chart.on('drawingSelect', e => /* { ids, primary } */)
chart.on('rendererChange', e => /* { renderer: 'canvas' | 'webgl', reason?: 'unsupported' | 'contextLost' | 'contextRestored' | 'limit' } */)`}</code></pre>

<h3>직접 만든 변경의 실행 취소</h3>
<p>
  <code>recordUndo</code>는 여러분의 변경을 그림, 지표와 함께 차트의 실행 취소 기록에 넣습니다. Ctrl/Cmd+Z는
  <code>undo</code>를, 다시 실행은 <code>redo</code>를 호출합니다. 같은 <code>subject</code>에 대해 잇달아 일어난 변경은
  한 단계로 묶입니다. ChartWidget도 설정과 차트 유형을 이렇게 기록합니다.
</p>
<pre><code>{`const before = panel.color
panel.color = 'red'
chart.recordUndo({ subject: 'panel-color', undo: () => (panel.color = before), redo: () => (panel.color = 'red') })`}</code></pre>

<h3>키보드와 스크린 리더</h3>
<p>
  포커스를 받은 차트는 화살표 키로 스크롤하고(Shift를 누르면 봉 열 개씩), ↑/↓ 또는 +/−로 확대/축소하며, Home과 End로
  처음과 끝으로 이동합니다. 스크린 리더에게는 요약(종목, 유형, 시간 단위, 현재가)이 있는 애플리케이션입니다. 키로 보기를
  움직이면 화면에 보이는 내용을 알려 주고, 쉼표와 마침표로 봉을 하나씩 읽습니다. <code>a11y.labels</code>로 원하는 언어로
  바꾸고, <code>a11y: false</code>로 뺄 수 있습니다. <code>scrollBars(n)</code>와 <code>selectDrawing(id)</code>는 키와
  클릭이 하는 일을 코드에서 합니다.
</p>
<pre><code>{`new Chart(host, { a11y: { labels: { role: 'gráfico', summary: '{what}. Último precio {close}.' } } })`}</code></pre>
<p>
  포인터 위치에서 얻은 가격은 <code>chart.roundPrice(price)</code>로 시장의 가격 단위에 맞출 수 있습니다.
  종목의 <code>minTick</code> 배수로, 그 값이 없으면 종목의 정밀도에 맞춥니다. ChartWidget의 메뉴, 주문 티켓과
  그리기 설정의 Coordinates 탭도 이렇게 합니다. <code>chart.getPriceStep()</code>은 그 단위 자체를 돌려줍니다.
</p>

<h2>ChartWidget</h2>
<p><code>Chart</code>를 완전한 UI로 감쌉니다. 같은 인스턴스를 <code>widget.chart</code>로 사용할 수 있습니다.</p>

<pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'

const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  features: { 'toolbar.replay': false },   // 위젯의 스위치: 커스터마이징 참고
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3 id="bars">각 바</h3>
<table>
  <thead><tr><th>바</th><th>들어 있는 것</th></tr></thead>
  <tbody>
    <tr><td>도구 모음</td><td>
      종목과 종목 정보, 시간 단위(고정한 것은 버튼으로 나오고, 모든 시간 단위를 분부터 월까지 단위별로 모은 메뉴도 있어 항목마다
      있는 별로 고정합니다), 아이콘으로 표시되는 차트 유형, 지표(대화상자: <a href={href('/docs/indicators')}>지표</a> 참고)와 (데이터 어댑터가 있을 때) 비교, 실행 취소와 다시 실행. 오른쪽에는 레이아웃, 바 리플레이,
      거래 메뉴(새 주문, 롱·숏 브래킷 주문, 호가창, 계좌 패널), 이어서 스크린샷, 설정, 테마, 전체 화면이 있고, 레일이
      없을 때(휴대폰, 또는 <code>{`features: { dock: false }`}</code>)는 알림과 개체 트리도 있습니다. 자리가 모자라면
      나머지는 “더보기” 안으로 접힙니다.
    </td></tr>
    <tr><td>그리기 도구</td><td>
      각 그룹의 메뉴에는 도구의 단축키(Alt+T는 추세선)가 적혀 있고, 행마다 별이 있어 그 도구를 맨 위에 고정할 수 있습니다.
      맨 아래에는 그리기 스타일, 자석, 지우개, 영역 확대, 그리기 모드 유지, 모두 잠금, 모두 숨기기, 모두 지우기가 있습니다.
    </td></tr>
    <tr><td>상태 바</td><td>
      기간 프리셋과 날짜로 이동, 시장 상태, 연결, 표시 시간대의 시계(누르면 고를 수 있는 시간대 목록이 열립니다), 가격 눈금의
      <code>%</code> · <code>log</code> · <code>auto</code> 전환.
    </td></tr>
    <tr><td>선택한 그림 위</td><td>
      색, 선 두께와 선 모양, 설정, 알림, 잠금, 더보기, 삭제. 도구 모음을 손잡이로 끌어 옮기면 다음 그림에서도 그 자리에
      머물고, 손잡이를 더블 클릭하면 그림 위로 돌아갑니다.
    </td></tr>
    <tr><td>도크</td><td>
      바깥쪽 가장자리의 레일로, 패널마다 버튼이 하나씩 있습니다: 관심 종목, 알림, 개체 트리, 데이터 창, 종목 정보.
      <a href="#dock">도크</a> 참고.
    </td></tr>
  </tbody>
</table>

<h3 id="dock">도크</h3>
<p>
  위젯의 패널은 차트 옆에 한 번에 하나씩 놓이며, 바깥쪽 가장자리의 레일에서 엽니다(좌우 반전된 위젯에서는 왼쪽).
  레일의 버튼을 누르면 그 패널이 열리고, 이미 열려 있는 패널이면 닫힙니다. 각 패널의 닫기 버튼으로도 닫을 수 있습니다.
  관심 종목이 있으면 처음에는 관심 종목이 열려 있습니다. 패널 가장자리를 끌거나 가장자리에서 화살표 키를 쓰면 너비를
  233~377 px(처음에는 296)로 바꿀 수 있고, 너비는 이 브라우저에 저장됩니다.
</p>
<p>
  휴대폰이나 너비가 641 px 미만인 위젯에는 레일이 없습니다: 패널이 아래에서 차트 위로 올라오고, 처음에는 닫혀 있습니다.
  이때 알림과 개체 트리는 도구 모음에서, 종목 정보는 종목 옆의 <strong>ⓘ</strong>에서 열고, 어떤 패널이든 직접 작성한
  코드에서 열 수 있습니다. <code>ChartWidgetGrid</code>의 차트에는 각자의 레일이 없습니다. 단, 그
  <code>widget.features</code>에서 <code>dock</code>을 켜면 생깁니다.
</p>
<pre><code>{`widget.openPanel('watchlist')   // 'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo'; false if not there
widget.getOpenPanel()           // the panel open, or null
widget.closePanel()

new ChartWidget(host, { features: { dock: false } })              // no rail: the toolbar opens the panels
new ChartWidget(host, { features: { 'dock.dataWindow': false } })  // no button for the data window`}</code></pre>

<h3 id="search-dialogs">종목 검색, 비교, 이동</h3>
<p>
  <strong>종목 검색</strong>은 도구 모음의 종목, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>,
  또는 차트 위에서 입력한 글자로 열리며, 그 글자로 검색을 시작합니다. 아무것도 입력하기 전에는 <code>symbols</code> 목록을
  보여 주고, 입력하면 입력이 멈출 때마다 피드의 검색(<code>searchSymbols</code> 또는 어댑터의 검색)에 묻습니다. 종목, 이름,
  종류, 거래소가 열로 나뉘어 표시되고, 차트의 종목에는 표시가 붙습니다. 결과에 여러 종류(예: 주식과 암호화폐)가 섞여 있으면
  하나로 좁힐 수 있습니다. 검색으로 알게 된 이름은 처음 열 때 보이는 목록에도 남습니다.
  <code>{`features: { symbolTyping: false }`}</code>로 하면 차트 위에서 글자를 입력해도 열리지 않습니다.
</p>
<p>
  <strong>비교</strong>는 같은 대화상자로, 검색창 아래에 <strong>추가 방식</strong>이 있고 비교 중인 종목이 맨 앞에
  나열됩니다(<a href="#comparing-symbols">종목 비교</a> 참고).
</p>
<p>
  <strong>이동</strong>(상태 바의 달력, <kbd>Alt</kbd>+<kbd>G</kbd>, 또는 차트 메뉴)에는 탭이 두 개 있습니다.
  <strong>날짜</strong>는 지정한 날짜와 시각의 봉을 가운데로 가져오고, <strong>사용자 지정 범위</strong>는 두 시점 사이의 봉을
  화면 끝에서 끝까지 채워 보여 주며, 처음 값은 지금 화면에 보이는 범위입니다. 입력란 아래의 월 달력은 입력 중인 날짜 칸을
  채우고, 범위의 시작을 고르면 끝으로 넘어갑니다. 일봉 이상에서는 시각을 입력하지 않으며, 오늘 이후의 날짜는 고를 수
  없습니다. 날짜와 시각은 표시 시간대 기준으로 읽습니다.
</p>

<h3>위젯 키보드 단축키</h3>
<table>
  <thead><tr><th>단축키</th><th>동작</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>명령 팔레트(지표, 차트 유형, 그리기 도구…)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>종목 검색: 설정된 종목 목록, 또는 입력하는 대로 피드의 검색</td></tr>
    <tr><td><kbd>A</kbd>–<kbd>Z</kbd></td><td>입력한 글자로 시작하는 종목 검색(<code>{`features: { symbolTyping: false }`}</code>로 끌 수 있음)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>레이아웃 저장(처음에는 이름을 묻습니다)</td></tr>
    <tr><td><kbd>0</kbd>–<kbd>9</kbd></td><td>시간 단위(<code>5</code>, <code>15m</code>, <code>1h</code>, <code>1D</code>)를 입력하고 Enter로 적용(<code>intervalTyping: false</code>로 끌 수 있음)</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>H</kbd> / <kbd>J</kbd> / <kbd>V</kbd> / <kbd>C</kbd> / <kbd>F</kbd></td><td>추세선, 수평선, 수평 반직선, 수직선, 십자선, 피보나치 되돌림</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>보기 재설정: 모든 봉을 화면에 담고 가격 눈금을 그에 맞춤</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>I</kbd></td><td>가격 눈금 반전</td></tr>
    <tr><td><kbd>Alt</kbd> + <kbd>G</kbd></td><td>날짜로 이동</td></tr>
    <tr><td><kbd>?</kbd></td><td>키보드 단축키 목록 표시</td></tr>
    <tr><td><kbd>Alt</kbd> + 차트 클릭</td><td>마우스를 올린 봉에 OHLC 툴팁 고정(실시간 십자선과의 차이 표시)</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>툴팁 고정 해제 / 그리기 취소</td></tr>
    <tr><td>도구 모음에서 종목 클릭</td><td>종목 검색 모달을 엽니다</td></tr>
    <tr><td>도구 모음에서 재생 클릭</td><td>바 리플레이 스크러버를 엽니다(재생/한 봉씩 이동/탐색/속도)</td></tr>
  </tbody>
</table>
<p>검색 가능한 종목 목록은 런타임에 <code>widget.setSymbols(['BTCUSDT', 'ETHUSDT', …])</code>로 업데이트합니다.</p>

<h3>데이터 창</h3>
<p>
  마우스를 올린 봉의 정확한 O/H/L/C/V, 봉 변동, 모든 활성 지표의 값을
  보여 주는 플로팅 표시창으로, 십자선을 움직이면 실시간으로 갱신됩니다.
  명령 팔레트(<kbd>Ctrl/⌘ K</kbd> →
  "데이터 창 표시/숨기기")에서 켜고 끕니다.
</p>

<h3>공유 가능한 보기 (딥 링크)</h3>
<p>
  종목, 시간 단위, 차트 유형, 가격 눈금, 지표(파라미터 포함), 그림 등
  보기 전체를 딥 링크용의 간결하고 URL에 안전한 문자열로 인코딩합니다.
  <code>shareUrl: true</code>를 설정하면 위젯이 로드 시
  <code>#tcw=…</code> 해시를 복원하고, 명령 팔레트의 "보기 공유" 동작이
  링크를 클립보드에 복사합니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, { shareUrl: true })

const token = widget.exportState()      // portable string
await widget.importState(token)         // restore a view
await widget.copyShareLink()            // copy "<url>#tcw=<token>"`}</code></pre>

<h3>이름 있는 레이아웃</h3>
<p>
  도구 모음의 레이아웃 버튼은 차트를 이름을 붙여 저장합니다. 종목, 시간 단위, 가격 눈금,
  차트 유형, 지표, 그림, 알림이 저장되며, 테마는 보는 사람의 설정이므로 저장하지 않습니다.
  레이아웃 열기, 이름 바꾸기, 삭제는 이 버튼의 메뉴에서 합니다. 열려 있는 레이아웃은
  바뀔 때마다 자동 저장되며, <kbd>Ctrl/⌘ S</kbd>로도 저장할 수 있습니다. <code>storage</code>를
  넘기지 않으면 레이아웃은 이 브라우저의 <code>localStorage</code>에 저장됩니다.
  <code>storage</code>는 네 가지 호출로 이루어지며, 각각 프로미스를 반환해도 됩니다.
</p>
<pre><code>{`import { ChartWidget, type LayoutStorage } from '@tradecanvas/chart/widget'

const server: LayoutStorage = {
  list: () => api.get('/layouts'),              // [{ id, name, symbol, timeframe, updatedAt }]
  load: (id) => api.get(\`/layouts/\${id}\`),     // { ...summary, content } 또는 null
  save: (layout) => api.put(\`/layouts/\${layout.id}\`, layout),
  remove: (id) => api.delete(\`/layouts/\${id}\`),
}

const widget = new ChartWidget(host, {
  layouts: { storage: server, autoSave: true, openLast: true },  // 끄려면 false
})

const layouts = widget.getLayoutSession()!
await layouts.saveAs('Swing BTC')
await layouts.open(id)
layouts.current()          // { id, name, … } 또는 null
layouts.setAutoSave(false)

// 내용만 꺼내서 원하는 곳에 보관
const json = widget.getLayoutContent()
await widget.applyLayoutContent(json)`}</code></pre>
<p>
  기본 제공 저장소는 <code>localStorageLayouts(prefix)</code>와 <code>memoryLayouts()</code> 두
  가지입니다. 저장된 내용은 방어적으로 읽기 때문에, 해석할 수 없는 레이아웃은 절반만 적용되지 않고
  거부됩니다. 각 레이아웃은 자신의 <code>kind</code>(<code>'chart'</code> 또는 <code>'grid'</code>)를
  기록하므로, 위젯과 그리드가 저장소 하나를 함께 써도 각자 자신의 레이아웃만 나열합니다. 저장, 열기,
  자동 저장은 한 번에 하나씩 실행되므로, 저장이 그 뒤에 연 레이아웃에 기록되는 일은 없습니다.
</p>

<h3>종목별 레이아웃</h3>
<p>
  이와 별도로, 종목별 지표 구성, 그림, 알림, 차트 유형을
  <code>localStorage</code>에 자동으로 저장할 수 있습니다.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  persistLayouts: true,  // or { keyPrefix: 'myapp:', debounceMs: 2000 }
})

// Reset a single symbol's layout
widget.clearSavedLayout('BTCUSDT')`}</code></pre>
<p>
  레이아웃은 종목을 전환할 때와 위젯이 소멸될 때 저장되므로, 사용자가
  페이지를 떠나도 잃는 것이 없습니다.
</p>

<h3>드래그 앤 드롭 데이터 가져오기</h3>
<p>
  CSV 또는 JSON 파일을 차트에 끌어다 놓으면 즉시 불러옵니다. 기본적으로
  활성화되어 있으며 <code>dragDropImport: false</code>로 끌 수 있습니다. 파서는
  일반적인 열 구성(<code>time, open, high, low, close, volume</code>),
  ISO 8601 타임스탬프, 유닉스 초/밀리초를 처리합니다.
</p>
<pre><code>{`// Programmatic use
import { parseOHLCV } from '@tradecanvas/chart'

const { data, rowCount, skipped } = parseOHLCV(csvText)
chart.setData(data)`}</code></pre>

<h3>시간 단위 리샘플링</h3>
<p>
  가장 세밀한 해상도의 시리즈를 <code>widget.setData()</code>로 위젯에 넘기면
  도구 모음의 시간 단위 버튼이 클라이언트에서 집계합니다. 데이터셋 하나로
  모든 해상도를 구동하므로 다시 가져올 필요가 없습니다. 실시간 어댑터가 연결되지
  않았을 때 항상 동작하며, <code>resampleTimeframes: false</code>로 끌 수 있습니다.
  주간 구간은 기본적으로 월요일 기준입니다(일요일 기준은 <code>weekStartsOn: 0</code>).
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  timeframes: ['5m', '15m', '1h', '4h', '1d', '1w'],
})
widget.setData(oneMinuteBars)   // base series; clicking 4h/1d/1w resamples it

// Or use the pure function directly
import { resampleOHLCV, inferTimeframeMs } from '@tradecanvas/chart'

const hourly = resampleOHLCV(oneMinuteBars, '1h')   // OHLC merged, volume summed
const fourHour = resampleOHLCV(oneMinuteBars, '4h', { weekStartsOn: 1 })`}</code></pre>
<p>
  달력을 고려한 구간 나누기: 일중 및 일 단위는 UTC epoch 경계에, 주 단위는
  설정된 주 시작일에, 월 / 분기 / 연 단위는 달력 경계에 맞춥니다.
  입력 봉은 절대 변경되지 않습니다.
</p>

<h3>관심 종목</h3>
<p>
  도크의 패널 중 하나로, 종목 목록을 담고 각 행에 현재가, % 변화, 스파크라인을 보여 줍니다. 목록은 메뉴에서 전환, 생성,
  이름 바꾸기, 삭제하고, 종목은 종목 검색(+)으로 추가하고 삭제하며 드래그나 Alt+↑/↓로 순서를 바꿉니다. 각 행의
  시세는 어댑터의 <code>subscribeQuotes</code>, 직접 만든 시세 소스, 또는 직접 넣은 값에서 가져옵니다.
</p>
<pre><code>{`const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  adapter: new BinanceAdapter(),               // its quotes fill the rows
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,                             // kept in this browser
    onChange: (lists, active) => save(lists),  // or keep them yourself
  },
})

widget.addToWatchlist('BNBUSDT', 'alts')
widget.setActiveWatchlist('alts')
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }])   // from your own feed
widget.getQuote('AAPL')`}</code></pre>
<p>
  <code>watchlist: true</code>는 예전처럼 <code>symbols</code> 목록 하나를 보여 주고, <code>setWatchlistEntry</code>로
  여전히 행의 가격, 변동, 스파크라인을 넣을 수 있습니다.
</p>

<h3>종목 정보</h3>
<p>
  도크의 패널 중 하나로, 종목 옆의 ⓘ, 레일, 또는 명령 팔레트에서 엽니다. 종목의 이름, 현재가와 변동, 다음 개장이나 마감까지
  카운트다운하는 시장 상태, 당일 시가, 범위, 거래량, 전일 종가, 매수호가와 매도호가, 호가 단위, 통화, 시간대와
  거래 시간, 뉴스를 보여 줍니다. 시장이 닫혀 있으면 상태 표시줄에도 표시됩니다.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'AAPL',
  news: (symbol, limit) => api.headlines(symbol, limit),   // or the adapter's fetchNews
})
widget.toggleSymbolInfo(true)`}</code></pre>

<h3>탐색, 실행 취소, 방향</h3>
<p>
  차트 위의 버튼 — 축소와 확대, 이전과 이후로 스크롤(누르고 있으면 계속 이동), 재설정 — 은 마우스가 데이터를 가리지 않는 플롯 영역 아래쪽 가장자리
  근처에 있을 때나 버튼 하나에 포커스가 있을 때 나타납니다(<code>navigation: false</code>로 뺄 수 있습니다). 설정 변경과 차트 유형 변경은 그림, 지표와 함께
  Ctrl/Cmd+Z로 되돌립니다. 아랍어, 히브리어, 페르시아어, 우르두어에서는 위젯이 좌우 반전됩니다(<code>dir: 'auto'</code>,
  또는 <code>'rtl'</code> / <code>'ltr'</code>). 차트의 시간은 그대로 왼쪽에서 오른쪽으로 흐릅니다.
</p>

<h3>그리기 도구 즐겨찾기</h3>
<p>
  자주 쓰는 그리기 도구를 사이드바 위쪽 띠에 고정합니다.
  도구(그룹 플라이아웃 안이든 띠 안이든)를 마우스 오른쪽 버튼으로 클릭하면 고정하거나
  해제할 수 있으며, 고정한 목록은 localStorage에 저장됩니다. 처음 고정할 도구는
  <code>drawingFavorites</code>로 지정합니다.
</p>
<pre><code>{`new ChartWidget(host, {
  drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'],
})`}</code></pre>

<h3>그리기 스타일 및 템플릿</h3>
<p>
  그리기 사이드바의 팔레트 버튼을 누르면 스타일 팝오버가 열립니다. 다음 그림(및
  선택된 그림)의 색상, 선 두께, 선 스타일을 고르고, 이름을 붙인
  <strong>템플릿</strong>으로 localStorage에 저장해 클릭 한 번으로 다시 쓸 수
  있습니다. 코드로는 다음과 같습니다.
</p>
<pre><code>{`chart.setDrawingStyle({ color: '#e8505b', lineWidth: 2, lineStyle: 'dashed' })
chart.getDrawingStyle()
chart.setSelectedDrawingStyle({ color: '#1fa874' })  // restyle the selected drawing`}</code></pre>

<h3>개체 트리</h3>
<p>
  레일의 레이어 버튼(레일이 없으면 도구 모음의 버튼)을 누르면 모든 활성 지표와 그림을 나열하는 개체 트리가
  도크에 열립니다. 지표는 삭제할 수 있고, 그림은 항목마다
  표시 / 숨기기, 잠금 / 잠금 해제, 설정, 삭제를 할 수 있고, 그룹은 소속된 그림과
  함께 그 아래에 나열됩니다. 기본적으로 활성화되어 있으며
  <code>objectTree: false</code>로 끌 수 있습니다. 그림 관련 컨트롤은 다음 API에 대응합니다.
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked, intervals)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.isDrawingShown(id)            // 숨겨지지 않았고, 이 시간 단위에서 표시됨
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // 함께 숨기고, 잠그고, 선택됨
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>그림 설정과 메뉴</h3>
<p>
  그림을 더블 클릭하거나 개체 트리의 톱니바퀴 버튼을 누르면 그 그림의 설정이 탭으로 나뉘어 열립니다.
  탭은 스타일(선, 선 끝, 채우기, 그리고 피보나치 레벨, 연장, 라벨 같은 도구 고유의 설정), 글을 쓰는 도구의
  텍스트, 좌표(차트 시간대 기준의 각 점), 표시(그림이 보이는 시간 단위)이고, 아래쪽에 템플릿 메뉴, 취소,
  확인이 있습니다. 그림을 오른쪽 클릭하면 메뉴가 열리며, 설정, 선에 거는 알림, 순서,
  그룹, 잠금, 숨기기, 복제, 삭제를 고를 수 있습니다. 사이드바에는 지우개, 확대 도구,
  그리고 꺼짐·약함·강함으로 바꾸는 자석도 있습니다. 바탕이 되는 API는
  <a href={href('/docs/drawing-tools')}>그리기 도구</a>를 참고하세요.
</p>

<p>
  각 지표 행의 톱니바퀴 버튼을 누르면 <strong>설정 대화상자</strong>가 열립니다.
  이 대화상자는 지표의 파라미터(숫자, 토글, 색상)를 자동으로 읽어 오고, 변경 사항을
  <code>updateIndicator</code>로 즉시 적용합니다. 기간이나 색상을 바꾸려고
  지표를 지웠다가 다시 추가할 필요가 없습니다.
</p>
<p>
  개체 트리의 <strong>비교</strong> 섹션에는 정규화된 선으로 겹쳐 표시한 종목이
  나열됩니다. 실시간 어댑터가 있으면 이 섹션의 + 버튼이 비교 대화상자를 엽니다.
  퍼센트로 추가한 종목은 <code>adapter.fetchHistory</code>로 과거 데이터를
  가져옵니다(가격대가 다른 종목도 하나의 축을 공유하도록). 비교 종목은
  시간 단위가 바뀌면 자동으로 다시 가져옵니다. 코드로는 다음과 같습니다.
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>가격 알림</h3>
<p>
  알림은 가격 수준뿐 아니라 한 선을 다른 선과 비교할 수 있고(가격이 이동평균선을 교차, MACD가
  시그널선을 교차), 일정 봉 수(2~500) 안에 일정 퍼센트 움직이면 발생하게 하거나, 마감된 봉만 보게
  하거나(되돌아오는 꼬리에는 발생하지 않음), 만료되게 할 수 있습니다. 위젯의 알림 패널에서 이 모두를
  설정할 수 있고, 코드에서는 <code>addAlert</code>의 마지막 인수로 지정합니다. 알림은
  <code>setCurrentPrice</code>에서 오든 연결된 피드에서 오든 가격이 들어올 때마다, 감시하는 선과 함께
  검사됩니다.
</p>
<pre><code>{`const ema = chart.addIndicator('ema', { period: 50 })
const rsi = chart.addIndicator('rsi')
chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: \`\${ema}:value\` })
chart.addAlert(NaN, 'movesUp', 'pump', 'price', undefined, { percent: 5, bars: 12 })
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', \`\${rsi}:value\`, 'RSI', { onBarClose: true })
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 })

chart.on('alertExpired', (e) => e.payload)   // it reached its time without firing
chart.on('alertTriggered', (e) => e.payload)  // { id, condition, channel, target?, percent?, bars?, … }`}</code></pre>
<p>
  도구 모음의 종 아이콘을 누르면 가격 알림을 추가, 조회, 삭제하는 플로팅 패널이
  열리며, 알림이 발생하면 토스트가 표시됩니다. 알림 선은
  <strong>드래그</strong>할 수도 있어서, 차트에서 잡고 밀어 가격을 바꿀 수 있습니다
  (알림을 옮기면 다시 활성화됩니다). 기본적으로 활성화되어 있으며
  <code>alerts: false</code>로 끌 수 있습니다. 코드에서는
  <code>Chart</code> API와 타입이 지정된 알림 이벤트로 제어합니다.
</p>
<pre><code>{`// Add from code (condition: 'crossing' | 'crossingUp' | 'crossingDown'
//                          | 'greaterThan' | 'lessThan')
const id = chart.addAlert(64200, 'crossingUp', 'breakout')
chart.removeAlert(id)
chart.getAlerts()      // PriceAlert[]
chart.saveAlerts('tcw:alerts:BTCUSDT')   // localStorage persistence
chart.loadAlerts('tcw:alerts:BTCUSDT')

// React to triggers
chart.on('alertTriggered', (e) => {
  console.log('hit', e.payload.price, e.payload.message)
})
// also: 'alertAdd' / 'alertRemove' / 'alertUpdate' (fired on drag)

// Indicator alerts: bind to an indicator line via channel '<instanceId>:<key>'.
// In the widget, the alerts panel's source dropdown lists every active line.
const ema = chart.addIndicator('rsi')
chart.addAlert(70, 'crossingUp', 'RSI overbought', \`\${ema}:rsi\`, 'RSI')`}</code></pre>
<p>
  알림이 발생할 때 소리 및/또는 데스크톱 알림을 받도록 선택할 수 있습니다(둘 다
  기본값은 꺼짐). <code>sound: true</code>는 내장 비프음을 재생하며, URL을 넘기면
  사용자 지정 소리를 사용합니다. <code>desktop: true</code>는 Notification API를 사용하며
  처음 사용할 때 권한을 요청합니다.
</p>
<pre><code>{`new ChartWidget(host, {
  alertNotifications: { sound: true, desktop: true },
})`}</code></pre>

<h3>기능 스위치</h3>
<p>스위치 132개가 있고, 끄기 전까지 모두 켜져 있습니다. 점이 없는 이름은 기능 전체로 나타나는 모든 곳에서 꺼지고, 점이 있는 이름은 한 자리입니다. 위젯이 실행 중일 때도 바꿀 수 있습니다. 전체 목록과 그에 해당하는 예전 옵션은 <a href={href('/docs/customization')}>커스터마이징</a>에 있습니다.</p>
<pre><code>{`new ChartWidget(host, { features: { 'toolbar.replay': false, 'sidebar.patterns': false, hotkeys: false } })   // 버튼 하나, 그리기 도구 묶음 하나, 모든 단축키

widget.setFeatures({ sidebar: false, statusBar: false })
widget.isFeatureOn('sidebar')    // false
widget.getFeatures()             // 모든 스위치의 켜짐/꺼짐`}</code></pre>

<h3>직접 추가하는 버튼과 메뉴 항목</h3>
<p>
  도구 모음에 버튼(내장 아이콘 또는 직접 만든 요소, 텍스트, 스위치)을, 차트의 오른쪽 클릭 메뉴에
  항목을 추가합니다. 추가한 버튼과 항목은 위젯 기본 항목 뒤에 놓입니다.
</p>
<pre><code>{`const news = widget.addToolbarButton({
  id: 'news',
  label: 'News',
  icon: 'bell',            // 또는 <svg> 요소, 혹은 text: 'News'
  side: 'right',           // 'left'는 차트 컨트롤 옆에 놓임
  toggle: true,
  onClick: () => news?.setActive(togglePanel()),
})
news?.setText('3')
news?.remove()

new ChartWidget(host, {
  chartMenuItems: ({ area, price, time }) => area === 'plot' && price !== undefined
    ? [{ label: \`Copy \${price.toFixed(2)}\`, icon: 'check', onSelect: () => copy(price) }]
    : [],
})`}</code></pre>
<p>그 밖에 툴바의 메뉴 버튼, 그리기 사이드바의 버튼, 상태 바의 항목, 각 바와 차트 위의 내 자리, 그림이나 지표 메뉴 끝의 항목도 있습니다(<a href={href('/docs/customization#parts')}>커스터마이징</a> 참고):</p>
<pre><code>{`widget.addToolbarDropdown({ id: 'scans', label: 'Scans', icon: 'layers', items: () => [...] })   // 열 때마다 새로 가져옴
widget.addSidebarButton({ id: 'ruler', label: 'Ruler', icon: 'ruler', toggle: true, onClick })
widget.addStatusBarItem({ id: 'latency', text: '12 ms', label: 'Latency' })
widget.getSlot('chart')          // 차트 위의 층
widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })   // 직접 만든 단축키, 같은 키의 위젯 단축키를 대신함

new ChartWidget(host, {
  drawingMenuItems: ({ id, type }) => [{ label: 'Share', onSelect: () => share(id) }],
  indicatorMenuItems: ({ instanceId, indicatorId }) => [{ label: 'Explain', onSelect: () => explain(indicatorId) }],
})`}</code></pre>

<h2>ChartWidgetGrid</h2>
<p>
  여러 차트 위젯을 나란히 배치하며, 각 차트는 자신만의 종목, 시간 단위, 지표, 그림을 가집니다.
  위쪽 막대에서 배치를 고르고, 차트를 연동하고, 그리드 전체를 이름 있는 레이아웃으로 저장합니다.
  마지막으로 누른 차트가 활성 차트(테두리 표시)입니다.
</p>
<pre><code>{`import { ChartWidgetGrid } from '@tradecanvas/chart/widget'

const grid = new ChartWidgetGrid(host, {
  layout: '2x2',                                   // '1x1' '1x2' '2x1' '2x2' '1x3' '3x1' '2x3' '3x2'
  widget: { timeframe: '1h' },                    // 모든 차트에 적용
  adapter: () => new BinanceAdapter(),            // 차트마다 하나: 어댑터 하나는 스트림 하나를 유지
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' }, { symbol: 'BNBUSDT' }],
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false, replay: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // 나머지 차트를 활성 차트에 맞춤
grid.applyOverrides({ 'grid.vertical.visible': false })   // 모든 차트의 모양, 나중에 추가하는 차트까지
grid.setFeatures({ 'toolbar.replay': false })               // 모든 차트의 스위치, 나중에 추가하는 차트까지
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// 각 차트가 만들어질 때마다 (처음, 그리고 그리드가 커질 때)
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  십자선 동기화는 포인터 아래의 시간을 모든 차트에 표시하고, 시간 축 동기화는 사용 중인 차트에 맞춰
  나머지 차트를 스크롤하고 확대/축소하며, 그림은 같은 종목을 보여 주는 차트로 복사됩니다(이 동기화를 켜면
  그 차트들의 그림이 하나로 합쳐지며, 사라지는 그림은 없습니다). 리플레이 동기화는 리플레이 중인 차트와
  같은 시간까지 다른 차트도 리플레이합니다(리플레이 스텝보다 긴 봉의 차트에는 그 시간을 포함하는 봉 전체가 표시됩니다).
  그리드가 작아질 때 빠진 차트는 치워 두며
  저장된 레이아웃에도 남고, 그리드가 다시 커지면 이전 모습 그대로 돌아옵니다. 완전히 새로운 차트는 종목과
  시간 단위가 동기화되어 있으면 활성 차트의 종목과 시간 단위로 열립니다.
</p>

<h2>ChartGrid</h2>
<p>헤드리스 차트(도구 모음 없음)로 이루어진 동기화된 다중 차트 레이아웃입니다. 전체 UI가 필요하면 <code>ChartWidgetGrid</code>를 참고하세요.</p>
<pre><code>{`import { ChartGrid } from '@tradecanvas/chart'

const grid = new ChartGrid(host, { layout: '2x2', theme: 'dark' })
// 차트마다 어댑터 하나: 어댑터 하나는 스트림 하나를 유지
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'], '5m')
grid.setLayout('1x2')`}</code></pre>

<p>레이아웃: <code>'1x1'</code>, <code>'1x2'</code>, <code>'2x1'</code>, <code>'2x2'</code>, <code>'1x3'</code>, <code>'3x1'</code>, <code>'2x3'</code>, <code>'3x2'</code>.</p>
