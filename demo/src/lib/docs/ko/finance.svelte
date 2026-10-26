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
    <tr><td><code>PerformanceDashboard</code></td><td>백테스트로 만드는 전략 보고서: 통계, 자산 곡선, 낙폭, 월별 수익률.</td></tr>
  </tbody>
</table>

<h2>공통 기능</h2>
<pre><code>{`const chart = new BarChart(element, { categories, series, theme: 'dark' })

chart.setOptions({ mode: 'stacked' })   // 어떤 옵션이든, 병합됨
chart.setTheme('light')                 // 'dark' | 'light' | Theme
chart.destroy()                         // 캔버스와 리스너를 제거`}</code></pre>
<p>
  각 차트는 요소를 가득 채우고, 요소 크기가 바뀌면 다시 그립니다. 마우스를 올렸을 때 툴팁이 나오는 차트는
  <code>crosshair: false</code>로 끌 수 있습니다. 막대, 도넛, 산점도, 히스토그램, 캘린더, 행렬 차트는 무엇을 보여 주는지 스크린 리더에
  알립니다(캔버스에 image 역할과 라벨이 붙습니다). <code>ariaLabel</code>을 쓰면 이를 직접 고른 말로, 예를 들어 페이지의
  언어로 바꿀 수 있습니다. 숫자는 <code>valueFormat</code>(또는 <code>xFormat</code> / <code>yFormat</code>)으로
  표시되며, 지정하지 않으면 1,234.5 형식, 1만을 넘으면 12.3K 형식입니다.
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
