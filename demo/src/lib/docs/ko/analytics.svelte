<script lang="ts">
  import BacktestPanel from '$lib/components/BacktestPanel.svelte';
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>분석 및 백테스트 — TradeCanvas 문서</title>
  <meta name="description" content="@tradecanvas/analytics — 봉 단위 Backtester, Portfolio 추적, 리스크 지표(Sharpe, Sortino, Calmar, 최대 낙폭)." />
</svelte:head>

<h1>분석</h1>
<p>
  <code>@tradecanvas/analytics</code>는 포트폴리오 추적과 리스크 지표 요약 계산기를 갖춘
  헤드리스 봉 단위 전략 백테스터를 제공합니다.
  <a href={href('/docs/realtime')}>리플레이 모드</a>와 함께 사용하면 거래를 차트 위에 시각화할 수 있습니다.
</p>

<BacktestPanel />
<p style="font-size: 12.5px; color: var(--text-muted); margin-top: -16px; margin-bottom: 24px;">
  ↑ 365일 분량의 결정적(deterministic) 합성 데이터로 실행하는 SMA(10/30) 교차 백테스트입니다.
  슬라이더를 움직이거나 재생을 눌러 자산 곡선을 봉 단위로 따라가 보세요.
</p>

<h2>백테스터</h2>
<p>실행 모델:</p>
<ul>
  <li>전략 함수는 각 봉의 종가 시점에 실행됩니다.</li>
  <li>N번째 봉에서 낸 주문은 N+1번째 봉에서 체결됩니다. 시장가 주문은 시가에 체결되고, 지정가/스탑 주문은 봉이 트리거 가격을 지나갈 때 체결됩니다.</li>
  <li>자산은 매 봉의 종가로 평가됩니다.</li>
</ul>

<pre><code>{`import { Backtester, FixedCommission, PercentSlippage } from '@tradecanvas/analytics'

const bt = new Backtester({
  initialCash: 10_000,
  commission: new FixedCommission(2),
  slippage: new PercentSlippage(0.0005),
  allowShort: true,
})

const result = bt.run(historicalBars, (ctx) => {
  if (!ctx.position) {
    ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 })
  } else if (ctx.bar.close > ctx.position.averagePrice * 1.02) {
    ctx.close()
  }
})

console.log(result.metrics.sharpe, result.metrics.maxDrawdownPct)`}</code></pre>

<h2>StrategyContext</h2>
<table>
  <thead><tr><th>필드 / 메서드</th><th>설명</th></tr></thead>
  <tbody>
    <tr><td><code>bar</code></td><td>현재 봉.</td></tr>
    <tr><td><code>index</code></td><td>입력 시리즈에서 <code>bar</code>의 인덱스.</td></tr>
    <tr><td><code>history</code></td><td><code>bar</code>까지(포함)의 봉.</td></tr>
    <tr><td><code>position</code></td><td>현재 포지션 또는 <code>null</code>.</td></tr>
    <tr><td><code>cash</code></td><td>사용 가능한 현금.</td></tr>
    <tr><td><code>equity</code></td><td>현금 + 포지션의 시가 평가액.</td></tr>
    <tr><td><code>placeOrder(order)</code></td><td>다음 봉에서 체결할 주문을 대기열에 넣습니다.</td></tr>
    <tr><td><code>close(tag?)</code></td><td>현재 포지션을 시장가로 청산합니다.</td></tr>
    <tr><td><code>cancel(orderId)</code></td><td>대기 중인 주문을 취소합니다.</td></tr>
  </tbody>
</table>

<h2>수수료 및 슬리피지 모델</h2>
<ul>
  <li><code>FixedCommission(perTrade)</code></li>
  <li><code>PercentCommission(rate)</code> — 명목 금액 대비 비율. 예: <code>0.001</code> = 10 bps.</li>
  <li><code>PerShareCommission(perShare, minimum?)</code></li>
  <li><code>PercentSlippage(rate)</code> — 가격에 불리하게 적용되는 비율.</li>
  <li><code>RangeBasedSlippage(factor)</code> — 봉의 변동 폭에 비례합니다.</li>
</ul>

<h2>포트폴리오</h2>
<p>현금, 하나의 순포지션, 실현 손익, 자산 곡선을 추적합니다.</p>
<pre><code>{`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`}</code></pre>

<h2>리스크 지표</h2>
<pre><code>{`import { computeRiskMetrics } from '@tradecanvas/analytics'

const m = computeRiskMetrics(initialCash, equityCurve, trades, {
  periodsPerYear: 252,    // optional; auto-detected from timestamps
  riskFreeRate: 0.03,
})

m.totalReturnPct
m.cagr
m.sharpe
m.sortino
m.calmar
m.maxDrawdownPct
m.winRate
m.profitFactor
m.expectancy`}</code></pre>

<p>
  결과의 <code>equityCurve</code>를
  <a href={href('/docs/finance')}>EquityCurveRenderer</a>와 함께 사용하면 백테스트를 시각화할 수 있습니다.
</p>

<h2>전략 라이브러리</h2>
<p>바로 쓸 수 있는 참조 전략입니다. 각 전략은 <code>StrategyFn</code>을 반환합니다.</p>
<pre><code>{`import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))`}</code></pre>

<h2>몬테카를로</h2>
<p>
  실현된 거래의 순서를 N번 섞어 경로 의존성을 드러냅니다.
  견고한 우위(edge)를 가진 전략은 P5/P95 범위가 좁게 유지되고, 운 좋은
  순서에 기댄 전략은 범위가 넓게 퍼집니다.
</p>
<pre><code>{`import { runMonteCarlo } from '@tradecanvas/analytics'

const result = bt.run(bars, smaCrossStrategy())
const mc = runMonteCarlo(10_000, result.trades, {
  simulations: 1000,
  seed: 42,  // deterministic
})

mc.equityBands         // per-step P5/P25/P50/P75/P95
mc.finalEquityPercentiles  // { p5, p25, p50, p75, p95 }
mc.probabilityProfitable
mc.worstMaxDrawdownPct`}</code></pre>
