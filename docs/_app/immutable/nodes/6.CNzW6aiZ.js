import{a as s,f as h}from"../chunks/D1Xo73DX.js";import"../chunks/BMDqXj-z.js";import{s as t,f as C,t as P,e as w,c as e,$ as _,n as l,r}from"../chunks/Bfa79lMJ.js";import{h as q}from"../chunks/DC6RaQJL.js";import{s as p}from"../chunks/DoGDV8-e.js";import{b as m}from"../chunks/j58xHptK.js";var S=h('<meta name="description" content="@tradecanvas/analytics — bar-by-bar Backtester, Portfolio tracking, and risk metrics (Sharpe, Sortino, Calmar, max drawdown)."/>'),R=h(`<h1>Analytics (0.8)</h1> <p><code>@tradecanvas/analytics</code> ships a headless, bar-by-bar strategy
  backtester with portfolio tracking and a summary risk-metrics calculator.
  Pair it with <a>replay mode</a> to visualize trades on the chart.</p> <h2>Backtester</h2> <p>Execution model:</p> <ul><li>Strategy fn runs at close of each bar.</li> <li>Orders placed on bar N fill on bar N+1 — market at open; limit/stop when the bar trades through the trigger price.</li> <li>Equity is marked to close of every bar.</li></ul> <pre><code></code></pre> <h2>StrategyContext</h2> <table><thead><tr><th>Field / method</th><th>Description</th></tr></thead><tbody><tr><td><code>bar</code></td><td>Current bar.</td></tr><tr><td><code>index</code></td><td>Index of <code>bar</code> in the input series.</td></tr><tr><td><code>history</code></td><td>Bars up to and including <code>bar</code>.</td></tr><tr><td><code>position</code></td><td>Current position or <code>null</code>.</td></tr><tr><td><code>cash</code></td><td>Available cash.</td></tr><tr><td><code>equity</code></td><td>Cash + mark-to-market position value.</td></tr><tr><td><code>placeOrder(order)</code></td><td>Queue order for next bar.</td></tr><tr><td><code>close(tag?)</code></td><td>Market-close current position.</td></tr><tr><td><code>cancel(orderId)</code></td><td>Cancel a pending order.</td></tr></tbody></table> <h2>Commission &amp; slippage models</h2> <ul><li><code>FixedCommission(perTrade)</code></li> <li><code>PercentCommission(rate)</code> — fraction of notional, e.g. <code>0.001</code> = 10 bps.</li> <li><code>PerShareCommission(perShare, minimum?)</code></li> <li><code>PercentSlippage(rate)</code> — adverse fraction of price.</li> <li><code>RangeBasedSlippage(factor)</code> — proportional to the bar's range.</li></ul> <h2>Portfolio</h2> <p>Tracks cash, one net position, realized P&amp;L, and the equity curve.</p> <pre><code></code></pre> <h2>Risk metrics</h2> <pre><code></code></pre> <p>Pair the result's <code>equityCurve</code> with <a>EquityCurveRenderer</a> to visualize backtests.</p>`,1);function A(u){var c=R();q("6tuxzt",k=>{var x=S();w(()=>{_.title="Analytics & backtesting — TradeCanvas docs"}),s(k,x)});var o=t(C(c),2),f=t(e(o),2);l(),r(o);var a=t(o,8),b=e(a);b.textContent=`import { Backtester, FixedCommission, PercentSlippage } from '@tradecanvas/analytics'

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

console.log(result.metrics.sharpe, result.metrics.maxDrawdownPct)`,r(a);var i=t(a,14),g=e(i);g.textContent=`const portfolio = new Portfolio({ initialCash: 10_000 })
portfolio.applyFill({ ... })
portfolio.mark(time, price)         // record equity point

portfolio.getPosition()             // → { side, quantity, averagePrice, ... } | null
portfolio.getTrades()               // → closed trades
portfolio.getEquityCurve()          // → equity points
portfolio.equity(price)             // mark-to-market`,r(i);var n=t(i,4),v=e(n);v.textContent=`import { computeRiskMetrics } from '@tradecanvas/analytics'

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
m.expectancy`,r(n);var d=t(n,2),y=t(e(d),3);l(),r(d),P(()=>{p(f,"href",`${m??""}/docs/realtime`),p(y,"href",`${m??""}/docs/finance`)}),s(u,c)}export{A as component};
