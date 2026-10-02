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

<h3>차트 유형 및 테마</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>setChartType(type)</code></td><td>17가지 유형 중 하나 — <a href={href('/docs/chart-types')}>차트 유형</a>을 참고하세요.</td></tr>
    <tr><td><code>setTheme(name)</code></td><td>내장 테마 사이에서 전환합니다.</td></tr>
    <tr><td><code>setTimeframe(tf)</code></td><td>활성 시간 단위를 바꾸고 실시간 스트림을 다시 연결합니다.</td></tr>
  </tbody>
</table>

<h3>지표</h3>
<table>
  <thead><tr><th>메서드</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>addIndicator(id, params?, position?)</code></td><td>오버레이 또는 패널 지표를 추가합니다. 인스턴스 id를 반환합니다.</td></tr>
    <tr><td><code>updateIndicator(instanceId, params)</code></td><td>실행 중인 지표를 변경합니다.</td></tr>
    <tr><td><code>removeIndicator(instanceId)</code></td><td>지표를 제거하고 정리합니다.</td></tr>
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
chart.fitContent()         // zoom out to all data
chart.scrollToEnd()
chart.setVisibleRangePreset('3M')       // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))    // centre that bar (Alt+G in the widget)`}</code></pre>

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
  </tbody>
</table>
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
chart.on('stateChange', () => /* 그림, 지표, 알림, 차트 유형 또는 테마가 바뀌었을 수 있음 */)`}</code></pre>

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
  features: { drawings: true, indicators: true },
  onReady: (chart) => { /* ... */ },
})

widget.chart.setData(...)
widget.destroy()`}</code></pre>

<h3>위젯 키보드 단축키</h3>
<table>
  <thead><tr><th>단축키</th><th>동작</th></tr></thead>
  <tbody>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></td><td>명령 팔레트(지표, 차트 유형, 그리기 도구…)</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td><td>종목 검색 — 설정된 종목 목록에서 퍼지 검색</td></tr>
    <tr><td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td><td>레이아웃 저장(처음에는 이름을 묻습니다)</td></tr>
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

<h3>관심 종목 사이드바</h3>
<p>
  설정된 모든 종목의 최근 가격, % 변화, 미니 스파크라인을 보여 주는
  오른쪽 패널로, 필요할 때 켜서 사용합니다.
</p>
<pre><code>{`new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),
  watchlist: true,
})

// Feed non-active rows from your own data source
widget.setWatchlistEntry('ETHUSDT', {
  lastPrice: 3245.12,
  refPrice: 3180.50,
  sparkline: [3180, 3195, 3210, ...],
})`}</code></pre>

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
  도구 모음의 레이어 버튼을 누르면 모든 활성 지표와 그림을 나열하는 개체 트리
  패널이 열립니다. 지표는 삭제할 수 있고, 그림은 항목마다
  표시 / 숨기기, 잠금 / 잠금 해제, 설정, 삭제를 할 수 있고, 그룹은 소속된 그림과
  함께 그 아래에 나열됩니다. 기본적으로 활성화되어 있으며
  <code>objectTree: false</code>로 끌 수 있습니다. 그림 관련 컨트롤은 다음 API에 대응합니다.
</p>
<pre><code>{`chart.getDrawings()                 // DrawingState[] (id, type, visible, locked)
chart.setDrawingVisible(id, false)  // hide a single drawing
chart.setDrawingLocked(id, true)    // lock it from edits
chart.removeDrawing(id)
chart.groupDrawings(ids, 'Weekly levels')  // 함께 숨기고, 잠그고, 선택됨
chart.renameDrawingGroup(groupId, 'Old highs')
chart.getActiveIndicators()         // active indicator instances
chart.updateIndicator(instanceId, { period: 50 })  // re-tune params live
chart.removeIndicator(instanceId)`}</code></pre>
<h3>그림 설정과 메뉴</h3>
<p>
  그림을 더블 클릭하거나 개체 트리의 톱니바퀴 버튼을 누르면 그 그림의 설정이 열립니다.
  스타일, 도구 고유의 설정(피보나치 레벨, 연장, 라벨 등), 차트 시간대 기준의 각 점을
  다룰 수 있습니다. 그림을 오른쪽 클릭하면 메뉴가 열리며, 설정, 선에 거는 알림, 순서,
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
  개체 트리의 <strong>비교</strong> 섹션은 다른 종목을 정규화된 선으로
  겹쳐 표시합니다. 실시간 어댑터가 있으면 + 버튼이 종목 선택기를 열고,
  <code>adapter.fetchHistory</code>로 해당 종목의 과거 데이터를 가져와
  퍼센트 모드로 추가합니다(가격대가 다른 종목도 하나의 축을 공유하도록). 비교 종목은
  시간 단위가 바뀌면 자동으로 다시 가져옵니다. 코드로는 다음과 같습니다.
</p>
<pre><code>{`widget.addCompareSymbol('ETHUSDT')   // fetches + overlays (needs an adapter)

// or drive the chart directly with your own data
chart.addCompareSymbol('ETHUSDT', 'ETH', ethBars, '#627eea')
chart.setCompareMode('percent')      // 'percent' | 'absolute'
chart.removeCompareSymbol('ETHUSDT')`}</code></pre>

<h3>가격 알림</h3>
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
  sync: { crosshair: true, time: false, symbol: false, interval: false, drawings: false },
})

grid.setLayout('1x2')
grid.setSync({ interval: true })   // 나머지 차트를 활성 차트에 맞춤
grid.getActiveWidget().getChart()
grid.getLayoutSession()?.saveAs('Majors')

// 각 차트가 만들어질 때마다 (처음, 그리고 그리드가 커질 때)
new ChartWidgetGrid(host, {
  onChartAdd: (widget, index) => widget.getChart().addIndicator('ema', { period: 21 }),
})`}</code></pre>
<p>
  십자선 동기화는 포인터 아래의 시간을 모든 차트에 표시하고, 시간 축 동기화는 사용 중인 차트에 맞춰
  나머지 차트를 스크롤하고 확대/축소하며, 그림은 같은 종목을 보여 주는 차트로 복사됩니다(이 동기화를 켜면
  그 차트들의 그림이 하나로 합쳐지며, 사라지는 그림은 없습니다). 그리드가 작아질 때 빠진 차트는 치워 두며
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
