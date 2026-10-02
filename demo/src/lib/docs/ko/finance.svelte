<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>금융 차트 — TradeCanvas 문서</title>
  <meta name="description" content="금융 전용 렌더러: 게이지, 히트맵, 시장 심도, 스파크라인, 자산 곡선, 워터폴." />
</svelte:head>

<h1>금융 차트</h1>
<p>메인 캔들 차트와 함께 쓰는 금융 대시보드용 전용 렌더러입니다.</p>

<h2>제공되는 렌더러</h2>
<table>
  <thead><tr><th>렌더러</th><th>사용 사례</th></tr></thead>
  <tbody>
    <tr><td><code>SparklineRenderer</code></td><td>간결한 시세 표시, 관심 종목, KPI 셀.</td></tr>
    <tr><td><code>GaugeRenderer</code></td><td>단일 값 게이지 — 시장 심리, 리스크, 익스포저.</td></tr>
    <tr><td><code>HeatmapRenderer</code></td><td>섹터 / 자산 상관관계 행렬.</td></tr>
    <tr><td><code>DepthChartRenderer</code></td><td>L2 호가 심도, 누적 매수/매도 잔량.</td></tr>
    <tr><td><code>WaterfallRenderer</code></td><td>손익 기여도 분석, 누적 흐름.</td></tr>
    <tr><td><code>EquityCurveRenderer</code></td><td>낙폭 구간을 음영으로 표시하는 백테스트 자산 곡선.</td></tr>
    <tr><td><code>FinanceCrosshair</code></td><td>금융 차트용 다중 축 십자선.</td></tr>
  </tbody>
</table>

<h2>자산 곡선 예제</h2>
<p><a href={href('/docs/analytics')}>분석</a> 백테스터와 함께 사용합니다.</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { EquityCurveRenderer } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const renderer = new EquityCurveRenderer(canvas.getContext('2d')!)
renderer.render(result.equityCurve)`}</code></pre>

<h2>성과 대시보드</h2>
<p>
  <code>PerformanceDashboard</code>는 금융 렌더러를 조합해 테마가 적용된
  하나의 전략 보고서를 만듭니다. 주요 통계 띠, 자산 곡선,
  언더워터 낙폭 패널, 월별 수익률 달력 히트맵으로 구성되며,
  백테스트 결과에서 바로 만들어집니다.
</p>

<pre><code>{`import { Backtester } from '@tradecanvas/analytics'
import { PerformanceDashboard } from '@tradecanvas/chart'

const result = new Backtester({ initialCash: 10_000 }).run(bars, myStrategy)

const dash = new PerformanceDashboard(document.getElementById('report')!, {
  result,            // any { equityCurve, metrics } — Backtester output fits
  theme: 'dark',
  title: 'SMA Crossover',
  subtitle: 'BTC/USDT · 1h · 2023',
})

// later: dash.update(newResult) · dash.setTheme('light') · dash.destroy()`}</code></pre>

<p>
  레이아웃을 직접 구성하고 싶다면 순수 계산 함수도 export되어 있습니다:
  <code>computeMonthlyReturns</code>, <code>computeDrawdownCurve</code>,
  <code>toEquityPoints</code>, <code>selectKeyStats</code>.
</p>

<h2>히트맵 레이아웃</h2>
<p><code>HeatmapLayout</code>은 임의의 수치 행렬에 맞는 정사각형 격자와 색상 척도를 계산하도록 도와줍니다.</p>
