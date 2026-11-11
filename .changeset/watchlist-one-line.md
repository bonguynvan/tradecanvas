---
'@tradecanvas/chart': minor
---

The watchlist reads a line a symbol: the ticker, last price, move and % change, in columns under their names, 24 px a row, where a row was about 46. The sparkline beside each price is off by default; `watchlist: { sparkline: true }` brings it back in the move's place. A ticker shows without its venue (`HYPERLIQUID:xyz:NVDA` reads NVDA, the whole symbol on hover). A panel under 250 px drops the move, and the dock opens 262 px wide, where it opened at 296.

The drawing tools are six buttons where there were thirteen (Lines, Fibonacci, Patterns, Forecasting, Shapes, Annotation), each menu listing its tools under the kinds it gathers. A tool group of yours can do the same with `heading` on a tool. With fewer buttons an icon keeps its full 26 px on a short screen, and the column is its buttons and little more: 42 px in Print, where it was 53.
