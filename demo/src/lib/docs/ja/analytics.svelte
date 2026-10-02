<script lang="ts">
  import BacktestPanel from '$lib/components/BacktestPanel.svelte';
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>分析とバックテスト — TradeCanvas ドキュメント</title>
  <meta name="description" content="@tradecanvas/analytics — バーごとに進む Backtester、Portfolio の追跡、リスク指標（シャープレシオ、ソルティノレシオ、カルマーレシオ、最大ドローダウン）。" />
</svelte:head>

<h1>分析</h1>
<p>
  <code>@tradecanvas/analytics</code> は、ポートフォリオの追跡とリスク指標のサマリー計算を備えた、
  ヘッドレスでバーごとに進む戦略バックテスターを提供します。
  <a href={href('/docs/realtime')}>リプレイモード</a>と組み合わせると、チャート上で取引を可視化できます。
</p>

<BacktestPanel />
<p style="font-size: 12.5px; color: var(--text-muted); margin-top: -16px; margin-bottom: 24px;">
  ↑ 365 日分の決定的な合成データで動く、SMA(10/30) クロスオーバーのライブバックテストです。
  スライダーを動かすか 「再生」を押すと、エクイティカーブをバーごとに進めて確認できます。
</p>

<h2>Backtester</h2>
<p>執行モデル：</p>
<ul>
  <li>戦略関数は各バーの終値で実行されます。</li>
  <li>バー N で出した注文はバー N+1 で約定します。成行注文は始値で、指値 / 逆指値注文はそのバーがトリガー価格を通過したときに約定します。</li>
  <li>エクイティは毎バーの終値で評価されます。</li>
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
  <thead><tr><th>フィールド / メソッド</th><th>説明</th></tr></thead>
  <tbody>
    <tr><td><code>bar</code></td><td>現在のバー。</td></tr>
    <tr><td><code>index</code></td><td>入力系列における <code>bar</code> のインデックス。</td></tr>
    <tr><td><code>history</code></td><td><code>bar</code> を含む、それまでのすべてのバー。</td></tr>
    <tr><td><code>position</code></td><td>現在のポジション、または <code>null</code>。</td></tr>
    <tr><td><code>cash</code></td><td>利用可能な現金。</td></tr>
    <tr><td><code>equity</code></td><td>現金 + ポジションの時価評価額。</td></tr>
    <tr><td><code>placeOrder(order)</code></td><td>次のバーで執行する注文をキューに入れます。</td></tr>
    <tr><td><code>close(tag?)</code></td><td>現在のポジションを成行で決済します。</td></tr>
    <tr><td><code>cancel(orderId)</code></td><td>未約定の注文を取り消します。</td></tr>
  </tbody>
</table>

<h2>手数料とスリッページのモデル</h2>
<ul>
  <li><code>FixedCommission(perTrade)</code></li>
  <li><code>PercentCommission(rate)</code> — 想定元本に対する比率。例：<code>0.001</code> = 10 bps。</li>
  <li><code>PerShareCommission(perShare, minimum?)</code></li>
  <li><code>PercentSlippage(rate)</code> — 価格に対して不利な方向への比率。</li>
  <li><code>RangeBasedSlippage(factor)</code> — バーの値幅に比例します。</li>
</ul>

<h2>Portfolio</h2>
<p>現金、1 つのネットポジション、実現損益、エクイティカーブを追跡します。</p>
<pre><code>{`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`}</code></pre>

<h2>リスク指標</h2>
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
  結果の <code>equityCurve</code> を
  <a href={href('/docs/finance')}>EquityCurveRenderer</a> と組み合わせると、バックテストを可視化できます。
</p>

<h2>戦略ライブラリ</h2>
<p>そのまま使える参考用の戦略です。それぞれ <code>StrategyFn</code> を返します：</p>
<pre><code>{`import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))`}</code></pre>

<h2>モンテカルロ</h2>
<p>
  実現した取引の順序を N 回シャッフルして、経路依存性を明らかにします。
  堅牢なエッジなら P5/P95 の帯は狭いままですが、運の良い順序に頼った戦略では大きく広がります。
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
