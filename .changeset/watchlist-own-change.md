---
'@tradecanvas/chart': patch
---

The watchlist row of the chart's own symbol, with no quote for it, shows the day's move: against the close before the last day in the bars, in the exchange's zone, as the symbol info panel reads it. It was read against the first bar loaded, so a daily chart showed the move over its whole history. With no day before the last in the bars, the row shows no move. A `refPrice` given with `setWatchlistEntry` still wins.
