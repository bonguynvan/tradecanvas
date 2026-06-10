---
'@tradecanvas/chart': patch
---

feat: strategy performance dashboard

- **`PerformanceDashboard`** — a composed, themed dashboard rendered from a
  backtest result (structurally any `{ equityCurve, metrics }`, e.g. the
  output of `@tradecanvas/analytics` `Backtester.run()`). One call builds a
  headline stats strip (total return, CAGR, Sharpe, Sortino, max drawdown,
  win rate, profit factor, trades), an equity curve, an underwater drawdown
  panel, and a calendar monthly-returns heatmap. Responsive grid, light/dark
  aware, `update()` / `setTheme()` / `destroy()`.
- **Pure derivations exported** for custom layouts: `computeMonthlyReturns`,
  `computeDrawdownCurve`, `toEquityPoints`, `selectKeyStats`. Monthly returns
  are chained off the prior month's close so the heatmap reads as sequential
  monthly performance.
