---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
'@tradecanvas/mcp': minor
---

Six more finance charts, twenty in all, for options and portfolios: `PayoffChart` (what an options position makes or loses at expiry, with its breakevens and the price now; `payoffStats` and `optionPayoff` give the numbers), `CurveChart` (values against a strike or a tenor: a volatility smile, a term structure, a yield curve), `BoxPlotChart` (quartiles, whiskers and outliers for each group; `boxPlotStats`), `RadarChart` (several measures on spokes, a shape a series), `SunburstChart` (parts inside parts, a ring a level, with a click) and `StackedAreaChart` (series one on another, or as shares with `normalized`). Each reads out under the pointer, takes `theme`, `font`, `locale` and `ariaLabel`, and is in the MCP server's `list_finance_charts`.
