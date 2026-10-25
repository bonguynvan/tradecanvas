---
'@tradecanvas/analytics': patch
'@tradecanvas/chart': patch
---

`maxDrawdownPct` from `computeRiskMetrics` and the `Backtester` is now the deepest fall from a running peak. It was the percent of the largest fall in money, which on a growing account can be a later, shallower fall: an equity curve of 100, 50, 100, 400, 1000, 800, 1200 gave 0.2 (20%) instead of 0.5 (50%). It only ever gets larger, so a strategy filtered by a drawdown limit can now fail it. `calmar` divides by it and falls with it. `maxDrawdown` is still the largest fall in money, so the two can now come from different falls. The `RiskMetrics` fields say their units: the percentages are fractions (0.12 is 12%). `PerformanceDashboard` shows the total return and the max drawdown of a `Backtester` result in percent: they read 100 times too small (`+0.20%` for a 20% drawdown). The Max Drawdown card reads as a fall, `-20.00%`, as the Drawdown panel under it plots it. Metrics you build by hand for it take fractions too, as `RiskMetricsLike` now says.
