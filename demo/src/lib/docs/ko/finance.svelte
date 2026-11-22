<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>금융 차트 — TradeCanvas 문서</title>
  <meta name="description" content="캔들 차트와 함께 쓰는 금융 대시보드용 차트: 막대, 도넛, 산점도와 버블, 히스토그램, 캘린더, 상관 행렬, 스파크라인, 게이지, 히트맵과 트리맵, 워터폴, 시장 심도, 자산 곡선, 성과 보고서." />
</svelte:head>

<h1>금융 차트</h1>
<p>
  캔들 차트와 함께 쓰는 대시보드·보고서용 차트입니다. 각 차트는 요소와 옵션을 받는 클래스로, 요소 크기에 맞춰지고
  차트의 다크 또는 라이트 테마로 그려집니다. 대부분은 포인터를 따라 툴팁을 보여 줍니다.
</p>

<h2>차트 목록</h2>
<table>
  <thead><tr><th>클래스</th><th>용도</th></tr></thead>
  <tbody>
    <tr><td><code>BarChart</code></td><td>범주별 값: 순매수 흐름, 세션별 거래량, 월별 수익률. 묶음 또는 누적, 세로 또는 가로, 0을 기준으로 위아래로.</td></tr>
    <tr><td><code>DonutChart</code></td><td>전체 중 부분: 자산 배분, 섹터별 익스포저. <code>innerRadius: 0</code>이면 파이 차트입니다.</td></tr>
    <tr><td><code>ScatterChart</code></td><td>항목마다 두 값: 리스크 대비 수익률, 밸류에이션 대비 성장률. 점에 크기가 있으면 버블이 됩니다.</td></tr>
    <tr><td><code>HistogramChart</code></td><td>값의 분포: 일별 수익률, 거래 결과. 평균이나 VaR 위치에 선을 표시합니다.</td></tr>
    <tr><td><code>CalendarChart</code></td><td>달력 위에 하루 하나의 값: 일간 수익률, 손익, 매매 일지.</td></tr>
    <tr><td><code>MatrixChart</code></td><td>행과 열의 쌍마다 하나의 값: 상관관계, 시간대와 요일별 거래량.</td></tr>
    <tr><td><code>CounterClockChart</code></td><td>봉마다 평균 가격과 평균 거래량을 이은 종목의 역시계곡선.</td></tr>
    <tr><td><code>SparklineChart</code></td><td>관심 종목 행이나 KPI 타일 속의 작은 선.</td></tr>
    <tr><td><code>GaugeChart</code></td><td>구간과 비교해 보는 하나의 값: 시장 심리, 리스크, 증거금 사용률.</td></tr>
    <tr><td><code>HeatmapChart</code></td><td>등락으로 색칠한 셀. 격자 또는 비중(시가총액)으로 크기를 정한 트리맵. <code>grouped</code>를 쓰면 섹터 맵이 됩니다.</td></tr>
    <tr><td><code>WaterfallChart</code></td><td>시작부터 끝까지의 단계: 손익 기여도 분석, 현금 흐름.</td></tr>
    <tr><td><code>DepthChart</code></td><td>호가창의 누적 매수/매도 잔량.</td></tr>
    <tr><td><code>EquityCurveChart</code></td><td>시간에 따른 계좌 가치, 낙폭과 벤치마크 포함.</td></tr>
    <tr><td><code>PayoffChart</code></td><td>기초자산 가격에 따라 옵션 포지션이 만기에 얻거나 잃는 금액: 스프레드, 스트래들, 콘도르.</td></tr>
    <tr><td><code>CurveChart</code></td><td>행사가나 테너에 따른 값, 시리즈마다 선 하나: 변동성 스마일, 기간 구조, 수익률 곡선.</td></tr>
    <tr><td><code>BoxPlotChart</code></td><td>그룹별 값이 퍼져 있는 모습: 요일별, 월별, 전략별 수익률.</td></tr>
    <tr><td><code>RadarChart</code></td><td>여러 척도를 한 번에, 척도마다 축 하나: 전략의 성적표를 벤치마크의 성적표 옆에.</td></tr>
    <tr><td><code>SunburstChart</code></td><td>전체 중 부분과 그 안의 부분: 자산군별, 그다음 섹터별, 그다음 보유 종목별 자산 배분.</td></tr>
    <tr><td><code>StackedAreaChart</code></td><td>시간에 따라 여러 시리즈를 차례로 쌓은 것: 합계가 무엇으로 이루어지는지, 또는 그 구성이 어떻게 바뀌는지.</td></tr>
    <tr><td><code>SurfaceChart</code></td><td>두 축 위의 값을, 드래그해 돌리는 3D 상자 속의 면으로: 행사가와 만기별 내재 변동성, 가격과 날짜별 이익, 또는 단면으로 그린 시간에 따른 호가창의 심도.</td></tr>
    <tr><td><code>Bar3DChart</code></td><td>같은 상자 안에 값마다 기둥 하나, 시리즈마다 한 줄씩 깊이 방향으로: 분기와 자산군별 수익률, 시간대와 요일별 거래량.</td></tr>
    <tr><td><code>PerformanceDashboard</code></td><td>백테스트로 만드는 전략 보고서: 통계, 자산 곡선, 낙폭, 월별 수익률.</td></tr>
  </tbody>
</table>

<h2>공통 기능</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // 어떤 옵션이든, 병합됨
chart.setTheme('light')                 // 'dark' | 'light' | Theme
chart.screenshot('flows', { pixelRatio: 2 })   // 이미지: 아래 참고
chart.destroy()                         // 캔버스와 리스너를 제거`}</code></pre>
<p>
  터치 화면에서는 한 번 탭하면 툴팁이 나타나고, 다른 곳을 탭할 때까지 유지됩니다. 드래그하면 페이지는 그대로 스크롤됩니다. 차트는 화면 자체의 픽셀에 맞춰 그려지므로 어떤 배율에서도 선이 선명합니다. 뎁스, 에쿼티, 워터폴 차트는 최신 차트와 마찬가지로 라벨에 맞춰 여백을 정합니다.
</p>
<p>
  텍스트는 시스템의 산세리프 글꼴로 그려지며, 위젯의 숫자와 같은 글꼴입니다. <code>font</code>로 다른 글꼴을 지정할 수 있고(<code>{'{'} family: MONO_FONT_FAMILY {'}'}</code>로 고정폭 글꼴로 되돌릴 수 있습니다), 자체 글꼴이 있는 테마는 그 글꼴을 유지합니다. <code>locale</code>(<code>'vi'</code> 같은 BCP 47 태그)은 숫자와 날짜를 표기하는 언어를 정하며, 생략하면 브라우저의 언어를 따릅니다. 각 차트는 스크린 리더에 영어로 자신을 설명하지만, <code>ariaLabel</code>로 직접 고른 말로 바꿀 수 있습니다. 뎁스 차트의 <code>spreadLabel</code>과 에쿼티 커브의 <code>benchmarkLabel</code>은 차트 위에 그려지는 글자를, 대시보드의 <code>labels</code>는 제목과 통계 이름을 지정합니다.
</p>
<p>
  각 차트는 요소를 가득 채우고, 요소 크기가 바뀌면 다시 그립니다. 마우스를 올렸을 때 툴팁이 나오는 차트는
  <code>crosshair: false</code>로 끌 수 있습니다. 막대, 도넛, 산점도, 히스토그램, 캘린더, 행렬 차트는 무엇을 보여 주는지 스크린 리더에
  알립니다(캔버스에 image 역할과 라벨이 붙습니다). <code>ariaLabel</code>을 쓰면 이를 직접 고른 말로, 예를 들어 페이지의
  언어로 바꿀 수 있습니다. 숫자는 <code>valueFormat</code>(또는 <code>xFormat</code> / <code>yFormat</code>)으로
  표시되며, 지정하지 않으면 1,234.5 형식, 1만을 넘으면 12.3K 형식입니다.
</p>

<h2 id="pictures">이미지, 종이, 페이지 없이 그리기</h2>
<p>
  모든 차트는 가격 차트처럼 자신의 이미지를 줍니다: <code>screenshot(filename, options)</code>는
  이미지를 저장하고, <code>copyScreenshot()</code>은 PNG를 클립보드에 넣고, <code>screenshotDataURL()</code>,
  <code>screenshotBlob()</code>, <code>toCanvas()</code>는 이미지를 넘겨줍니다. 차트는 이미지를 위해 다시
  그려지며, 포인터를 따르는 것은 담기지 않습니다: 자신의 크기에 화면의 픽셀 비율로, 또는 옵션이 주는
  <code>pixelRatio</code>, <code>theme</code>, <code>width</code>와 <code>height</code>로
  그립니다(다른 크기에서는 다시 배치됩니다). <code>print()</code>는 차트만을 위한 인쇄 대화상자를 열고
  <code>toPdf()</code>는 한 페이지짜리 PDF를 돌려주며, 둘 다 달리 지정하지 않으면 라이트 테마와 두 배의
  픽셀로 그립니다. <code>chartsToPdf</code>는 여러 차트로 PDF 하나를 만듭니다
  (옵션은 <a href={href('/docs/api')}>이미지, 인쇄, PDF</a>에 있습니다).
</p>
<pre><code>{`import { chartsToPdf } from '@tradecanvas/chart'

equity.screenshot('equity', { pixelRatio: 3 })                 // equity.png
const wide = flows.screenshotDataURL({ width: 1200, height: 400, type: 'jpeg' })
allocation.print({ title: 'Allocation' })
const report = await chartsToPdf([equity, flows, allocation], { title: 'March' })`}</code></pre>
<p>
  <code>renderFinanceChart</code>는 페이지 없이, 직접 마련한 2D 컨텍스트에 차트를 그립니다: 이메일, 보고서,
  봇의 메시지에 넣을 이미지를 위해 Node에서 만든 캔버스, 또는 워커의 <code>OffscreenCanvas</code>.
  두 번째 인수는 차트의 이름으로, 클래스 이름에서 <code>Chart</code>를 떼고 첫 글자를 소문자로
  쓴 것입니다(<code>'bar'</code>, <code>'equityCurve'</code>, <code>'boxPlot'</code>,
  <code>'surface'</code>, <code>'bar3d'</code>. <code>FINANCE_CHART_KINDS</code>에 목록이 있습니다). 세 번째
  인수는 그 차트 자체의 옵션입니다. 지정한 크기를 컨텍스트 자체의 단위로, 테마의 배경 위에
  그립니다. 픽셀을 늘리려면 먼저 컨텍스트의 배율을 조정하세요.
</p>
<pre><code>{`import { createCanvas } from '@napi-rs/canvas'        // 또는 Node용 다른 캔버스
import { renderFinanceChart } from '@tradecanvas/chart'

const canvas = createCanvas(1600, 800)
const ctx = canvas.getContext('2d')
ctx.scale(2, 2)                                        // 두 배의 픽셀로 그린 800 × 400 차트
renderFinanceChart(ctx, 'equityCurve', { data: equity, theme: 'light', font: { family: 'Inter' } }, { width: 800, height: 400 })
const png = canvas.toBuffer('image/png')`}</code></pre>
<p>
  컨텍스트에는 브라우저의 컨텍스트에 있는 것이 있어야 합니다: 경로, 텍스트와 그 측정, 그리고
  <code>getTransform</code>. 텍스트는 테마의 글꼴로 그리므로, 캔버스에 있는 글꼴을
  <code>font</code>로 지정하세요. 포인터를 따르는 것도, 움직이는 것도 없습니다: 게이지는 자신의 값에 있습니다.
  성과 대시보드는 페이지 요소로 만들어져 이 방식으로 그려지지 않지만, 그 안의 차트들은 그려집니다. 가격 차트에는
  자체 함수가 있습니다: API 페이지의 <code>renderPriceChart</code>.
</p>

<h2>막대 차트</h2>
<pre><code>{`import { BarChart } from '@tradecanvas/chart'

// 10개 세션의 외국인 순매수: 0 위는 초록, 아래는 빨강.
const flows = new BarChart(el, {
  categories: ['6/10', '7/10', '8/10', '9/10'],
  series: [{ name: 'Net', values: [-660, 860, -280, 230] }],
  colorBySign: true,                    // 또는 { positive, negative }
  valueFormat: (v) => v + ' bn',
  onBarClick: ({ category, series, value, index }) => openDay(index),
})

// 여러 시리즈를 나란히, 또는 누적으로: 양수는 0에서 위로, 음수는 아래로.
new BarChart(el, {
  categories: ['Foreign', 'Proprietary', 'Retail'],
  series: [{ name: 'Buy', values: [820, 310, 4200] }, { name: 'Sell', values: [-760, -280, -4290] }],
  mode: 'stacked',
  orientation: 'horizontal',            // 막대는 오른쪽으로, 라벨은 왼쪽에
  showValues: true,
})

flows.update(categories, series)`}</code></pre>
<p>
  값 축에는 항상 0이 포함됩니다. 범주에 마우스를 올리면 그 범주의 모든 시리즈 값이 표시되고, 시리즈가 둘 이상이면
  범례가 나타납니다(<code>legend</code>로 선택). 아래쪽에 다 들어가지 않는 라벨은 몇 범주마다 하나씩 표시됩니다.
</p>

<h2>도넛 차트</h2>
<pre><code>{`import { DonutChart } from '@tradecanvas/chart'

new DonutChart(el, {
  data: [
    { label: 'Stocks', value: 52 },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 15 },
    { label: 'Gold', value: 10, color: '#d4a017' },
  ],
  innerRadius: 0.6,                     // 0이면 파이 차트
  centerLabel: 'Total',
  centerValue: '1.2B ₫',
  onSliceClick: (slice) => filterBy(slice.label),
})`}</code></pre>
<p>
  조각은 12시 방향에서 시계 방향으로 놓이며, 0 이하의 값은 빠집니다. 각 조각은 공간이 있으면 비중을 표시하고,
  범례는 이름과 비중을 나열합니다. 범례는 차트가 넓으면 링 옆에, 그렇지 않으면 아래에 놓입니다.
</p>

<h2>산점도와 버블 차트</h2>
<pre><code>{`import { ScatterChart } from '@tradecanvas/chart'

new ScatterChart(el, {
  series: [{
    name: 'Banks',
    points: [
      { x: 21, y: 9, size: 480, label: 'VCB' },   // size: 시가총액, 버블 면적이 이에 비례
      { x: 34, y: 24, size: 170, label: 'TCB' },
    ],
  }],
  xLabel: 'Volatility',
  yLabel: 'Return, a year',
  xFormat: (v) => v + '%',
  yFormat: (v) => v + '%',
  showLabels: true,
  onPointClick: (point, series) => openSymbol(point.label),
})`}</code></pre>
<p>
  축은 가장 큰 버블이 들어갈 여백을 남기고(<code>maxRadius</code>, 기본 24 px), 축 범위가 x = 0이나 y = 0을 지나면
  그 자리에 선을 긋습니다(<code>zeroLines: false</code>로 숨김).
</p>

<h2>히스토그램</h2>
<pre><code>{`import { HistogramChart, histogramBins } from '@tradecanvas/chart'

new HistogramChart(el, {
  values: dailyReturns,                 // 퍼센트 단위
  binWidth: 0.5,                        // 또는 bins: 20, 또는 'auto'(Sturges 규칙)
  colorBySign: true,
  valueFormat: (v) => v.toFixed(1) + '%',
  markers: [{ value: mean, label: 'Mean' }, { value: var95, label: 'VaR 95%', color: '#e85a67' }],
})

histogramBins([1, 2, 2, 3, 10], { bins: 3 })
// [{ from: 1, to: 4, count: 4 }, { from: 4, to: 7, count: 0 }, { from: 7, to: 10, count: 1 }]`}</code></pre>

<h2>캘린더</h2>
<pre><code>{`import { CalendarChart } from '@tradecanvas/chart'

// 1년 치 거래일(월~금)을 그날의 등락으로 색칠합니다.
new CalendarChart(el, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],   // YYYY-MM-DD
  weekdays: 5,                          // 7(기본값)은 매일, weekStart: 0이면 주가 일요일에 시작
  locale: 'vi-VN',                      // 월과 요일 이름
  colorScale: { min: -2, max: 2 },      // 테마의 빨강과 초록, ±2에서 가장 진하게
  valueFormat: (v) => v.toFixed(2) + '%',
  onDayClick: (day) => openSession(day.date),
})`}</code></pre>
<p>
  주는 왼쪽에서 오른쪽으로, 요일은 위에서 아래로 놓이며, 한 해에 한 줄씩 최대 10년입니다. 차트 높이가 모자라면 가장 오래된 해부터 빠집니다. 값이 없는 날은 빈 칸으로 그리고, 아래의 색상 막대가 색 척도를 보여 줍니다(<code>legend: false</code>로 숨김).
</p>

<h2>상관 행렬</h2>
<pre><code>{`import { MatrixChart, correlationMatrix } from '@tradecanvas/chart'

// 가격이 아닌 일간 수익률을 넘깁니다. 종목마다 배열 하나, 날짜는 같게.
const names = ['VCB', 'BID', 'CTG', 'TCB']
const values = correlationMatrix(returnsByStock)

new MatrixChart(el, {
  rows: names,                          // 정사각이 아닌 행렬은 columns: [...]
  values,                               // values[row][column]
  triangle: 'lower',                    // 상관관계는 절반이면 충분
  colorScale: { min: -1, max: 1 },
  onCellClick: ({ row, column, value }) => compare(row, column),
})`}</code></pre>
<p>
  셀은 정사각형을 유지하고 들어갈 때 값을 표시합니다(<code>valueFormat</code>이 없으면 소수 둘째 자리). 셀 너비에 맞지 않는 열 이름은 기울입니다. <code>correlationMatrix</code>는 두 시계열 모두 값이 있는 날만 짝지으며, 3일 미만이면 NaN을 돌려주고 그 셀은 비워 둡니다. 시간대와 요일별 거래량 같은 다른 수치 표에도 맞습니다.
</p>
<p>
  열이 적은 표(기간별 재무제표 항목 등)에는 <code>cellWidth: 'fill'</code>을 씁니다. 열이 행 이름 옆의 너비를 나눠 갖고 행 높이는 그대로라서, 매트릭스가 가운데에 작게 놓이지 않고 차트를 채웁니다. 숫자를 주면 각 열의 너비를 픽셀로 정하며, 남은 공간보다 넓어지지는 않습니다.
</p>

<h2>섹터 맵</h2>
<pre><code>{`import { HeatmapChart } from '@tradecanvas/chart'

new HeatmapChart(el, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: '은행' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: '철강' },
    { id: 'vhm', label: 'VHM', value: -2.4, weight: 170, group: '부동산' },
  ],
  grouped: true,                        // 섹터별로, 그다음 종목별로 타일 배치
  valueFormat: (v) => v.toFixed(1) + '%',
})`}</code></pre>
<p>
  각 섹터는 종목 비중의 합만큼 자리를 차지하고, 들어갈 때 타일 위쪽에 섹터 이름과 가중 평균 등락을 표시합니다. 히트맵의 색은 <code>colorScale</code>에 <code>min</code>과 <code>max</code>를 주지 않으면 -5에서 5까지입니다.
</p>

<h2>역시계곡선</h2>
<pre><code>{`import { CounterClockChart } from '@tradecanvas/chart'

const clock = new CounterClockChart(el, {
  data: bars,                           // OHLCV 봉, 오래된 것부터
  period: 25,                           // 평균에 넣을 봉 수
  points: 120,                          // 그릴 최신 점의 수
  xLabel: '거래량, 평균', yLabel: '가격, 평균',
  onPointClick: (p) => goTo(p.time),
})

clock.getPhase()                        // 1~8: 마지막 움직임의 방향`}</code></pre>
<p>
  각 점은 거래량(가로)과 종가(세로)의 25봉 평균이며, 시간 순서로 이어지고 오래될수록 흐려집니다. 건강한 순환은 시계 반대 방향으로 돕니다. <code>getPhase()</code>(와 <code>counterClockPhase(points)</code>)는 마지막 움직임을 알려 줍니다: 1 거래량 증가, 2 가격과 거래량 동반 상승, 3 가격 상승, 4 거래량 감소 속 가격 상승, 5 거래량 감소, 6 동반 하락, 7 가격 하락, 8 거래량 증가 속 가격 하락.
</p>

<h2>스파크라인, 게이지, 히트맵, 워터폴, 시장 심도, 자산 곡선</h2>
<pre><code>{`import { SparklineChart, GaugeChart, HeatmapChart, WaterfallChart, DepthChart, EquityCurveChart } from '@tradecanvas/chart'

new SparklineChart(el, { data: closes, mode: 'area', showLastPoint: true })

const gauge = new GaugeChart(el, {
  value: 72, min: 0, max: 100, label: 'Fear & Greed',
  zones: [{ from: 0, to: 45, color: '#e8505b' }, { from: 45, to: 55, color: '#8a93a3' }, { from: 55, to: 100, color: '#1fa874' }],
})
gauge.setValue(64)

// 시가총액으로 크기를, 당일 등락으로 색을 정한 트리맵.
new HeatmapChart(el, {
  data: [{ id: 'vcb', label: 'VCB', value: 1.2, weight: 480 }, { id: 'fpt', label: 'FPT', value: -0.8, weight: 170 }],
  weighted: true, showLabels: true, showValues: true,
  onCellClick: (cell) => openSymbol(cell.label),
})

new WaterfallChart(el, { data: [{ label: 'Start', value: 10000, type: 'total' }, { label: 'Fees', value: -85 }, { label: 'End', value: 9915, type: 'total' }] })
new DepthChart(el, { data: { bids, asks }, midPriceLine: true, spreadLabel: true })
new EquityCurveChart(el, { data: equity, benchmark, drawdown: true })`}</code></pre>
<p>
  자산 곡선은 <strong>levels</strong>(고정된 값에서 플롯을 가로지르는 선으로, 값은 축의 태그에 적힘)와
  <strong>bands</strong>(곡선 아래에 색을 칠한 값의 구간)도 받습니다. level에는 오른쪽 끝에 적히는 <code>label</code>(<code>labelAt: 'start'</code>면 곡선의 최근 점에서 먼 왼쪽 끝),
  <code>color</code>, <code>dash</code>(<code>[]</code>는 실선)가 있고, band에는 모서리에 적히는 <code>label</code>과 그대로
  쓰이는 <code>color</code>가 있으니 투명도가 있는 색을 주세요. 색이 없으면 둘 다 테마의 색을 씁니다. level의 값은
  줄이지 않고 적히며, <code>valueFormat</code>이 있으면 그것을 따릅니다.
  너무 가까워 둘 다 들어가지 않는 level의 태그는 서로 비켜나고(모두 둘 자리가 없으면 가장 낮은 level의 태그가 빠집니다),
  플롯 안의 이름도 서로 겹치지 않습니다. 값 눈금은 모두 보이도록 넓어집니다.
  <code>fitLevels: false</code>는 눈금을 곡선에 맞추어, 바깥의 level은 빼고 band는 겹치는 부분만 그립니다.
  <code>setOptions</code>로 차트를 다시 만들지 않고 바꿀 수 있습니다.
</p>
<pre><code>{`const chart = new EquityCurveChart(el, {
  data: closes,
  levels: [{ value: 41_250, label: 'BOS', color: '#e0a030' }, { value: 38_900, label: 'Equilibrium' }],
  bands: [
    { from: 38_900, to: 44_100, label: 'Premium', color: 'rgba(232, 80, 91, 0.10)' },
    { from: 33_700, to: 38_900, label: 'Discount', color: 'rgba(31, 168, 116, 0.10)' },
  ],
})
chart.setOptions({ levels: [{ value: 42_000, label: 'CHoCH' }] })`}</code></pre>

<h2>옵션 손익 구조</h2>
<p>
  <code>PayoffChart</code>는 기초자산 가격에 따라 옵션 포지션이 만기에 얻거나 잃는 금액을 그립니다:
  0 위의 이익과 0 아래의 손실에 색을 입히고, 각 손익분기점과 현재 가격인 <code>spot</code>에 점선을
  긋습니다. 레그는 <code>'call'</code> 또는 <code>'put'</code>이고, 매수했거나(<code>'long'</code>) 매도한
  (<code>'short'</code>) 것이며, <code>strike</code>와 한 단위의 <code>premium</code>을 가집니다.
  <code>'underlying'</code> 레그는 그 옆에 함께 보유한 기초자산으로, <code>entry</code>에 들어간 것입니다.
  <code>multiplier</code>는 계약 하나가 나타내는 단위 수입니다. 그리는 가격은 행사가 주변이거나, 주어진
  <code>range</code>입니다. 포인터는 그 가격에서의 이익이나 손실을 읽습니다.
</p>
<pre><code>{`import { PayoffChart, payoffStats, optionPayoff } from '@tradecanvas/chart'

const condor = [
  { type: 'put', side: 'long', strike: 90, premium: 1 },
  { type: 'put', side: 'short', strike: 95, premium: 2.5 },
  { type: 'call', side: 'short', strike: 105, premium: 2.5 },
  { type: 'call', side: 'long', strike: 110, premium: 1 },
]
const chart = new PayoffChart(el, { legs: condor, multiplier: 100, spot: 101.4, spotLabel: 'Spot' })
chart.update(otherLegs)

payoffStats(condor, 100)    // { maxProfit: 300, maxLoss: -200, breakevens: [92, 108] }
optionPayoff(condor, 100, 100)   // 300: 기초자산이 100일 때 레그들이 버는 금액

// 만기 전: 모델로 그리는 두 번째 선, 점선
chart.setOptions({ model: { daysToExpiry: 30, volatility: 0.25, rate: 0.03 } })
positionValue(condor, 100, { daysToExpiry: 30, volatility: 0.25 }, 100)   // 만기까지 30일 남았을 때 레그들이 버는 금액
optionPrice('call', 100, 105, { years: 30 / 365, volatility: 0.25 })      // 옵션 하나의 가격`}</code></pre>
<p>
  <code>payoffStats</code>는 레그들이 만기에 가장 많이 버는 금액과 가장 많이 잃는 금액
  (한도가 없으면 <code>null</code>: 매수한 콜, 단독으로 매도한 콜), 그리고 손익이 0이 되는 가격을
  돌려줍니다. 행사가가 없는 레그나 진입가가 없는 기초자산은 아무것도 더하지 않습니다.
</p>
<p>
  <code>model</code>을 주면 차트는 만기까지 그만큼의 날이 남았을 때 포지션이 얻거나 잃는 금액을
  만기 손익 위에 점선으로 그리고, 두 선의 이름을 플롯 위에 각각 자기 선의 한 토막 옆에 적으며
  (<code>expiryLabel</code>과 <code>model.label</code>로 원하는 말로 적습니다), 포인터 아래에서 둘 다
  읽습니다. 각 옵션은 모델의 <code>volatility</code>(연간 변동성을 비율로: <code>0.25</code>는 25%)에서
  Black-Scholes로 유럽형 옵션으로 평가하며, 주어진 경우 <code>rate</code>와 <code>dividendYield</code>를 씁니다. 레그 자체의
  <code>volatility</code>와 <code>daysToExpiry</code>는 모델의 값을 대신하며, 스큐나 캘린더
  스프레드에 씁니다. 이것은 모델의 답이지 시세가 아닙니다: 미국형 옵션이나, 변동성이 가격에 따라 움직이는
  옵션의 가치는 다릅니다. <code>positionValue</code>와 <code>optionPrice</code>가 그 계산이며, 가격의
  약 백만분의 일까지 맞습니다. 남은 날이 없으면 <code>positionValue</code>는
  <code>optionPayoff</code>이고, 기초자산이 0이면 풋의 가치는 할인한 행사가입니다.
</p>

<h2>곡선: 변동성 스마일, 기간 구조</h2>
<p>
  <code>CurveChart</code>는 행사가, 테너 또는 만기에 따른 값을 시리즈마다 선 하나로 그립니다.
  선은 점들을 지나며 둥글게 이어지되 점들이 이르지 않는 값을 넘지 않습니다
  (<code>smooth: false</code>는 직선으로 잇습니다). <code>dashed</code>인 시리즈는 오늘의 곡선 옆에 놓는
  어제의 곡선이고, <code>markers</code>는 어떤 x에 긋는 라벨 붙은 선입니다. <code>ticks</code>를 주면 x축의
  이름을 직접 붙입니다: 날짜 수마다 테너 하나. 포인터는 시세가 있는 가장 가까운 x에 달라붙어, 그려진 선을 따라
  그 자리의 모든 곡선을 읽습니다. <code>curveValueAt(points, x)</code>는 코드에서 곡선을 읽으며,
  점 사이를 직선으로 읽거나, 세 번째 인수가 <code>true</code>이면 둥근 선을 따라 읽습니다.
</p>
<pre><code>{`import { CurveChart } from '@tradecanvas/chart'

// 스마일: 행사가에 따른 내재 변동성, 만기마다 선 하나.
new CurveChart(el, {
  series: [
    { name: '1M', points: [{ x: 90, y: 31 }, { x: 100, y: 24 }, { x: 110, y: 27 }] },
    { name: '3M', points: [{ x: 90, y: 28 }, { x: 100, y: 25 }, { x: 110, y: 26 }] },
  ],
  markers: [{ x: 101.4, label: 'ATM' }],
  valueFormat: (v) => v.toFixed(1) + '%',
})

// 기간 구조: x를 따라 테너, 일 단위.
new CurveChart(el, {
  series: [
    { name: 'Today', points: [{ x: 30, y: 26 }, { x: 90, y: 25 }, { x: 365, y: 27 }] },
    { name: 'A week ago', points: [{ x: 30, y: 24 }, { x: 90, y: 25 }, { x: 365, y: 26 }], dashed: true },
  ],
  ticks: [{ x: 30, label: '1M' }, { x: 90, label: '3M' }, { x: 365, label: '1Y' }],
})`}</code></pre>

<h2>상자 그림</h2>
<p>
  <code>BoxPlotChart</code>는 그룹별 값이 어떻게 퍼져 있는지 보여 줍니다: 1사분위수에서 3사분위수까지의 상자와
  중앙값의 선, 상자에서 상자 높이의 <code>whiskers</code>배 안에 있는 가장 먼 값까지의 수염
  (생략하면 1.5, <code>Infinity</code>면 최저값과 최고값까지), 그리고 그보다 더 먼 값마다 고리 하나.
  그룹은 원래의 <code>values</code>를 주거나, 다른 곳에서 계산했다면 그 수치를 <code>stats</code>로
  줍니다. <code>boxPlotStats(values)</code>는 같은 계산을 코드에서 하는 것이고,
  <code>labels</code>는 툴팁의 말을 다른 언어로 바꿉니다. <code>onBoxClick</code>은 클릭이 닿은 그룹과
  그 다섯 수치를 줍니다: 툴팁이 그룹을 고르는 방식대로, 플롯에서 그 그룹이 가로로 차지하는 자리의
  위아래 어디든.
</p>
<pre><code>{`import { BoxPlotChart, boxPlotStats } from '@tradecanvas/chart'

new BoxPlotChart(el, {
  data: [{ label: 'Mon', values: mondayReturns }, { label: 'Tue', values: tuesdayReturns }],
  colorBySign: true,                     // 각 상자의 중앙값 기준
  valueFormat: (v) => v.toFixed(1) + '%',
  onBoxClick: (group, stats) => openDay(group.label, stats.median),
})

boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])
// { min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] }`}</code></pre>

<h2>레이더</h2>
<p>
  <code>RadarChart</code>는 여러 척도를 중심 둘레의 축에 12시 방향부터 시계 방향으로 놓고,
  각 시리즈의 값을 이어 도형을 만듭니다. 축은 중심의 <code>min</code>(생략하면 0, 그 축의 가장 낮은 값이
  0보다 작으면 그 값)에서 가장자리의 <code>max</code>까지 이어지며, 주지 않으면 그 축의 가장 높은
  값입니다: 척도의 크기가 서로 다르면 축마다 따로 주세요. 축이 세 개 필요합니다. 포인터는 가장 가까운
  축의 모든 시리즈를 읽고, <code>onAxisClick</code>은 클릭에 대해 그 축을 줍니다: 그 라벨,
  <code>axes</code>에서의 자리, 그 축 위의 각 시리즈 값.
</p>
<pre><code>{`import { RadarChart } from '@tradecanvas/chart'

new RadarChart(el, {
  axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Win rate', max: 100 }],
  series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 58] }, { name: 'Benchmark', values: [1.0, 1.3, 0.7, 51] }],
  onAxisClick: ({ axis, index, values }) => explain(axis, values),   // 'Sortino', 1, [{ series: 'Strategy', value: 2.4 }, …]
})`}</code></pre>

<h2>선버스트</h2>
<p>
  <code>SunburstChart</code>는 전체 중 부분과 그 안의 부분을, 단계마다 고리 하나로 그립니다.
  <code>children</code>이 있는 부분은 자식들을 합친 크기이고, 없는 부분은 자신의 <code>value</code>를 씁니다. 첫 번째
  고리는 팔레트의 색을, 그 바깥의 각 고리는 부모의 색을 더 옅게 씁니다. 고리는 많아야 네 개 그리며
  (<code>maxDepth</code>로 줄이거나 늘림), <code>innerRadius: 0</code>은 구멍을 메우고,
  <code>centerLabel</code>과 <code>centerValue</code>는 구멍 안에 적힙니다. 클릭하면 그 부분과
  거기까지의 라벨을 줍니다. 이름은 들어갈 자리가 있으면 고리를 따라 적습니다.
</p>
<pre><code>{`import { SunburstChart } from '@tradecanvas/chart'

new SunburstChart(el, {
  data: [
    { label: 'Stocks', children: [{ label: 'Banks', value: 22 }, { label: 'Technology', value: 14 }] },
    { label: 'Bonds', value: 23 },
    { label: 'Cash', value: 18 },
  ],
  centerLabel: 'Total', centerValue: '1.2B',
  onNodeClick: (node, path) => openHoldings(path),   // ['Stocks', 'Banks']
})`}</code></pre>

<h2>누적 영역</h2>
<p>
  <code>StackedAreaChart</code>는 같은 점들 위에 여러 시리즈를 쌓으며, 첫 번째가 맨 아래입니다: 시간에 따라
  합계가 무엇으로 이루어지는지. <code>normalized</code>를 주면 각 점의 값이 그 합계에 대한 비중이 되고
  영역이 높이를 가득 채웁니다: 구성이 어떻게 바뀌는지. 0보다 작은 값은 없는 것으로 칩니다. 포인터는 가장 가까운
  점에서 모든 시리즈와 그 합계를 읽습니다.
</p>
<pre><code>{`import { StackedAreaChart } from '@tradecanvas/chart'

const chart = new StackedAreaChart(el, {
  categories: ['Jan', 'Feb', 'Mar', 'Apr'],
  series: [{ name: 'Stocks', values: [40, 44, 47, 52] }, { name: 'Bonds', values: [30, 29, 27, 25] }, { name: 'Cash', values: [30, 27, 26, 23] }],
  normalized: true,
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>3D 표면</h2>
<p>
  <code>SurfaceChart</code>는 두 축 위의 값을 상자 속의 면으로 그립니다: <code>x</code>는 가로로,
  <code>y</code>는 뒤쪽으로, <code>values[yIndex][xIndex]</code>는 위로. 축의 숫자는
  그 값에 따라 놓이며, 순서가 어떻든 값이 커지는 순서로 그립니다. 이름은 주어진 순서대로 같은 간격으로 놓이므로,
  테너 목록(<code>'1W'</code>, <code>'1M'</code>, <code>'1Y'</code>)이 짧은 쪽 끝에 몰리지 않습니다.
  없거나 숫자가 아닌 값은 구멍을 남기고, 축에서 숫자가 아닌 자리는 그 값들과 함께 빠집니다.
</p>
<pre><code>{`import { SurfaceChart } from '@tradecanvas/chart'

const chart = new SurfaceChart(el, {
  x: [80, 90, 100, 110, 120],              // 행사가
  y: ['1W', '1M', '3M', '6M', '1Y'],       // 만기
  values: impliedVolatility,               // values[expiry][strike]
  xLabel: 'Strike', yLabel: 'Expiry', valueLabel: 'IV',
  valueFormat: (v) => (v * 100).toFixed(1) + '%',
  onPointClick: (point) => openChain(point.x, point.y),
})
chart.update(nextValues)                   // 축도 바뀌었으면 update(values, { x, y })`}</code></pre>
<p>
  드래그하면 차트가 돌아갑니다: 마우스는 돌리고 기울이며, 손가락은 돌리기만 해서 그 아래에서 페이지가 계속
  스크롤됩니다. 키보드에서는 Tab이 차트에 이른 뒤 화살표 키가 5도씩(Shift와 함께면 15도씩) 돌리고 기울이며
  Home은 되돌립니다. 스크린 리더에는 키를 알려 주고, 키를 누를 때마다 차트를 어디서 보고 있는지 알려 줍니다
  (<code>describeView</code>로 원하는 말로 알립니다). 더블 클릭하면 옵션이 준 <code>view</code>로
  돌아갑니다(옵션이 주지 않으면 <code>{'{'} yaw: -35, pitch: 28 {'}'}</code>: <code>yaw</code>는 차트를
  세로축을 중심으로 돌리고, <code>pitch</code>는 눈이 바닥에서 얼마나 위에 있는지로 0도에서 90도입니다).
  <code>getView()</code>는 지금 어디서 보고 있는지 읽고, <code>setView()</code>는 이를 정하고,
  <code>onViewChange</code>는 이를 따라가며, <code>rotate: false</code>는 그대로 고정합니다. 차트는
  원근 없이 그리므로 데이터에서 평행한 선은 화면에서도 평행하고, 돌려도 크기가 같습니다.
</p>
<p>
  <code>style</code>은 <code>'surface'</code>(음영을 넣은 면, 기본값), <code>'wireframe'</code>(그
  선만) 또는 <code>'slices'</code>(<code>y</code>마다 채워진 선 하나씩, 앞뒤로 차례로)입니다.
  값은 <code>colorRamp</code>로 색을 입힙니다: 기본값은 값의 범위에 걸쳐 차트 배경에 가까운 색에서 가장 진한 색까지
  가는 한 가지 색조입니다. 직접 정하려면 <code>colors</code>(둘 이상, 가장 낮은 값의 색부터)와
  <code>min</code>, <code>max</code>를 주세요. 예를 들어 0의 양쪽에 손실 색, 중립 색, 이익 색을
  둘 수 있습니다. 포인터는 자신이 있는 칸의 가장 가까운 점을 읽고, 면이 스스로 겹치는 곳에서는 앞쪽의
  것을 읽습니다. 한 축에 점이 120개를 넘는 격자는 양 끝을 남기고 그 수로 솎아 내며,
  돌리는 동안에는 60개로 솎아 큰 격자도 부드럽게 돌아갑니다.
</p>
<p>
  <code>depthSurface(snapshots, {'{'} levels {'}'})</code>는 연속된 호가창을 표면의
  <code>x</code>, <code>y</code>, <code>values</code>로 바꿉니다: 가로로 가격, 뒤쪽으로 호가창의 시각, 그리고 각 자리에는
  뎁스 차트처럼 최우선 호가에서 그 가격까지 대기 중인 잔량. <code>levels</code>는 가격의
  개수이고(생략하면 48, 최대 1,000), <code>from</code>과 <code>to</code>는 가격 구간 안으로 제한합니다.
</p>
<pre><code>{`import { SurfaceChart, depthSurface } from '@tradecanvas/chart'

// books: { time, bids: [{ price, volume }], asks: [...] }[], 오래된 것부터
const chart = new SurfaceChart(el, {
  ...depthSurface(books, { levels: 48 }),
  style: 'slices',
  xLabel: 'Price', yLabel: 'Time', valueLabel: 'Depth',
  yFormat: (ms) => new Date(ms).toISOString().slice(11, 16),
})`}</code></pre>

<h2>3D 막대</h2>
<p>
  <code>Bar3DChart</code>는 값마다 기둥을 하나 세우며, 시리즈마다 한 줄씩 깊이 방향으로 놓습니다:
  <code>categories</code>는 가로로, <code>series</code> 각각이 한 줄이며 첫 번째가 <code>y</code>축의
  맨 앞입니다. 기둥은 0에서 시작합니다. 0보다 작은 기둥은 0의 높이에서 아래로 매달리고, 그 높이는 상자를
  가로지르는 면으로 그려집니다. 돌리는 데에는 <code>view</code>, <code>rotate</code>와 표면이 받는 나머지를 받으며,
  <code>onBarClick</code>은 범주, 시리즈, 값을 줍니다. 범주 120개와 시리즈 120개까지만 그립니다.
</p>
<pre><code>{`import { Bar3DChart } from '@tradecanvas/chart'

const chart = new Bar3DChart(el, {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ name: 'Stocks', values: [4.2, 6.1, -2.4, 5.3] }, { name: 'Bonds', values: [1.1, 0.8, 1.6, -0.5] }],
  valueFormat: (v) => v.toFixed(1) + '%',
})
chart.update(nextSeries, nextCategories)`}</code></pre>

<h2>성과 대시보드</h2>
<p>
  <code>PerformanceDashboard</code>는 백테스트로 전략 보고서를 구성합니다. 주요 통계 띠, 자산 곡선, 그 아래의 낙폭,
  월별 수익률 달력으로 이루어집니다. <a href={href('/docs/analytics')}>분석</a> 백테스터와 함께 사용하세요.
</p>
<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // { equityCurve, metrics }를 가진 무엇이든: Backtester 결과를 그대로 넣으면 됨
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// 나중에: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>
<p>
  직접 만드는 지표는 <code>@tradecanvas/analytics</code>가 돌려주는 것처럼 소수로 넣습니다.
  <code>totalReturnPct</code>가 <code>0.12</code>이면 +12.00%로 표시되고, 퍼센트로(<code>12</code>)
  넣으면 100배 크게 표시됩니다. <code>maxDrawdownPct</code>는 부호와 상관없이 하락으로 표시됩니다.
</p>
<p>
  레이아웃을 직접 구성할 수 있도록 계산 함수도 export되어 있습니다: <code>computeMonthlyReturns</code>,
  <code>computeDrawdownCurve</code>, <code>toEquityPoints</code>, <code>selectKeyStats</code>. 축을 직접 그릴 때는
  <code>niceScale(min, max)</code>를 쓰세요(눈금 간격 1, 2, 2.5, 5).
</p>
