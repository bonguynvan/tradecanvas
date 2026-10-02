<script lang="ts">
  import BacktestPanel from '$lib/components/BacktestPanel.svelte';
  import { useI18n } from '$lib/i18n/context.svelte';

  const { href } = useI18n();
</script>

<svelte:head>
  <title>Phân tích &amp; backtest — Tài liệu TradeCanvas</title>
  <meta name="description" content="@tradecanvas/analytics — Backtester chạy từng nến, theo dõi danh mục (Portfolio) và chỉ số rủi ro (Sharpe, Sortino, Calmar, max drawdown)." />
</svelte:head>

<h1>Phân tích</h1>
<p>
  <code>@tradecanvas/analytics</code> cung cấp một bộ backtest chiến lược headless, chạy từng
  nến một, kèm theo dõi danh mục và bộ tính tổng hợp chỉ số rủi ro.
  Kết hợp với <a href={href('/docs/realtime')}>chế độ phát lại</a> để hiển thị các giao dịch trên biểu đồ.
</p>

<BacktestPanel />
<p style="font-size: 12.5px; color: var(--text-muted); margin-top: -16px; margin-bottom: 24px;">
  ↑ Backtest giao cắt SMA(10/30) chạy trực tiếp trên 365 ngày dữ liệu tổng hợp tất định.
  Kéo thanh trượt hoặc bấm Phát để đi qua đường vốn từng nến một.
</p>

<h2>Backtester</h2>
<p>Mô hình khớp lệnh:</p>
<ul>
  <li>Hàm chiến lược chạy khi mỗi nến đóng cửa.</li>
  <li>Lệnh đặt ở nến N được khớp ở nến N+1 — lệnh thị trường khớp tại giá mở cửa; lệnh limit/stop khớp khi nến giao dịch xuyên qua giá kích hoạt.</li>
  <li>Vốn (equity) được định giá theo giá đóng cửa của mỗi nến.</li>
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
  <thead><tr><th>Trường / phương thức</th><th>Mô tả</th></tr></thead>
  <tbody>
    <tr><td><code>bar</code></td><td>Nến hiện tại.</td></tr>
    <tr><td><code>index</code></td><td>Chỉ số của <code>bar</code> trong chuỗi đầu vào.</td></tr>
    <tr><td><code>history</code></td><td>Các nến tính đến và bao gồm <code>bar</code>.</td></tr>
    <tr><td><code>position</code></td><td>Vị thế hiện tại hoặc <code>null</code>.</td></tr>
    <tr><td><code>cash</code></td><td>Tiền mặt khả dụng.</td></tr>
    <tr><td><code>equity</code></td><td>Tiền mặt + giá trị vị thế theo giá thị trường.</td></tr>
    <tr><td><code>placeOrder(order)</code></td><td>Xếp lệnh vào hàng đợi cho nến tiếp theo.</td></tr>
    <tr><td><code>close(tag?)</code></td><td>Đóng vị thế hiện tại bằng lệnh thị trường.</td></tr>
    <tr><td><code>cancel(orderId)</code></td><td>Huỷ một lệnh đang chờ.</td></tr>
  </tbody>
</table>

<h2>Mô hình phí &amp; trượt giá</h2>
<ul>
  <li><code>FixedCommission(perTrade)</code></li>
  <li><code>PercentCommission(rate)</code> — tỉ lệ trên giá trị danh nghĩa, ví dụ <code>0.001</code> = 10 bps.</li>
  <li><code>PerShareCommission(perShare, minimum?)</code></li>
  <li><code>PercentSlippage(rate)</code> — tỉ lệ bất lợi trên giá.</li>
  <li><code>RangeBasedSlippage(factor)</code> — tỉ lệ với biên độ của nến.</li>
</ul>

<h2>Portfolio</h2>
<p>Theo dõi tiền mặt, một vị thế ròng, lãi/lỗ đã chốt (P&amp;L) và đường vốn.</p>
<pre><code>{`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`}</code></pre>

<h2>Chỉ số rủi ro</h2>
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
  Kết hợp <code>equityCurve</code> trong kết quả với
  <a href={href('/docs/finance')}>EquityCurveRenderer</a> để trực quan hoá kết quả backtest.
</p>

<h2>Thư viện chiến lược</h2>
<p>Các chiến lược mẫu dùng ngay — mỗi hàm trả về một <code>StrategyFn</code>:</p>
<pre><code>{`import {
  Backtester,
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))`}</code></pre>

<h2>Monte Carlo</h2>
<p>
  Xáo trộn thứ tự các giao dịch đã thực hiện N lần để thấy kết quả phụ thuộc vào trình tự đến mức nào.
  Một lợi thế vững chắc giữ dải P5/P95 hẹp; một chiến lược dựa vào trình tự
  may mắn sẽ xoè rộng.
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
